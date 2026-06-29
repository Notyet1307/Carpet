import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  runRuntimeOrchestrator,
  proveMainCheckoutWorkCellRejected,
} from "../../apps/runtime-orchestrator/src/index.ts";
import { readRuntimeStoreSnapshotFile } from "../../packages/runtime-store/src/index.ts";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

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
  assert.equal(result.approval_grant.ok, true);
  assert.equal(result.approval_after_grant.ok, true);
  assert.equal(result.prs.length, 1);
  assert.equal(result.memory_proposal.ok, true);
  if (result.memory_proposal.ok) {
    assert.equal(result.memory_proposal.status, "proposed");
  }
  assert.equal(written.proof_refs[0]?.status, "verified");
  assert.equal(written.approval_refs[0]?.status, "consumed");
  assert.equal(written.artifact_refs.some((artifact) => artifact.kind === "pr"), true);
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
