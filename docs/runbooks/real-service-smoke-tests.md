# Real-Service Compatibility Smoke Tests

## Status

Default: disabled. The current repo artifact is only a skipped scaffold in
`tests/e2e/real-service-smoke.skip.ts`.

Do not start a real Matrix service, real Codex execution, GitHub API client,
database, secret manager, or live memory writer from the default local test
path.

## Purpose

This smoke exists to check whether the local contracts can be compared against
a disposable real-service surface after explicit human approval.

Smoke evidence is compatibility proof. It is not a correctness source.
Correctness still comes from contract tests, schemas, fake E2E tests, proof
verification, and human review.

## Required Gate

The smoke remains blocked unless all gates are true:

- `MCR_REAL_SERVICE_SMOKE=1`
- `MCR_REAL_SERVICE_CREDENTIAL_SCOPE=disposable`
- human owner approved one run for one run id
- all credentials and resources are disposable and scoped to that run

Missing either environment gate means no real-service path may run.

## Manual Opt-In Command

```bash
MCR_REAL_SERVICE_SMOKE=1 MCR_REAL_SERVICE_CREDENTIAL_SCOPE=disposable node --test tests/e2e/real-service-smoke.skip.ts
```

This command is only a scaffold/manual gate check. It does not make real
services run by default, and the skipped placeholder remains disabled until a
future human-approved runner is added.

## Disposable Credential Scope

Disposable credential scope means:

- no production credentials
- no personal or long-lived tokens
- no broad organization, repo, room, database, or memory permissions
- credentials expire or are revoked after the run
- resource names include the run id so cleanup can find them

Record only credential scope names in evidence. Do not record credential values.

## Evidence Capture

For each approved manual run, capture:

- run id, branch, worktree path, base SHA, and head SHA
- explicit gate values without secrets
- disposable resource names and expiry or revocation plan
- command summaries and validation output
- artifact refs, proof refs, and diff refs
- cleanup result
- rollback result or rollback not-needed rationale

Evidence capture should prove what was observed without storing raw secrets,
large logs, raw Matrix events, raw Codex output, GitHub API payloads, database
dumps, or live memory writes.

## Cleanup

After the run:

- revoke disposable credentials
- remove disposable rooms, users, registrations, branches, and artifacts that
  were created only for the run
- stop any local processes created for the run
- remove temporary evidence working files after review, keeping only approved
  proof refs
- record cleanup status in the handoff

## Rollback

Rollback for this scaffold is deletion of:

- `docs/runbooks/real-service-smoke-tests.md`
- `tests/e2e/real-service-smoke.skip.ts`

If future work adds package wiring, remove that wiring in the same rollback.
No database migration, real AppService registration, GitHub automation, Codex
execution, deploy step, or live memory write is part of this scaffold.
