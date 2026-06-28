# Runtime Task State Machine

Version: 2026-06-28

Task ID: Analysis-P4-task-state-machine

Roadmap: Phase 4 / Codex Task Card 4.1

## Purpose

This document defines the MVP Runtime task lifecycle and transition contract
before runtime implementation starts.

This is an analysis and contract artifact only. It does not authorize runtime
apps, worker runners, database code, Matrix gateway code, Codex execution,
GitHub automation, runtime workflow files, or merge automation.

## Source Of Truth

Runtime-owned task state is the source of truth. Matrix events, GitHub events,
Codex output, and human-readable chat are inputs or projections only.

State changes must be recorded as explicit transition records that validate
against `schemas/runtime/task-state-transition.schema.json`. A task snapshot
validates against `schemas/runtime/task.schema.json`.

The transition record is the audit unit:

- `from` and `to` define the state movement.
- `trigger_event` defines the event or command that requested the movement.
- `actor.type` defines the allowed actor class.
- `requirements` carries the required artifact, proof, or approval reference.
- `audit_event` is the append-only runtime audit event emitted for the change.

## MVP Happy Path

```text
created -> accepted -> scoped -> graph_compiled -> capability_selected
-> work_cell_created -> worker_dispatched -> running -> artifact_submitted
-> proof_submitted -> verifying -> waiting_approval -> approved
-> pr_created -> completed
```

The happy path has one irreversible external action in this baseline:
`approved -> pr_created`. It must carry both a verified `proof_ref` and an
action-scoped human `approval_ref`.

## State Semantics

| State | Entry condition | Exit condition | Timeout behavior | Audit event |
|---|---|---|---|---|
| `created` | A trusted Runtime command accepted the intake candidate. | Human accepts, Runtime rejects, or human cancels. | Intake timeout moves to `rejected` or `cancelled` by policy. | `task.transition.created` |
| `accepted` | A human accepted the task for Runtime analysis. | Runtime scopes allowed paths, proof needs, risk, and stop conditions. | Scoping timeout moves to `blocked`. | `task.transition.accepted` |
| `scoped` | Runtime has a bounded scope and risk level. | Runtime compiles the graph or denies by policy. | Scope validation timeout moves to `policy_denied` or `blocked`. | `task.transition.scoped` |
| `graph_compiled` | Runtime produced an executable task graph draft. | Runtime selects a capability or blocks on graph ambiguity. | Graph compile timeout moves to `blocked`. | `task.transition.graph_compiled` |
| `capability_selected` | Runtime selected a capability version and policy envelope. | Runtime creates a Work Cell or denies by policy. | Capability routing timeout moves to `policy_denied`. | `task.transition.capability_selected` |
| `work_cell_created` | Runtime created isolated worktree provenance and execution envelope. | Runtime dispatches the worker. | Work Cell setup timeout moves to `worker_failed`. | `task.transition.work_cell_created` |
| `worker_dispatched` | Runtime dispatched a worker with cwd set to the Work Cell path. | Worker starts or reports failure. | Dispatch heartbeat timeout moves to `worker_failed`. | `task.transition.worker_dispatched` |
| `running` | Worker started inside the Work Cell. | Worker submits an artifact, requests human input, fails, or is cancelled. | Heartbeat or budget timeout moves to `worker_failed`. | `task.transition.running` |
| `artifact_submitted` | Worker submitted artifact references, not raw bodies. | Worker submits proof referencing the artifact. | Artifact review timeout moves to `blocked`. | `task.transition.artifact_submitted` |
| `proof_submitted` | Worker submitted proof references and validation summary. | Verifier starts verification or rejects proof. | Verification start timeout moves to `verification_failed`. | `task.transition.proof_submitted` |
| `verifying` | Verifier is checking proof and artifact references. | Runtime requests approval or verifier fails the proof. | Verification timeout moves to `verification_failed`. | `task.transition.verifying` |
| `waiting_approval` | Runtime needs an explicit human approval for a high-risk action. | Human approves, denies, or cancels. | Approval timeout moves to `approval_denied` or `cancelled` by policy. | `task.transition.waiting_approval` |
| `approved` | Human approved one exact action against one proof. | Runtime performs the approved external action. | Action timeout moves to `blocked`; approval does not generalize to other actions. | `task.transition.approved` |
| `pr_created` | Runtime created a PR using the approved proof reference. | Runtime records completion with the PR artifact reference. | Projection timeout moves to `blocked`; the PR remains an external artifact. | `task.transition.pr_created` |
| `completed` | Runtime recorded final artifact, proof, and approval references. | Terminal. | None. | `task.transition.completed` |
| `rejected` | Runtime rejected intake before execution. | Terminal for this task. | None. | `task.transition.rejected` |
| `blocked` | Runtime cannot proceed without a corrected spec, missing dependency, or operator decision. | Terminal for this task baseline; follow-up work creates a new task. | None. | `task.transition.blocked` |
| `needs_human_input` | Worker needs bounded human input before it can continue. | Terminal for this baseline; a follow-up task may resume with the new input. | None. | `task.transition.needs_human_input` |
| `policy_denied` | Runtime policy denied scope, capability, or action. | Terminal unless policy changes through a separate approved task. | None. | `task.transition.policy_denied` |
| `worker_failed` | Worker failed, exceeded budget, lost heartbeat, or exited without required artifact. | Terminal for this worker attempt. | None. | `task.transition.worker_failed` |
| `verification_failed` | Verifier rejected proof or could not validate artifact references. | Terminal for this proof attempt. | None. | `task.transition.verification_failed` |
| `approval_denied` | Human denied the requested action-scoped approval. | Terminal for that action. | None. | `task.transition.approval_denied` |
| `cancelled` | Human cancelled before an irreversible action executed. | Terminal. | None. | `task.transition.cancelled` |

## Transition Contract

| From | To | Trigger event | Actor | Required artifact | Required proof | Required approval | Audit event |
|---|---|---|---|---|---|---|---|
| `created` | `accepted` | `task.accepted` | `human` | None | None | None | `task.transition.accepted` |
| `accepted` | `scoped` | `task.scoped` | `runtime` | None | None | None | `task.transition.scoped` |
| `scoped` | `graph_compiled` | `task.graph_compiled` | `runtime` | None | None | None | `task.transition.graph_compiled` |
| `graph_compiled` | `capability_selected` | `capability.selected` | `runtime` | None | None | None | `task.transition.capability_selected` |
| `capability_selected` | `work_cell_created` | `work_cell.created` | `runtime` | None | None | None | `task.transition.work_cell_created` |
| `work_cell_created` | `worker_dispatched` | `worker.dispatched` | `runtime` | None | None | None | `task.transition.worker_dispatched` |
| `worker_dispatched` | `running` | `worker.started` | `worker` | None | None | None | `task.transition.running` |
| `running` | `artifact_submitted` | `artifact.submitted` | `worker` | `artifact_ref` | None | None | `task.transition.artifact_submitted` |
| `artifact_submitted` | `proof_submitted` | `proof.submitted` | `worker` | `artifact_ref` | None | None | `task.transition.proof_submitted` |
| `proof_submitted` | `verifying` | `verification.started` | `verifier` | None | `proof_ref` | None | `task.transition.verifying` |
| `verifying` | `waiting_approval` | `approval.requested` | `runtime` | None | `proof_ref` | None | `task.transition.waiting_approval` |
| `waiting_approval` | `approved` | `approval.granted` | `human` | None | `proof_ref` | `approval_ref` | `task.transition.approved` |
| `approved` | `pr_created` | `github.pr.create_requested` | `runtime` | None | `proof_ref` | `approval_ref` | `task.transition.pr_created` |
| `pr_created` | `completed` | `task.completed` | `runtime` | `artifact_ref` | `proof_ref` | `approval_ref` | `task.transition.completed` |
| `created` | `rejected` | `task.rejected` | `runtime` | None | None | None | `task.transition.rejected` |
| `accepted` | `blocked` | `task.blocked` | `runtime` | None | None | None | `task.transition.blocked` |
| `scoped` | `policy_denied` | `policy.denied` | `runtime` | None | None | None | `task.transition.policy_denied` |
| `graph_compiled` | `blocked` | `task.blocked` | `runtime` | None | None | None | `task.transition.blocked` |
| `capability_selected` | `policy_denied` | `policy.denied` | `runtime` | None | None | None | `task.transition.policy_denied` |
| `worker_dispatched` | `worker_failed` | `worker.failed` | `worker` | None | None | None | `task.transition.worker_failed` |
| `running` | `worker_failed` | `worker.failed` | `worker` | None | None | None | `task.transition.worker_failed` |
| `running` | `needs_human_input` | `human_input.requested` | `worker` | None | None | None | `task.transition.needs_human_input` |
| `proof_submitted` | `verification_failed` | `verification.failed` | `verifier` | None | `proof_ref` | None | `task.transition.verification_failed` |
| `verifying` | `verification_failed` | `verification.failed` | `verifier` | None | `proof_ref` | None | `task.transition.verification_failed` |
| `waiting_approval` | `approval_denied` | `approval.denied` | `human` | None | None | `approval_ref` | `task.transition.approval_denied` |
| `created`, `accepted`, `scoped`, `running`, `waiting_approval` | `cancelled` | `task.cancelled` | `human` | None | None | None | `task.transition.cancelled` |

Unknown state names and unlisted transition pairs must be rejected.

## Irreversible Actions

The MVP irreversible action is PR creation through the GitHub adapter.

Rules:

- `approved -> pr_created` is the only transition that may request
  `github.pr.create_requested`.
- It requires an action-scoped `approval_ref` and a verified `proof_ref`.
- The approval must be for the exact action, not for the whole task.
- Natural-language approval such as "looks good" is not enough.
- Runtime must not infer approval from Matrix room history.

Future irreversible actions must be added as explicit transition rows and schema
cases before implementation.

## Cancel And Retry Semantics

Cancellation is allowed only before the irreversible action executes. In this
baseline it is accepted from `created`, `accepted`, `scoped`, `running`, and
`waiting_approval`.

Retry is deliberately not a direct state transition in this baseline. A failed
task attempt stays in its failure state so audit history is stable. Retrying
requires a new task or a later retry contract that names the source task, new
Work Cell, new proof expectations, and approval requirements.

This keeps the current contract implementable without guessing at queue,
database, or worker-runner behavior.

## Contract Tests

`tests/contracts/task-state-machine.test.mjs` validates:

- one valid happy-path sequence;
- illegal transition rejection;
- wrong actor rejection;
- high-risk PR creation rejection when approval is missing;
- audit event mismatch rejection;
- artifact submission rejection when `artifact_ref` is missing;
- unknown state and unknown transition-pair rejection.

Both `pnpm test:contracts` and `pnpm schemas:validate` run the contract tests in
this repository.

## Deferred

The following remain outside this task:

- runtime workflow files such as `runtime/workflows/repo-patch.yaml`;
- task graph shape beyond the state names used here;
- database persistence;
- Matrix gateway translation code;
- worker dispatch code;
- GitHub PR automation;
- direct retry transitions.
