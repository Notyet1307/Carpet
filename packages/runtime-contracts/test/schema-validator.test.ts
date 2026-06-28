import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createSchemaValidator,
  loadJsonFile,
  loadJsonSchema,
} from "runtime-contracts";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

function fromRoot(relativePath: string) {
  return path.join(root, relativePath);
}

test("validates the event envelope fixture", () => {
  const schema = loadJsonSchema(
    fromRoot("schemas/matrix/event-envelope.schema.json"),
  );
  const fixture = loadJsonFile(
    fromRoot("fixtures/matrix-events/valid/event-envelope.valid.json"),
  );

  const validate = createSchemaValidator(schema);

  assert.deepEqual(validate(fixture), { valid: true, errors: [] });
});

test("returns readable errors for an invalid event envelope fixture", () => {
  const schema = loadJsonSchema(
    fromRoot("schemas/matrix/event-envelope.schema.json"),
  );
  const fixture = loadJsonFile(
    fromRoot(
      "fixtures/matrix-events/invalid/event-envelope.missing-trace-id.invalid.json",
    ),
  );

  const validate = createSchemaValidator(schema);
  const result = validate(fixture);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /trace_id/);
});

test("reuses compiled validators by schema id", () => {
  const schema = loadJsonSchema(
    fromRoot("schemas/matrix/event-envelope.schema.json"),
  );

  assert.strictEqual(createSchemaValidator(schema), createSchemaValidator(schema));
});
