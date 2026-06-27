# Matrix Integration Analysis

Version: 2026-06-27

Task ID: Analysis-P3-matrix-integration-analysis

Roadmap: Phase 3 / Matrix Event Contract Analysis

## Purpose

This document defines the Phase 3 Matrix integration boundary before any Matrix
gateway implementation starts. It connects the current Matrix event schemas to
the component boundary from `docs/analysis/03-bounded-contexts.md` and the
Matrix collaboration decision in ADR-0002.

This is an analysis artifact only. It does not authorize runtime apps, Matrix
gateway code, Codex execution code, GitHub automation, database code, new
schemas, new fixtures, or contract test changes.

## Boundary Summary

Matrix is a collaboration and projection surface. It is not the Runtime source
of truth.

Inbound Matrix events are untrusted input until the Matrix AppService Gateway
authenticates the homeserver transaction, resolves the room and sender, checks
idempotency, validates the event content against JSON Schema, and translates an
allowed event into a Runtime command.

The boundary is:

```text
Matrix room event
-> Matrix Homeserver transaction
-> Matrix AppService Gateway
-> Runtime command
-> Runtime-owned state change
-> Runtime projection request
-> Matrix projection event or failure reply
```

The first Runtime-owned boundary is the Runtime command. Matrix event content,
room history, and human-readable messages must not mutate task state directly.

## Inbound Trust Rules

- Treat every inbound Matrix event body as untrusted data.
- Verify the homeserver transaction before reading event intent.
- Derive `workspace_id` from trusted room mapping, not from event content alone.
- Derive the actor from Matrix sender and membership policy; the `actor` field in
  event content is a claim to validate or replace, not proof of identity.
- Validate the envelope and the event-specific `data` shape before translation.
- Reject unsupported event types before they reach the Runtime API.
- Use one idempotency key for one Runtime command. Duplicate Matrix delivery must
  return the prior outcome or no-op, not create a second task or approval.

## AppService Gateway Responsibilities

The gateway owns the transport seam only:

1. Authenticate homeserver transactions with the AppService `hs_token`.
2. Normalize transaction metadata: `txn_id`, Matrix `event_id`, room, sender,
   event type, and content.
3. Resolve room to workspace and sender to actor.
4. Deduplicate by transaction ID, Matrix event ID, and event `idempotency_key`.
5. Validate the Matrix event envelope and event-specific schema.
6. Translate allowed inbound events into Runtime commands.
7. Project Runtime summaries back to Matrix with the AppService `as_token`.
8. Emit visible rejection or incident projections for invalid, unauthorized,
   unsupported, ambiguous, or replayed inputs.

The gateway does not own durable task lifecycle, proof truth, approval truth,
worker lifecycle, artifact bodies, policy decisions, or secrets.

## Event Translation Boundary

Only command-shaped Matrix events may become Runtime commands.

| Matrix event | Direction at boundary | Runtime command meaning |
|---|---|---|
| `com.notyet.agent.task.created` | Matrix -> Runtime | Create an intake candidate after schema, actor, room, scope, and policy checks. |
| `com.notyet.agent.approval.granted` | Matrix -> Runtime | Record one action-scoped approval decision for one `approval_id`, `action`, and `proof_id`. |
| `com.notyet.agent.approval.denied` | Matrix -> Runtime | Record one action-scoped denial with a non-empty reason. |

Projection-shaped events must not be accepted as commands from arbitrary Matrix
senders. Runtime-owned projections include task acceptance or rejection, worker
dispatch summaries, proof summaries, approval requests, and memory proposals.

The gateway should reject or convert to an incident any Matrix-origin event that
tries to impersonate Runtime-owned projections such as `worker.dispatched`,
`proof.submitted`, `approval.requested`, or `memory.update.proposed`.

## Schema Validation Boundary

The current schema layer uses JSON Schema plus Ajv contract tests. Validation is
required before event translation, and envelope validation alone is not enough
for event-specific behavior.

Required validation order:

1. Parse JSON.
2. Validate envelope fields: `specversion`, `id`, `source`, `type`, `subject`,
   `time`, `datacontenttype`, `workspace_id`, `trace_id`, `actor`,
   `created_at`, `idempotency_key`, and `data`.
3. Select the event-specific schema by `type`.
4. Validate event-specific required fields and negative constraints.
5. Translate only if the event type is allowed for the inbound direction.

If no event-specific schema exists, the gateway must treat the event as
unsupported for Runtime command translation even if it passes the generic
envelope schema.

## Idempotency

Matrix delivery can be duplicated. The gateway must treat retries as normal and
harmless.

Inbound idempotency keys:

- Homeserver transaction ID.
- Matrix event ID.
- Envelope `id`.
- Envelope `idempotency_key`.

The Runtime command generated from an inbound event must carry a stable
idempotency key derived from the Matrix event identity. Duplicate delivery of the
same Matrix event must produce at most one Runtime command and one persisted
Runtime state transition.

Outbound projection retries are also idempotent. Retrying a Matrix send may
create gateway delivery records, but it must not create new Runtime state.

## Projection Events

Projection events are Runtime summaries sent to Matrix for human review and audit
visibility. They are not proof, task state, worker state, or approval truth.

Current projection baseline:

- `task.accepted` and `task.rejected` show intake outcomes.
- `worker.dispatched` shows work cell launch metadata and worktree provenance.
- `artifact.submitted` shows worker artifact references, types, and hashes.
- `proof.submitted` shows proof IDs, artifact references, hashes, and validation
  summaries.
- `approval.requested` asks for one action-scoped decision against one proof.
- `memory.update.proposed` presents an evidence-backed proposal for review.

Projection events should carry references and summaries only. Raw proof logs,
diff bodies, worker stdout, secrets, task database rows, and artifact bodies must
stay outside Matrix.

## Failure Replies

Failure replies are visible projections, not direct Runtime state mutation by
the gateway.

Expected failure handling:

- Invalid homeserver authentication: reject the transaction at the AppService
  boundary. Do not create a Matrix projection from an unauthenticated request.
- Invalid schema for `task.created`: produce a `task.rejected` projection when a
  task identity is available and safe to expose.
- Unauthorized actor, room/workspace mismatch, unsupported event type, replay
  conflict, projection impersonation, or malformed event without a safe task
  identity: produce an incident projection once `incident.created` is defined.
- Runtime API unavailable: record gateway delivery or command failure for retry;
  do not assume the Runtime accepted the command.

Because `incident.created` has no schema baseline yet, generic gateway incidents
remain a Phase 3 event gap.

## Implemented Schema Baseline

Current files under `schemas/matrix/` and `fixtures/matrix-events/` define this
baseline:

| Event | Schema | Fixture coverage |
|---|---|---|
| Generic event envelope | `event-envelope.schema.json` | valid envelope; missing `trace_id` invalid |
| `task.created` | `task.created.schema.json` | valid task intake; empty `goal` invalid |
| `task.accepted` | `task.accepted.schema.json` | valid acceptance; missing `task_id` invalid |
| `task.rejected` | `task.rejected.schema.json` | valid rejection; empty `reason` invalid |
| `capability.selected` | `capability.selected.schema.json` | valid selection; empty `selection_reason` and missing `capability_version` invalid |
| `worker.dispatched` | `worker.dispatched.schema.json` | valid dispatch; main checkout path invalid |
| `worker.progress` | `worker.progress.schema.json` | valid progress; invalid `status`, raw stdout, and out-of-range `progress_percent` invalid |
| `artifact.submitted` | `artifact.submitted.schema.json` | valid artifact reference; missing `artifact_ref` and raw diff body invalid |
| `proof.submitted` | `proof.submitted.schema.json` | valid proof summary; empty `proof_id` and raw proof logs invalid |
| `approval.requested` | `approval.requested.schema.json` | valid action-scoped request; ambiguous `task.approve` invalid |
| `approval.granted` | `approval.granted.schema.json` | valid action-scoped grant; missing `proof_id` invalid |
| `approval.denied` | `approval.denied.schema.json` | valid denial; empty `reason` invalid |
| `memory.update.proposed` | `memory.update.proposed.schema.json` | valid proposal; live memory write invalid |

The current contract test is `tests/contracts/schema-fixtures.test.mjs`. Both
`pnpm test:contracts` and `pnpm schemas:validate` run that contract test.

## Remaining Phase 3 Event Gaps

After the `artifact.submitted` contract baseline, comparing the Phase 3
namespace in the roadmap with the current schema files, strict schemas and
valid/invalid fixtures are still missing for:

- `com.notyet.agent.verification.completed`
- `com.notyet.agent.incident.created`

The architecture document also mentions `com.notyet.agent.task.scoped`, but that
event is not in the current Phase 3 roadmap namespace. It should not be added by
implication without an explicit roadmap update.

Matrix AppService transaction fixtures, room mapping contracts, and fake
transaction tests belong to the later Phase 7 AppService Gateway analysis. They
are not part of this document's allowed changes.

## Explicit Non-Authorities

Matrix is not:

- Runtime state.
- The proof source of truth.
- The worker lifecycle manager.
- The secret store.
- The policy engine.
- The approval source of truth.
- The memory source of truth.

Room history must not be replayed as the task database. Matrix approval messages
must not grant broad or ongoing permission. Matrix events must not contain
AppService tokens, API keys, raw logs, full diffs, secret paths, or durable
Runtime records.

## Phase 3 Exit Note

This document completes the Phase 3 Matrix integration analysis artifact, but it
does not complete all Phase 3 event contracts. Phase 3 remains partially complete
until the remaining event gaps have JSON Schemas, valid/invalid fixtures, and
contract test coverage.
