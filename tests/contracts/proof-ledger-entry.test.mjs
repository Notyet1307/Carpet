import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const gatedActions = [
  "push_branch",
  "create_pr",
  "external_write",
  "secret_access",
  "memory_write",
];

const validApprovalFixtures = gatedActions.map((action) => ({
  action,
  fixture: `fixtures/proof/valid/approval.${action}.valid.json`,
}));

const invalidApprovalFixtures = [
  "fixtures/proof/invalid/approval.vague-task.invalid.json",
  "fixtures/proof/invalid/approval.missing-proof.invalid.json",
  "fixtures/proof/invalid/approval.missing-expiry.invalid.json",
  "fixtures/proof/invalid/approval.memory-write-missing-proposal.invalid.json",
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson("schemas/proof/proof-ledger-entry.schema.json"));
  ajv.addSchema(readJson("schemas/proof/approval.schema.json"));
  return ajv;
}

function approvalGateErrors({ action, taskId, proofId, approval, knownProofIds }) {
  const errors = [];

  if (!proofId || !knownProofIds.has(proofId)) {
    errors.push("missing proof reference");
  }

  if (!approval) {
    errors.push("missing approval");
    return errors;
  }

  if (approval.action !== action) {
    errors.push("approval action mismatch");
  }
  if (approval.task_id !== taskId) {
    errors.push("approval task mismatch");
  }
  if (approval.proof_id !== proofId) {
    errors.push("approval proof mismatch");
  }
  if (new Date(approval.expires_at) <= new Date(approval.created_at)) {
    errors.push("approval validity is not bounded after creation");
  }

  return errors;
}

test("approval schema accepts only action-scoped gated approvals", () => {
  const ajv = createAjv();
  const validateApproval = ajv.getSchema(
    "https://notyet.dev/schemas/proof/approval.schema.json",
  );

  assert.ok(validateApproval);
  assert.equal(
    ajv.validateSchema(readJson("schemas/proof/approval.schema.json")),
    true,
  );

  for (const { action, fixture } of validApprovalFixtures) {
    const approval = readJson(fixture);

    assert.equal(
      validateApproval(approval),
      true,
      `${fixture}: ${JSON.stringify(validateApproval.errors, null, 2)}`,
    );
    assert.equal(approval.action, action);
    assert.ok(new Date(approval.expires_at) > new Date(approval.created_at));
  }

  assert.deepEqual(
    validApprovalFixtures.map(({ action }) => action).sort(),
    gatedActions.toSorted(),
  );
});

test("approval schema rejects vague or proofless approvals", () => {
  const ajv = createAjv();
  const validateApproval = ajv.getSchema(
    "https://notyet.dev/schemas/proof/approval.schema.json",
  );

  for (const fixture of invalidApprovalFixtures) {
    const approval = readJson(fixture);

    assert.equal(validateApproval(approval), false, fixture);
  }
});

test("gated irreversible actions require proof and matching approval", () => {
  const proof = readJson("fixtures/proof/valid/proof-ledger-entry.valid.json");
  const knownProofIds = new Set([proof.proof_id]);

  for (const { action, fixture } of validApprovalFixtures) {
    const approval = readJson(fixture);
    const request = {
      action,
      taskId: approval.task_id,
      proofId: approval.proof_id,
      approval,
      knownProofIds,
    };

    assert.deepEqual(approvalGateErrors(request), []);
    assert.deepEqual(approvalGateErrors({ ...request, proofId: undefined }), [
      "missing proof reference",
      "approval proof mismatch",
    ]);
    assert.deepEqual(approvalGateErrors({ ...request, approval: undefined }), [
      "missing approval",
    ]);
    const otherAction = action === "create_pr" ? "push_branch" : "create_pr";
    assert.deepEqual(approvalGateErrors({ ...request, action: otherAction }), [
      "approval action mismatch",
    ]);
  }
});
