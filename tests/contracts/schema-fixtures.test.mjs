import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const schemas = [
  "schemas/matrix/event-envelope.schema.json",
  "schemas/matrix/task.created.schema.json",
  "schemas/matrix/task.accepted.schema.json",
  "schemas/matrix/task.rejected.schema.json",
  "schemas/matrix/capability.selected.schema.json",
  "schemas/matrix/proof.submitted.schema.json",
  "schemas/matrix/verification.completed.schema.json",
  "schemas/matrix/approval.requested.schema.json",
  "schemas/matrix/approval.granted.schema.json",
  "schemas/matrix/approval.denied.schema.json",
  "schemas/matrix/memory.update.proposed.schema.json",
  "schemas/matrix/incident.created.schema.json",
  "schemas/matrix/worker.dispatched.schema.json",
  "schemas/matrix/worker.progress.schema.json",
  "schemas/matrix/artifact.submitted.schema.json",
  "schemas/runtime/work-cell.schema.json",
  "schemas/proof/proof-ledger-entry.schema.json",
  "schemas/codex/repo-patch-result.schema.json",
];

const fixtureCases = [
  {
    name: "event envelope valid",
    schema: "https://notyet.dev/schemas/matrix/event-envelope.schema.json",
    fixture: "fixtures/matrix-events/valid/event-envelope.valid.json",
    valid: true,
  },
  {
    name: "event envelope missing trace id",
    schema: "https://notyet.dev/schemas/matrix/event-envelope.schema.json",
    fixture: "fixtures/matrix-events/invalid/event-envelope.missing-trace-id.invalid.json",
    valid: false,
  },
  {
    name: "task created valid",
    schema: "https://notyet.dev/schemas/matrix/task.created.schema.json",
    fixture: "fixtures/matrix-events/valid/task.created.valid.json",
    valid: true,
  },
  {
    name: "task created empty goal",
    schema: "https://notyet.dev/schemas/matrix/task.created.schema.json",
    fixture: "fixtures/matrix-events/invalid/task.created.empty-goal.invalid.json",
    valid: false,
  },
  {
    name: "task accepted valid",
    schema: "https://notyet.dev/schemas/matrix/task.accepted.schema.json",
    fixture: "fixtures/matrix-events/valid/task.accepted.valid.json",
    valid: true,
  },
  {
    name: "task accepted missing task id",
    schema: "https://notyet.dev/schemas/matrix/task.accepted.schema.json",
    fixture: "fixtures/matrix-events/invalid/task.accepted.missing-task-id.invalid.json",
    valid: false,
  },
  {
    name: "task rejected valid",
    schema: "https://notyet.dev/schemas/matrix/task.rejected.schema.json",
    fixture: "fixtures/matrix-events/valid/task.rejected.valid.json",
    valid: true,
  },
  {
    name: "task rejected empty reason",
    schema: "https://notyet.dev/schemas/matrix/task.rejected.schema.json",
    fixture: "fixtures/matrix-events/invalid/task.rejected.empty-reason.invalid.json",
    valid: false,
  },
  {
    name: "capability selected valid",
    schema: "https://notyet.dev/schemas/matrix/capability.selected.schema.json",
    fixture: "fixtures/matrix-events/valid/capability.selected.valid.json",
    valid: true,
  },
  {
    name: "capability selected empty selection reason",
    schema: "https://notyet.dev/schemas/matrix/capability.selected.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/capability.selected.empty-selection-reason.invalid.json",
    valid: false,
  },
  {
    name: "capability selected missing version",
    schema: "https://notyet.dev/schemas/matrix/capability.selected.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/capability.selected.missing-version.invalid.json",
    valid: false,
  },
  {
    name: "proof submitted valid",
    schema: "https://notyet.dev/schemas/matrix/proof.submitted.schema.json",
    fixture: "fixtures/matrix-events/valid/proof.submitted.valid.json",
    valid: true,
  },
  {
    name: "proof submitted empty proof id",
    schema: "https://notyet.dev/schemas/matrix/proof.submitted.schema.json",
    fixture: "fixtures/matrix-events/invalid/proof.submitted.empty-proof-id.invalid.json",
    valid: false,
  },
  {
    name: "proof submitted missing artifact refs",
    schema: "https://notyet.dev/schemas/matrix/proof.submitted.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/proof.submitted.missing-artifact-refs.invalid.json",
    valid: false,
  },
  {
    name: "proof submitted missing validation summary",
    schema: "https://notyet.dev/schemas/matrix/proof.submitted.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/proof.submitted.missing-validation-summary.invalid.json",
    valid: false,
  },
  {
    name: "proof submitted empty artifact refs",
    schema: "https://notyet.dev/schemas/matrix/proof.submitted.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/proof.submitted.empty-artifact-refs.invalid.json",
    valid: false,
  },
  {
    name: "proof submitted raw proof logs",
    schema: "https://notyet.dev/schemas/matrix/proof.submitted.schema.json",
    fixture: "fixtures/matrix-events/invalid/proof.submitted.raw-proof-logs.invalid.json",
    valid: false,
  },
  {
    name: "verification completed valid",
    schema: "https://notyet.dev/schemas/matrix/verification.completed.schema.json",
    fixture: "fixtures/matrix-events/valid/verification.completed.valid.json",
    valid: true,
  },
  {
    name: "verification completed invalid result",
    schema: "https://notyet.dev/schemas/matrix/verification.completed.schema.json",
    fixture: "fixtures/matrix-events/invalid/verification.completed.invalid-result.invalid.json",
    valid: false,
  },
  {
    name: "verification completed raw validation logs",
    schema: "https://notyet.dev/schemas/matrix/verification.completed.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/verification.completed.raw-validation-logs.invalid.json",
    valid: false,
  },
  {
    name: "approval requested valid",
    schema: "https://notyet.dev/schemas/matrix/approval.requested.schema.json",
    fixture: "fixtures/matrix-events/valid/approval.requested.valid.json",
    valid: true,
  },
  {
    name: "approval requested ambiguous action",
    schema: "https://notyet.dev/schemas/matrix/approval.requested.schema.json",
    fixture: "fixtures/matrix-events/invalid/approval.requested.ambiguous-action.invalid.json",
    valid: false,
  },
  {
    name: "approval requested wrong actor",
    schema: "https://notyet.dev/schemas/matrix/approval.requested.schema.json",
    fixture: "fixtures/matrix-events/invalid/approval.requested.wrong-actor.invalid.json",
    valid: false,
  },
  {
    name: "approval granted valid",
    schema: "https://notyet.dev/schemas/matrix/approval.granted.schema.json",
    fixture: "fixtures/matrix-events/valid/approval.granted.valid.json",
    valid: true,
  },
  {
    name: "approval granted missing proof id",
    schema: "https://notyet.dev/schemas/matrix/approval.granted.schema.json",
    fixture: "fixtures/matrix-events/invalid/approval.granted.missing-proof-id.invalid.json",
    valid: false,
  },
  {
    name: "approval granted wrong actor",
    schema: "https://notyet.dev/schemas/matrix/approval.granted.schema.json",
    fixture: "fixtures/matrix-events/invalid/approval.granted.wrong-actor.invalid.json",
    valid: false,
  },
  {
    name: "approval denied valid",
    schema: "https://notyet.dev/schemas/matrix/approval.denied.schema.json",
    fixture: "fixtures/matrix-events/valid/approval.denied.valid.json",
    valid: true,
  },
  {
    name: "approval denied empty reason",
    schema: "https://notyet.dev/schemas/matrix/approval.denied.schema.json",
    fixture: "fixtures/matrix-events/invalid/approval.denied.empty-reason.invalid.json",
    valid: false,
  },
  {
    name: "approval denied wrong actor",
    schema: "https://notyet.dev/schemas/matrix/approval.denied.schema.json",
    fixture: "fixtures/matrix-events/invalid/approval.denied.wrong-actor.invalid.json",
    valid: false,
  },
  {
    name: "memory update proposed valid",
    schema: "https://notyet.dev/schemas/matrix/memory.update.proposed.schema.json",
    fixture: "fixtures/matrix-events/valid/memory.update.proposed.valid.json",
    valid: true,
  },
  {
    name: "memory update proposed live write",
    schema: "https://notyet.dev/schemas/matrix/memory.update.proposed.schema.json",
    fixture: "fixtures/matrix-events/invalid/memory.update.proposed.live-write.invalid.json",
    valid: false,
  },
  {
    name: "memory update proposed wrong actor",
    schema: "https://notyet.dev/schemas/matrix/memory.update.proposed.schema.json",
    fixture: "fixtures/matrix-events/invalid/memory.update.proposed.wrong-actor.invalid.json",
    valid: false,
  },
  {
    name: "incident created valid",
    schema: "https://notyet.dev/schemas/matrix/incident.created.schema.json",
    fixture: "fixtures/matrix-events/valid/incident.created.valid.json",
    valid: true,
  },
  {
    name: "incident created missing incident id",
    schema: "https://notyet.dev/schemas/matrix/incident.created.schema.json",
    fixture: "fixtures/matrix-events/invalid/incident.created.missing-incident-id.invalid.json",
    valid: false,
  },
  {
    name: "incident created raw inbound event body",
    schema: "https://notyet.dev/schemas/matrix/incident.created.schema.json",
    fixture: "fixtures/matrix-events/invalid/incident.created.raw-inbound-event-body.invalid.json",
    valid: false,
  },
  {
    name: "worker dispatched valid",
    schema: "https://notyet.dev/schemas/matrix/worker.dispatched.schema.json",
    fixture: "fixtures/matrix-events/valid/worker.dispatched.valid.json",
    valid: true,
  },
  {
    name: "worker dispatched main checkout path",
    schema: "https://notyet.dev/schemas/matrix/worker.dispatched.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/worker.dispatched.main-checkout-path.invalid.json",
    valid: false,
  },
  {
    name: "worker progress valid",
    schema: "https://notyet.dev/schemas/matrix/worker.progress.schema.json",
    fixture: "fixtures/matrix-events/valid/worker.progress.valid.json",
    valid: true,
  },
  {
    name: "worker progress invalid status",
    schema: "https://notyet.dev/schemas/matrix/worker.progress.schema.json",
    fixture: "fixtures/matrix-events/invalid/worker.progress.invalid-status.invalid.json",
    valid: false,
  },
  {
    name: "worker progress raw stdout",
    schema: "https://notyet.dev/schemas/matrix/worker.progress.schema.json",
    fixture: "fixtures/matrix-events/invalid/worker.progress.raw-stdout.invalid.json",
    valid: false,
  },
  {
    name: "worker progress percent too high",
    schema: "https://notyet.dev/schemas/matrix/worker.progress.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/worker.progress.percent-too-high.invalid.json",
    valid: false,
  },
  {
    name: "artifact submitted valid",
    schema: "https://notyet.dev/schemas/matrix/artifact.submitted.schema.json",
    fixture: "fixtures/matrix-events/valid/artifact.submitted.valid.json",
    valid: true,
  },
  {
    name: "artifact submitted missing artifact ref",
    schema: "https://notyet.dev/schemas/matrix/artifact.submitted.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/artifact.submitted.missing-artifact-ref.invalid.json",
    valid: false,
  },
  {
    name: "artifact submitted raw diff body",
    schema: "https://notyet.dev/schemas/matrix/artifact.submitted.schema.json",
    fixture:
      "fixtures/matrix-events/invalid/artifact.submitted.raw-diff-body.invalid.json",
    valid: false,
  },
  {
    name: "work cell valid",
    schema: "https://notyet.dev/schemas/runtime/work-cell.schema.json",
    fixture: "fixtures/runtime/valid/work-cell.valid.json",
    valid: true,
  },
  {
    name: "work cell main checkout edit denied",
    schema: "https://notyet.dev/schemas/runtime/work-cell.schema.json",
    fixture: "fixtures/runtime/invalid/work-cell.allows-main-checkout.invalid.json",
    valid: false,
  },
  {
    name: "proof ledger entry valid",
    schema: "https://notyet.dev/schemas/proof/proof-ledger-entry.schema.json",
    fixture: "fixtures/proof/valid/proof-ledger-entry.valid.json",
    valid: true,
  },
  {
    name: "proof ledger entry missing validation",
    schema: "https://notyet.dev/schemas/proof/proof-ledger-entry.schema.json",
    fixture: "fixtures/proof/invalid/proof-ledger-entry.missing-validation.invalid.json",
    valid: false,
  },
  {
    name: "proof ledger entry missing worktree",
    schema: "https://notyet.dev/schemas/proof/proof-ledger-entry.schema.json",
    fixture: "fixtures/proof/invalid/proof-ledger-entry.missing-worktree.invalid.json",
    valid: false,
  },
  {
    name: "codex repo patch result valid",
    schema: "https://notyet.dev/schemas/codex/repo-patch-result.schema.json",
    fixture: "fixtures/codex/valid/repo-patch-result.valid.json",
    valid: true,
  },
  {
    name: "codex repo patch result missing summary",
    schema: "https://notyet.dev/schemas/codex/repo-patch-result.schema.json",
    fixture: "fixtures/codex/invalid/repo-patch-result.missing-summary.invalid.json",
    valid: false,
  },
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  for (const schemaPath of schemas) {
    ajv.addSchema(readJson(schemaPath));
  }

  return ajv;
}

test("schema files are valid JSON Schemas", () => {
  const ajv = createAjv();

  for (const schemaPath of schemas) {
    const schema = readJson(schemaPath);
    assert.equal(ajv.validateSchema(schema), true, schemaPath);
  }
});

test("fixtures match their declared schemas", () => {
  const ajv = createAjv();

  for (const fixtureCase of fixtureCases) {
    const validate = ajv.getSchema(fixtureCase.schema);
    assert.ok(validate, `schema not registered: ${fixtureCase.schema}`);

    const data = readJson(fixtureCase.fixture);
    const actual = validate(data);

    assert.equal(
      actual,
      fixtureCase.valid,
      `${fixtureCase.name}: ${JSON.stringify(validate.errors, null, 2)}`,
    );
  }
});
