# Matrix AppService Gateway Contract Baseline

Status: Phase 7 contract baseline

Related:
- [Architecture](../architecture/matrix-codex-capability-runtime.md)
- [ADR-0002 Matrix as collaboration surface](../adr/0002-matrix-as-collaboration-surface.md)
- [Analysis roadmap](../roadmaps/analysis-roadmap.md)

## 1. Boundary

Matrix AppService Gateway is the trust boundary between homeserver transactions and the Runtime. It receives Matrix homeserver transaction pushes, authenticates the homeserver, normalizes accepted Matrix events into Runtime events, and asks Runtime to project accepted/rejected/incident summaries back into Matrix.

Matrix remains a collaboration and input surface. Runtime remains the source of truth for task state, policy, proof, approval, work cells, and artifact references.

The gateway must not implement:

```text
real Matrix server
database migrations
queue worker
Codex execution
GitHub automation
policy engine
proof ledger
Runtime task state machine
```

This baseline is intentionally limited to docs, fixtures, schemas, and contract tests.

## 2. Inbound Transaction Contract

MVP endpoint shape:

```text
PUT /_matrix/app/v1/transactions/{txn_id}
Authorization: Bearer <hs_token>
```

Implementation can later support Matrix-spec token transport variants only if they normalize into the same `hs_token` validator. Token values are runtime configuration, not Matrix event content.

Required checks, in order:

```text
1. Validate hs_token before parsing Matrix event content into Runtime work.
2. Check txn_id idempotency.
3. Check each Matrix event_id deduplication.
4. Resolve room_id to Runtime-owned workspace mapping.
5. Validate Matrix event content against JSON Schema.
6. Derive actor authority from Matrix sender and Runtime membership, not content.actor.
7. Translate accepted input into schemas/runtime/runtime-event.schema.json.
8. Enqueue only after validation and mapping succeed.
```

`as_token` is outbound-only for appservice-to-homeserver projection calls. It must not authorize inbound homeserver transactions.

## 3. Idempotency

`txn_id` and `event_id` are separate idempotency keys.

`txn_id`:
- If already processed, return `200 duplicate_transaction`.
- Do not enqueue Runtime work.
- Do not emit another Matrix projection.

`event_id`:
- If already seen in a new transaction, return `200 ok` for the transaction.
- Ignore the duplicate event.
- Do not enqueue Runtime work or emit another projection.

Durability rule:

```text
Only commit txn_id/event_id idempotency after the gateway can durably record the accepted, rejected, or incident outcome.
```

If Runtime enqueue or durable recording is unavailable, return a retryable failure and do not commit idempotency.

## 4. Room Mapping

Room mapping is Runtime-owned state:

```text
room_id -> workspace_id + purpose + allowed inbound event types
```

The gateway must not trust `content.workspace_id` as the workspace authority. If the Matrix room is unknown or maps to a different workspace than the event claims, the gateway must not enqueue Runtime task work.

Unknown room behavior:
- No Runtime task/intake event.
- Record or enqueue an incident if Runtime durability is available.
- Do not project into the unknown room as if it belonged to a workspace.

## 5. Schema Validation

Matrix event content is untrusted input. The gateway validates content before enqueueing Runtime work.

Accepted inbound command examples:
- `com.notyet.agent.task.created`

AppService namespace registration should subscribe only to configured `com.notyet.agent.*` namespaces and registered rooms/users. Namespace match is routing, not authorization; `hs_token`, room mapping, schema validation, and Runtime policy still decide whether an event can affect Runtime.

Runtime-owned projection examples:
- `com.notyet.agent.task.accepted`
- `com.notyet.agent.task.rejected`
- `com.notyet.agent.proof.submitted`
- `com.notyet.agent.incident.created`

Runtime-owned projections must not become Runtime facts when received inbound from Matrix. Inbound attempts to submit Runtime-owned projections become rejected input or incidents.

Validation failure behavior:
- Known room and task context: produce `task.rejected` projection through Runtime.
- Security or boundary violation: produce `incident.created` projection through Runtime.
- Never create or mutate Runtime task state from invalid content.

## 6. Actor Provenance

Inbound Matrix content can contain an `actor` object, but it is a claim. The gateway must derive effective authority from:

```text
Matrix event sender
Runtime workspace membership / role map
Runtime policy
```

The normalized Runtime event records both:

```text
actor.id           = Matrix sender
actor.derived_from = matrix.sender
actor.claimed_actor = content.actor
```

A spoofed `content.actor` can be retained as provenance, but it cannot grant Runtime, worker, verifier, admin, or system authority.

## 7. Runtime Event Mapping

Accepted Matrix input becomes a Runtime event matching [runtime-event schema](../../schemas/runtime/runtime-event.schema.json).

For `com.notyet.agent.task.created`:

```text
Matrix transaction
→ validate hs_token
→ resolve room_id to workspace_id
→ validate task.created content
→ derive actor from Matrix sender
→ runtime.intent.received
→ Runtime intake queue
```

Runtime event requirements:
- `source_component` is `matrix_appservice_gateway`.
- `source_of_truth` is `runtime`.
- `matrix` contains transaction/event/room/sender provenance.
- `validation` records accepted/rejected and schema id.
- `enqueue` records whether Runtime work was queued.

Matrix event content is never copied into Runtime state without validation and provenance.

## 8. Failure And Reply Rules

Gateway HTTP replies:

| Case | HTTP | Commit idempotency | Runtime task work | Matrix projection |
|---|---:|---|---|---|
| Invalid `hs_token` | 401 | no | no | no |
| Duplicate `txn_id` | 200 | already | no | no |
| Duplicate `event_id` | 200 | yes | no | no |
| Invalid schema in known room | 200 | yes | no | `task.rejected` |
| Spoofed actor claim but valid command | 200 | yes | yes, sender-derived actor | `task.accepted` |
| Unknown room/workspace | 200 | yes | no | operator incident only if configured |
| Runtime enqueue unavailable | 503 | no | no | no |

`200` for rejected input means the gateway handled the homeserver transaction and prevents retry loops. `503` is reserved for cases where the gateway cannot durably record the outcome, so homeserver retry is useful.

## 9. Outbound Projection Rules

Only Runtime can decide outbound projection content. The gateway may send Matrix events with `as_token`, but projection requests must come from Runtime state or proof.

Projection rules:
- Use Runtime actor in projection content.
- Include task/proof/artifact references, not raw logs or secret-bearing payloads.
- Do not project a state transition unless Runtime state already contains that transition.
- Do not use Matrix room history to infer task state.

Failure projections:
- Invalid task input in a known workspace maps to `com.notyet.agent.task.rejected`.
- Boundary/security issues map to `com.notyet.agent.incident.created`.
- Worker/runtime execution failures are Runtime failures, not Matrix transaction failures; project them only after Runtime records the failure.

## 10. Contract Fixtures And Tests

Fixtures:

```text
fixtures/matrix-transactions/success.json
fixtures/matrix-transactions/duplicate-transaction.json
fixtures/matrix-transactions/duplicate-event.json
fixtures/matrix-transactions/invalid-schema.json
fixtures/matrix-transactions/spoofed-actor.json
fixtures/matrix-transactions/unknown-room.json
fixtures/matrix-transactions/failure-reply.json
fixtures/matrix-transactions/invalid-hs-token.json
```

Contract test:

```text
tests/contracts/matrix-appservice-transaction.test.mjs
```

The tests prove:
- Invalid `hs_token` does not commit idempotency or enqueue Runtime work.
- Duplicate transactions and events are harmless.
- Invalid Matrix input does not enqueue Runtime task work.
- Spoofed actor claims are bounded by Matrix sender provenance.
- Runtime events explicitly say `source_of_truth: runtime`.
- Runtime enqueue failure returns retryable failure without committing idempotency.

## 11. Implementation Entry Notes

Future implementation tasks should start with a fake transaction harness. Do not connect real Synapse, real Runtime queues, Codex, GitHub, or production secrets until the later development gates are satisfied.

Smallest next implementation slice after analysis closeout:

```text
MCR-200/MCR-201: fake transaction endpoint + hs_token validator + fixture-driven contract tests
```

Do not implement this in Phase 7.
