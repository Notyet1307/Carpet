import assert from "node:assert/strict";
import test from "node:test";

import {
  decidePolicy,
  loadPolicy,
  loadPolicyFixture,
  type PolicyDecision,
} from "policy-engine";

const policy = loadPolicy(
  new URL("../../../runtime/policies/repo-patch.yaml", import.meta.url),
);

function fixture(name: string) {
  return loadPolicyFixture(
    new URL(`../../../fixtures/policy/${name}.yaml`, import.meta.url),
  );
}

function assertDecision(name: string) {
  const policyFixture = fixture(name);
  const decision = decidePolicy(policy, policyFixture.request);

  assert.equal(decision.decision, policyFixture.expected_decision);
  assert.equal(decision.policy_id, "policy.repo_patch.v1");
  assert.deepEqual(decision.errors, policyFixture.expected_errors);
  assert.equal(typeof decision.reason, "string");
  assert.ok(decision.reason.length > 0);
}

test("default decision is deny", () => {
  const decision = decidePolicy(policy, {
    task_id: "task_default_deny",
    run_id: "run_default_deny",
    capability_id: "repo.patch.codex",
    action: "repo:unknown",
    requested_at: "2026-06-28T02:00:00Z",
    target: {
      type: "worktree_file",
      path: "packages/policy-engine/src/policy-engine.ts",
      ref: "worktree://packages/policy-engine/src/policy-engine.ts",
    },
    artifact_refs: [],
  });

  assert.deepEqual(decision, {
    decision: "deny",
    policy_id: "policy.repo_patch.v1",
    reason: "default deny: no allow rule matched",
    errors: ["default deny: no allow rule matched"],
  } satisfies PolicyDecision);
});

test("local repo patch inside isolated worktree is allowed", () => {
  assertDecision("local-repo-patch.allowed");
});

test("external write without approval is denied", () => {
  assertDecision("external-write-missing-approval.denied");
});

test("fake proof is denied", () => {
  assertDecision("fake-proof.denied");
});

test("prompt injection is denied", () => {
  assertDecision("prompt-injection-policy-override.denied");
});

test("dangerous command is denied", () => {
  assertDecision("dangerous-command.denied");
});

test("production secret is denied", () => {
  assertDecision("production-secret.denied");
});

test("path traversal is denied", () => {
  assertDecision("path-traversal-artifact.denied");
});

test("approval replay is denied", () => {
  assertDecision("approval-replay.denied");
});

test("secret-bearing log is denied", () => {
  assertDecision("secret-log.denied");
});
