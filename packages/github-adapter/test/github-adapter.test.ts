import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";

import { createInMemoryApprovalGate } from "approval-gate";
import { createFakeGitHubPrAdapter, type PullRequestTarget } from "github-adapter";
import type { ProofLedgerEntry } from "proof-ledger";

const taskId = "task_mcr_510";
const proofId = "proof_mcr_510";
const now = "2026-06-29T10:00:00Z";
const target: PullRequestTarget = {
  type: "pull_request",
  ref: "refs/heads/mcr/MCR-510/fake-github-pr-adapter",
  base_ref: "refs/heads/main",
};

function proof(overrides: Partial<ProofLedgerEntry> = {}): ProofLedgerEntry {
  return {
    proof_id: proofId,
    task_id: taskId,
    run_id: "run_mcr_510",
    trace_id: "trace_mcr_510",
    created_at: now,
    capability: "repo.patch.codex",
    worktree: {
      path: "../.worktrees/Carpet/MCR-510-fake-github-pr-adapter",
      branch: "mcr/MCR-510/fake-github-pr-adapter",
      base_branch: "main",
      base_sha: "339dd075a2b450ac24ecb1f49bedcfbfa7847f3c",
      head_sha: "339dd075a2b450ac24ecb1f49bedcfbfa7847f3c",
      cleanup_status: "kept_for_review",
    },
    summary: "Add fake GitHub PR adapter.",
    artifacts: [
      {
        kind: "patch",
        uri: "artifact://mcr-510/diff.patch",
        sha256: "a".repeat(64),
      },
    ],
    validation: [
      {
        command: "pnpm --filter github-adapter test",
        exit_code: 0,
        status: "passed",
        log_ref: "artifact://mcr-510/github-adapter-test.log",
      },
    ],
    risk_notes: ["No GitHub network calls."],
    rollback_notes: ["Remove packages/github-adapter and approval PR flow test."],
    ...overrides,
  };
}

function approval() {
  return {
    approval_id: "approval_mcr_510",
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    actor: { type: "human", id: "@lead:matrix.local" },
    target,
    conditions: ["Create only the simulated PR record."],
    created_at: now,
    expires_at: "2026-06-29T11:00:00Z",
  };
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    task_id: taskId,
    proof: proof(),
    target,
    title: "MCR-510 Fake GitHub PR Adapter",
    requested_at: "2026-06-29T10:05:00Z",
    ...overrides,
  };
}

function approvedAdapter() {
  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00Z"),
    verified_proof_ids: new Set([proofId]),
  });

  equal(approvalGate.grant(approval()).ok, true);

  return createFakeGitHubPrAdapter({ approvalGate });
}

test("records no PR call before approval", () => {
  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00Z"),
    verified_proof_ids: new Set([proofId]),
  });
  const adapter = createFakeGitHubPrAdapter({ approvalGate });

  const result = adapter.createPullRequest(createRequest());

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "approval_required");
  }
  deepEqual(adapter.listPullRequests(), []);
});

test("records one simulated PR request after matching approval", () => {
  const adapter = approvedAdapter();

  const first = adapter.createPullRequest(createRequest());
  const second = adapter.createPullRequest(createRequest());

  equal(first.ok, true);
  equal(second.ok, true);
  deepEqual(adapter.listPullRequests().length, 1);
  if (first.ok && second.ok) {
    equal(second.pr.simulated_pr_id, first.pr.simulated_pr_id);
    equal(first.pr.task_id, taskId);
    equal(first.pr.proof_id, proofId);
    deepEqual(first.pr.target, target);
    deepEqual(first.pr.validation_summary, [
      {
        command: "pnpm --filter github-adapter test",
        status: "passed",
        exit_code: 0,
      },
    ]);
    equal(first.pr.risk_notes[0], "No GitHub network calls.");
    equal(
      first.pr.rollback_notes[0],
      "Remove packages/github-adapter and approval PR flow test.",
    );
    equal(first.pr.body.includes(taskId), true);
    equal(first.pr.body.includes(proofId), true);
  }
});

test("rejects proofless PR body and main-to-main target confusion", () => {
  const adapter = approvedAdapter();

  const prooflessBody = adapter.createPullRequest(
    createRequest({
      body: "Task task_mcr_510\nValidation passed\nRisk none\nRollback remove change",
    }),
  );

  equal(prooflessBody.ok, false);
  if (!prooflessBody.ok) {
    equal(prooflessBody.code, "proofless_pr_body");
  }

  const confusedTarget = adapter.createPullRequest(
    createRequest({
      target: {
        type: "pull_request",
        ref: "refs/heads/main",
        base_ref: "refs/heads/main",
      },
    }),
  );

  equal(confusedTarget.ok, false);
  if (!confusedTarget.ok) {
    equal(confusedTarget.code, "target_confusion");
  }
  deepEqual(adapter.listPullRequests(), []);
});

test("exposes no merge or branch push method", () => {
  const adapter = approvedAdapter() as Record<string, unknown>;

  equal("merge" in adapter, false);
  equal("mergePullRequest" in adapter, false);
  equal("pushBranch" in adapter, false);
});
