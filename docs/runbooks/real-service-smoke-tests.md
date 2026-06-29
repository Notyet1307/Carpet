# Real-Service Compatibility Smoke Tests

## Status

Default: disabled. The current repo artifact is only a Matrix-only skipped scaffold in
`tests/e2e/real-service-smoke.skip.ts`.

Do not start a real Matrix service, real Codex execution, GitHub API client,
database, secret manager, or live memory writer from the default local test
path.

## Purpose

MCR-720 exists to preflight whether the local Matrix contracts can later be
compared against a disposable Matrix-only real-service surface after explicit
human approval.

Smoke evidence is compatibility proof. It is not a correctness source.
Correctness still comes from contract tests, schemas, fake E2E tests, proof
verification, and human review.

MCR-310 Codex proof remains separate and does not authorize Matrix smoke,
GitHub smoke, deploy, live memory writes, or any further real Codex execution.

## Required Gate

The smoke remains blocked unless all gates are true:

- `MCR_REAL_SERVICE_SMOKE=1`
- `MCR_REAL_SERVICE_CREDENTIAL_SCOPE=disposable`
- `MCR_REAL_SERVICE_TARGET=matrix`
- `MCR_MATRIX_SMOKE_RUN_ID=mcr-720-yyyymmddthhmmssz-<slug>`
- human owner approved one run for one run id
- all Matrix credentials and resources are disposable and scoped to that run

Missing any environment gate means no real-service path may run.

## Manual Opt-In Command

```bash
MCR_REAL_SERVICE_SMOKE=1 MCR_REAL_SERVICE_CREDENTIAL_SCOPE=disposable MCR_REAL_SERVICE_TARGET=matrix MCR_MATRIX_SMOKE_RUN_ID=mcr-720-20260629t120000z-example node --test tests/e2e/real-service-smoke.skip.ts
```

This command is only a scaffold/manual gate check. It does not make real
services run by default, and the skipped placeholder remains disabled until a
future human-approved runner is added.

## Manual Disposable Synapse Scaffold

`infra/matrix/synapse` contains a manual-only disposable Synapse compose
scaffold for a future approved Matrix-only smoke. It has no secrets and no
default service start: the service is behind the `manual` compose profile.

Future manual commands after one action-scoped approval:

```bash
cd infra/matrix/synapse
docker compose --profile manual config
docker compose --profile manual up -d synapse
docker compose --profile manual logs --tail=100 synapse
docker compose --profile manual down --volumes --remove-orphans
rm -rf data
```

Do not run these commands during scaffold review. They are documented so the
next approved smoke can separate homeserver start, evidence capture, stop, and
cleanup from test-runner implementation.

## AppService Registration Scaffold

`infra/matrix/synapse/appservice-registration.example.yaml` is an example-only
registration shape for a future approved MCR-720 Matrix smoke. It contains only
placeholder `as_token` and `hs_token` values.

Tokens must be generated per approved run and never committed. Generated
registrations must use the MCR-720 run id in the token scope, appservice
identity, namespace, artifact refs, and cleanup note.

The homeserver example references the example registration only so the shape is
visible to reviewers. Do not use the committed placeholder token values as smoke
credentials.

## Matrix-Only Disposable Resources

Each approved MCR-720 run must use Matrix-only disposable resources:

- disposable homeserver: local or throwaway, never production or personal
- disposable room: named with the run id and removed after the run
- bot/appservice identity: run-scoped user or namespace with no broad room access
- appservice registration: generated for that run, revoked or deleted after use
- run_id naming: `mcr-720-yyyymmddthhmmssz-<slug>` on every room, identity,
  registration, artifact ref, and cleanup note

No GitHub repo, Codex exec, database, deploy target, secret manager, or live
memory path is part of MCR-720.

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
large logs, raw Matrix events, raw Matrix event bodies, Matrix access tokens,
raw Codex output, GitHub API payloads, database dumps, or live memory writes.

## Cleanup

After the run:

- revoke disposable credentials
- remove the disposable homeserver if local to the run
- remove disposable rooms, bot/appservice identities, appservice registrations,
  branches, and artifacts that were created only for the run
- remove generated run-scoped AppService registration files and tokens
- stop any local processes created for the run
- remove temporary evidence working files after review, keeping only approved
  proof refs
- record cleanup status in the handoff

## Rollback

Rollback for this scaffold is deletion of:

- `infra/matrix/synapse/README.md`
- `infra/matrix/synapse/docker-compose.yaml`
- `infra/matrix/synapse/homeserver.example.yaml`
- `infra/matrix/synapse/appservice-registration.example.yaml`
- `docs/runbooks/real-service-smoke-tests.md`
- `tests/e2e/real-service-smoke.skip.ts`

If future work adds package wiring, remove that wiring in the same rollback.
No database migration, real AppService registration, GitHub automation, Codex
execution, deploy step, or live memory write is part of this scaffold.
