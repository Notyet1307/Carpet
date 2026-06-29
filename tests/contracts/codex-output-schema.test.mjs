import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const schemaId = "https://notyet.dev/schemas/codex/repo-patch-result.schema.json";
const smokeSchemaId =
  "https://notyet.dev/schemas/codex/codex-exec-smoke-result.schema.json";
const codexCliDisallowedKeywords = new Set([
  "allOf",
  "if",
  "then",
  "contains",
  "not",
]);

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson("schemas/codex/repo-patch-result.schema.json"));
  ajv.addSchema(readJson("schemas/codex/codex-exec-smoke-result.schema.json"));
  return ajv;
}

function findDisallowedKeywords(value, location = "$") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findDisallowedKeywords(item, `${location}[${index}]`),
    );
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childLocation = `${location}.${key}`;
    const current = codexCliDisallowedKeywords.has(key) ? [childLocation] : [];
    return current.concat(findDisallowedKeywords(child, childLocation));
  });
}

function baseResult(overrides = {}) {
  return {
    status: "success",
    task_id: "task_p6_codex_worker_contract",
    run_id: "run_p6_success",
    root_cause: "The previous worker contract did not encode terminal states.",
    changes_made: ["Added a Codex output schema contract."],
    files_changed: [
      {
        path: "schemas/codex/repo-patch-result.schema.json",
        action: "modified",
      },
    ],
    commands_run: [
      {
        command: "pnpm test:contracts",
        exit_code: 0,
        summary: "Contract tests passed.",
      },
    ],
    validation_results: [
      {
        command: "pnpm test:contracts",
        exit_code: 0,
        status: "passed",
        summary: "Contract tests passed.",
      },
    ],
    diff_summary: {
      summary: "One schema updated.",
      files_added: 0,
      files_modified: 1,
      files_deleted: 0,
    },
    risk_notes: ["No runtime code changed."],
    rollback_notes: ["Revert the contract baseline patch."],
    security_notes: ["No secrets or external writes were used."],
    blockers: [],
    memory_update_proposals: [],
    ready_for_review: true,
    ...overrides,
  };
}

function baseSmokeResult(overrides = {}) {
  const { root_cause, memory_update_proposals, ...result } = baseResult();
  void root_cause;
  void memory_update_proposals;
  return {
    ...result,
    ...overrides,
  };
}

test("repo patch result schema is a valid JSON Schema", () => {
  const ajv = createAjv();

  assert.equal(
    ajv.validateSchema(readJson("schemas/codex/repo-patch-result.schema.json")),
    true,
  );
});

test("codex exec smoke schema is valid and avoids Codex CLI-disallowed keywords", () => {
  const smokeSchema = readJson("schemas/codex/codex-exec-smoke-result.schema.json");
  const ajv = createAjv();

  assert.equal(ajv.validateSchema(smokeSchema), true);
  assert.deepEqual(findDisallowedKeywords(smokeSchema), []);
});

test("codex exec smoke schema accepts the smoke handoff fields", () => {
  const validate = createAjv().getSchema(smokeSchemaId);

  assert.equal(validate(baseSmokeResult()), true, JSON.stringify(validate.errors, null, 2));
  assert.equal(
    validate(
      baseSmokeResult({
        validation_results: [
          {
            command: "pnpm test:contracts",
            status: "passed",
            summary: "Contract tests passed.",
          },
        ],
      }),
    ),
    false,
    "smoke validation evidence without exit_code must reject",
  );
});

test("success requires validation evidence with exit code", () => {
  const validate = createAjv().getSchema(schemaId);

  assert.equal(validate(baseResult()), true, JSON.stringify(validate.errors, null, 2));

  assert.equal(
    validate(baseResult({ validation_results: [] })),
    false,
    "success without validation evidence must reject",
  );
  assert.equal(
    validate(
      baseResult({
        validation_results: [
          {
            command: "pnpm test:contracts",
            status: "passed",
            summary: "Contract tests passed.",
          },
        ],
      }),
    ),
    false,
    "success validation evidence without exit_code must reject",
  );
});

test("ready for review requires successful validation evidence", () => {
  const validate = createAjv().getSchema(schemaId);
  const result = baseResult({
    commands_run: [
      {
        command: "pnpm test:contracts",
        exit_code: 1,
        summary: "Contract tests failed.",
      },
    ],
    validation_results: [
      {
        command: "pnpm test:contracts",
        exit_code: 1,
        status: "failed",
        summary: "Contract tests failed.",
      },
    ],
    ready_for_review: true,
  });

  assert.equal(validate(result), false);
  assert.equal(
    validate(
      baseResult({
        validation_results: [
          {
            command: "node --test tests/contracts/codex-output-schema.test.mjs",
            exit_code: 0,
            status: "passed",
            summary: "Schema tests passed.",
          },
          {
            command: "pnpm test:contracts",
            exit_code: 1,
            status: "failed",
            summary: "Full contract suite failed.",
          },
        ],
      }),
    ),
    false,
    "success cannot include failed validation results",
  );
});

test("failed and blocked outputs cannot masquerade as review-ready success", () => {
  const validate = createAjv().getSchema(schemaId);

  for (const status of ["failed", "blocked"]) {
    assert.equal(
      validate(
        baseResult({
          status,
          blockers: ["Validation did not pass."],
          ready_for_review: true,
        }),
      ),
      false,
      status,
    );
  }
});

test("blocked and needs-human-input outputs carry blockers and are not review ready", () => {
  const validate = createAjv().getSchema(schemaId);

  for (const status of ["blocked", "needs_human_input"]) {
    assert.equal(
      validate(
        baseResult({
          status,
          validation_results: [],
          blockers: ["Required worktree path is missing."],
          ready_for_review: false,
        }),
      ),
      true,
      JSON.stringify(validate.errors, null, 2),
    );
  }
});
