# Real-Service Compatibility Smoke Tests

## Status

Default: disabled. The current repo artifact is only a Matrix-only skipped scaffold in
`tests/e2e/real-service-smoke.skip.ts`.

Do not start a real Matrix service, real Codex execution, GitHub API client,
database, secret manager, or live memory writer from the default local test
path.

MCR-720 has one approved Matrix-only real smoke pass on 2026-06-29. That pass
does not change the default path: future real-service runs remain manual,
opt-in, action-scoped, and disabled by default.

MCR-850 has one approved real vertical smoke pass on 2026-06-29. That pass is
compatibility proof only. It does not make the smoke default-on and does not
authorize production Matrix, production GitHub, merge, deploy, DB/Postgres
migration, live memory write, production main push, or secret dump.

## Purpose

MCR-720 exists to preflight whether the local Matrix contracts can later be
compared against a disposable Matrix-only real-service surface after explicit
human approval.

Evidence retention and cleanup for all real-service smoke work must follow
`docs/runbooks/evidence-retention-and-cleanup.md`.

Smoke evidence is compatibility proof. It is not a correctness source.
Correctness still comes from contract tests, schemas, fake E2E tests, proof
verification, and human review.

MCR-310 Codex proof remains separate and does not authorize Matrix smoke,
GitHub smoke, deploy, live memory writes, or any further real Codex execution.

MCR-850 combines already-gated paths for one approved disposable vertical run.
It is still not a correctness source or production readiness signal.

## Passed Run Record

Run id: `mcr-720-20260629t130000z-matrix-smoke-02`.

Scope:

- local disposable Synapse
- local AppService listener
- one AppService transaction

Evidence dir:

```text
/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02
```

Key proof files:

- `transaction.exit_code`: `exit_code=0`
- `transaction.stdout`: `status=200` and `{"code":"ok","retryable":false}`
- `listener.kill0.before-transaction.exit_code`
- `listener.lsof.before-transaction.stdout`
- `listener.bound.before-transaction.exit_code`
- `docker-compose-down.cleanup.exit_code`
- `cleanup-lsof-8008.proof`
- `cleanup-lsof-8448.proof`
- `cleanup-lsof-9009.proof`
- `generated-cleanup.txt`
- `cleanup-paths.stdout`

Cleanup proof records `docker compose down` exit code 0, no listeners on
8008/8448/9009, and removed generated credentials/data.

Non-blocking note: the first run failed because the listener process was not
alive when Synapse submitted the transaction. The second run used a durable
listener and direct transaction exit-code capture.

This is compatibility proof only. Production Matrix integration, persistent
Runtime service, real room/user lifecycle automation, GitHub/deploy/live memory,
and production readiness remain not done.

## MCR-850 Passed Vertical Smoke Record

Run id: `mcr-850-20260629t170000z-vertical-smoke-01`.

Evidence dir:

```text
/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01
```

Scope:

- Matrix local fixture/runtime path only; no Synapse or AppService service was
  started for this run.
- Codex exec exactly one attempt, exit code 0.
- GitHub disposable sandbox PR create and cleanup.

Codex command shape:

```bash
codex exec --json --sandbox workspace-write --output-schema ./schemas/codex/codex-exec-smoke-result.schema.json -
```

Codex env keys were `PATH` and `CODEX_HOME` only. Evidence must not include a
token value or full environment dump.

GitHub proof:

- Target repo: `Notyet1307/github-pr-smoke-sandbox`.
- PR: #2.
- Cleanup: PR #2 closed with `merged=false`.
- Disposable base/head branches deleted.
- Open PR count for that head after cleanup: 0.
- Sandbox `main` SHA before and after cleanup:
  `4438b7a905d12fead4f539e6faf349b8a2464f60`.

Cleanup proof:

- Ports `8008`, `8448`, and `9009` had no listeners after cleanup.
- Generated smoke file was deleted after commander review.
- Evidence directory was retained locally.
- Commander validation re-run: `pnpm test:contracts` 84/84 pass,
  `pnpm schemas:validate` 84/84 pass, and `git diff --check` pass.

Boundary: no Carpet commit, push, merge, or PR; no merge, deploy, DB/Postgres
migration, live memory write, production main push, or secret dump. This is
compatibility proof only, not production readiness.

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

## MCR-850 Manual Vertical Smoke Scaffold

MCR-850 manual vertical smoke scaffold is default disabled and does not authorize real execution.
It exists so preflight can see a Runtime-owned manual path shape before a
separate one-run approval exists.

Real execution requires another action-scoped human approval for one fresh
`mcr-850-yyyymmddthhmmssz-<slug>` run id. This scaffold must not start Docker,
Synapse, an AppService listener, real `codex exec`, real `gh pr create`, branch
creation or deletion, PR close, deploy, database, secret manager, or live memory
write during normal local tests.

The planned order is:

```text
Matrix/local fixture ingress -> Runtime snapshot -> approved Codex exec -> proof verification -> approval -> disposable GitHub PR create -> cleanup/projection
```

The fully gated manual path may report `wouldCallRealServices=true` only as a
readiness signal. Local tests must use an injected/fake step runner; no
production service client or ambient credential fallback is allowed.

Required gates:

- run id: `mcr-850-yyyymmddthhmmssz-<slug>`
- action-scoped human approval: `mcr_850_vertical_smoke`
- disposable Matrix target only
- Codex smoke approval scope: `codex_exec_smoke`
- Codex credential scope: `disposable`
- explicit Codex env key list; do not forward `process.env`
- disposable GitHub token presence only: `set` or `unset`
- disposable GitHub target: `Notyet1307/github-pr-smoke-sandbox`
- disposable GitHub base/head branches named with the run id; no production
  `main` target
- run-scoped `evidence_dir`
- cleanup plan covering Matrix services, PR close, disposable branch deletion,
  disposable credential revocation, and generated Matrix file removal

Allowed actions are only Matrix/local ingress, Runtime snapshot, Codex smoke,
proof verification, approval request, disposable PR creation, and
cleanup/projection. No merge, no deploy, no live memory write, no production
main push, and no token values may appear in evidence.

## Manual Disposable Synapse Scaffold

`infra/matrix/synapse` contains a manual-only disposable Synapse compose
scaffold for a future approved Matrix-only smoke. It has no secrets and no
default service start: the service is behind the `manual` compose profile.

Future manual commands after one action-scoped approval:

```bash
cd infra/matrix/synapse
RUN_ID=mcr-720-yyyymmddthhmmssz-slug
MCR_MATRIX_SMOKE_RUN_ID="$RUN_ID" \
  node ../../../apps/matrix-appservice/src/index.ts generate-matrix-smoke-config

export MCR_MATRIX_RUN_DIR="$PWD/generated/$RUN_ID"
docker compose --profile manual config
docker compose --profile manual up -d synapse
docker compose --profile manual logs --tail=100 synapse
docker compose --profile manual down --volumes --remove-orphans
rm -rf data
rm -rf "generated/$RUN_ID"
```

Do not run these commands during scaffold review. They are documented so the
next approved smoke can separate homeserver start, evidence capture, stop, and
cleanup from test-runner implementation.

## AppService Registration Scaffold

`infra/matrix/synapse/appservice-registration.example.yaml` is an example-only
registration shape for a future approved MCR-720 Matrix smoke. It contains only
placeholder `as_token` and `hs_token` values. The compose file must not mount
that tracked example as the live smoke registration.

Tokens must be generated per approved run and never committed. Generated
registrations must use the MCR-720 run id in the token scope, appservice
identity, namespace, artifact refs, and cleanup note.

Generate the run-scoped files with:

```bash
cd infra/matrix/synapse
RUN_ID=mcr-720-yyyymmddthhmmssz-slug
MCR_MATRIX_SMOKE_RUN_ID="$RUN_ID" \
  node ../../../apps/matrix-appservice/src/index.ts generate-matrix-smoke-config
export MCR_MATRIX_RUN_DIR="$PWD/generated/$RUN_ID"
```

This writes untracked `appservice-registration.yaml`, `log.config`, and
`listener.env` under `MCR_MATRIX_RUN_DIR`. The homeserver example references
`/data/appservice-registration.yaml`, which is the generated compose mount.
Do not use the committed placeholder token values as smoke credentials.

## AppService HTTP Listener Scaffold

`apps/matrix-appservice/src/http-listener.ts` contains a minimal Node built-in
HTTP listener factory for future approved Matrix-only smoke work. AppService HTTP listener start is manual-only: no default command, skipped test, Docker compose, or package script starts it.

The listener is only the `registration.url` target glue for
`PUT /_matrix/app/v1/transactions/:txn_id`; it reuses the existing
`apps/matrix-appservice` transaction handler for Matrix validation and runtime
event mapping.

The default generated registration URL is `http://host.docker.internal:9009`.
That is the Docker Desktop host route for a Synapse container to reach a
listener bound on the host at `127.0.0.1:9009`. Registration url must match the listener host and port chosen for the approved run. If the listener binds a
different localhost port or host, set `MCR_MATRIX_APPSERVICE_REGISTRATION_URL`
before running `generate-matrix-smoke-config`, and remove the generated files
during cleanup.

Manual listener start path after the generated `listener.env` exists:

```bash
cd infra/matrix/synapse
RUN_ID=mcr-720-yyyymmddthhmmssz-slug
export MCR_MATRIX_RUN_DIR="$PWD/generated/$RUN_ID"
set -a
. "$MCR_MATRIX_RUN_DIR/listener.env"
set +a
export MCR_MATRIX_ROOM_ID='!mcr_720_room:mcr-720.localhost'
export MCR_MATRIX_WORKSPACE_ID='ws_mcr_720'
node ../../../apps/matrix-appservice/src/index.ts listen
```

`MCR_MATRIX_APPSERVICE_HS_TOKEN` must come from the generated `listener.env`
for the same run id. The listener binds `127.0.0.1:9009` by default only when
the `listen` command is explicitly invoked.

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
Keep raw review material local under `.mcr/runs/<run_id>/`; tracked closeout docs
may record only refs, paths, SHAs, exit codes, command shapes, redacted
summaries, and cleanup status.

## Cleanup

After the run:

- revoke disposable credentials
- remove the disposable homeserver if local to the run
- remove disposable rooms, bot/appservice identities, appservice registrations,
  branches, and artifacts that were created only for the run
- remove generated run-scoped AppService registration files and tokens:
  `MCR_MATRIX_RUN_DIR/appservice-registration.yaml`,
  `MCR_MATRIX_RUN_DIR/log.config`, and `MCR_MATRIX_RUN_DIR/listener.env`
- stop any local processes created for the run
- keep decisive evidence under `.mcr/runs/<run_id>/` until human review and
  cleanup review are complete
- remove only disposable resources, generated credentials, generated
  registrations, token-bearing files, and non-decisive temporary files
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
