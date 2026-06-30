# Target System Design Alignment

Version: 2026-06-30

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
| GitHub PR adapter | fake default plus disabled scaffold; local refusal matrix complete; MCR-1046 audit GO; MCR-1047 aligned runtime-orchestrator coverage to public `api_summary`; MCR-1049 chose further restriction of internal legacy stdout compatibility; MCR-1050 completed that local restriction in commit `d584579566782aa7cbd51c00e59e53966b64b95d` | `packages/github-adapter/src/fake-github-adapter.ts`; `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`; `fixtures/github-adapter/refusals/GH-REF-001` through `GH-REF-026`; package tests assert no runner calls; runtime-orchestrator integration now uses `api_summary` | No production GitHub adapter, Octokit path, default real GitHub write, merge, deploy, production main write, branch deletion, fetch-capable path, broad-token path, or stdout/stderr public runner-result contract. Legacy stdout PR URL fallback remains github-adapter internal compatibility only and is restricted to absent-`api_summary` legacy local runner results; present invalid or mismatched `api_summary` returns `pr_url_missing`. |
| Memory proposal flow | implemented fake | `workers/memory-curator-worker/**` | No reviewed PR/human application path for memory proposals. Runtime must still not write live memory. |
| Local fake E2E harness | implemented fake | `tests/e2e/local-fake-mvp.test.ts` | Proves contract flow only, not service compatibility. |
| Real-service smoke runbook and tests | guarded scaffold; MCR-720 and MCR-850 passed once manually | `docs/runbooks/real-service-smoke-tests.md`, `tests/e2e/real-service-smoke.skip.ts`; MCR-720 evidence dir `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02`; MCR-850 evidence dir `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01` | Default path remains skipped; proof is disposable compatibility only, not production readiness. |
| Real Matrix integration | local disposable smoke proof only | MCR-720 run id `mcr-720-20260629t130000z-matrix-smoke-02`: local Synapse, local AppService listener, one transaction | Production Matrix integration, persistent Runtime service, and room/user lifecycle automation remain not implemented. |
| Real GitHub PR integration | disposable PR create smoke passed once | MCR-730 created PR #1 in `Notyet1307/github-pr-smoke-sandbox`, then closed it unmerged and deleted both disposable branches | Runtime adapter remains fake/in-memory; this proves one manual sandbox `gh` create/cleanup path only, not production GitHub integration. |
| Real vertical smoke | disposable vertical smoke passed once | MCR-850 run id `mcr-850-20260629t170000z-vertical-smoke-01`: local fixture/runtime Matrix path, one approved Codex exec attempt exit 0, disposable sandbox PR #2 create, cleanup completed | Compatibility proof only; no real Synapse/AppService service, production GitHub, merge, deploy, DB/Postgres migration, live memory write, production main push, or secret dump. |
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
4. Keep the MCR-850 approved vertical smoke proof as one disposable
   compatibility proof, not production readiness or default automation.
5. Treat MCR-105 Runtime Store snapshot export and MCR-106 file snapshot
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

## MCR-910 Runtime Store DB Design Boundary

MCR-910 adds `docs/analysis/runtime-store-db-design.md` as a design-only gate
before any DB/Postgres work. It defines the future minimal record set as tasks,
append-only transitions, idempotency keys, proof refs, approval refs, artifact
refs, and optional run/evidence refs.

The future DB transition boundary must atomically validate expected state,
dedupe idempotency, append the transition, update the task, and record supplied
refs. Replay must come from Runtime-owned transitions or snapshot plus
transition log, not from Matrix, GitHub, memory, logs, or PR history. Raw Matrix
events, raw logs, raw diffs, token/env material, and live memory bodies remain
excluded.

This is not DB implementation, migration authorization, production Runtime
readiness, or a persistent service.

## MCR-920 Matrix Room/User Lifecycle Design Boundary

MCR-920 adds `docs/analysis/matrix-room-user-lifecycle-design.md` as a
design-only gate before real Matrix room or user lifecycle work.

The design keeps Matrix as collaboration, approval, and projection surface, not
Runtime source of truth. Runtime owns room bindings, user and approval identity
bindings, deny-by-default permission decisions, projection idempotency, cleanup
refs, and revocation refs.

Future Matrix implementation must start with room/user binding contracts and
fixtures before any room creation, invite automation, membership automation,
production AppService deployment, real Matrix send path, or production
homeserver setup.

This is not production Matrix integration, room/user automation authorization,
real Matrix send authorization, production Runtime readiness, or a persistent
service.

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
does not implement Octokit or a production Runtime-owned GitHub write path.
MCR-840 later added a disabled command-shaped `gh pr create` scaffold with an
injected runner; that scaffold is not enabled by default and is not production
GitHub integration.

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
records `SimulatedPullRequest` objects in memory by default. The disabled
MCR-840 scaffold is explicitly not a merge, deploy, production main, branch
deletion, broad-token, ambient-auth, or live-memory path.

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

## MCR-940 GitHub Adapter Hardening Boundary

MCR-940 adds `docs/analysis/github-adapter-hardening-plan.md` as a planning
gate before any future real GitHub adapter hardening or implementation slice.

The plan keeps the default Runtime path fake/in-memory, treats MCR-840 as a
disabled scaffold only, and requires future code to keep explicit credentials,
injected runner/client, disposable targets, run-id-bound base/head refs, verified
proof, action-scoped approval, cleanup proof, branch deletion proof, and redacted
evidence.

This is not GitHub implementation, Octokit authorization, real smoke
authorization, PR creation, branch deletion, merge, deploy, production main
write, broad token use, or live memory authorization.

## MCR-1030 GitHub Adapter Refusal Matrix Readiness Boundary

MCR-1030 confirms the local GitHub adapter refusal matrix is readiness GO for
the current fake/guarded adapter boundary only. GH-REF-001 through GH-REF-026 all
exist under `fixtures/github-adapter/refusals/`, all are supported local
fixtures, and package tests assert each refusal before runner execution.

The accepted local semantics are:

- credential gates require explicit disposable or scoped authority and no
  ambient env fallback before execution
- approval preview is non-consuming
- local target, ref, protection, dirty-worktree, body, and evidence refusals do
  not consume approval
- runtime-orchestrator coverage keeps GitHub target, repository, and run id
  correlated with the approved proof/approval envelope

This is not production GitHub readiness. It does not authorize Octokit,
`gh pr create`, `gh api`, fetch calls, PR creation, branch deletion, merge,
deploy, production `main` writes, broad-token use, token/env dumps, secret
reads, or live memory writes.

## MCR-1040 GitHub Adapter Bounded Expansion Planning Boundary

MCR-1040 adds
`docs/analysis/github-adapter-bounded-expansion-plan.md` as a planning-only
boundary after the MCR-1030 refusal matrix readiness audit.

The target system may next design the smallest local-only adapter expansion
slice, such as an injected client/runner interface shape or command/API
redaction contract. That future design must preserve explicit scoped or
disposable credential input, action-scoped approval, verified proof, run id,
target, base ref, head ref, no ambient auth, no runner call on refusals, and
redacted evidence refs.

This is not implementation permission. It does not permit real GitHub calls,
Octokit, `fetch`, `gh api`, `gh pr create`, PR creation, branch deletion, merge,
deploy, production `main` writes, token reads, secret reads, env dumps, raw
payload logging, or live memory writes.

## MCR-1041 Through MCR-1049 GitHub Adapter Local Expansion Boundary

MCR-1041 chose the local expansion order after MCR-1040: redacted command/API
contract first, injected runner/client interface tightening second. MCR-1042
completed and was accepted as the first local-only redacted command/API summary
contract slice in commit `fcdd4caff37ecbca64b34635e209afb5fa4b9fd7`.

The accepted MCR-1042 boundary keeps the compatibility path local: structured
`api_summary` is accepted on success, legacy local stdout URL extraction is
limited to repo-scoped PR URLs for github-adapter internal compatibility, and
retained proof is rebuilt from redacted fields instead of raw stdout, stderr,
token/env material, raw API payload, raw patch/diff, raw PR body, or raw approval
payload material.

MCR-1043 is a docs-only closeout. MCR-1044 completed and was accepted in commit
`367c625fe05e76e865ed2dab45f0f4d19ceb0167` as the second local-only sequencing
step: injected runner interface tightening around the MCR-1042 redacted
contract. Exported `RuntimeOwnedGitHubPrRunnerResult` now retains only
`exit_code` plus `api_summary`, and exported `RuntimeOwnedGitHubPrRunner` no
longer standardizes runner stdout/stderr as public contract fields. Legacy
stdout PR URL compatibility remains only as an internal local helper. Retained
proof and evidence still come from redacted `api_summary` fields and evidence
refs, not raw stdout, stderr, token/env material, raw API payload, raw
patch/diff, raw PR body, or raw approval payload material.

MCR-1045 is a docs-only closeout for that completed status. MCR-1046 completed
a clean GO read-only audit: validation was green, MCR-1044 was no longer active
next, docs did not authorize real GitHub, and source-drift grep found no real
GitHub, network, or process execution path. MCR-1047 completed and merged in
commit `56f76f7a6354f074589fc126076ba767711689f5`; it changed only
`tests/e2e/runtime-orchestrator-cli.test.ts` so runtime-orchestrator GitHub PR
integration uses the public `api_summary` runner result. Legacy stdout PR URL
fallback coverage remains only inside github-adapter package tests and internal
compatibility.

MCR-1049 completed that docs/design decision. Decision: further restrict, not
remove now. Evidence did not support removal because github-adapter package
tests still intentionally covered bounded internal compatibility, but the target
system should not let legacy stdout mask a present invalid structured
`api_summary`. MCR-1050 completed and merged at commit
`d584579566782aa7cbd51c00e59e53966b64b95d`. It made the restriction local to the
github-adapter: fallback may remain only for legacy local runner results that
omit `api_summary`; present-but-invalid or mismatched `api_summary` rejects with
`pr_url_missing` instead of recovering from stdout; runtime-orchestrator remains
on the public `api_summary`; no real GitHub, network-capable client, external
process execution path, Octokit, `fetch`, `gh api`, or `gh pr create` path was
added. MCR-1052 then completed as a GO read-only audit at repository SHA
`621b3b660384a7fb11c2f0827c569a8ca1f3248b`: github-adapter tests were 46/46,
runtime-orchestrator tests were 13/13, contract/schema validation was 84/84
under both commands, top-level tests were 233/233, `git diff --check` passed, no
real GitHub/network/process execution path was found, and runtime-orchestrator
still used public `api_summary`. MCR-1053 is the docs-only closeout for that
audit. MCR-1054 completed the read-only/design removal decision: keep the
fallback as bounded github-adapter internal compatibility, do not propose source
removal now, and require any future removal attempt to start from new local
evidence plus an explicit source/test allowlist. The next recommended task is
MCR-1055 Post-GitHub Adapter Backlog Source-of-Truth Review. This boundary still
does not authorize real GitHub calls, Octokit, `fetch`, `gh api`,
`gh pr create`, PR creation, source removal, branch deletion, merge, deploy,
production `main` writes, token reads, secret reads, env dumps, raw payload
logging, a network-capable client, or live memory writes.

## MCR-850 Real Vertical Smoke Boundary

MCR-850 has one approved real vertical smoke pass on 2026-06-29 for run id
`mcr-850-20260629t170000z-vertical-smoke-01`.

Current status: GO for the completed disposable vertical compatibility smoke
only. Production readiness remains not proven.

Proof:

- Evidence dir:
  `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01`.
- Matrix path: local fixture/runtime path only; no Synapse or AppService service
  started for this run.
- Codex exec: exactly one attempt, exit code 0.
- Codex command shape:
  `codex exec --json --sandbox workspace-write --output-schema ./schemas/codex/codex-exec-smoke-result.schema.json -`.
- Codex env keys: `PATH` and `CODEX_HOME`; no token or full env dump.
- GitHub target: `Notyet1307/github-pr-smoke-sandbox`.
- PR: #2.
- Cleanup result: PR #2 closed with `merged=false`; disposable base/head
  branches deleted; open PR count for that head was 0.
- Sandbox `main` SHA before and after cleanup:
  `4438b7a905d12fead4f539e6faf349b8a2464f60`.
- Ports `8008`, `8448`, and `9009` had no listeners after cleanup.
- Generated smoke file was deleted after commander review; evidence directory
  was retained locally.
- Commander validation re-run: `pnpm test:contracts` 84/84 pass,
  `pnpm schemas:validate` 84/84 pass, and `git diff --check` pass.

Boundary:

- No Carpet commit, push, merge, or PR.
- No merge, deploy, DB/Postgres migration, live memory write, production main
  push, or secret dump.
- No production Matrix integration, persistent Runtime service, real room/user
  lifecycle automation, production GitHub integration, or production automation
  is claimed.
