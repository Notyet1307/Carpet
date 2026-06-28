import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const graphSchemaId = "https://notyet.dev/schemas/runtime/task-graph.schema.json";

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function readWorkflow(relativePath) {
  // package.json has no YAML parser; keep workflow YAML JSON-compatible for now.
  return readJson(relativePath);
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson("schemas/runtime/task-graph.schema.json"));
  return ajv;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function graphContractErrors(graph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const errors = [];

  if (graph.state_source !== "runtime") {
    errors.push("matrix cannot be task graph source of truth");
  }

  for (const node of graph.nodes) {
    if (
      node.event_ref &&
      node.kind !== "event_ingest" &&
      node.kind !== "matrix_projection"
    ) {
      errors.push(`matrix event outside input/projection node: ${node.id}`);
    }
  }

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

function repoPatchWorkflow() {
  return readWorkflow("runtime/workflows/repo-patch.yaml");
}

test("workflow validates against the task graph schema", () => {
  const ajv = createAjv();
  const validateGraph = ajv.getSchema(graphSchemaId);
  const workflow = repoPatchWorkflow();

  assert.equal(validateGraph(workflow), true, JSON.stringify(validateGraph.errors, null, 2));
  assert.deepEqual(graphContractErrors(workflow), []);
});

test("workflow maps the repo patch task graph shape", () => {
  const workflow = repoPatchWorkflow();

  assert.deepEqual(
    workflow.nodes.map((node) => node.kind),
    [
      "event_ingest",
      "runtime_decision",
      "capability_execution",
      "proof_verification",
      "approval_gate",
      "external_action",
      "matrix_projection",
    ],
  );

  assert.equal(
    workflow.nodes.find((node) => node.kind === "capability_execution").capability_ref,
    "capability.repo.patch.codex@v1",
  );
  assert.equal(
    workflow.nodes.find((node) => node.kind === "external_action").action_type,
    "github_pr_create",
  );
});

test("graph helper rejects cycles", () => {
  const workflow = repoPatchWorkflow();
  const cyclic = {
    ...workflow,
    edges: [
      ...workflow.edges,
      {
        from: "node_matrix_projection",
        to: "node_runtime_decision",
        condition: "retry_requested",
      },
    ],
  };

  assert.deepEqual(graphContractErrors(cyclic), ["cycle detected"]);
});

test("graph helper rejects unknown nodes", () => {
  const workflow = repoPatchWorkflow();
  const unknownTarget = {
    ...workflow,
    edges: [
      ...workflow.edges,
      {
        from: "node_proof_verification",
        to: "node_missing",
        condition: "proof_verified",
      },
    ],
  };

  assert.deepEqual(graphContractErrors(unknownTarget), [
    "unknown edge target: node_missing",
  ]);
});

test("high-risk PR action requires approval", () => {
  const workflow = repoPatchWorkflow();
  const missingApproval = clone(workflow);
  missingApproval.nodes.find((node) => node.id === "node_github_pr_create")
    .approval_required = false;

  assert.deepEqual(graphContractErrors(missingApproval), [
    "high-risk external action without approval: node_github_pr_create",
  ]);
});

test("proof exists before approval and PR creation", () => {
  const workflow = repoPatchWorkflow();
  const missingProof = clone(workflow);

  for (const node of missingProof.nodes) {
    if (node.id === "node_proof_verification" || node.id === "node_approval_gate") {
      node.proof_required = false;
    }
  }

  assert.deepEqual(graphContractErrors(missingProof), [
    "missing prior proof requirement: node_approval_gate",
    "missing prior proof requirement: node_github_pr_create",
  ]);
});

test("Matrix remains input and projection only", () => {
  const workflow = repoPatchWorkflow();

  assert.equal(workflow.state_source, "runtime");
  assert.deepEqual(
    workflow.nodes.filter((node) => node.event_ref).map((node) => node.kind),
    ["event_ingest", "matrix_projection"],
  );

  const matrixSourced = { ...workflow, state_source: "matrix" };
  assert.deepEqual(graphContractErrors(matrixSourced), [
    "matrix cannot be task graph source of truth",
  ]);
});
