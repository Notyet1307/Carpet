import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson("schemas/runtime/task-graph.schema.json"));
  return ajv;
}

function baseNode(id, kind, overrides = {}) {
  return {
    id,
    kind,
    required_inputs: [],
    produces: [],
    proof_required: false,
    approval_required: false,
    ...overrides,
  };
}

function validGraph(overrides = {}) {
  return {
    task_id: "task_demo",
    graph_id: "graph_demo",
    version: 1,
    state_source: "runtime",
    nodes: [
      baseNode("node_intake", "event_ingest", {
        event_ref: "event_task_created",
        produces: ["intent"],
      }),
      baseNode("node_scope", "runtime_decision", {
        required_inputs: ["intent"],
        produces: ["scope"],
      }),
      baseNode("node_patch", "capability_execution", {
        capability_ref: "capability.repo.patch.codex@v1",
        required_inputs: ["scope"],
        produces: ["artifact_patch"],
      }),
      baseNode("node_verify", "proof_verification", {
        capability_ref: "capability.proof.verify@v1",
        required_inputs: ["artifact_patch"],
        produces: ["proof_verified"],
        proof_required: true,
      }),
      baseNode("node_approval", "approval_gate", {
        required_inputs: ["proof_verified"],
        produces: ["approval_granted"],
        proof_required: true,
        approval_required: true,
      }),
      baseNode("node_pr", "external_action", {
        capability_ref: "capability.github.pr.create@v1",
        action_type: "github_pr_create",
        risk: "high",
        required_inputs: ["approval_granted"],
        produces: ["artifact_pr"],
        proof_required: true,
        approval_required: true,
      }),
      baseNode("node_projection", "matrix_projection", {
        event_ref: "event_task_completed_projection",
        required_inputs: ["artifact_pr"],
        produces: ["matrix_projection"],
      }),
    ],
    edges: [
      { from: "node_intake", to: "node_scope", condition: "always" },
      { from: "node_scope", to: "node_patch", condition: "policy_allowed" },
      { from: "node_patch", to: "node_verify", condition: "artifact_ready" },
      { from: "node_verify", to: "node_approval", condition: "proof_verified" },
      { from: "node_approval", to: "node_pr", condition: "approval_granted" },
      { from: "node_pr", to: "node_projection", condition: "external_action_completed" },
    ],
    ...overrides,
  };
}

function graphContractErrors(graph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const errors = [];

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`unknown edge source: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`unknown edge target: ${edge.to}`);
    }
  }

  const adjacency = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    if (nodeIds.has(edge.from) && nodeIds.has(edge.to)) {
      adjacency.get(edge.from).push(edge.to);
    }
  }

  const visiting = new Set();
  const visited = new Set();

  function hasCycle(nodeId) {
    if (visiting.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    for (const nextNodeId of adjacency.get(nodeId)) {
      if (hasCycle(nextNodeId)) {
        return true;
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  if ([...nodeIds].some((nodeId) => hasCycle(nodeId))) {
    errors.push("cycle detected");
  }

  function hasPriorProofNode(nodeId, seen = new Set()) {
    if (seen.has(nodeId)) {
      return false;
    }
    seen.add(nodeId);

    const incoming = graph.edges
      .filter((edge) => edge.to === nodeId)
      .map((edge) => nodesById.get(edge.from))
      .filter(Boolean);

    return incoming.some(
      (node) => node.proof_required || hasPriorProofNode(node.id, seen),
    );
  }

  for (const node of graph.nodes) {
    if (
      node.kind === "external_action" &&
      node.risk === "high" &&
      node.approval_required !== true
    ) {
      errors.push(`high-risk external action without approval: ${node.id}`);
    }

    if (
      (node.kind === "approval_gate" || node.action_type === "github_pr_create") &&
      !hasPriorProofNode(node.id)
    ) {
      errors.push(`missing prior proof requirement: ${node.id}`);
    }
  }

  return errors;
}

function assertValidTaskGraph(graph) {
  const ajv = createAjv();
  const validateGraph = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-graph.schema.json",
  );

  assert.equal(validateGraph(graph), true, JSON.stringify(validateGraph.errors, null, 2));
  assert.deepEqual(graphContractErrors(graph), []);
}

test("schema defines the task graph contract", () => {
  const ajv = createAjv();

  assert.equal(
    ajv.validateSchema(readJson("schemas/runtime/task-graph.schema.json")),
    true,
  );
});

test("validates a repo patch graph with Matrix input and projection nodes", () => {
  assertValidTaskGraph(validGraph());
});

test("rejects edges pointing to unknown nodes", () => {
  const graph = validGraph({
    edges: [
      ...validGraph().edges,
      { from: "node_verify", to: "node_missing", condition: "proof_verified" },
    ],
  });

  assert.deepEqual(graphContractErrors(graph), ["unknown edge target: node_missing"]);
});

test("rejects cyclic task graphs", () => {
  const graph = validGraph({
    edges: [
      ...validGraph().edges,
      { from: "node_projection", to: "node_scope", condition: "retry_requested" },
    ],
  });

  assert.deepEqual(graphContractErrors(graph), ["cycle detected"]);
});

test("rejects high-risk external actions without approval", () => {
  const graph = validGraph({
    nodes: validGraph().nodes.map((node) =>
      node.id === "node_pr" ? { ...node, approval_required: false } : node,
    ),
  });

  assert.deepEqual(graphContractErrors(graph), [
    "high-risk external action without approval: node_pr",
  ]);
});

test("requires proof before approval and PR creation nodes", () => {
  const missingProofBeforeApproval = validGraph({
    nodes: validGraph().nodes.map((node) =>
      node.id === "node_verify" ? { ...node, proof_required: false } : node,
    ),
  });

  assert.deepEqual(graphContractErrors(missingProofBeforeApproval), [
    "missing prior proof requirement: node_approval",
  ]);

  const missingProofBeforePrCreation = validGraph({
    nodes: validGraph().nodes.map((node) =>
      node.id === "node_verify" || node.id === "node_approval"
        ? { ...node, proof_required: false }
        : node,
    ),
  });

  assert.deepEqual(graphContractErrors(missingProofBeforePrCreation), [
    "missing prior proof requirement: node_approval",
    "missing prior proof requirement: node_pr",
  ]);
});

test("rejects Matrix as the task state source of truth", () => {
  const ajv = createAjv();
  const validateGraph = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-graph.schema.json",
  );
  const graph = validGraph({ state_source: "matrix" });

  assert.equal(validateGraph(graph), false);
});
