import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createFixtureTransactionHandler,
  FakeMatrixProjectionAdapter,
  IdempotencyStore,
  type RuntimeEvent,
} from "../../apps/matrix-appservice/src/index.ts";
import { runFakeCodexWorker } from "../../apps/worker-runner/src/index.ts";
import {
  createInMemoryApprovalGate,
  type ApprovalRequest,
} from "../../packages/approval-gate/src/index.ts";
import {
  loadCapabilityRegistry,
  routeCapability,
} from "../../packages/capability-router/src/index.ts";
import { createFakeGitHubPrAdapter } from "../../packages/github-adapter/src/index.ts";
import {
  decidePolicy,
  loadPolicy,
  loadPolicyFixture,
} from "../../packages/policy-engine/src/index.ts";
import {
  createInMemoryProofLedger,
  createProofFromWorkerArtifacts,
  verifyProof,
  type ProofLedgerEntry,
} from "../../packages/proof-ledger/src/index.ts";
import {
  createInMemoryTaskStore,
  type InMemoryTaskStore,
} from "../../packages/runtime-store/src/index.ts";
import type { ActorType, TaskStateName } from "../../packages/state-machine/src/index.ts";
import {
  createFakeWorktreeManager,
  createWorkCell,
} from "../../packages/work-cell-manager/src/index.ts";
import { createMemoryProposal } from "../../workers/memory-curator-worker/src/index.ts";

import {
  FakeArtifactStore,
  FakeMatrixHomeserver,
  FakeRuntimeEventQueue,
} from "./fakes/index.ts";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const now = "2026-06-29T10:00:00Z";
const taskId = "task_mcr_700_local_fake";
const runId = "run_mcr_700_local_fake";
const traceId = "trace_mcr_700_local_fake";
const proofId = "proof_mcr_700_local_fake";
const baseSha = "39ed836e69846612c478865a20a3f6bd1f4956e2";
const target = {
  type: "pull_request" as const,
  ref: "refs/heads/mcr/MCR-700/local-fake-mvp-e2e",
  base_ref: "refs/heads/main",
};

test("local fake MVP runs task.created through verified proof, approval, simulated PR, and memory proposal", () => {
  const flow = runHappyPath();

  assert.deepEqual(flow.matrix.response, {
    status: 200,
    body: { code: "ok", retryable: false },
  });
  assert.equal(flow.matrix.queue.events.length, 1);
  assert.equal(flow.matrix.queue.events[0]?.source_of_truth, "runtime");
  assert.deepEqual(
    flow.matrixProjections.map((record) => record.event_type),
    ["com.notyet.agent.task.accepted", "com.notyet.agent.proof.submitted"],
  );
  assert.deepEqual(flow.transitions, [
    "accepted",
    "scoped",
    "graph_compiled",
    "capability_selected",
    "work_cell_created",
    "worker_dispatched",
    "running",
    "artifact_submitted",
    "proof_submitted",
    "verifying",
    "waiting_approval",
    "approved",
    "pr_created",
    "completed",
  ]);
  assert.equal(flow.route.ok, true);
  assert.equal(flow.policyDecision.decision, "allow");
  assert.equal(flow.worker.status, "success");
  assert.equal(flow.proofVerification.ok, true);
  assert.equal(flow.beforeApproval.ok, false);
  if (!flow.beforeApproval.ok) {
    assert.equal(flow.beforeApproval.code, "approval_required");
  }
  assert.equal(flow.prCallsBeforeApproval, 0);
  assert.equal(flow.afterApproval.ok, true);
  assert.equal(flow.prs.length, 1);
  assert.equal(flow.prs[0]?.proof_id, proofId);
  assert.equal("merge" in flow.githubAdapter, false);
  assert.equal("mergePullRequest" in flow.githubAdapter, false);
  assert.equal(flow.memoryProposal.ok, true);
  if (flow.memoryProposal.ok) {
    assert.equal(flow.memoryProposal.status, "proposed");
    if (flow.memoryProposal.status === "proposed") {
      assert.equal(
        flow.memoryProposal.event.data.proposed_change.operation,
        "propose",
      );
      assert.equal(flow.memoryProposal.event.data.proof_id, proofId);
    }
  }
  assert.deepEqual(flow.artifactStore.liveMemoryWrites, []);
  const publicSurface = JSON.stringify({
    matrixProjections: flow.matrixProjections,
    prs: flow.prs,
    memoryProposal: flow.memoryProposal,
  });

  assert.equal(/\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/.test(publicSurface), false);
  assert.equal(publicSurface.includes("api_key"), false);
  assert.equal(publicSurface.includes("raw_"), false);
});

test("invalid Matrix event enqueues no runtime work", () => {
  const matrix = new FakeMatrixHomeserver({
    root,
    createHandler: ({ queue }) =>
      createFixtureTransactionHandler({ runtimeEventQueue: queue }),
  });

  const outcome = matrix.submitFixture("invalid-schema");

  assert.equal(outcome.runtimeEvents.length, 0);
  assert.equal(outcome.queue.events.length, 0);
  assert.equal(outcome.failureEvents.length, 1);
  assert.equal(outcome.failureEvents[0]?.enqueue.status, "not_queued");
});

test("duplicate Matrix transaction returns idempotent success without runtime work", () => {
  const outcome = submitMatrixFixtureWithPreexisting("duplicate-transaction");

  assert.equal(outcome.response.status, 200);
  assert.equal(outcome.response.body.code, "duplicate_transaction");
  assert.equal(outcome.committed, true);
  assert.equal(outcome.runtimeEvents.length, 0);
  assert.equal(outcome.queue.events.length, 0);
  assert.equal(outcome.failureEvents.length, 0);
});

test("duplicate Matrix event commits the transaction without duplicate side effects", () => {
  const outcome = submitMatrixFixtureWithPreexisting("duplicate-event");
  const duplicateSideEffects = duplicateSideEffectsFor(outcome);

  assert.equal(outcome.response.status, 200);
  assert.equal(outcome.response.body.code, "ok");
  assert.equal(outcome.committed, true);
  assert.equal(outcome.runtimeEvents.length, 0);
  assert.equal(outcome.queue.events.length, 0);
  assert.equal(outcome.failureEvents.length, 0);
  assert.deepEqual(duplicateSideEffects, {
    taskTransitions: [],
    workCells: [],
    proofs: [],
    prs: [],
  });
});

test("worker failure and blocked output stop before approval and PR creation", () => {
  for (const fixtureName of ["failure", "blocked"] as const) {
    const result = runWorkerStopCase(fixtureName);

    assert.notEqual(result.worker.status, "success");
    assert.equal(result.proof.ok, false);
    assert.equal(result.approvalRequested, false);
    assert.equal(result.prs.length, 0);
  }
});

test("fake proof, policy bypass, approval replay, and secret logs stop before PR creation", () => {
  for (const fixtureName of [
    "fake-proof.denied",
    "prompt-injection-policy-override.denied",
    "approval-replay.denied",
    "secret-log.denied",
  ]) {
    const denied = runDeniedPolicyFixture(fixtureName);

    assert.equal(denied.decision, "deny", fixtureName);
    assert.deepEqual(denied.errors, denied.expectedErrors, fixtureName);
    assert.equal(denied.prs.length, 0, fixtureName);
  }

  const fakeProof = createSuccessProof({
    omitFinalOutputArtifact: true,
  });
  assert.equal(fakeProof.proof.ok, false);
  if (!fakeProof.proof.ok) {
    assert.equal(fakeProof.proof.code, "missing_worker_artifact_ref");
  }
  assert.equal(fakeProof.prs.length, 0);

  const replay = runApprovalReplayMutation();
  assert.equal(replay.first.ok, true);
  assert.equal(replay.second.ok, false);
  if (!replay.second.ok) {
    assert.equal(replay.second.code, "approval_replayed");
  }
  assert.equal(replay.prs.length, 0);

  const secretLog = createSuccessProof();
  assert.equal(secretLog.proof.ok, true);
  if (secretLog.proof.ok) {
    const verification = verifyProof({
      proof: secretLog.proof.proof,
      log_contents_by_ref: {
        [secretLog.validationLogRef]: "token=sk-proj-secretlocaltest",
      },
    });

    assert.equal(verification.ok, false);
    assert.equal(verification.errors.includes("secret_bearing_log"), true);
    assert.equal(secretLog.prs.length, 0);
  }
});

function runHappyPath() {
  const matrix = submitMatrixTask();
  const runtimeEvent = requiredRuntimeEvent(matrix.queue);
  const matrixProjection = new FakeMatrixProjectionAdapter();
  const store = createTaskStore();
  const artifactStore = new FakeArtifactStore("artifact://mcr-700");
  const registry = loadCapabilityRegistry(path.join(root, "runtime/capabilities.yaml"));
  const route = routeCapability(registry, {
    task_type: "test_change",
    risk: "medium",
    required_permissions: ["repo:read", "repo:write_patch", "process:run_tests"],
    suggested_capability: "repo.patch.codex",
  });
  assert.equal(route.ok, true);
  if (!route.ok) {
    throw new Error(route.reason);
  }

  transition(store, "created", "accepted", "task.accepted", "human");
  matrixProjection.project({
    room_id: "!agent-runtime:carpet.test",
    content: {
      specversion: "1.0",
      id: "evt_mcr_700_task_accepted",
      source: "runtime://task-store",
      type: "com.notyet.agent.task.accepted",
      subject: taskId,
      time: now,
      datacontenttype: "application/json",
      workspace_id: runtimeEvent.workspace_id ?? "ws_carpet",
      task_id: taskId,
      trace_id: traceId,
      actor: { type: "runtime", id: "runtime_intake" },
      created_at: now,
      idempotency_key: `task-accepted:${taskId}`,
      data: {},
    },
  });
  transition(store, "accepted", "scoped", "task.scoped", "runtime");
  transition(
    store,
    "scoped",
    "graph_compiled",
    "task.graph_compiled",
    "runtime",
  );
  transition(
    store,
    "graph_compiled",
    "capability_selected",
    "capability.selected",
    "runtime",
  );

  const policy = loadPolicy(path.join(root, "runtime/policies/repo-patch.yaml"));
  const policyDecision = decidePolicy(policy, {
    task_id: taskId,
    run_id: runId,
    capability_id: route.capability.id,
    action: "repo:write_patch",
    requested_at: now,
    worktree: { path: "../.worktrees/Carpet/MCR-700-local-fake-mvp-e2e" },
    scope: {
      allowed_paths: ["tests/e2e/**", "apps/matrix-appservice/src/index.ts"],
      forbidden_paths: [".env*", "secrets/**"],
    },
    target: {
      type: "worktree_file",
      path: "tests/e2e/local-fake-mvp.test.ts",
      ref: "worktree://tests/e2e/local-fake-mvp.test.ts",
    },
  });
  const workCell = createWorkCell({
    task_id: taskId,
    run_id: runId,
    trace_id: traceId,
    capability: route.capability.id,
    task_card_id: "MCR-700",
    slug: "local-fake-mvp-e2e",
    base_branch: "main",
    base_sha: baseSha,
    policy_decision: policyDecision,
    worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
  });
  assert.equal(workCell.ok, true);
  if (!workCell.ok) {
    throw new Error(workCell.reason);
  }

  transition(
    store,
    "capability_selected",
    "work_cell_created",
    "work_cell.created",
    "runtime",
  );
  transition(
    store,
    "work_cell_created",
    "worker_dispatched",
    "worker.dispatched",
    "runtime",
  );
  transition(store, "worker_dispatched", "running", "worker.started", "worker");

  const proofBuild = createSuccessProof({ artifactStore, worktree: workCell.work_cell.worktree });
  assert.equal(proofBuild.proof.ok, true);
  if (!proofBuild.proof.ok) {
    throw new Error(proofBuild.proof.reason);
  }
  matrixProjection.project({
    room_id: "!agent-runtime:carpet.test",
    content: proofSubmittedProjection(proofBuild.proof.proof, runtimeEvent),
  });

  transition(
    store,
    "running",
    "artifact_submitted",
    "artifact.submitted",
    "worker",
    { artifact_ref: proofBuild.worker.artifact_refs.final_output },
  );
  transition(
    store,
    "artifact_submitted",
    "proof_submitted",
    "proof.submitted",
    "worker",
    { artifact_ref: proofBuild.worker.artifact_refs.final_output },
  );
  transition(
    store,
    "proof_submitted",
    "verifying",
    "verification.started",
    "verifier",
    { proof_ref: proofBuild.proof.proof.proof_id },
  );

  const ledger = createInMemoryProofLedger();
  const appended = ledger.append(proofBuild.proof.proof, {
    expected: {
      task_id: taskId,
      run_id: runId,
      trace_id: traceId,
      forbidden_paths: [".env*", "secrets/**"],
    },
    changed_files: [{ path: "tests/e2e/local-fake-mvp.test.ts" }],
  });
  assert.equal(appended.ok, true);
  const proofVerification = verifyProof({
    proof: proofBuild.proof.proof,
    expected: { task_id: taskId, run_id: runId, trace_id: traceId },
  });
  assert.equal(proofVerification.ok, true);

  transition(
    store,
    "verifying",
    "waiting_approval",
    "approval.requested",
    "runtime",
    { proof_ref: proofId },
  );

  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00Z"),
    verified_proof_ids: new Set([proofId]),
  });
  const githubAdapter = createFakeGitHubPrAdapter({ approvalGate });
  const pullRequest = {
    task_id: taskId,
    proof: proofBuild.proof.proof,
    target,
    title: "MCR-700 Local Fake MVP E2E Harness",
    requested_at: "2026-06-29T10:05:00Z",
  };
  const beforeApproval = githubAdapter.createPullRequest(pullRequest);
  const prCallsBeforeApproval = githubAdapter.listPullRequests().length;

  const approval = {
    approval_id: "approval_mcr_700_local_fake",
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    actor: { type: "human" as const, id: "@lead:carpet.test" },
    target,
    conditions: ["Create only the simulated PR record."],
    created_at: "2026-06-29T10:04:00Z",
    expires_at: "2026-06-29T11:00:00Z",
  };
  assert.equal(approvalGate.grant(approval).ok, true);
  transition(
    store,
    "waiting_approval",
    "approved",
    "approval.granted",
    "human",
    { proof_ref: proofId, approval_ref: approval.approval_id },
  );

  const afterApproval = githubAdapter.createPullRequest(pullRequest);
  assert.equal(afterApproval.ok, true);
  const prArtifact = artifactStore.putJson("simulated-pr.json", afterApproval);
  transition(
    store,
    "approved",
    "pr_created",
    "github.pr.create_requested",
    "runtime",
    {
      proof_ref: proofId,
      approval_ref: approval.approval_id,
    },
  );
  transition(store, "pr_created", "completed", "task.completed", "runtime", {
    artifact_ref: prArtifact.uri,
    proof_ref: proofId,
    approval_ref: approval.approval_id,
  });

  const memoryProposal = createMemoryProposal({
    proof: proofBuild.proof.proof,
    verified_proof_ids: new Set([proofId]),
    lesson: {
      reusable: true,
      scope: "Carpet MCR E2E",
      statement: "Local MVP E2E uses fake adapters only before real services.",
      evidence_ref: proofBuild.validationLogRef,
      review_target: "memory://carpet/mcr",
      confidence: "medium",
    },
    proposal_id: "memory_proposal_mcr_700_local_fake",
    event_id: "evt_memory_proposal_mcr_700_local_fake",
    created_at: now,
    workspace_id: runtimeEvent.workspace_id ?? "ws_carpet",
  });

  return {
    matrix,
    transitions: store
      .listTransitionRecords(taskId)
      .map((record) => record.task_snapshot.state),
    route,
    policyDecision,
    workCell,
    matrixProjections: matrixProjection.records,
    worker: proofBuild.worker,
    proofVerification,
    beforeApproval,
    prCallsBeforeApproval,
    afterApproval,
    prs: githubAdapter.listPullRequests(),
    githubAdapter: githubAdapter as Record<string, unknown>,
    memoryProposal,
    artifactStore,
  };
}

function proofSubmittedProjection(
  proof: ProofLedgerEntry,
  runtimeEvent: RuntimeEvent,
) {
  return {
    specversion: "1.0",
    id: "evt_mcr_700_proof_submitted",
    source: "runtime://proof-ledger",
    type: "com.notyet.agent.proof.submitted",
    subject: proof.task_id,
    time: now,
    datacontenttype: "application/json",
    workspace_id: runtimeEvent.workspace_id ?? "ws_carpet",
    task_id: proof.task_id,
    run_id: proof.run_id,
    trace_id: proof.trace_id,
    actor: { type: "runtime", id: "proof_ledger" },
    created_at: now,
    idempotency_key: `proof:${proof.proof_id}`,
    data: {
      proof_id: proof.proof_id,
      artifact_refs: proof.artifacts,
      validation_summary: {
        status: "passed",
        command_count: proof.validation.length,
        passed_count: proof.validation.filter(
          (validation) => validation.status === "passed",
        ).length,
        failed_count: proof.validation.filter(
          (validation) => validation.status === "failed",
        ).length,
        summary: "Local fake MVP proof verified.",
      },
    },
  };
}

function createSuccessProof(options: {
  artifactStore?: FakeArtifactStore;
  worktree?: {
    path: string;
    branch: string;
    base_branch: string;
    base_sha: string;
  };
  omitFinalOutputArtifact?: boolean;
} = {}) {
  const artifactStore = options.artifactStore ?? new FakeArtifactStore("artifact://mcr-700");
  const jsonl = readText("fixtures/codex-jsonl/success.jsonl");
  const jsonlArtifact = artifactStore.putText("codex-success.jsonl", jsonl, "log");
  const validationLog = artifactStore.putText(
    "contracts.log",
    "pnpm test:contracts passed with 78 tests.",
    "log",
  );
  const finalOutput = successFinalOutput(validationLog.uri);
  const finalOutputArtifact = artifactStore.putJson(
    "repo-patch-result.json",
    finalOutput,
  );
  const worker = runFakeCodexWorker({
    jsonl,
    jsonl_artifact_ref: jsonlArtifact.uri,
    final_output: finalOutput,
    final_output_artifact_ref: finalOutputArtifact.uri,
    forbidden_paths: [".env*", "secrets/**"],
  });
  const artifacts = [
    jsonlArtifact,
    ...(options.omitFinalOutputArtifact ? [] : [finalOutputArtifact]),
    validationLog,
  ];
  const proof = createProofFromWorkerArtifacts({
    proof_id: proofId,
    task_id: taskId,
    run_id: runId,
    trace_id: traceId,
    created_at: now,
    capability: "repo.patch.codex",
    forbidden_paths: [".env*", "secrets/**"],
    worktree: {
      path:
        options.worktree?.path ??
        "../.worktrees/Carpet/MCR-700-local-fake-mvp-e2e",
      branch: options.worktree?.branch ?? "mcr/MCR-700/local-fake-mvp-e2e",
      base_branch: options.worktree?.base_branch ?? "main",
      base_sha: options.worktree?.base_sha ?? baseSha,
      head_sha: baseSha,
      cleanup_status: "kept_for_review",
    },
    artifacts,
    worker_result: worker,
  });

  return {
    artifactStore,
    worker,
    proof,
    validationLogRef: validationLog.uri,
    prs: [],
  };
}

function runWorkerStopCase(fixtureName: "failure" | "blocked") {
  const artifactStore = new FakeArtifactStore(`artifact://mcr-700/${fixtureName}`);
  const jsonl = readText(`fixtures/codex-jsonl/${fixtureName}.jsonl`);
  const jsonlArtifact = artifactStore.putText(`${fixtureName}.jsonl`, jsonl, "log");
  const worker = runFakeCodexWorker({
    jsonl,
    jsonl_artifact_ref: jsonlArtifact.uri,
    forbidden_paths: [".env*", "secrets/**"],
  });
  const proof = createProofFromWorkerArtifacts({
    proof_id: `proof_mcr_700_${fixtureName}`,
    task_id: `task_mcr_700_${fixtureName}`,
    run_id: `run_mcr_700_${fixtureName}`,
    trace_id: `trace_mcr_700_${fixtureName}`,
    created_at: now,
    capability: "repo.patch.codex",
    forbidden_paths: [".env*", "secrets/**"],
    worktree: {
      path: `../.worktrees/Carpet/MCR-700-${fixtureName}`,
      branch: `mcr/MCR-700/${fixtureName}`,
      base_branch: "main",
      base_sha: baseSha,
      head_sha: baseSha,
      cleanup_status: "kept_for_review",
    },
    artifacts: [jsonlArtifact],
    worker_result: worker,
  });

  return { worker, proof, approvalRequested: false, prs: [] };
}

function runDeniedPolicyFixture(fixtureName: string) {
  const policy = loadPolicy(path.join(root, "runtime/policies/repo-patch.yaml"));
  const fixture = loadPolicyFixture(path.join(root, `fixtures/policy/${fixtureName}.yaml`));
  const result = decidePolicy(policy, fixture.request);

  return {
    decision: result.decision,
    errors: result.errors,
    expectedErrors: fixture.expected_errors,
    prs: [],
  };
}

function runApprovalReplayMutation() {
  const gate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00Z"),
    verified_proof_ids: new Set([proofId]),
  });
  const approval = {
    approval_id: "approval_mcr_700_replay",
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    actor: { type: "human" as const, id: "@lead:carpet.test" },
    target,
    conditions: ["single use"],
    created_at: "2026-06-29T10:04:00Z",
    expires_at: "2026-06-29T11:00:00Z",
  };
  const request: ApprovalRequest = {
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    target,
    requested_at: "2026-06-29T10:05:00Z",
  };

  assert.equal(gate.grant(approval).ok, true);

  return {
    first: gate.authorize(request),
    second: gate.authorize(request),
    prs: [],
  };
}

function submitMatrixTask() {
  const matrix = new FakeMatrixHomeserver({
    root,
    createHandler: ({ queue }) =>
      createFixtureTransactionHandler({ runtimeEventQueue: queue }),
  });

  return matrix.submitFixture("success");
}

function submitMatrixFixtureWithPreexisting(name: string) {
  const matrix = new FakeMatrixHomeserver({
    root,
    createHandler: ({ queue, fixture }) =>
      createFixtureTransactionHandler({
        idempotencyStore: new IdempotencyStore(fixture.preexisting),
        runtimeEventQueue: queue,
      }),
  });

  return matrix.submitFixture(name);
}

function duplicateSideEffectsFor(outcome: {
  queue: FakeRuntimeEventQueue;
}) {
  if (outcome.queue.events.length > 0) {
    return {
      taskTransitions: ["duplicate_task_created"],
      workCells: ["duplicate_work_cell_created"],
      proofs: ["duplicate_proof_created"],
      prs: ["duplicate_pr_created"],
    };
  }

  return {
    taskTransitions: [],
    workCells: [],
    proofs: [],
    prs: [],
  };
}

function requiredRuntimeEvent(queue: FakeRuntimeEventQueue): RuntimeEvent {
  const event = queue.events[0];

  if (!event) {
    throw new Error("expected one runtime event");
  }

  return event;
}

function createTaskStore() {
  const store = createInMemoryTaskStore();

  store.putTaskSnapshot({
    task_id: taskId,
    state: "created",
    risk: "medium",
    current_transition_id: null,
    artifact_refs: [],
    proof_refs: [],
    approval_refs: [],
  });

  return store;
}

function transition(
  store: InMemoryTaskStore,
  from: TaskStateName,
  to: TaskStateName,
  trigger: string,
  actor: ActorType,
  refs: {
    artifact_ref?: string;
    proof_ref?: string;
    approval_ref?: string;
  } = {},
) {
  const result = store.appendTransition({
    command_id: `cmd_${from}_to_${to}`,
    task_id: taskId,
    expected_state: from,
    transition: {
      transition_id: `transition_${from}_to_${to}`,
      task_id: taskId,
      from,
      to,
      trigger_event: trigger,
      actor: { type: actor, id: `${actor}_mcr_700` },
      requirements: {
        artifact_ref: refs.artifact_ref ?? null,
        proof_ref: refs.proof_ref ?? null,
        approval_ref: refs.approval_ref ?? null,
      },
      audit_event: {
        type: `task.transition.${to}`,
        event_id: `audit_${from}_to_${to}`,
        trace_id: traceId,
      },
    },
  });

  assert.equal(result.ok, true, result.ok ? undefined : result.message);
}

function successFinalOutput(validationLogRef: string) {
  const fixture = readJson("fixtures/codex/valid/repo-patch-result.valid.json");

  return {
    ...fixture,
    task_id: taskId,
    run_id: runId,
    root_cause: "MCR-700 needs a local fake E2E harness before real services.",
    changes_made: ["Added local fake MVP E2E test harness."],
    files_changed: [
      {
        path: "tests/e2e/local-fake-mvp.test.ts",
        action: "added",
      },
    ],
    commands_run: [
      {
        command: "pnpm test:contracts",
        exit_code: 0,
        summary: "Contract tests passed.",
        log_ref: validationLogRef,
      },
    ],
    validation_results: [
      {
        command: "pnpm test:contracts",
        exit_code: 0,
        status: "passed",
        summary: "Contract tests passed.",
        log_ref: validationLogRef,
      },
    ],
    diff_summary: {
      summary: "Add local fake MVP E2E harness.",
      files_added: 4,
      files_modified: 1,
      files_deleted: 0,
    },
    risk_notes: ["External effects are fake and locally inspectable."],
    rollback_notes: ["Remove tests/e2e/local-fake-mvp.test.ts and tests/e2e/fakes."],
    security_notes: ["No real Matrix, Codex, GitHub, DB, secret, or memory write."],
    memory_update_proposals: [
      {
        target: "memory://carpet/mcr",
        proposal: "Local MVP E2E uses fake adapters before real services.",
        evidence_ref: validationLogRef,
        requires_human_review: true,
      },
    ],
    ready_for_review: true,
  };
}

function readJson(relativePath: string) {
  return JSON.parse(readText(relativePath)) as Record<string, unknown>;
}

function readText(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}
