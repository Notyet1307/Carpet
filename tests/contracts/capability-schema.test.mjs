import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const capabilitySchemaId = "https://notyet.dev/schemas/runtime/capability.schema.json";

const mvpCapabilityIds = [
  "spec.scope",
  "repo.patch.codex",
  "ci.recovery",
  "test.run",
  "proof.verify",
  "memory.propose",
  "security.review",
  "release.notes",
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readRegistry(relativePath = "runtime/capabilities.yaml") {
  return readJson(relativePath);
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson("schemas/runtime/capability.schema.json"));
  return ajv;
}

function registryCapabilityIds(registry) {
  return new Set(registry.capabilities.map((capability) => capability.id));
}

function capabilityIdFromRef(capabilityRef) {
  return capabilityRef.replace(/^capability\./, "").replace(/@v[0-9]+$/, "");
}

function workflowCapabilityRefs(workflowPath) {
  return readJson(workflowPath).nodes
    .map((node) => node.capability_ref)
    .filter(Boolean);
}

function capabilitiesForTaskType(registry, taskType) {
  return registry.capabilities.filter((capability) =>
    capability.task_types.includes(taskType),
  );
}

function capabilityById(registry, capabilityId) {
  return registry.capabilities.find((capability) => capability.id === capabilityId);
}

function readCapabilityPolicies() {
  const policies = [];
  let currentPolicy;
  let inCapabilityPolicies = false;
  let currentList;

  for (const line of readText("runtime/policies/default.yaml").split(/\r?\n/)) {
    if (line === "capability_policies:") {
      inCapabilityPolicies = true;
      continue;
    }
    if (!inCapabilityPolicies) {
      continue;
    }
    if (/^\S/.test(line)) {
      break;
    }

    const id = line.match(/^  - id: ([^\s]+)$/);
    if (id) {
      currentPolicy = { id: id[1] };
      policies.push(currentPolicy);
      currentList = undefined;
      continue;
    }

    const capabilityId = line.match(/^    capability_id: ([^\s]+)$/);
    if (capabilityId && currentPolicy) {
      currentPolicy.capability_id = capabilityId[1];
      currentList = undefined;
      continue;
    }

    const listName = line.match(/^    (allowed_permissions|denied_permissions):$/);
    if (listName && currentPolicy) {
      currentList = listName[1];
      currentPolicy[currentList] = [];
      continue;
    }

    const listItem = line.match(/^      - ([^\s]+)$/);
    if (listItem && currentPolicy && currentList) {
      currentPolicy[currentList].push(listItem[1]);
    }
  }

  return policies;
}

test("capability registry validates against schema", () => {
  const ajv = createAjv();
  const validateRegistry = ajv.getSchema(capabilitySchemaId);

  assert.equal(
    ajv.validateSchema(readJson("schemas/runtime/capability.schema.json")),
    true,
  );
  assert.equal(
    validateRegistry(readRegistry()),
    true,
    JSON.stringify(validateRegistry.errors, null, 2),
  );
});

test("all MVP capability ids exist", () => {
  const ids = registryCapabilityIds(readRegistry());

  for (const capabilityId of mvpCapabilityIds) {
    assert.equal(ids.has(capabilityId), true, capabilityId);
  }
});

test("workflow-referenced capabilities exist", () => {
  const ids = registryCapabilityIds(readRegistry());
  const refs = [
    ...workflowCapabilityRefs("runtime/workflows/repo-patch.yaml"),
    ...workflowCapabilityRefs("runtime/workflows/ci-recovery.yaml"),
  ];

  for (const capabilityRef of refs) {
    assert.equal(ids.has(capabilityIdFromRef(capabilityRef)), true, capabilityRef);
  }
});

test("implementation capabilities require isolated worktree", () => {
  const implementationCapabilities = readRegistry().capabilities.filter(
    (capability) => capability.worker_type === "codex_exec",
  );

  assert.ok(implementationCapabilities.length > 0);

  for (const capability of implementationCapabilities) {
    assert.equal(
      capability.execution?.requires_isolated_worktree,
      true,
      capability.id,
    );
    assert.equal(capability.execution?.worktree_created_by, "runtime", capability.id);
    assert.equal(capability.execution?.codex_cwd, "worktree_path", capability.id);
    assert.equal(capability.execution?.allow_main_checkout_edits, false, capability.id);
  }
});

test("security review is read-only", () => {
  const securityReview = capabilityById(readRegistry(), "security.review");
  const securityPolicy = readCapabilityPolicies().find(
    (policy) => policy.id === securityReview.policy_ref,
  );

  assert.ok(securityReview);
  assert.equal(securityReview.worker_type, "security_scanner");
  assert.deepEqual(securityReview.task_types, ["security_review"]);
  assert.equal(
    securityReview.permissions.allow.includes("repo:write_patch"),
    false,
  );
  assert.equal(securityReview.permissions.deny.includes("repo:write_patch"), true);
  assert.ok(securityPolicy);
  assert.equal(
    securityPolicy.denied_permissions.includes("repo:write_patch"),
    true,
  );
});

test("generic repository changes do not route to ci recovery", () => {
  const registry = readRegistry();
  const repoPatchPolicy = readCapabilityPolicies().find(
    (policy) => policy.id === "capability.repo.patch.codex.default",
  );

  for (const taskType of ["code_change", "test_change"]) {
    const matchingCapabilityIds = capabilitiesForTaskType(registry, taskType).map(
      (capability) => capability.id,
    );

    assert.equal(
      matchingCapabilityIds.includes("ci.recovery"),
      false,
      taskType,
    );
    assert.equal(
      matchingCapabilityIds.includes("repo.patch.codex"),
      true,
      taskType,
    );
  }

  assert.deepEqual(capabilityById(registry, "ci.recovery").task_types, [
    "ci_recovery",
  ]);
  assert.equal(
    repoPatchPolicy.denied_permissions.includes("repo:write_patch"),
    false,
  );
});

test("high-risk and external-action capabilities require proof and human gate", () => {
  const gatedCapabilities = readRegistry().capabilities.filter(
    (capability) =>
      capability.risk_level === "high" || capability.worker_type === "external_action",
  );

  assert.ok(gatedCapabilities.length > 0);

  for (const capability of gatedCapabilities) {
    assert.equal(capability.proof_required, true, capability.id);
    assert.equal(capability.human_gate.required, true, capability.id);
    assert.equal(
      typeof capability.verifier.capability_ref,
      "string",
      capability.id,
    );
  }
});

test("capability policy references resolve in default policy", () => {
  const policies = readCapabilityPolicies();
  const policiesById = new Map(policies.map((policy) => [policy.id, policy]));

  assert.equal(policiesById.size, policies.length);

  for (const capability of readRegistry().capabilities) {
    const policy = policiesById.get(capability.policy_ref);

    assert.ok(policy, capability.policy_ref);
    assert.equal(policy.capability_id, capability.id, capability.id);
  }
});

test("capability fixtures validate and invalid proof policy fixture rejects", () => {
  const ajv = createAjv();
  const validateRegistry = ajv.getSchema(capabilitySchemaId);

  assert.equal(
    validateRegistry(readRegistry("fixtures/capabilities/valid/capability-registry.valid.yaml")),
    true,
    JSON.stringify(validateRegistry.errors, null, 2),
  );

  assert.equal(
    validateRegistry(
      readRegistry("fixtures/capabilities/invalid/capability-registry.missing-verifier.invalid.yaml"),
    ),
    false,
  );
  assert.deepEqual(
    validateRegistry.errors.map(({ instancePath, keyword, params }) => ({
      instancePath,
      keyword,
      params,
    })),
    [
      {
        instancePath: "/capabilities/0",
        keyword: "required",
        params: { missingProperty: "verifier" },
      },
    ],
  );
});

test("capability artifacts avoid hierarchy language", () => {
  const text = [
    readText("runtime/capabilities.yaml"),
    readText("fixtures/capabilities/valid/capability-registry.valid.yaml"),
    readText("fixtures/capabilities/invalid/capability-registry.missing-verifier.invalid.yaml"),
    readText("docs/analysis/capability-routing.md"),
  ]
    .join("\n")
    .toLowerCase();

  for (const forbidden of ["department", "squad", "company", "org chart"]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});
