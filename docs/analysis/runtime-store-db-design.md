# Runtime Store DB Design Before Implementation

Version: 2026-06-30

Task ID: MCR-910

## Purpose

This is design only. It authorizes no DB implementation, Postgres startup, SQL
DDL, migrations, docker service, Runtime service, Matrix/GitHub/Codex call, live
memory write, deploy, merge, push, or production main write.

The current implemented persistence path remains MCR-106: a local single-writer
file snapshot adapter for schema-valid `RuntimeStoreSnapshot` JSON files.

## Source Of Truth

Runtime owns the source of truth for task state, transition history,
idempotency, proof refs, approval refs, artifact refs, and run/evidence refs.

Matrix is untrusted input, human collaboration, approval surface, and projection
timeline. GitHub is an external artifact/action surface after proof and
action-scoped approval. Memory is proposal-only until a reviewed human or PR path
applies it. None of Matrix, GitHub, memory, worker logs, room history, PR bodies,
or external service payloads may become the Runtime task database.

## Future Minimal Records

A future DB store should keep the current snapshot contract, but it does not need
a giant schema. The smallest useful record set is:

- `tasks`: one current row per Runtime task, including workspace, trace, state,
  risk, current transition id, timestamps, and ref arrays or join records.
- `task_transitions`: append-only transition rows with sequence, from/to state,
  trigger, actor, requirement refs, audit event ref, and occurred time.
- `idempotency_keys`: one durable replay key per Matrix transaction/event,
  Runtime command, or external action, storing request hash, status, result ref,
  and first/last seen times.
- `proof_refs`: proof id, task/run/trace ids, proof status, ledger URI, artifact
  refs, validation summary counts, and validation log refs.
- `approval_refs`: action-scoped approval id, proof id, target ref, conditions,
  status, replay key hash, expiry, and use time.
- `artifact_refs`: artifact id, task/run ids, kind, URI, SHA-256, size, content
  type, and creation time.
- `run_evidence_refs`: optional small index from run id to proof/artifact/log
  refs, if proof lookup by run becomes awkward. It must store refs only.

The DB layout may normalize arrays into join tables only when implementation
needs it. The contract-level shape remains the durable snapshot fields in
`schemas/runtime/runtime-store.schema.json`.

## Transaction Boundary

Applying a state transition is one atomic Runtime transaction:

1. Read the current task row for update.
2. Reject if `expected_state` does not match the current task state.
3. Check the idempotency key and request hash.
4. If the key is already applied, return the recorded result ref without
   appending a new transition.
5. Validate the transition with the state-machine rules.
6. Insert the transition row with the next per-task sequence.
7. Update the task current state, current transition id, timestamps, and ref
   links.
8. Upsert the idempotency record with status and result ref.
9. Insert or link proof, approval, artifact, and run/evidence refs supplied by
   the command.
10. Commit.

No Matrix projection, GitHub write, Codex exec, memory write, or object-store
upload belongs inside this transaction. Those are later effects driven from
committed Runtime state plus proof and approval gates.

## Replay And Recovery

The future DB store should recover from either:

- append-only `task_transitions` plus current `tasks`; or
- periodic schema-valid snapshots plus the transition log after the snapshot.

On startup or recovery, Runtime must validate stored records against the current
contract, rebuild current task state, rebuild idempotency state, and fail closed
on unknown schema versions, unsafe inline data, broken sequence order, or missing
required refs. Matrix room history, GitHub PR history, logs, or memory notes are
not replay sources for Runtime task state.

Snapshots are acceleration and audit artifacts, not the only source of truth.
The append-only transition log remains the recovery baseline once DB persistence
exists.

## Locking

The first DB implementation may assume a single Runtime writer process if it
states that assumption in code and docs. Under that assumption, per-task row
locking inside the transition transaction is enough.

Upgrade only when concurrency matters:

- enforce unique `(task_id, sequence)` and unique idempotency keys;
- use row-level locks or optimistic compare-and-swap on task version;
- add a lease/fencing token if multiple Runtime writer processes exist.

Do not add distributed locking before there is a measured multi-writer need.

## Retention And Redaction

The Runtime Store keeps refs, hashes, timestamps, summaries, statuses, and small
safe identifiers. It must not store:

- raw Matrix event bodies or room history;
- raw worker stdout/stderr, raw logs, or raw validation output;
- raw diffs, patches, PR bodies, or review text;
- token, env, secret, DB URL, private key, or credential material;
- live memory content or applied memory bodies;
- external API request/response bodies.

Large evidence belongs behind artifact/proof/object refs with hashes and
retention policy. Runtime DB retention may delete or expire refs only according
to an explicit later evidence-retention policy; it must not silently erase
transition history needed for replay and audit.

## Migration Gate

No DB or migration task may start until all of this is true:

- MCR-910 is accepted as a design artifact.
- The implementation task has a narrow allowlist for DB code, migrations,
  tests, fixtures, and docs.
- Schema/fixture/contract-test changes are approved first if the snapshot
  contract must change.
- The task states whether it is single-writer or multi-writer.
- The task defines rollback, backup, replay, and unsafe-data rejection proof.
- Production Matrix/GitHub/Codex/live-memory actions remain out of scope unless
  separately approved by their own gates.

## Future Implementation Proof

A later DB implementation must prove:

- duplicate idempotency key returns the same result ref without a second
  transition;
- stale `expected_state` rejects and records a rejected idempotency result;
- valid transition commits task update, transition append, idempotency, and refs
  atomically;
- recovery rebuilds current state from transition log or snapshot plus log;
- unsafe raw Matrix/log/diff/token/env material is rejected;
- single-writer or locking assumptions are tested;
- `pnpm test:contracts`, `pnpm schemas:validate`, package tests, and
  `git diff --check` pass.

This design does not claim production readiness.
