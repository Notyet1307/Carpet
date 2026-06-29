import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runCodexExecSmoke,
  runFakeCodexWorker,
  type CodexExecProcessRunner,
  type CodexExecSmokeInput,
  type CodexExecSmokeResult,
  type WorkerRunnerResult,
} from "../../worker-runner/src/index.ts";
import { createInMemoryApprovalGate } from "../../../packages/approval-gate/src/index.ts";
import {
  loadCapabilityRegistry,
  routeCapability,
} from "../../../packages/capability-router/src/index.ts";
import {
  createFakeGitHubPrAdapter,
  createRuntimeOwnedGitHubPrAdapter,
  type DisposableGitHubPrTarget,
  type RuntimeOwnedGitHubPrRunner,
} from "../../../packages/github-adapter/src/index.ts";
import {
  decidePolicy,
  loadPolicy,
} from "../../../packages/policy-engine/src/index.ts";
import {
  createInMemoryProofLedger,
  createProofFromWorkerArtifacts,
  verifyProof,
  type ProofArtifact,
  type ProofLedgerEntry,
} from "../../../packages/proof-ledger/src/index.ts";
import {
  createInMemoryTaskStore,
  exportRuntimeStoreSnapshot,
  readRuntimeStoreSnapshotFile,
  writeRuntimeStoreSnapshotFile,
  type ArtifactRefRecord,
  type InMemoryTaskStore,
  type RuntimeStoreSnapshot,
} from "../../../packages/runtime-store/src/index.ts";
import type {
  ActorType,
  TaskStateName,
} from "../../../packages/state-machine/src/index.ts";
import {
  createFakeWorktreeManager,
  createWorkCell,
  WORK_CELL_CLEANUP_POLICY,
  type WorktreeManager,
} from "../../../packages/work-cell-manager/src/index.ts";
import { createMemoryProposal } from "../../../workers/memory-curator-worker/src/index.ts";
import type { RuntimeEvent } from "../../matrix-appservice/src/runtime-event-mapper.ts";
import {
  createRuntimeApprovalIntake,
  createRuntimeApprovalProjection,
} from "./approval-projection.ts";

export {
  createRuntimeApprovalIntake,
  createRuntimeApprovalProjection,
} from "./approval-projection.ts";

export type RunRuntimeOrchestratorInput = {
  snapshotPath: string;
  repoRoot?: string;
  worker_adapter?: RuntimeWorkerAdapter;
  github_pr_adapter?: RuntimeGitHubPrAdapter;
};

export type RunRuntimeOrchestratorFromMatrixEventInput =
  RunRuntimeOrchestratorInput & {
    runtimeEvent: RuntimeEvent;
  };

type RuntimeWorkerAdapter = {
  type: "codex_exec_smoke";
  worktree_path: string;
  main_checkout_path: string;
  prompt_file: string;
  evidence_dir: string;
  codex_binary?: string;
  smoke?: boolean;
  manual_approval?: CodexExecSmokeInput["manual_approval"];
  credential_scope?: string;
  env?: Record<string, string>;
  process_runner?: CodexExecProcessRunner;
};

type RuntimeGitHubPrAdapter = {
  enabled?: boolean;
  repository: string;
  disposable_target: DisposableGitHubPrTarget;
  credential_scope?: "disposable" | "scoped";
  env?: Record<string, string>;
  evidence_dir: string;
  body_file: string;
  base_sha: string;
  head_sha: string;
  cleanup_status: "not_started" | "kept_for_review";
  runner?: RuntimeOwnedGitHubPrRunner;
};

const repoRoot = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const now = "2026-06-29T10:00:00.000Z";
const taskId = "task_mcr_800_runtime_orchestrator_cli";
const runId = "run_mcr_800_runtime_orchestrator_cli";
const traceId = "trace_mcr_800_runtime_orchestrator_cli";
const proofId = "proof_mcr_800_runtime_orchestrator_cli";
const approvalId = "approval_mcr_800_runtime_orchestrator_cli";
const baseSha = "0b9fe09e9497627cf6aa8efc5c7a1bad25848bf1";
const validationLogUri = "artifact://mcr-800/validation-log";
const prTarget = {
  type: "pull_request" as const,
  ref: "refs/heads/mcr/MCR-800/runtime-orchestrator-cli",
  base_ref: "refs/heads/main",
};

type RuntimeOrchestratorContext = {
  now: string;
  taskId: string;
  runId: string;
  traceId: string;
  proofId: string;
  approvalId: string;
  baseSha: string;
  workspaceId: string;
  sourceMatrixEventRef: string;
  taskCardId: string;
  slug: string;
  title: string;
  storeId: string;
  validationLogUri: string;
  memoryProposalId: string;
  memoryProposalEventId: string;
};

function defaultRuntimeContext(): RuntimeOrchestratorContext {
  return {
    now,
    taskId,
    runId,
    traceId,
    proofId,
    approvalId,
    baseSha,
    workspaceId: "ws_carpet",
    sourceMatrixEventRef: "matrix-event://mcr-800/local-task",
    taskCardId: "MCR-800",
    slug: "runtime-orchestrator-cli",
    title: "MCR-800 Runtime Orchestrator CLI",
    storeId: "runtime_store_mcr_800_runtime_orchestrator_cli",
    validationLogUri,
    memoryProposalId: "memory_proposal_mcr_800_runtime_orchestrator_cli",
    memoryProposalEventId: "event_memory_proposal_mcr_800_runtime_orchestrator_cli",
  };
}

function runtimeContextFromMatrixEvent(event: RuntimeEvent): RuntimeOrchestratorContext {
  const suffix = sanitizeRuntimeId(`${event.matrix.transaction_id}_${event.matrix.event_id}`);

  return {
    ...defaultRuntimeContext(),
    taskId: event.task_id as string,
    runId: `run_${suffix}`,
    traceId: event.trace_id,
    proofId: `proof_${suffix}`,
    approvalId: `approval_${suffix}`,
    workspaceId: event.workspace_id as string,
    sourceMatrixEventRef: `matrix-event://${sanitizeRuntimeId(
      event.matrix.transaction_id,
    )}/${sanitizeMatrixEventId(event.matrix.event_id)}`,
    taskCardId: "MCR-820",
    slug: "matrix-ingress-runtime-orchestrator",
    title: "MCR-820 Matrix Ingress Runtime Orchestrator",
    storeId: `runtime_store_${suffix}`,
    validationLogUri: "artifact://mcr-820/validation-log",
    memoryProposalId: `memory_proposal_${suffix}`,
    memoryProposalEventId: `event_memory_proposal_${suffix}`,
  };
}

function validateAcceptedMatrixRuntimeEvent(event: RuntimeEvent) {
  if (
    event.source_component !== "matrix_appservice_gateway" ||
    event.source_of_truth !== "runtime" ||
    event.event_type !== "runtime.intent.received" ||
    event.validation.status !== "accepted" ||
    event.enqueue.status !== "queued" ||
    event.enqueue.target !== "runtime_intake" ||
    event.workspace_id === null ||
    event.task_id === null ||
    event.matrix.room_mapping.status !== "mapped"
  ) {
    return {
      ok: false as const,
      code: "not_accepted_runtime_intent",
      reason: "Matrix runtime event is not an accepted queued runtime intent",
    };
  }

  if (
    event.actor.derived_from !== "matrix.sender" ||
    event.actor.id !== event.matrix.sender ||
    (event.actor.claimed_actor !== null &&
      event.actor.claimed_actor.id !== event.matrix.sender)
  ) {
    return {
      ok: false as const,
      code: "actor_spoof_rejected",
      reason: "claimed actor data conflicts with Matrix sender",
    };
  }

  return { ok: true as const };
}

function sanitizeRuntimeId(value: string) {
  return value.replace(/^[^A-Za-z0-9]+/, "").replace(/[^A-Za-z0-9_-]/g, "_");
}

function sanitizeMatrixEventId(value: string) {
  return sanitizeRuntimeId(value);
}

export async function runRuntimeOrchestratorFromMatrixEvent(
  input: RunRuntimeOrchestratorFromMatrixEventInput,
) {
  const accepted = validateAcceptedMatrixRuntimeEvent(input.runtimeEvent);

  if (!accepted.ok) {
    return {
      ok: false as const,
      snapshot_path: input.snapshotPath,
      code: accepted.code,
      reason: accepted.reason,
    };
  }

  return {
    ok: true as const,
    ...(await runRuntimeOrchestrator(input, runtimeContextFromMatrixEvent(input.runtimeEvent))),
  };
}

export async function runRuntimeOrchestrator(
  input: RunRuntimeOrchestratorInput,
  context = defaultRuntimeContext(),
) {
  const root = input.repoRoot ?? repoRoot;
  const store = createInMemoryTaskStore();
  const artifacts = createArtifactRecorder(context);

  store.putTaskSnapshot({
    task_id: context.taskId,
    workspace_id: context.workspaceId,
    trace_id: context.traceId,
    state: "created",
    risk: "medium",
    current_transition_id: null,
    source_matrix_event_ref: context.sourceMatrixEventRef,
    created_at: context.now,
    updated_at: context.now,
    artifact_refs: [],
    proof_refs: [],
    approval_refs: [],
  });

  const registry = loadCapabilityRegistry(path.join(root, "runtime/capabilities.yaml"));
  const route = routeCapability(registry, {
    task_type: "test_change",
    risk: "medium",
    required_permissions: ["repo:read", "repo:write_patch", "process:run_tests"],
    suggested_capability: "repo.patch.codex",
  });

  if (!route.ok) {
    throw new Error(route.reason);
  }

  const policy = loadPolicy(path.join(root, "runtime/policies/repo-patch.yaml"));
  const policyDecision = decidePolicy(policy, {
    task_id: context.taskId,
    run_id: context.runId,
    capability_id: route.capability.id,
    action: "repo:write_patch",
    requested_at: context.now,
    worktree: { path: "../.worktrees/Carpet/MCR-800-runtime-orchestrator-cli" },
    scope: {
      allowed_paths: [
        "apps/runtime-orchestrator/**",
        "tests/e2e/runtime-orchestrator-cli.test.ts",
      ],
      forbidden_paths: [".env*", "secrets/**"],
    },
    target: {
      type: "worktree_file",
      path: "apps/runtime-orchestrator/src/index.ts",
      ref: "artifact://mcr-800/runtime-orchestrator-source",
    },
  });

  transition(context, store, "created", "accepted", "task.accepted", "human");
  transition(context, store, "accepted", "scoped", "task.scoped", "runtime");
  transition(context, store, "scoped", "graph_compiled", "task.graph_compiled", "runtime");
  transition(
    context,
    store,
    "graph_compiled",
    "capability_selected",
    "capability.selected",
    "runtime",
  );

  const workCell = createWorkCell({
    task_id: context.taskId,
    run_id: context.runId,
    trace_id: context.traceId,
    capability: route.capability.id,
    task_card_id: context.taskCardId,
    slug: context.slug,
    base_branch: "main",
    base_sha: context.baseSha,
    policy_decision: policyDecision,
    worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
  });

  if (!workCell.ok) {
    throw new Error(workCell.reason);
  }

  transition(
    context,
    store,
    "capability_selected",
    "work_cell_created",
    "work_cell.created",
    "runtime",
  );
  transition(
    context,
    store,
    "work_cell_created",
    "worker_dispatched",
    "worker.dispatched",
    "runtime",
  );
  transition(context, store, "worker_dispatched", "running", "worker.started", "worker");

  let codexExecSmoke: CodexExecSmokeResult | undefined;
  let finalOutput;
  let worker: WorkerRunnerResult;
  let validationLog: ArtifactRefRecord;
  let finalOutputArtifact: ArtifactRefRecord | undefined;
  let proofArtifactRecords: ArtifactRefRecord[];

  if (input.worker_adapter?.type === "codex_exec_smoke") {
    const { type, process_runner: processRunner, ...adapter } = input.worker_adapter;
    void type;
    codexExecSmoke = await runCodexExecSmoke(
      {
        ...adapter,
        task_id: context.taskId,
        run_id: context.runId,
      },
      processRunner,
    );
    proofArtifactRecords = recordCodexExecSmokeArtifacts(artifacts, codexExecSmoke);
    finalOutputArtifact = proofArtifactRecords[1];
    validationLog = proofArtifactRecords[2] as ArtifactRefRecord;
    worker = workerResultFromCodexExecSmoke(context, codexExecSmoke);
    finalOutput = worker.final_output;
  } else {
    const jsonl = await readFile(path.join(root, "fixtures/codex-jsonl/success.jsonl"), "utf8");
    const jsonlArtifact = artifacts.add("artifact_mcr_800_codex_jsonl", "log", jsonl);
    validationLog = artifacts.add(
      "artifact_mcr_800_validation_log",
      "log",
      "contracts passed",
      context.validationLogUri,
    );
    finalOutput = await createFinalOutput(root, context);
    finalOutputArtifact = artifacts.add(
      "artifact_mcr_800_final_output",
      "report",
      JSON.stringify(finalOutput),
    );
    proofArtifactRecords = [jsonlArtifact, finalOutputArtifact, validationLog];
    worker = runFakeCodexWorker({
      jsonl,
      jsonl_artifact_ref: jsonlArtifact.uri,
      final_output: finalOutput,
      final_output_artifact_ref: finalOutputArtifact.uri,
      forbidden_paths: [".env*", "secrets/**"],
    });
  }

  if (worker.status !== "success") {
    transition(
      context,
      store,
      "running",
      worker.status === "blocked" ? "needs_human_input" : "worker_failed",
      worker.status === "blocked" ? "human_input.requested" : "worker.failed",
      "worker",
    );

    return {
      snapshot_path: input.snapshotPath,
      route,
      policy_decision: policyDecision,
      work_cell: workCell.work_cell,
      worker,
      codex_exec_smoke: codexExecSmoke,
      prs: [],
    };
  }

  if (!finalOutput || !finalOutputArtifact) {
    throw new Error("successful worker result requires final output artifacts");
  }

  const proofBuild = createProofFromWorkerArtifacts({
    proof_id: context.proofId,
    task_id: context.taskId,
    run_id: context.runId,
    trace_id: context.traceId,
    created_at: context.now,
    capability: route.capability.id,
    forbidden_paths: [".env*", "secrets/**"],
    worktree: {
      path: workCell.work_cell.worktree.path,
      branch: workCell.work_cell.worktree.branch,
      base_branch: workCell.work_cell.worktree.base_branch,
      base_sha: workCell.work_cell.worktree.base_sha,
      head_sha: context.baseSha,
      cleanup_status: "kept_for_review",
    },
    artifacts: proofArtifactRecords.map(toProofArtifact),
    worker_result: worker,
  });

  if (!proofBuild.ok) {
    throw new Error(proofBuild.reason);
  }

  transition(
    context,
    store,
    "running",
    "artifact_submitted",
    "artifact.submitted",
    "worker",
    { artifact_ref: finalOutputArtifact.artifact_id },
  );
  transition(
    context,
    store,
    "artifact_submitted",
    "proof_submitted",
    "proof.submitted",
    "worker",
    { artifact_ref: finalOutputArtifact.artifact_id, proof_ref: context.proofId },
  );
  transition(
    context,
    store,
    "proof_submitted",
    "verifying",
    "verification.started",
    "verifier",
    { proof_ref: context.proofId },
  );

  const ledger = createInMemoryProofLedger();
  const appended = ledger.append(proofBuild.proof, {
    expected: {
      task_id: context.taskId,
      run_id: context.runId,
      trace_id: context.traceId,
    },
    changed_files: finalOutput.files_changed,
  });

  if (!appended.ok) {
    throw new Error(appended.reason);
  }

  const proofVerification = verifyProof({
    proof: proofBuild.proof,
    expected: {
      task_id: context.taskId,
      run_id: context.runId,
      trace_id: context.traceId,
    },
  });

  transition(
    context,
    store,
    "verifying",
    "waiting_approval",
    "approval.requested",
    "runtime",
    { proof_ref: context.proofId },
  );

  const approvalProjectionResult = createRuntimeApprovalProjection({
    approval_id: context.approvalId,
    task_id: context.taskId,
    proof_id: context.proofId,
    run_id: context.runId,
    trace_id: context.traceId,
    action: "create_pr",
    target: prTarget,
    requested_at: "2026-06-29T10:03:00.000Z",
    expires_at: "2026-06-29T11:00:00.000Z",
    risk_notes: proofBuild.proof.risk_notes,
    rollback_notes: proofBuild.proof.rollback_notes,
    validation_summary: proofBuild.proof.validation.map((validation) => ({
      command: validation.command,
      status: validation.status,
      exit_code: validation.exit_code,
    })),
  });

  if (!approvalProjectionResult.ok) {
    throw new Error(approvalProjectionResult.reason);
  }

  const approvalProjection = approvalProjectionResult.projection;
  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00.000Z"),
    verified_proof_ids: new Set([context.proofId]),
  });
  const githubAdapter = input.github_pr_adapter
    ? createRuntimeOwnedGitHubPrAdapter({
        enabled: input.github_pr_adapter.enabled,
        approvalGate,
        runner: input.github_pr_adapter.runner,
        now: () => new Date("2026-06-29T10:05:00.000Z"),
      })
    : createFakeGitHubPrAdapter({ approvalGate });
  const pullRequest = input.github_pr_adapter
    ? runtimeOwnedGitHubPrRequest(context, proofBuild.proof, input.github_pr_adapter)
    : {
        task_id: context.taskId,
        proof: proofBuild.proof,
        target: prTarget,
        title: context.title,
        requested_at: "2026-06-29T10:05:00.000Z",
      };
  const approvalBeforeGrant = await githubAdapter.createPullRequest(pullRequest as never);
  const approvalIntake = createRuntimeApprovalIntake({
    now: () => new Date("2026-06-29T10:05:00.000Z"),
  });
  const approvalIntakeResult = approvalIntake.accept(approvalProjection, {
    approval_id: context.approvalId,
    task_id: context.taskId,
    proof_id: context.proofId,
    run_id: context.runId,
    action: "create_pr",
    actor: { type: "human" as const, id: "@lead:carpet.test" },
    target: prTarget,
    approved_at: "2026-06-29T10:04:00.000Z",
  });
  const approvalGrant = approvalIntakeResult.ok
    ? approvalGate.grant(approvalIntakeResult.approval)
    : approvalIntakeResult;

  if (!approvalGrant.ok) {
    throw new Error(approvalGrant.reason);
  }

  transition(
    context,
    store,
    "waiting_approval",
    "approved",
    "approval.granted",
    "human",
    { proof_ref: context.proofId, approval_ref: context.approvalId },
  );

  const approvalAfterGrant = await githubAdapter.createPullRequest(pullRequest as never);

  if (!approvalAfterGrant.ok) {
    throw new Error(approvalAfterGrant.reason);
  }

  const prArtifact = artifacts.add(
    "artifact_mcr_800_simulated_pr",
    "pr",
    JSON.stringify(approvalAfterGrant.pr),
    prArtifactUri(context, approvalAfterGrant.pr),
  );

  transition(
    context,
    store,
    "approved",
    "pr_created",
    "github.pr.create_requested",
    "runtime",
    { proof_ref: context.proofId, approval_ref: context.approvalId },
  );
  transition(context, store, "pr_created", "completed", "task.completed", "runtime", {
    artifact_ref: prArtifact.artifact_id,
    proof_ref: context.proofId,
    approval_ref: context.approvalId,
  });

  const memoryProposal = createMemoryProposal({
    proof: proofBuild.proof,
    verified_proof_ids: new Set([context.proofId]),
    lesson: {
      reusable: true,
      scope: "Carpet MCR runtime orchestrator",
      statement: "Runtime orchestrator CLI composes fake adapters before real services.",
      evidence_ref: validationLog.uri,
      review_target: "memory://carpet/mcr",
      confidence: "medium",
    },
    proposal_id: context.memoryProposalId,
    event_id: context.memoryProposalEventId,
    created_at: context.now,
    workspace_id: context.workspaceId,
  });
  const snapshot = exportRuntimeStoreSnapshot(store, {
    store_id: context.storeId,
    created_at: context.now,
    proof_refs: [
      proofRef(
        context,
        proofBuild.proof,
        validationLog.uri,
        proofArtifactRecords.map((artifact) => artifact.artifact_id),
      ),
    ],
    approval_refs: [approvalRef(context)],
    artifact_refs: artifacts.records(),
  });

  await writeRuntimeStoreSnapshotFile(input.snapshotPath, snapshot);
  const readSnapshot = await readRuntimeStoreSnapshotFile(input.snapshotPath);

  return {
    snapshot_path: input.snapshotPath,
    snapshot,
    read_snapshot: readSnapshot,
    route,
    policy_decision: policyDecision,
    work_cell: workCell.work_cell,
    worker,
    codex_exec_smoke: codexExecSmoke,
    proof_verification: proofVerification,
    approval_projection: approvalProjection,
    approval_intake: approvalIntakeResult,
    approval_before_grant: approvalBeforeGrant,
    approval_grant: approvalGrant,
    approval_after_grant: approvalAfterGrant,
    prs: githubAdapter.listPullRequests(),
    memory_proposal: memoryProposal,
  };
}

export function proveMainCheckoutWorkCellRejected() {
  return createWorkCell({
    task_id: "task_mcr_800_main_checkout_rejection",
    run_id: "run_mcr_800_main_checkout_rejection",
    trace_id: "trace_mcr_800_main_checkout_rejection",
    capability: "repo.patch.codex",
    task_card_id: "MCR-800",
    slug: "runtime-orchestrator-cli",
    base_branch: "main",
    base_sha: baseSha,
    policy_decision: {
      decision: "allow",
      policy_id: "policy.repo_patch.v1",
      reason: "test rejection after policy allow",
      errors: [],
    },
    worktree_manager: mainCheckoutWorktreeManager(),
  });
}

async function createFinalOutput(root: string, context: RuntimeOrchestratorContext) {
  const fixture = JSON.parse(
    await readFile(path.join(root, "fixtures/codex/valid/repo-patch-result.valid.json"), "utf8"),
  ) as Record<string, unknown>;

  return {
    ...fixture,
    task_id: context.taskId,
    run_id: context.runId,
    root_cause: `${context.taskCardId} needs one Runtime-owned local entrypoint.`,
    changes_made: ["Added a local runtime orchestrator CLI."],
    files_changed: [
      { path: "apps/runtime-orchestrator/src/index.ts", action: "added" },
      { path: "apps/runtime-orchestrator/src/cli.ts", action: "added" },
      { path: "tests/e2e/runtime-orchestrator-cli.test.ts", action: "added" },
    ],
    commands_run: [
      {
        command: "pnpm test:contracts",
        exit_code: 0,
        summary: "Contract tests passed.",
        log_ref: context.validationLogUri,
      },
    ],
    validation_results: [
      {
        command: "pnpm test:contracts",
        exit_code: 0,
        status: "passed",
        summary: "Contract tests passed.",
        log_ref: context.validationLogUri,
      },
    ],
    diff_summary: {
      summary: "Add runtime orchestrator CLI composition glue.",
      files_added: 4,
      files_modified: 1,
      files_deleted: 0,
    },
    risk_notes: ["Default path uses fake/local adapters only."],
    rollback_notes: ["Remove apps/runtime-orchestrator and its e2e test."],
    security_notes: ["No external service call, credential access, or direct memory application."],
    memory_update_proposals: [
      {
        target: "memory://carpet/mcr",
        proposal: "Runtime orchestrator CLI composes fake adapters before real services.",
        evidence_ref: context.validationLogUri,
        requires_human_review: true,
      },
    ],
    ready_for_review: true,
  };
}

function runtimeOwnedGitHubPrRequest(
  context: RuntimeOrchestratorContext,
  proof: ProofLedgerEntry,
  adapter: RuntimeGitHubPrAdapter,
) {
  return {
    action: "create_pr",
    task_id: context.taskId,
    proof,
    target: prTarget,
    repository: adapter.repository,
    title: context.title,
    body_file: adapter.body_file,
    base_sha: adapter.base_sha,
    head_sha: adapter.head_sha,
    cleanup_status: adapter.cleanup_status,
    disposable_target: adapter.disposable_target,
    credential_scope: adapter.credential_scope,
    env: adapter.env,
    evidence_dir: adapter.evidence_dir,
    requested_at: "2026-06-29T10:05:00.000Z",
  };
}

function prArtifactUri(context: RuntimeOrchestratorContext, pr: Record<string, unknown>) {
  if (typeof pr.simulated_pr_id === "string") {
    return `github-pr://mcr-800/${pr.simulated_pr_id}`;
  }
  if (typeof pr.url === "string") {
    return `github-pr://${context.taskCardId.toLowerCase()}/${sanitizeRuntimeId(pr.url)}`;
  }

  return `github-pr://${context.taskCardId.toLowerCase()}/unknown`;
}

function recordCodexExecSmokeArtifacts(
  artifacts: ReturnType<typeof createArtifactRecorder>,
  result: CodexExecSmokeResult,
) {
  return [
    artifacts.add(
      "artifact_mcr_810_codex_exec_jsonl",
      "log",
      JSON.stringify({ ref: result.evidence_refs.jsonl }),
      result.evidence_refs.jsonl,
    ),
    artifacts.add(
      "artifact_mcr_810_codex_exec_final_output",
      "report",
      JSON.stringify({ ref: result.evidence_refs.final_output }),
      result.evidence_refs.final_output,
    ),
    artifacts.add(
      "artifact_mcr_810_codex_exec_validation_log",
      "log",
      JSON.stringify({ ref: result.evidence_refs.validation_log }),
      result.evidence_refs.validation_log,
    ),
    artifacts.add(
      "artifact_mcr_810_codex_exec_diff",
      "patch",
      JSON.stringify({ ref: result.evidence_refs.diff }),
      result.evidence_refs.diff,
    ),
    artifacts.add(
      "artifact_mcr_810_codex_exec_proof",
      "report",
      JSON.stringify({ ref: result.evidence_refs.proof }),
      result.evidence_refs.proof,
    ),
  ];
}

function workerResultFromCodexExecSmoke(
  context: RuntimeOrchestratorContext,
  result: CodexExecSmokeResult,
): WorkerRunnerResult {
  const artifact_refs = {
    jsonl: result.evidence_refs.jsonl,
    final_output: result.evidence_refs.final_output,
  };

  if (result.status !== "completed") {
    return {
      status: result.status === "failed" ? "failed" : "blocked",
      ready_for_review: false,
      needs_human_input: result.status === "blocked",
      reason: result.reason,
      code: result.code,
      errors: result.errors,
      artifact_refs,
      command_results: [],
    };
  }

  const command = "codex exec smoke";

  return {
    status: "success",
    ready_for_review: true,
    needs_human_input: false,
    reason: result.reason,
    code: "ok",
    errors: [],
    artifact_refs,
    command_results: [
      {
        command,
        exit_code: result.exit_code ?? 0,
        status: "passed",
      },
    ],
    final_output: {
      status: "success",
      task_id: context.taskId,
      run_id: context.runId,
      ready_for_review: true,
      files_changed: [],
      validation_results: [
        {
          command,
          exit_code: result.exit_code ?? 0,
          status: "passed",
          summary: "Injected Codex exec smoke runner completed.",
          log_ref: result.evidence_refs.validation_log,
        },
      ],
      diff_summary: {
        summary: "Runtime orchestrator invoked approved Codex exec smoke adapter.",
      },
      risk_notes: ["Codex exec smoke adapter remains explicit opt-in."],
      rollback_notes: ["Switch runtime orchestrator worker_adapter back to fake/default."],
    },
  };
}

function transition(
  context: RuntimeOrchestratorContext,
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
    task_id: context.taskId,
    expected_state: from,
    occurred_at: context.now,
    transition: {
      transition_id: `transition_${from}_to_${to}`,
      task_id: context.taskId,
      from,
      to,
      trigger_event: trigger,
      actor: { type: actor, id: `${actor}_${context.taskCardId.toLowerCase()}` },
      requirements: {
        artifact_ref: refs.artifact_ref ?? null,
        proof_ref: refs.proof_ref ?? null,
        approval_ref: refs.approval_ref ?? null,
      },
      audit_event: {
        type: `task.transition.${to}`,
        event_id: `event_${from}_to_${to}`,
        trace_id: context.traceId,
      },
    },
  });

  if (!result.ok) {
    throw new Error(result.message);
  }
}

function createArtifactRecorder(context: RuntimeOrchestratorContext) {
  const records: ArtifactRefRecord[] = [];

  return {
    add(
      artifact_id: string,
      kind: ArtifactRefRecord["kind"],
      content: string,
      uri = `artifact://mcr-800/${artifact_id}`,
    ) {
      const record: ArtifactRefRecord = {
        record_type: "artifact_ref",
        artifact_id,
        task_id: context.taskId,
        run_id: context.runId,
        kind,
        uri,
        sha256: createHash("sha256").update(content).digest("hex"),
        size_bytes: Buffer.byteLength(content),
        content_type: "application/json",
        created_at: context.now,
      };

      records.push(record);
      return record;
    },
    records() {
      return records.map((record) => ({ ...record }));
    },
  };
}

function toProofArtifact(record: ArtifactRefRecord): ProofArtifact {
  return {
    kind: record.kind === "pr" || record.kind === "object" ? "report" : record.kind,
    uri: record.uri,
    sha256: record.sha256,
  };
}

function proofRef(
  context: RuntimeOrchestratorContext,
  proof: ProofLedgerEntry,
  validationLogRef: string,
  artifactRefs = [
    "artifact_mcr_800_codex_jsonl",
    "artifact_mcr_800_final_output",
    "artifact_mcr_800_validation_log",
  ],
) {
  return {
    record_type: "proof_ref" as const,
    proof_id: proof.proof_id,
    task_id: proof.task_id,
    run_id: proof.run_id,
    trace_id: proof.trace_id,
    status: "verified" as const,
    ledger_uri: `proof://${context.taskCardId.toLowerCase()}/${proof.proof_id}`,
    artifact_refs: artifactRefs,
    validation_summary: {
      command_count: proof.validation.length,
      failed_count: proof.validation.filter((validation) => validation.status === "failed").length,
      log_refs: [validationLogRef],
    },
    created_at: proof.created_at,
    verified_at: context.now,
  };
}

function approvalRef(context: RuntimeOrchestratorContext) {
  return {
    record_type: "approval_ref" as const,
    approval_id: context.approvalId,
    task_id: context.taskId,
    proof_id: context.proofId,
    action: "create_pr" as const,
    status: "consumed" as const,
    actor: { type: "human" as const, id: "@lead:carpet.test" },
    target: prTarget,
    conditions: ["Create only the simulated PR record."],
    replay_key_hash: createHash("sha256")
      .update([context.taskId, context.runId, "create_pr", prTarget.ref, context.proofId].join(":"))
      .digest("hex"),
    created_at: "2026-06-29T10:04:00.000Z",
    expires_at: "2026-06-29T11:00:00.000Z",
    used_at: "2026-06-29T10:05:00.000Z",
  };
}

function mainCheckoutWorktreeManager(): WorktreeManager {
  return {
    createWorktree(request) {
      return {
        required: true,
        created_by: "runtime",
        base_branch: request.base_branch,
        base_sha: request.base_sha,
        branch: `mcr/${request.task_card_id}/${request.slug}`,
        path: ".",
        codex_cwd: "worktree_path",
        allow_main_checkout_edits: false,
        cleanup_policy: WORK_CELL_CLEANUP_POLICY,
      };
    },
  };
}
