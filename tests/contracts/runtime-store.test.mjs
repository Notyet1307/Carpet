import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const schemaPath = "schemas/runtime/runtime-store.schema.json";
const validDir = "fixtures/runtime-store/valid";
const invalidDir = "fixtures/runtime-store/invalid";

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function fixtureFiles(relativeDir) {
  return readdirSync(path.join(root, relativeDir))
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(relativeDir, name))
    .sort();
}

function createValidator() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const schema = readJson(schemaPath);

  assert.equal(ajv.validateSchema(schema), true, JSON.stringify(ajv.errors, null, 2));
  ajv.addSchema(schema);

  return ajv.getSchema(schema.$id);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

test("runtime store schema accepts valid durable snapshots", () => {
  const validate = createValidator();
  const fixtures = fixtureFiles(validDir);

  assert.deepEqual(fixtures, ["fixtures/runtime-store/valid/minimal-store.valid.json"]);

  for (const fixture of fixtures) {
    const data = readJson(fixture);

    assert.equal(validate(data), true, `${fixture}: ${JSON.stringify(validate.errors, null, 2)}`);
    assert.equal(data.source_of_truth, "runtime");
  }
});

test("runtime store schema rejects unsafe inline records", () => {
  const validate = createValidator();
  const fixtures = fixtureFiles(invalidDir);

  assert.deepEqual(fixtures, [
    "fixtures/runtime-store/invalid/runtime-store.github-token.invalid.json",
    "fixtures/runtime-store/invalid/runtime-store.matrix-event-body.invalid.json",
    "fixtures/runtime-store/invalid/runtime-store.raw-diff.invalid.json",
    "fixtures/runtime-store/invalid/runtime-store.raw-log.invalid.json",
    "fixtures/runtime-store/invalid/runtime-store.secret.invalid.json",
  ]);

  for (const fixture of fixtures) {
    const data = readJson(fixture);

    assert.equal(validate(data), false, `${fixture} should be rejected`);
  }
});

test("minimal durable snapshot stores refs, not raw bodies or token material", () => {
  const snapshot = readJson("fixtures/runtime-store/valid/minimal-store.valid.json");
  const serialized = JSON.stringify(snapshot);

  assert.match(serialized, /artifact_demo/);
  assert.match(serialized, /proof_demo/);
  assert.match(serialized, /approval_demo/);
  assert.doesNotMatch(serialized, /raw_log|raw_diff|matrix_event_body|github_token|ghp_/i);
});

test("runtime store schema rejects unsafe strings inside safe text fields", () => {
  const validate = createValidator();
  const snapshot = readJson("fixtures/runtime-store/valid/minimal-store.valid.json");
  const cases = [
    {
      name: "raw diff header in idempotency operation",
      value: "diff --git a/secret b/secret",
      mutate(data) {
        data.idempotency_keys[0].operation = this.value;
      },
    },
    {
      name: "inline command output in idempotency operation",
      value: "pnpm test:contracts\nPASS tests/contracts/runtime-store.test.mjs",
      mutate(data) {
        data.idempotency_keys[0].operation = this.value;
      },
    },
    {
      name: "database url in approval condition",
      value: "DATABASE_URL=postgres://db.example/runtime",
      mutate(data) {
        data.approval_refs[0].conditions = [this.value];
      },
    },
  ];

  for (const mutation of cases) {
    const data = cloneJson(snapshot);

    mutation.mutate(data);

    assert.equal(validate(data), false, mutation.name);
  }
});
