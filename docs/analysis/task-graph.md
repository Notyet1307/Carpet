# Runtime Task Graph Contract

Version: 2026-06-28

Task ID: Analysis-P4-task-graph-contract

Roadmap: Phase 4 / Task Graph contract baseline

## Purpose

This document defines the MVP Runtime task graph contract before runtime
implementation starts.

This is an analysis and contract artifact only. It does not authorize runtime
apps, graph compiler code, worker runners, database code, Matrix gateway code,
Codex execution, GitHub automation, runtime workflow files, merge automation, or
real external actions.

## Source Of Truth

Runtime-owned task state and graph records are the source of truth.

Matrix events may start a graph as untrusted input. Matrix events may also
receive projected graph status for human collaboration and audit visibility.
Matrix room history must not be used as the task state source, graph source, or
approval source.

Every graph validates against `schemas/runtime/task-graph.schema.json`.

## Graph Shape

| Field | Required | Contract |
|---|---:|---|
| `task_id` | Yes | Runtime task identifier. |
| `graph_id` | Yes | Runtime graph identifier for this compiled plan. |
| `version` | Yes | Positive integer contract version. |
| `state_source` | Yes | Must be `runtime`; Matrix is input or projection only. |
| `nodes` | Yes | Non-empty ordered list of graph nodes. |
| `edges` | Yes | Directed edges between nodes. |

## Node Contract

Every node has:

| Field | Contract |
|---|---|
| `id` | Node identifier used by edges. |
| `kind` | One of the baseline node kinds. |
| `capability_ref` | Required when the node invokes a capability. |
| `event_ref` | Required for Matrix input or projection nodes. |
| `required_inputs` | Symbols the node needs before it can run. |
| `produces` | Symbols the node makes available to later nodes. |
| `proof_required` | True when the node requires proof before downstream gated action. |
| `approval_required` | True when the node requires explicit action-scoped approval. |

Baseline node kinds:

| Kind | Role | Ref rule |
|---|---|---|
| `event_ingest` | Runtime accepts an input event candidate. | Requires `event_ref`; no `capability_ref`. |
| `runtime_decision` | Runtime scopes, filters, or routes without invoking a worker. | No `event_ref` or `capability_ref`. |
| `capability_execution` | A capability produces an artifact. | Requires `capability_ref`; no `event_ref`. |
| `proof_verification` | A verifier capability checks artifact/proof. | Requires `capability_ref`; no `event_ref`. |
| `approval_gate` | Runtime waits for action-scoped human approval. | No `event_ref` or `capability_ref`; `approval_required` must be true. |
| `external_action` | Runtime requests an irreversible or external side effect. | Requires `capability_ref`, `action_type`, and `risk`. |
| `matrix_projection` | Runtime projects status back to Matrix. | Requires `event_ref`; no `capability_ref`. |

## Edge Contract

Every edge has:

| Field | Contract |
|---|---|
| `from` | Existing source node id. |
| `to` | Existing target node id. |
| `condition` | Named condition that must hold before the edge is traversed. |

The graph must be a DAG:

- edges pointing to unknown nodes are invalid;
- cycles are invalid;
- edge conditions are labels only in this baseline, not runtime policy code.

## MVP Repo Patch Graph

The baseline repo patch graph shape is:

```text
event_ingest
-> runtime_decision
-> capability_execution
-> proof_verification
-> approval_gate
-> external_action
-> matrix_projection
```

Safety rules:

- A high-risk `external_action` node must set `approval_required: true`.
- `approval_gate` and `github_pr_create` nodes require an upstream node with
  `proof_required: true`.
- PR creation requires proof first and approval second; Matrix chat text is not
  proof or approval by itself.
- Matrix appears only as `event_ingest` or `matrix_projection`.

## Contract Tests

`tests/contracts/task-graph.test.mjs` validates:

- the schema is a valid JSON Schema;
- a valid repo patch graph with Matrix input and projection nodes;
- rejection of edges that point to unknown nodes;
- rejection of graph cycles;
- rejection of high-risk external action nodes without approval;
- rejection of approval or PR creation nodes without prior proof;
- rejection of Matrix as the Runtime state source of truth.

## Deferred

The following remain outside this task:

- runtime workflow files such as `runtime/workflows/repo-patch.yaml`;
- runtime workflow files such as `runtime/workflows/ci-recovery.yaml`;
- graph compiler implementation;
- database persistence;
- Matrix gateway translation code;
- worker dispatch code;
- GitHub PR automation;
- dynamic retries, fan-out, fan-in, and graph recompile semantics.

Workflow YAML remains deferred because this baseline defines the graph contract,
not concrete executable workflow instances.
