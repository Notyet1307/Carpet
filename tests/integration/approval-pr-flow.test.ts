import { equal } from "node:assert/strict";
import test from "node:test";

import { createInMemoryApprovalGate } from "../../packages/approval-gate/src/index.ts";
import { createFakeGitHubPrAdapter } from "../../packages/github-adapter/src/index.ts";
import {
  createInMemoryProofLedger,
  createProofFromWorkerArtifacts,
} from "../../packages/proof-ledger/src/index.ts";

test("approval PR flow records a simulated PR only after verified proof and matching approval", () => {
  const proof = createProofFromWorkerArtifacts({
    proof_id: "proof_mcr_510_flow",
    task_id: "task_mcr_510_flow",
    run_id: "run_mcr_510_flow",
    trace_id: "trace_mcr_510_flow",
    created_at: "2026-06-29T10:00:00Z",
    capability: "repo.patch.codex",
    forbidden_paths: [".env*", "production/**"],
    worktree: {
      path: "../.worktrees/Carpet/MCR-510-fake-github-pr-adapter",
      branch: "mcr/MCR-510/fake-github-pr-adapter",
      base_branch: "main",
      base_sha: "339dd075a2b450ac24ecb1f49bedcfbfa7847f3c",
      head_sha: "339dd075a2b450ac24ecb1f49bedcfbfa7847f3c",
      cleanup_status: "kept_for_review",
    },
    artifacts: [
      {
        kind: "patch",
        uri: "artifact://mcr-510-flow/diff.patch",
        sha256: "b".repeat(64),
      },
      {
        kind: "report",
        uri: "artifact://mcr-510-flow/final-output.json",
        sha256: "c".repeat(64),
      },
      {
        kind: "log",
        uri: "artifact://mcr-510-flow/github-adapter-test.log",
        sha256: "d".repeat(64),
      },
    ],
    worker_result: {
      status: "success",
      ready_for_review: true,
      code: "ok",
      reason: "complete",
      errors: [],
      artifact_refs: {
        jsonl: "artifact://mcr-510-flow/diff.patch",
        final_output: "artifact://mcr-510-flow/final-output.json",
      },
      command_results: [
        {
          command: "pnpm --filter github-adapter test",
          exit_code: 0,
          status: "passed",
        },
      ],
      final_output: {
        status: "success",
        task_id: "task_mcr_510_flow",
        run_id: "run_mcr_510_flow",
        files_changed: [
          {
            path: "packages/github-adapter/src/fake-github-adapter.ts",
            action: "created",
          },
        ],
        validation_results: [
          {
            command: "pnpm --filter github-adapter test",
            exit_code: 0,
            status: "passed",
            summary: "github-adapter tests passed",
            log_ref: "artifact://mcr-510-flow/github-adapter-test.log",
          },
        ],
        diff_summary: {
          summary: "Add fake GitHub PR adapter.",
        },
        risk_notes: ["No real GitHub, push, merge, token, or deploy path."],
        rollback_notes: ["Remove packages/github-adapter and this integration test."],
        ready_for_review: true,
      },
    },
  });

  equal(proof.ok, true);
  if (!proof.ok) {
    return;
  }

  const ledger = createInMemoryProofLedger();
  equal(
    ledger.append(proof.proof, {
      expected: {
        task_id: "task_mcr_510_flow",
        run_id: "run_mcr_510_flow",
        trace_id: "trace_mcr_510_flow",
        forbidden_paths: [".env*", "production/**"],
      },
      changed_files: [
        {
          path: "packages/github-adapter/src/fake-github-adapter.ts",
        },
      ],
    }).ok,
    true,
  );

  const target = {
    type: "pull_request",
    ref: "refs/heads/mcr/MCR-510/fake-github-pr-adapter",
    base_ref: "refs/heads/main",
  };
  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00Z"),
    verified_proof_ids: new Set([proof.proof.proof_id]),
  });
  const adapter = createFakeGitHubPrAdapter({ approvalGate });

  const beforeApproval = adapter.createPullRequest({
    task_id: proof.proof.task_id,
    proof: proof.proof,
    target,
    title: "MCR-510 Fake GitHub PR Adapter",
    requested_at: "2026-06-29T10:05:00Z",
  });

  equal(beforeApproval.ok, false);
  equal(adapter.listPullRequests().length, 0);

  equal(
    approvalGate.grant({
      approval_id: "approval_mcr_510_flow",
      task_id: proof.proof.task_id,
      proof_id: proof.proof.proof_id,
      action: "create_pr",
      actor: { type: "human", id: "@lead:matrix.local" },
      target,
      conditions: ["Create only the simulated PR record."],
      created_at: "2026-06-29T10:04:00Z",
      expires_at: "2026-06-29T11:00:00Z",
    }).ok,
    true,
  );

  const afterApproval = adapter.createPullRequest({
    task_id: proof.proof.task_id,
    proof: proof.proof,
    target,
    title: "MCR-510 Fake GitHub PR Adapter",
    requested_at: "2026-06-29T10:05:00Z",
  });

  equal(afterApproval.ok, true);
  equal(adapter.listPullRequests().length, 1);
  if (afterApproval.ok) {
    equal(afterApproval.pr.proof_id, proof.proof.proof_id);
    equal(afterApproval.pr.body.includes("No real GitHub"), true);
    equal(afterApproval.pr.body.includes("Remove packages/github-adapter"), true);
  }
});
