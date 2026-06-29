import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createRuntimeApprovalIntake,
  createRuntimeApprovalProjection,
  runRuntimeOrchestrator,
  runRuntimeOrchestratorFromMatrixEvent,
  proveMainCheckoutWorkCellRejected,
} from "../../apps/runtime-orchestrator/src/index.ts";
import {
  createFixtureTransactionHandler,
  FakeRuntimeEventQueue,
  IdempotencyStore,
} from "../../apps/matrix-appservice/src/transaction-handler.ts";
import { readRuntimeStoreSnapshotFile } from "../../packages/runtime-store/src/index.ts";
import { loadJsonFile } from "../../packages/runtime-contracts/src/index.ts";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const mainCheckoutPath = "/Users/yet/Test_drive_sales/Carpet";
const codexAdapterWorktreePath =
  "/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-810-approved-codex-exec-adapter";
const runId = "run_mcr_800_runtime_orchestrator_cli";
const proofId = "proof_mcr_800_runtime_orchestrator_cli";
const prTarget = {
  type: "pull_request",
  ref: "refs/heads/mcr/MCR-800/runtime-orchestrator-cli",
  base_ref: "refs/heads/main",
};

test("runtime orchestrator writes and reads a schema-valid local snapshot", async () => {
  const snapshotPath = tempSnapshotPath();
  const result = await runRuntimeOrchestrator({ repoRoot: root, snapshotPath });
  const written = await readRuntimeStoreSnapshotFile(snapshotPath);

  assert.equal(result.snapshot_path, snapshotPath);
  assert.deepEqual(result.read_snapshot, result.snapshot);
  assert.deepEqual(written, result.snapshot);
  assert.equal(written.source_of_truth, "runtime");
  assert.equal(written.tasks[0]?.state, "completed");
  assert.deepEqual(
    written.task_transitions.map((transition) => transition.to),
    [
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
    ],
  );
  assert.equal(result.route.ok, true);
  assert.equal(result.policy_decision.decision, "allow");
  assert.equal(result.worker.status, "success");
  assert.equal(result.proof_verification.ok, true);
  assert.equal(result.approval_before_grant.ok, false);
  if (!result.approval_before_grant.ok) {
    assert.equal(result.approval_before_grant.code, "approval_required");
  }
  assert.equal(result.approval_projection.proof_id, proofId);
  assert.equal(result.approval_projection.action, "create_pr");
  assert.equal(result.approval_projection.run_id, runId);
  assert.equal(result.approval_projection.expires_at, "2026-06-29T11:00:00.000Z");
  assert.deepEqual(result.approval_projection.target, prTarget);
  assert.deepEqual(result.approval_projection.rollback_notes, [
    "Remove apps/runtime-orchestrator and its e2e test.",
  ]);
  assert.deepEqual(result.approval_projection.risk_notes, [
    "Default path uses fake/local adapters only.",
  ]);
  assert.equal(result.approval_projection.source_of_truth, "runtime");
  assert.deepEqual(unsafeProjectionKeys(result.approval_projection), []);
  assert.equal(result.approval_intake.ok, true);
  assert.equal(result.approval_grant.ok, true);
  assert.equal(result.approval_after_grant.ok, true);
  assert.equal(result.prs.length, 1);
  assert.equal("simulated_pr_id" in result.prs[0], true);
  assert.equal("url" in result.prs[0], false);
  assert.equal(result.memory_proposal.ok, true);
  if (result.memory_proposal.ok) {
    assert.equal(result.memory_proposal.status, "proposed");
  }
  assert.equal(written.proof_refs[0]?.status, "verified");
  assert.equal(written.approval_refs[0]?.status, "consumed");
  assert.equal(written.artifact_refs.some((artifact) => artifact.kind === "pr"), true);
});

test("runtime approval intake accepts only the same proof, action, run, and target once", () => {
  const projectionResult = createRuntimeApprovalProjection({
    approval_id: "approval_mcr_830",
    task_id: "task_mcr_830",
    proof_id: "proof_mcr_830",
    run_id: "run_mcr_830",
    trace_id: "trace_mcr_830",
    action: "create_pr",
    target: {
      type: "pull_request",
      ref: "refs/heads/mcr/MCR-830/runtime-approval-projection-intake",
      base_ref: "refs/heads/main",
    },
    requested_at: "2026-06-29T10:00:00.000Z",
    expires_at: "2026-06-29T11:00:00.000Z",
    risk_notes: ["Fake GitHub adapter only."],
    rollback_notes: ["Remove runtime approval projection helper."],
    validation_summary: [
      { command: "pnpm --filter runtime-orchestrator test", status: "passed", exit_code: 0 },
    ],
  });

  assert.equal(projectionResult.ok, true);
  if (!projectionResult.ok) {
    return;
  }

  const projection = projectionResult.projection;
  const validApproval = {
    approval_id: "approval_mcr_830",
    task_id: "task_mcr_830",
    proof_id: "proof_mcr_830",
    run_id: "run_mcr_830",
    action: "create_pr",
    actor: { type: "human", id: "@lead:carpet.test" },
    target: projection.target,
    approved_at: "2026-06-29T10:05:00.000Z",
  };

  for (const [name, approval, code] of [
    ["vague approval", { ...validApproval, action: "task.approve" }, "vague_approval"],
    ["wrong proof", { ...validApproval, proof_id: "proof_other" }, "approval_mismatch"],
    ["wrong action", { ...validApproval, action: "push_branch" }, "forbidden_action"],
    ["wrong run", { ...validApproval, run_id: "run_other" }, "approval_mismatch"],
    [
      "wrong target",
      {
        ...validApproval,
        target: {
          type: "pull_request",
          ref: "refs/heads/mcr/MCR-830/other",
          base_ref: "refs/heads/main",
        },
      },
      "approval_mismatch",
    ],
    ["merge", { ...validApproval, action: "merge" }, "forbidden_action"],
    ["deploy", { ...validApproval, action: "deploy" }, "forbidden_action"],
    ["live memory", { ...validApproval, action: "memory_write" }, "forbidden_action"],
  ] as const) {
    const intake = createRuntimeApprovalIntake({
      now: () => new Date("2026-06-29T10:05:00.000Z"),
    });
    const result = intake.accept(projection, approval);

    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.code, code, name);
    }
  }

  const expired = createRuntimeApprovalIntake({
    now: () => new Date("2026-06-29T11:00:01.000Z"),
  }).accept(projection, validApproval);

  assert.equal(expired.ok, false);
  if (!expired.ok) {
    assert.equal(expired.code, "approval_expired");
  }

  const intake = createRuntimeApprovalIntake({
    now: () => new Date("2026-06-29T10:05:00.000Z"),
  });
  const accepted = intake.accept(projection, validApproval);

  assert.equal(accepted.ok, true);
  if (accepted.ok) {
    assert.equal(accepted.approval.proof_id, "proof_mcr_830");
    assert.equal(accepted.approval.action, "create_pr");
    assert.deepEqual(accepted.approval.target, projection.target);
    assert.equal(accepted.approval.expires_at, projection.expires_at);
  }

  const replay = intake.accept(projection, validApproval);

  assert.equal(replay.ok, false);
  if (!replay.ok) {
    assert.equal(replay.code, "approval_replayed");
  }
});

test("runtime approval projection rejects unsafe summaries before Matrix boundary", () => {
  for (const [name, overrides] of [
    [
      "raw diff risk note",
      { risk_notes: ["diff --git a/secret b/secret"] },
    ],
    [
      "token rollback note",
      { rollback_notes: ["GITHUB_TOKEN=ghp_abcd"] },
    ],
    [
      "unsafe validation command",
      {
        validation_summary: [
          { command: "cat .env && echo SECRET=1", status: "passed", exit_code: 0 },
        ],
      },
    ],
    [
      "bad exit code",
      {
        validation_summary: [
          {
            command: "pnpm --filter runtime-orchestrator test",
            status: "passed",
            exit_code: 999,
          },
        ],
      },
    ],
    [
      "bad validation status",
      {
        validation_summary: [
          {
            command: "pnpm --filter runtime-orchestrator test",
            status: "green",
            exit_code: 0,
          },
        ],
      },
    ],
    [
      "Matrix raw event body",
      { risk_notes: ["raw_inbound_event_body: {\"content\":{\"body\":\"approve\"}}"] },
    ],
  ] as const) {
    const result = createRuntimeApprovalProjection({
      ...validApprovalProjectionInput(),
      ...overrides,
    });

    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.code, "invalid_projection", name);
    }
  }
});

test("runtime approval intake rejects invalid approved_at before approval gate", () => {
  const projectionResult = createRuntimeApprovalProjection(validApprovalProjectionInput());

  assert.equal(projectionResult.ok, true);
  if (!projectionResult.ok) {
    return;
  }

  const result = createRuntimeApprovalIntake({
    now: () => new Date("2026-06-29T10:05:00.000Z"),
  }).accept(projectionResult.projection, {
    approval_id: "approval_mcr_830",
    task_id: "task_mcr_830",
    proof_id: "proof_mcr_830",
    run_id: "run_mcr_830",
    action: "create_pr",
    actor: { type: "human", id: "@lead:carpet.test" },
    target: projectionResult.projection.target,
    approved_at: "not-a-date",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "invalid_approval");
  }
});

test("runtime orchestrator accepts one queued Matrix runtime event into a Runtime-owned snapshot", async () => {
  const snapshotPath = tempSnapshotPath();
  const { handler, queue } = buildMatrixHandler("success");

  const outcome = handler.handle(readMatrixFixture("success").request);
  assert.equal(outcome.runtimeEvents.length, 1);
  assert.equal(queue.events.length, 1);

  const result = await runRuntimeOrchestratorFromMatrixEvent({
    repoRoot: root,
    snapshotPath,
    runtimeEvent: outcome.runtimeEvents[0],
  });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  const written = await readRuntimeStoreSnapshotFile(snapshotPath);

  assert.deepEqual(written, result.snapshot);
  assert.equal(written.source_of_truth, "runtime");
  assert.equal(written.tasks[0]?.task_id, "task_matrix_success_001");
  assert.equal(written.tasks[0]?.trace_id, "trace_matrix_success_001");
  assert.equal(written.tasks[0]?.workspace_id, "ws_carpet");
  assert.equal(
    written.tasks[0]?.source_matrix_event_ref,
    "matrix-event://txn_success_001/event_success_001",
  );
  assert.equal(result.worker.status, "success");
  assert.equal(result.proof_verification.ok, true);
});

test("Matrix ingress rejection paths produce no runtime orchestrator work", () => {
  for (const name of [
    "invalid-hs-token",
    "invalid-schema",
    "duplicate-transaction",
    "duplicate-event",
    "unknown-room",
  ]) {
    const { handler, queue } = buildMatrixHandler(name);
    const outcome = handler.handle(readMatrixFixture(name).request);

    assert.equal(outcome.runtimeEvents.length, 0, name);
    assert.equal(queue.events.length, 0, name);
  }
});

test("runtime orchestrator rejects spoofed Matrix actor data before task state", async () => {
  const snapshotPath = tempSnapshotPath();
  const { handler } = buildMatrixHandler("spoofed-actor");
  const outcome = handler.handle(readMatrixFixture("spoofed-actor").request);

  assert.equal(outcome.runtimeEvents.length, 1);

  const result = await runRuntimeOrchestratorFromMatrixEvent({
    repoRoot: root,
    snapshotPath,
    runtimeEvent: outcome.runtimeEvents[0],
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "actor_spoof_rejected");
  }
  assert.equal(existsSync(snapshotPath), false);
});

test("runtime orchestrator opt-in Codex smoke adapter uses injected runner and persists evidence refs", async () => {
  const snapshotPath = tempSnapshotPath();
  const calls: unknown[] = [];
  const result = await runRuntimeOrchestrator({
    repoRoot: root,
    snapshotPath,
    worker_adapter: {
      type: "codex_exec_smoke",
      worktree_path: codexAdapterWorktreePath,
      main_checkout_path: mainCheckoutPath,
      prompt_file: ".mcr/runs/run_mcr_810/task.md",
      evidence_dir: "artifact://mcr-810/codex-exec-smoke",
      smoke: true,
      manual_approval: {
        approved: true,
        approver: "yet",
        run_id: "run_mcr_800_runtime_orchestrator_cli",
        scope: "codex_exec_smoke",
      },
      credential_scope: "disposable",
      env: { PATH: "/usr/bin:/bin" },
      process_runner: async (command) => {
        calls.push(command);
        return { exit_code: 0, stdout: "{\"type\":\"turn.completed\"}\n", stderr: "" };
      },
    },
  });
  const written = await readRuntimeStoreSnapshotFile(snapshotPath);

  assert.equal(calls.length, 1);
  assert.equal(result.codex_exec_smoke?.status, "completed");
  assert.equal(result.codex_exec_smoke?.executed, true);
  assert.equal(result.worker.status, "success");
  assert.equal(result.proof_verification.ok, true);
  assert.equal(written.proof_refs[0]?.status, "verified");
  assert.ok(
    written.artifact_refs.some(
      (artifact) =>
        artifact.uri === "artifact://mcr-810/codex-exec-smoke/codex-exec.jsonl",
    ),
  );
  assert.deepEqual(written, result.snapshot);
});

test("runtime orchestrator opt-in GitHub PR adapter uses injected runner after proof and approval", async () => {
  const snapshotPath = tempSnapshotPath();
  const token = "fake-runtime-disposable-token";
  const calls: unknown[] = [];
  const result = await runRuntimeOrchestrator({
    repoRoot: root,
    snapshotPath,
    github_pr_adapter: {
      enabled: true,
      repository: "Notyet1307/github-pr-smoke-sandbox",
      disposable_target: { kind: "repository" },
      credential_scope: "disposable",
      env: { GH_TOKEN: token },
      evidence_dir: "artifact://mcr-840/runtime-github-pr",
      body_file: ".mcr/runs/run_mcr_800_runtime_orchestrator_cli/pr-body.md",
      base_sha: "b".repeat(40),
      head_sha: "c".repeat(40),
      cleanup_status: "not_started",
      runner: async (command: unknown) => {
        calls.push(command);
        return {
          exit_code: 0,
          stdout: "https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/3\n",
          stderr: "",
        };
      },
    },
  } as Parameters<typeof runRuntimeOrchestrator>[0]);

  assert.equal(calls.length, 1);
  assert.equal(result.approval_before_grant.ok, false);
  if (!result.approval_before_grant.ok) {
    assert.equal(result.approval_before_grant.code, "approval_required");
  }
  assert.equal(result.approval_grant.ok, true);
  assert.equal(result.approval_after_grant.ok, true);
  assert.equal(result.prs.length, 1);
  assert.equal(result.prs[0]?.url, "https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/3");
  assert.equal(result.prs[0]?.approval_id, "approval_mcr_800_runtime_orchestrator_cli");
  assert.equal(result.prs[0]?.base_sha, "b".repeat(40));
  assert.equal(result.prs[0]?.head_sha, "c".repeat(40));
  assert.equal(result.prs[0]?.cleanup_status, "not_started");
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("runtime orchestrator Codex smoke adapter blocks without approval before runner execution", async () => {
  const snapshotPath = tempSnapshotPath();
  let calls = 0;
  const result = await runRuntimeOrchestrator({
    repoRoot: root,
    snapshotPath,
    worker_adapter: {
      type: "codex_exec_smoke",
      worktree_path: codexAdapterWorktreePath,
      main_checkout_path: mainCheckoutPath,
      prompt_file: ".mcr/runs/run_mcr_810/task.md",
      evidence_dir: "artifact://mcr-810/codex-exec-smoke",
      smoke: true,
      credential_scope: "disposable",
      env: { PATH: "/usr/bin:/bin" },
      process_runner: async () => {
        calls += 1;
        return { exit_code: 0, stdout: "", stderr: "" };
      },
    },
  });

  assert.equal(calls, 0);
  assert.equal(result.codex_exec_smoke?.status, "blocked");
  assert.equal(result.codex_exec_smoke?.executed, false);
  assert.equal(result.codex_exec_smoke?.code, "manual_approval_required");
  assert.equal(result.worker.status, "blocked");
});

test("runtime orchestrator Codex smoke adapter blocks unsafe cwd or secret env before runner execution", async () => {
  for (const unsafe of [
    {
      name: "main checkout cwd",
      worktree_path: mainCheckoutPath,
      env: { PATH: "/usr/bin:/bin" },
      code: "main_checkout_cwd_rejected",
    },
    {
      name: "secret env",
      worktree_path: codexAdapterWorktreePath,
      env: { PATH: "/usr/bin:/bin", OPENAI_API_KEY: "sk-proj-not-for-smoke" },
      code: "secret_env_rejected",
    },
  ]) {
    const snapshotPath = tempSnapshotPath();
    let calls = 0;
    const result = await runRuntimeOrchestrator({
      repoRoot: root,
      snapshotPath,
      worker_adapter: {
        type: "codex_exec_smoke",
        worktree_path: unsafe.worktree_path,
        main_checkout_path: mainCheckoutPath,
        prompt_file: ".mcr/runs/run_mcr_810/task.md",
        evidence_dir: "artifact://mcr-810/codex-exec-smoke",
        smoke: true,
        manual_approval: {
          approved: true,
          approver: "yet",
          run_id: "run_mcr_800_runtime_orchestrator_cli",
          scope: "codex_exec_smoke",
        },
        credential_scope: "disposable",
        env: unsafe.env,
        process_runner: async () => {
          calls += 1;
          return { exit_code: 0, stdout: "", stderr: "" };
        },
      },
    });

    assert.equal(calls, 0, unsafe.name);
    assert.equal(result.codex_exec_smoke?.status, "blocked", unsafe.name);
    assert.equal(result.codex_exec_smoke?.executed, false, unsafe.name);
    assert.equal(result.codex_exec_smoke?.code, unsafe.code, unsafe.name);
    assert.equal(result.worker.status, "blocked", unsafe.name);
  }
});

test("runtime orchestrator CLI writes a caller-provided snapshot path", async () => {
  const snapshotPath = tempSnapshotPath();
  const cli = spawnSync(
    process.execPath,
    [
      "--disable-warning=ExperimentalWarning",
      "apps/runtime-orchestrator/src/cli.ts",
      "--snapshot",
      snapshotPath,
    ],
    { cwd: root, encoding: "utf8" },
  );

  assert.equal(cli.status, 0, cli.stderr);
  const summary = JSON.parse(cli.stdout) as {
    snapshot_path: string;
    task_id: string;
    task_state: string;
    transition_count: number;
    proof_status: string;
    approval_status: string;
    pr_count: number;
    memory_status: string;
  };
  const written = await readRuntimeStoreSnapshotFile(snapshotPath);

  assert.equal(summary.snapshot_path, snapshotPath);
  assert.equal(summary.task_state, "completed");
  assert.equal(summary.transition_count, 14);
  assert.equal(summary.proof_status, "verified");
  assert.equal(summary.approval_status, "consumed");
  assert.equal(summary.pr_count, 1);
  assert.equal(summary.memory_status, "proposed");
  assert.equal(written.tasks[0]?.task_id, summary.task_id);
});

test("runtime orchestrator proves main-checkout work cells remain rejected", () => {
  const rejection = proveMainCheckoutWorkCellRejected();

  assert.equal(rejection.ok, false);
  if (!rejection.ok) {
    assert.equal(rejection.code, "main_checkout_path");
  }
});

function tempSnapshotPath(): string {
  return path.join(
    mkdtempSync(path.join(tmpdir(), "mcr-800-runtime-orchestrator-")),
    "runtime-store.snapshot.json",
  );
}

function validApprovalProjectionInput() {
  return {
    approval_id: "approval_mcr_830",
    task_id: "task_mcr_830",
    proof_id: "proof_mcr_830",
    run_id: "run_mcr_830",
    trace_id: "trace_mcr_830",
    action: "create_pr",
    target: {
      type: "pull_request",
      ref: "refs/heads/mcr/MCR-830/runtime-approval-projection-intake",
      base_ref: "refs/heads/main",
    },
    requested_at: "2026-06-29T10:00:00.000Z",
    expires_at: "2026-06-29T11:00:00.000Z",
    risk_notes: ["Fake GitHub adapter only."],
    rollback_notes: ["Remove runtime approval projection helper."],
    validation_summary: [
      { command: "pnpm --filter runtime-orchestrator test", status: "passed", exit_code: 0 },
    ],
  };
}

function unsafeProjectionKeys(value: unknown): string[] {
  const unsafe = new Set([
    "diff_body",
    "raw_diff_body",
    "raw_inbound_event_body",
    "raw_proof_logs",
    "raw_stderr",
    "raw_stdout",
    "raw_validation_logs",
    "stderr",
    "stdout",
    "validation_logs",
    "token",
    "secret",
  ]);
  const keys: string[] = [];

  collectUnsafeProjectionKeys(value, unsafe, keys);

  return keys;
}

function collectUnsafeProjectionKeys(
  value: unknown,
  unsafe: Set<string>,
  keys: string[],
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectUnsafeProjectionKeys(item, unsafe, keys);
    }
    return;
  }
  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (unsafe.has(key)) {
      keys.push(key);
    }
    collectUnsafeProjectionKeys(child, unsafe, keys);
  }
}

function readMatrixFixture(name: string) {
  return loadJsonFile(
    path.join(root, "fixtures/matrix-transactions", `${name}.json`),
  ) as MatrixTransactionFixture;
}

function buildMatrixHandler(name: string) {
  const fixture = readMatrixFixture(name);
  const queue = new FakeRuntimeEventQueue();
  const handler = createFixtureTransactionHandler({
    idempotencyStore: new IdempotencyStore(fixture.preexisting),
    runtimeEventQueue: queue,
  });

  return { handler, queue };
}

type MatrixTransactionFixture = {
  preexisting?: {
    processed_transaction_ids?: string[];
    processed_event_ids?: string[];
  };
  request: {
    params: { txn_id: string };
    headers: { authorization?: string };
    body: {
      events: unknown[];
    };
  };
};
