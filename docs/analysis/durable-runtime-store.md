# Durable Runtime Store Schema Contract

Version: 2026-06-29

Task ID: MCR-104

## Purpose

This document defines the minimum durable Runtime Store schema contract before a
database service, Postgres startup, or migrations exist.

The Runtime Store is the source of truth for task state, transition history,
idempotency, artifact references, proof references, and action-scoped approval
references. Matrix and GitHub are input, projection, and external artifact
surfaces only. Their room history, event bodies, PR bodies, worker logs, and
token material must not become the Runtime source of truth.

## Non-Goals

This task does not implement:

- a Runtime API, worker, queue, or app service;
- Postgres startup, SQL DDL, migrations, indexes, locks, or backups;
- Matrix, GitHub, Codex, object store, or live memory calls;
- raw log, raw diff, raw Matrix event, secret, or token storage.

## Store Snapshot Contract

`schemas/runtime/runtime-store.schema.json` defines a durable snapshot envelope:

| Field | Role |
|---|---|
| `store_id` | Stable snapshot identifier for tests and replay bundles. |
| `schema_version` | Contract version, currently `1`. |
| `source_of_truth` | Must be `runtime`. |
| `tasks` | Current Runtime task snapshots. |
| `task_transitions` | Append-only task state transition records. |
| `idempotency_keys` | Durable replay keys for Matrix input, Runtime commands, and external actions. |
| `proof_refs` | References to proof ledger entries and validation log refs. |
| `approval_refs` | Action-scoped approval refs with replay key hashes. |
| `artifact_refs` | Artifact metadata refs with URI, hash, kind, and size only. |

The snapshot is a contract artifact, not a preferred physical database layout.
Future SQL tables may normalize these records, but they must preserve the same
fields and rejection rules before replacing the fake/in-memory store.

## Durable Records

### Task Record

Task records persist Runtime-owned task state:

- `task_id`, `workspace_id`, and `trace_id`;
- current state, risk level, and current transition id;
- optional `source_matrix_event_ref` as a reference only;
- artifact/proof/approval id arrays.

Task records must not embed Matrix event bodies, room history, worker logs,
diffs, context packs, secrets, or external tokens.

### Task Transition Record

Transition records are append-only audit units:

- `transition_id`, `task_id`, and monotonic `sequence`;
- `from`, `to`, `trigger_event`, and actor;
- required artifact/proof/approval refs for gated transitions;
- Runtime audit event reference and timestamp.

The transition record mirrors the existing state-machine contract while keeping
only identifiers and refs.

### Idempotency Key Record

Idempotency records persist replay protection:

- key scope: Matrix transaction, Matrix event, Runtime command, or external
  action;
- operation name, request hash, result ref, status, and first/last seen time.

They store hashes and result refs, not request bodies, response bodies, Matrix
event bodies, or external API payloads.

### Proof Reference Record

Proof refs point to proof ledger evidence:

- `proof_id`, `task_id`, `run_id`, and `trace_id`;
- proof status and proof ledger URI;
- artifact refs and validation summary;
- validation log refs only.

Proof refs do not store raw validation output, raw worker stdout, or proof text
that should live in the proof ledger or object store.

### Approval Reference Record

Approval refs persist action-scoped authorization:

- `approval_id`, `task_id`, `proof_id`, action, status, actor, and target;
- conditions, expiry, optional use time, and replay key hash.

Approval refs authorize one exact action against one proof. They do not approve a
whole task, do not grant ongoing permission, and do not store Matrix approval
event bodies.

### Artifact Reference Record

Artifact refs persist metadata only:

- `artifact_id`, `task_id`, `run_id`, kind, URI, SHA-256, size, content type,
  and creation time.

Raw logs and raw diffs belong behind object/artifact storage with hashes. The
Runtime Store keeps `artifact://...` refs and hashes so proof can be audited
without turning the store into a log or patch blob database.

## Unsafe Data Rejection

The contract rejects unsafe inline records through `additionalProperties: false`,
safe string patterns, and fixture coverage:

- raw logs: `fixtures/runtime-store/invalid/runtime-store.raw-log.invalid.json`;
- raw diffs: `fixtures/runtime-store/invalid/runtime-store.raw-diff.invalid.json`;
- secrets: `fixtures/runtime-store/invalid/runtime-store.secret.invalid.json`;
- Matrix event bodies:
  `fixtures/runtime-store/invalid/runtime-store.matrix-event-body.invalid.json`;
- GitHub token material:
  `fixtures/runtime-store/invalid/runtime-store.github-token.invalid.json`.

The valid fixture stores only refs:
`fixtures/runtime-store/valid/minimal-store.valid.json`.

## Source-of-Truth Boundary

The durable Runtime Store owns:

- task state and transition history;
- idempotency and replay protection;
- refs to proof, approval, and artifacts.

Matrix owns collaboration events and human-visible projection. GitHub owns PRs
and checks after approval. Object storage owns larger artifacts and logs. None
of those external systems can be replayed as the Runtime task database.

## Validation

`tests/contracts/runtime-store.test.mjs` validates the schema, the valid minimal
snapshot, and the unsafe rejection fixtures. The standard repo validation remains:

```bash
pnpm test:contracts
pnpm schemas:validate
git diff --check
```
