# Target System Design Alignment

Version: 2026-06-29

Task ID: Analysis-target-system-design-alignment

## Purpose

The local fake MVP proves the control flow and security contracts. It is not the
real service system.

The target system keeps the same boundaries while replacing fake adapters with
real, gated adapters one vertical slice at a time. The next phase must not add an
automatic commander loop, a separate review lane, or broad orchestration beyond
the existing Runtime-owned task path.

## Target System Boundary

Matrix is a collaboration entrance, human approval surface, and projection
timeline. Matrix events are untrusted input. Matrix is not the runtime source of
truth for task state, policy, work cells, proof, approval, memory, secrets, raw
logs, or worker lifecycle.

Runtime is the source of truth for:

- task state and transition history
- task graph and capability selection
- policy decisions and allowed or forbidden actions
- Work Cell creation, including branch, worktree path, base SHA, and cleanup
- proof ledger entries and proof verification
- action-scoped approval requests and approval authorization
- memory update proposals
- adapter calls after policy, proof, and approval gates pass

Codex workers execute only inside a Runtime-created Work Cell. For repo patch
work, Runtime or worker-runner creates the worktree first, records the branch and
base SHA, and launches Codex with `cwd = worktree_path`. Codex does not choose
its own worktree, edit the main checkout, push, merge, create PRs, approve its
own work, change policy, or write live memory.

The ordering is mandatory:

```text
Matrix input
-> Runtime validation and task state
-> policy decision
-> Runtime-created Work Cell
-> worker artifact
-> proof
-> proof verification
-> action-scoped approval request
-> human approval
-> external action
-> Matrix projection
-> memory.update.proposed
```

Proof comes before approval. Approval requests must reference a verified proof
id. Approval comes before external action. External actions include real Codex
exec smoke, GitHub PR creation, push, deploy, secret access, and any live memory
write path. Memory remains proposal-only in Runtime; applying a proposal must be
a reviewed human or PR path, not an automatic live memory write.

## Current Component Status

| Component | Status | Current evidence | Real gap |
|---|---|---|---|
| Matrix event schemas and fixtures | implemented fake | `schemas/matrix/*.schema.json`, `fixtures/matrix-events/**`, contract tests; one MCR-720 local disposable Matrix-only smoke pass | No production homeserver compatibility, room/user lifecycle, or persistent Runtime proof. |
| Fake Matrix transaction handler | implemented fake | `apps/matrix-appservice/src/transaction-handler.ts`; MCR-720 exercised one real AppService transaction through the local listener | No production AppService registration, durable ingress store, real room/user lifecycle automation, or persistent Runtime service. |
| Matrix projection adapter | implemented fake | `apps/matrix-appservice/src/projection-adapter.ts` | No real Matrix send-event path. |
| Runtime event queue | implemented fake | `tests/e2e/fakes/fake-runtime-event-queue.ts` | No durable queue or replay worker. |
| Runtime task state machine | implemented fake | `packages/state-machine/**` | No production Runtime API or durable transaction boundary. |
| Runtime task store | implemented fake; ref-only snapshot exporter and file snapshot adapter merged | `packages/runtime-store/src/in-memory-task-store.ts`, `packages/runtime-store/src/durable-snapshot-exporter.ts`, `packages/runtime-store/test/durable-snapshot-exporter.test.ts` | No DB persistence, Postgres store, migrations, multi-writer locking, replay recovery, production durable Runtime Store, or persistent Runtime service. |
| Capability registry and router | implemented fake | `packages/capability-router/**`, `runtime/capabilities.yaml` | No service-side graph compiler or runtime dispatch API. |
| Policy engine | implemented fake | `packages/policy-engine/**`, `runtime/policies/*.yaml` | No production policy service, no external identity or secret broker. |
| Work Cell manager | implemented fake | `packages/work-cell-manager/src/fake-worktree-manager.ts` | No real git worktree create/remove implementation in the Runtime path. |
| Fake Codex worker runner | implemented fake | `apps/worker-runner/src/fake-codex-process.ts`, local fake E2E | No default real Codex execution. |
| Codex exec smoke runner | guarded scaffold; passed once manually | `apps/worker-runner/src/codex-exec-runner.ts`; `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2` | Further runs still require explicit smoke flag, run-scoped human approval, scoped credentials, explicit env, and injected process runner. |
| Proof ledger and verifier | implemented fake | `packages/proof-ledger/**` | No object store, durable proof ledger, or verifier worker service. |
| Approval gate | implemented fake | `packages/approval-gate/**` | No durable approval service, Matrix identity binding, or production authorization store. |
| GitHub PR adapter | implemented fake | `packages/github-adapter/src/fake-github-adapter.ts` | No Octokit or Runtime-owned GitHub API write path. |
| Memory proposal flow | implemented fake | `workers/memory-curator-worker/**` | No reviewed PR/human application path for memory proposals. Runtime must still not write live memory. |
| Local fake E2E harness | implemented fake | `tests/e2e/local-fake-mvp.test.ts` | Proves contract flow only, not service compatibility. |
| Real-service smoke runbook and tests | guarded scaffold; MCR-720 passed once manually | `docs/runbooks/real-service-smoke-tests.md`, `tests/e2e/real-service-smoke.skip.ts`; evidence dir `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02` | Default path remains skipped; proof is local disposable compatibility only. |
| Real Matrix integration | local disposable smoke proof only | MCR-720 run id `mcr-720-20260629t130000z-matrix-smoke-02`: local Synapse, local AppService listener, one transaction | Production Matrix integration, persistent Runtime service, and room/user lifecycle automation remain not implemented. |
| Real GitHub PR integration | disposable PR create smoke passed once | MCR-730 created PR #1 in `Notyet1307/github-pr-smoke-sandbox`, then closed it unmerged and deleted both disposable branches | Runtime adapter remains fake/in-memory; this proves one manual sandbox `gh` create/cleanup path only, not production GitHub integration. |
| Production database, queue, and object storage | not implemented real integration | In-memory and fake stores only; Runtime Store can export a schema-valid ref-only snapshot and persist it to a local JSON file | Needs separate DB persistence, replay recovery, and production Runtime service slices. |
| Commander automation or separate review lane | not implemented real integration | Out of scope by design | Do not add in the next phase. |

## Fake MVP To Real System Evolution

Keep the local fake MVP as the regression source. It should continue to prove
that invalid Matrix input, duplicate intake, worker failure, fake proof, policy
bypass, approval replay, and secret-bearing logs stop before PR creation.

Replace one fake boundary at a time:

1. Keep the MCR-310 real Codex exec smoke proof as a one-time compatibility
   proof, not a default worker path.
2. Keep the MCR-720 disposable Matrix AppService smoke as one compatibility
   proof, not a production Matrix path.
3. Keep the MCR-730 disposable GitHub PR create smoke proof as one sandbox
   compatibility proof, not a Runtime GitHub adapter implementation.
4. Treat MCR-105 Runtime Store snapshot export and MCR-106 file snapshot
   persistence as local ref-only bridges from the in-memory store to the durable
   schema contract. Add DB persistence, replay recovery, or service integration
   only as later vertical slices after the adapter gates still preserve the same
   state, proof, approval, and memory boundaries.

Do not start with broad service orchestration. Do not add an automatic commander
loop. Do not add a separate review lane. The existing verifier/proof path is the
review boundary for the next slice.

## MCR-105 Runtime Store Snapshot Export Boundary

MCR-105 is merged at commit `2f57b7dfa62a15ec05d7d5b3e01adc5fd54ee137`. It
adds `exportRuntimeStoreSnapshot(...)`, which exports current in-memory Runtime
Store state into the durable Runtime Store schema envelope.

That closes one local contract proof only:

```text
in-memory Runtime task store
-> task snapshots and append-only transition records
-> runtime command idempotency records
-> supplied proof, approval, and artifact refs
-> schema-valid durable Runtime Store snapshot
```

The snapshot remains ref-only. It must not embed raw logs, raw diffs, Matrix
event bodies, PR bodies, worker stdout/stderr, token material, or live memory
content. The exporter rejects unsafe strings that would leak those classes of
data into exported fields.

This does not implement DB persistence, Postgres startup, SQL migrations, a
persistent Runtime service, Matrix/GitHub/Codex external calls, or live memory
writes. Persisting exported snapshots to a database remains future work.

## MCR-106 Runtime Store File Snapshot Persistence Boundary

MCR-106 adds the smallest file-based persistence proof for the exported Runtime
Store snapshot. It writes and reads schema-valid `RuntimeStoreSnapshot` JSON
files, validates snapshots on write and read with the existing runtime-store
schema helper, and writes atomically with a temp file plus rename.

That closes one local file adapter proof only:

```text
schema-valid RuntimeStoreSnapshot
-> temp JSON snapshot file
-> rename to target snapshot file
-> read JSON snapshot file
-> schema-valid RuntimeStoreSnapshot
```

The adapter preserves the MCR-105 ref-only boundary and rejects unsafe snapshot
content. It does not add DB persistence, Postgres, migrations, a persistent
Runtime service, Matrix/GitHub/Codex calls, live memory writes, production
durable Runtime Store semantics, or replay recovery. It is single-writer only;
concurrent writers need later unique temp names or locking.

## MCR-310 Closeout Boundary

MCR-310 has produced one manual real Codex exec smoke proof on 2026-06-29:
`fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
`8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`.

That closes one compatibility proof around Codex exec only:

```text
checked-in task fixture
-> Runtime validates scope and policy
-> Runtime creates a real git worktree outside the main checkout
-> manual approval for one codex_exec_smoke run is checked before the real Codex call
-> guarded Codex exec runner uses cwd = worktree_path
-> runner captures JSONL, final JSON, diff, validation log, and proof refs
-> proof verifier accepts or rejects the proof
-> post-proof approval gate remains fake/in-memory for simulated PR only
-> GitHub remains fake; no PR API call
-> Matrix remains fake/projection-only
-> memory remains memory.update.proposed only
```

Acceptance boundary:

- requires explicit human approval before one `codex_exec_smoke` run id
- uses disposable or scoped credentials only
- rejects main-checkout cwd
- rejects secret-bearing environment
- records command, exit code, artifact refs, cleanup, risk, and rollback notes
- proves no GitHub, Matrix, deploy, merge, secret, or live memory call occurs

This proof does not make real Codex execution the default worker path and does
not validate real Matrix, real GitHub PR/API calls, deploy, or live memory
writes. MCR-310 Codex proof remains separate and does not authorize Matrix
smoke. MCR-720 Matrix proof is separate; future MCR-720 runs remain manual and
skipped-by-default unless separately approved.

## MCR-720 Closeout Boundary

MCR-720 has produced one manual Matrix-only real smoke proof on 2026-06-29:
`/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02`.

That closes one compatibility proof around local Matrix ingress only:

```text
local disposable Synapse
-> generated run-scoped AppService registration
-> local AppService listener on 127.0.0.1:9009
-> one PUT /_matrix/app/v1/transactions/txn_mcr_720_smoke_02
-> transaction handler returns status=200 and {"code":"ok","retryable":false}
-> cleanup stops compose, removes generated files/data, and leaves no 8008/8448/9009 listeners
```

Decisive proof files include `transaction.exit_code`, `transaction.stdout`,
`listener.kill0.before-transaction.exit_code`,
`listener.lsof.before-transaction.stdout`,
`listener.bound.before-transaction.exit_code`,
`docker-compose-down.cleanup.exit_code`, `cleanup-lsof-8008.proof`,
`cleanup-lsof-8448.proof`, `cleanup-lsof-9009.proof`, `generated-cleanup.txt`,
and `cleanup-paths.stdout`.

Non-blocking note: the first run failed because the listener process was not
alive when Synapse submitted the transaction. The second run used a durable
listener and direct transaction exit-code capture.

This proof does not validate production Matrix integration, a persistent Runtime
service, real room/user lifecycle automation, production GitHub PR/API calls,
deploy, or live memory writes. It does not make MCR-720 production-ready.

## MCR-730 GitHub PR Smoke Boundary

MCR-730 has one manual disposable GitHub PR create smoke pass on 2026-06-29. It
does not implement Octokit, a `gh pr create` wrapper, or any Runtime-owned
GitHub write path.

Current status: GO for the completed sandbox smoke only. Runtime GitHub adapter
integration remains not implemented.

Proof:

- Target repo: `Notyet1307/github-pr-smoke-sandbox`.
- PR: https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/1.
- Base branch:
  `mcr-730-base-mcr-730-20260629t140000z-github-pr-smoke-01`.
- Head branch:
  `mcr-730-head-mcr-730-20260629t140000z-github-pr-smoke-01`.
- Base SHA / sandbox `main` SHA before cleanup:
  `4438b7a905d12fead4f539e6faf349b8a2464f60`.
- Head SHA: `d04d80e36881633c53f2f0c018be4b4653c503f2`.
- Cleanup result: PR #1 is `closed`, `merged=false`; sandbox `main` SHA remains
  `4438b7a905d12fead4f539e6faf349b8a2464f60`; both disposable branch refs are
  missing after deletion.
- Branch protection proof: repo ruleset `protect-main` has `enforcement=active`
  and `target=branch`.
- Credential boundary: commands used
  `GH_TOKEN="$MCR_GITHUB_DISPOSABLE_TOKEN"` with a temporary `GH_CONFIG_DIR`; no
  token values or environment dumps were recorded.

The current `packages/github-adapter` path is still fake and contract-only. It
records `SimulatedPullRequest` objects in memory and exports no real GitHub API,
push, or merge path.

Required disposable target:

- Use a throwaway repository by default.
- If a throwaway repository is not used, the repository must have an explicitly
  disposable branch policy for the run id.
- The target must not be production `main`, and no smoke may push to or merge
  into production `main`.

Required credential boundary:

- Use a scoped, disposable GitHub credential created for the smoke target.
- Do not use a broad main-account token by default.
- Evidence may record credential class, account class, target repo, selected
  permissions, and expiry/revocation status. It must not record token values.

Approval gate:

- Require one action-scoped human approval for exactly one `run_id`.
- Approval must name `action=create_pr`, the disposable repo, source branch,
  base branch, task id, proof id, and expiry.
- Approval cannot authorize merge, push to main, deploy, secret access, or live
  memory write.

Proof requirements for any future approved run:

- command shape used for PR creation, without token values
- PR URL
- source branch and base branch
- base SHA and head SHA
- proof id and approval id
- captured `gh auth status` or equivalent credential-scope summary without
  secrets
- cleanup status, including whether the PR was closed and whether the smoke
  branch was deleted

Forbidden actions:

- merge PR
- push production `main`
- deploy
- dump secrets or token values
- write live memory
