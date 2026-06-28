import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";

import { createInMemoryApprovalGate } from "approval-gate";

const taskId = "task_mcr_500";
const proofId = "proof_mcr_500";
const createdAt = "2026-06-28T14:00:00Z";
const expiresAt = "2026-06-28T15:00:00Z";
const prTarget = {
  type: "pull_request",
  ref: "refs/heads/mcr/MCR-500/approval-gate",
  base_ref: "refs/heads/main",
};

function approval(overrides: Record<string, unknown> = {}) {
  return {
    approval_id: "approval_mcr_500",
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    actor: {
      type: "human",
      id: "@lead:matrix.local",
    },
    target: prTarget,
    conditions: ["Use the proof-backed branch only."],
    created_at: createdAt,
    expires_at: expiresAt,
    ...overrides,
  };
}

function createPrRequest(overrides: Record<string, unknown> = {}) {
  return {
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    target: prTarget,
    requested_at: "2026-06-28T14:05:00Z",
    ...overrides,
  };
}

function gate() {
  return createInMemoryApprovalGate({
    now: () => new Date("2026-06-28T14:05:00Z"),
    verified_proof_ids: new Set([proofId]),
  });
}

test("blocks create_pr before matching approval", () => {
  const approvalGate = gate();

  const result = approvalGate.authorize(createPrRequest());

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "approval_required");
  }
});

test("accepts one human action-scoped approval and rejects replay", () => {
  const approvalGate = gate();

  deepEqual(approvalGate.grant(approval()), {
    ok: true,
    approval_id: "approval_mcr_500",
  });

  const first = approvalGate.authorize(createPrRequest());

  equal(first.ok, true);
  if (first.ok) {
    deepEqual(first, {
      ok: true,
      approval_id: "approval_mcr_500",
      action: "create_pr",
      target: prTarget,
    });
  }

  const replay = approvalGate.authorize(createPrRequest());

  equal(replay.ok, false);
  if (!replay.ok) {
    equal(replay.code, "approval_replayed");
  }
});

test("requires task id, proof id, action, and target to match", () => {
  const approvalGate = gate();

  equal(approvalGate.grant(approval()).ok, true);

  const mismatches = [
    createPrRequest({ task_id: "task_other" }),
    createPrRequest({ proof_id: "proof_other" }),
    createPrRequest({ action: "push_branch" }),
    createPrRequest({
      target: {
        type: "pull_request",
        ref: "refs/heads/mcr/MCR-500/other",
        base_ref: "refs/heads/main",
      },
    }),
  ];

  for (const mismatch of mismatches) {
    equal(approvalGate.authorize(mismatch).ok, false);
  }

  equal(approvalGate.authorize(createPrRequest()).ok, true);
});

test("rejects proofless, vague, wrong-actor, and expired approvals", () => {
  const approvalGate = gate();
  const proofless = approval();
  delete proofless.proof_id;

  const invalidApprovals = [
    proofless,
    approval({ action: "task.approve" }),
    approval({ actor: { type: "runtime", id: "runtime" } }),
    approval({ expires_at: "2026-06-28T14:04:59Z" }),
  ];

  for (const invalidApproval of invalidApprovals) {
    equal(approvalGate.grant(invalidApproval).ok, false);
  }
});

test("approval with unknown proof_id cannot unlock create_pr", () => {
  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-28T14:05:00Z"),
    verified_proof_ids: new Set([proofId]),
  });
  const fakeProofApproval = approval({
    approval_id: "approval_fake_proof",
    proof_id: "proof_not_in_ledger",
  });
  const fakeProofRequest = createPrRequest({ proof_id: "proof_not_in_ledger" });

  const grant = approvalGate.grant(fakeProofApproval);

  equal(grant.ok, false);
  if (!grant.ok) {
    equal(grant.code, "unverified_proof");
  }

  const authorize = approvalGate.authorize(fakeProofRequest);

  equal(authorize.ok, false);
  if (!authorize.ok) {
    equal(authorize.code, "unverified_proof");
  }
});

test("treats denial and timeout as terminal outcomes for that action", () => {
  let now = new Date("2026-06-28T14:05:00Z");
  const approvalGate = createInMemoryApprovalGate({
    now: () => now,
    verified_proof_ids: new Set([proofId]),
  });

  equal(
    approvalGate.deny({
      task_id: taskId,
      proof_id: proofId,
      action: "create_pr",
      target: prTarget,
      actor: { type: "human", id: "@lead:matrix.local" },
      denied_at: "2026-06-28T14:05:00Z",
      reason: "Needs another reviewer.",
    }).ok,
    true,
  );

  const denied = approvalGate.authorize(createPrRequest());

  equal(denied.ok, false);
  if (!denied.ok) {
    equal(denied.code, "approval_denied");
  }

  const expiringGate = createInMemoryApprovalGate({
    now: () => now,
    verified_proof_ids: new Set([proofId]),
  });
  equal(expiringGate.grant(approval()).ok, true);
  now = new Date("2026-06-28T15:00:01Z");

  const expired = expiringGate.authorize(createPrRequest());

  equal(expired.ok, false);
  if (!expired.ok) {
    equal(expired.code, "approval_expired");
  }
});

test("never allows merge, deploy, secret access, or memory write", () => {
  const approvalGate = gate();

  for (const action of ["merge", "deploy", "secret_access", "memory_write"]) {
    const result = approvalGate.authorize(createPrRequest({ action }));

    equal(result.ok, false);
    if (!result.ok) {
      equal(result.code, "forbidden_action");
    }
  }
});
