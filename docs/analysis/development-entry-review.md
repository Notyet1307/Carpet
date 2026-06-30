# Development Entry Review

Version: 2026-06-30 status sync

Task ID: Analysis-P12-development-entry-review

## Current Closeout Status

Local fake MVP implementation through MCR-700 has merged into `main`. MCR-310
has merged as a guarded scaffold and one manual real Codex exec smoke passed on
2026-06-29. Tracked proof:
`fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
`8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`. MCR-720 has one approved
Matrix-only real smoke pass on 2026-06-29.

MCR-720 scope was exactly local disposable Synapse, a local AppService listener,
and one AppService transaction. Evidence:
`/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02`.
Key proof files: `transaction.exit_code`, `transaction.stdout`,
`listener.kill0.before-transaction.exit_code`,
`listener.lsof.before-transaction.stdout`,
`listener.bound.before-transaction.exit_code`,
`docker-compose-down.cleanup.exit_code`, `cleanup-lsof-8008.proof`,
`cleanup-lsof-8448.proof`, `cleanup-lsof-9009.proof`, `generated-cleanup.txt`,
and `cleanup-paths.stdout`.

This is not production Matrix integration. Production Matrix integration,
persistent Runtime service, real room/user lifecycle automation, production
GitHub PR/API, deploy, and live memory write remain not done. Any further real
smoke still requires action-scoped human approval, disposable scoped
credentials, opt-in execution, cleanup notes, and captured proof.

MCR-310 Codex proof remains separate and does not authorize Matrix smoke.
MCR-720 Matrix proof remains separate and does not authorize production Matrix,
GitHub, deploy, live memory, or default real-service execution.

MCR-730 has one completed disposable GitHub PR create smoke on 2026-06-29. PR
#1 in `Notyet1307/github-pr-smoke-sandbox` was created against disposable base
branch `mcr-730-base-mcr-730-20260629t140000z-github-pr-smoke-01` from
disposable head branch
`mcr-730-head-mcr-730-20260629t140000z-github-pr-smoke-01`, then closed without
merge. Sandbox `main` stayed at
`4438b7a905d12fead4f539e6faf349b8a2464f60`, both disposable branches were
deleted, and the `protect-main` ruleset remained active. The current Runtime
GitHub PR path is still `packages/github-adapter` fake/contract-only.

MCR-1020 has merged into `main`, and MCR-1030 completed the docs-only readiness
audit for the GitHub adapter refusal matrix. GH-REF-001 through GH-REF-026 are
all local executable refusal fixtures, no fixture is deferred, and every case
asserts no runner calls. This closes the local refusal matrix only. It does not
authorize production GitHub PR/API, Octokit, `gh pr create`, `gh api`, fetch
calls, push, merge, deploy, production `main` writes, token/env dumps, secret
reads, or live memory writes.

MCR-850 has one approved real vertical smoke pass on 2026-06-29 for run id
`mcr-850-20260629t170000z-vertical-smoke-01`. Evidence is retained locally at
`/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01`.
The Matrix leg used the local fixture/runtime path, not a real Synapse or
AppService service. Codex exec ran exactly once, exited 0, and used only
`PATH` and `CODEX_HOME` env keys. GitHub created disposable sandbox PR #2 in
`Notyet1307/github-pr-smoke-sandbox`; cleanup closed it with `merged=false`,
deleted disposable branches, and left the sandbox `main` SHA unchanged at
`4438b7a905d12fead4f539e6faf349b8a2464f60`.

MCR-105 has merged at commit `2f57b7dfa62a15ec05d7d5b3e01adc5fd54ee137`. The
Runtime Store can now export schema-valid durable snapshots from the in-memory
task store. That export remains ref-only and does not add DB persistence,
Postgres, migrations, a persistent Runtime service, Matrix/GitHub/Codex
external calls, or live memory writes.

MCR-106 adds minimal Runtime Store file snapshot persistence. It writes and
reads schema-valid `RuntimeStoreSnapshot` JSON files using a temp file plus
rename, and validates snapshots on both write and read. This is a single-writer
local file adapter only; concurrent writers need later unique temp names or
locking. It does not add DB persistence, Postgres, migrations, a persistent
Runtime service, Matrix/GitHub/Codex calls, live memory writes, production
durable Runtime Store semantics, or replay recovery.

## Target System Design Alignment

Target system alignment is recorded in
`docs/analysis/target-system-design.md`.

Development may continue only if the current fake/scaffold/real split remains
explicit:

- Matrix is collaboration ingress and projection, not Runtime source of truth.
- Runtime owns task state, policy, Work Cell creation, proof verification,
  action-scoped approval, external adapter authorization, and memory proposals.
- Codex workers run only inside Runtime-created worktrees, never the main
  checkout.
- Proof must be verified before approval can be requested.
- External actions require matching approval before they run.
- Memory remains proposal-only; Runtime must not write live memory.
- Runtime Store snapshot export and file snapshot persistence are ref-only; DB
  persistence and replay recovery remain future work.

The guarded MCR-310 real Codex exec smoke has produced one Codex-only proof.
MCR-720 has produced one Matrix-only local disposable proof. MCR-730 has
produced one sandbox GitHub PR create/cleanup proof. MCR-850 has produced one
approved disposable vertical compatibility proof across local fixture/runtime
Matrix, Codex exec, proof/approval, sandbox GitHub PR create, and cleanup. These
do not introduce an automatic commander loop, a separate review lane, default
real Codex execution, production Matrix integration, production GitHub PR/API
calls, deploy, DB/Postgres migration, or live memory writes.

## Original Entry Verdict

Limited development entry was ready for local fake MVP implementation through
MCR-700. That local fake implementation has since merged.

## Gate A: Contract Lock

Status: pass.

Evidence:

- Matrix schemas exist under `schemas/matrix/*.schema.json`.
- Runtime schemas exist under `schemas/runtime/*.schema.json`.
- MCR-105 exports in-memory Runtime Store state into the runtime-store schema
  envelope without embedding raw logs, diffs, Matrix event bodies, token
  material, or live memory content.
- MCR-106 writes and reads schema-valid `RuntimeStoreSnapshot` JSON files with
  temp-file-plus-rename semantics; it remains single-writer and local-only.
- Codex output schema exists at `schemas/codex/repo-patch-result.schema.json`.
- Proof and approval schemas exist under `schemas/proof/*.schema.json`.
- Fixture coverage exists across `fixtures/matrix-events`,
  `fixtures/matrix-transactions`, `fixtures/runtime`, `fixtures/codex`,
  `fixtures/proof`, `fixtures/capabilities`, and `fixtures/policy`.
- GitHub adapter refusal fixtures exist for GH-REF-001 through GH-REF-026, all
  execute locally with `no_runner_calls=true`, and package tests cover the
  non-consuming approval preview plus local-refusal non-consumption behavior.
- Baseline validation before this review: `pnpm test:contracts` passed 78 tests;
  `pnpm schemas:validate` passed 78 tests.

Notes:

- Contract lock is sufficient for fake MVP implementation.
- Any future schema shape change must be its own schema/fixture/contract-test
  task before implementation code depends on it.

Smallest follow-up if this gate regresses: add the missing schema or fixture
first, then add or update the matching contract test.

## Gate B: State Lock

Status: pass.

Evidence:

- `docs/analysis/task-state-machine.md` defines the MVP happy path, terminal
  states, failure states, irreversible PR action, cancellation, and retry
  deferral.
- `schemas/runtime/task.schema.json` and
  `schemas/runtime/task-state-transition.schema.json` exist.
- `tests/contracts/task-state-machine.test.mjs` covers the happy path, illegal
  transitions, audit event mismatch, missing artifact refs, missing approval,
  unknown states, and unknown transition pairs.

Notes:

- Direct retry transitions are intentionally deferred; follow-up tasks must not
  invent retry behavior while implementing runtime state.

Smallest follow-up if this gate regresses: update the transition schema and
contract test before touching a runtime store or API handler.

## Gate C: Policy Lock

Status: pass.

Evidence:

- `docs/analysis/07-security-threat-model.md` defines deny-by-default and the
  prompt-vs-runtime-control split.
- `runtime/policies/default.yaml` sets `decision_default: deny`, global denied
  actions, worker-context denies, and worktree policy.
- `runtime/policies/repo-patch.yaml` defines repo patch policy fixtures,
  approval-required actions, artifact ref constraints, proof requirements, and
  memory proposal-only behavior.
- `schemas/proof/approval.schema.json` defines action-scoped approval records.
- `tests/contracts/policy-decisions.test.mjs` covers deny-by-default, fake
  proof, approval replay, automatic memory write, path traversal, prompt
  injection, dangerous commands, branch confusion, and secret-bearing logs.

Notes:

- Runtime policy engine implementation now exists. Future policy changes must
  still implement the current data contract unless a separate schema/fixture
  task changes it first.
- Worktree isolation is development isolation, not a security boundary.

Smallest follow-up if this gate regresses: add the missing policy fixture and
contract assertion before any runtime policy code.

## Gate D: Test Lock

Status: pass.

Evidence:

- `tests/contracts/README.md` maps current contract tests to component
  boundaries.
- `docs/analysis/08-test-strategy.md` defines unit, contract, golden fixture,
  integration, E2E, and security regression layers.
- `tests/e2e/mvp-scenarios.md` defines the local fake happy path and failure
  scenarios without adding a runner.
- Existing contract suite passes.

Notes:

- Package-local unit/integration tests and the local fake E2E harness now exist.
  Contract tests alone still are not enough for future runtime changes.

Smallest follow-up if this gate regresses: add the missing test plan or fixture
coverage before the affected component implementation starts.

## Gate E: Backlog Lock

Status: pass.

Evidence:

- `docs/analysis/09-mvp-backlog.md` defines implementation-sized task cards from
  foundation through local fake E2E and blocked real-service smoke work.
- Every backlog item includes objective, allowed files, forbidden files,
  dependencies, tests to add first, implementation notes, acceptance criteria,
  rollback notes, verifier checklist, and expected proof/validation evidence.
- `docs/roadmaps/mvp-implementation-plan.md` sequences the same work into
  execution waves.

Notes:

- MCR-310 and MCR-720 scaffolds are merged. MCR-310 has one tracked real Codex
  exec smoke proof. MCR-720 has one tracked Matrix-only local disposable smoke
  proof. Neither proof authorizes default real-service execution, production
  Matrix, more real Codex, GitHub, secrets, PR creation, merge, deploy, or live
  memory writes.

Smallest follow-up if this gate regresses: split the oversized task and restore
allowed/forbidden files plus tests-first requirements.

## Real-Service Smoke Gate

Status: partially satisfied for MCR-310 Codex exec smoke, MCR-720 Matrix-only
local disposable smoke, MCR-730 disposable GitHub PR create smoke, and one
MCR-850 approved vertical compatibility smoke only; manual execution still
gated for every further real-service smoke.

Evidence now present:

- `docs/adr/0006-codex-exec-before-sdk.md` exists.
- MCR-700 local fake MVP E2E harness has merged.
- MCR-310 guarded Codex exec runner scaffold has merged.
- MCR-310 real Codex exec smoke passed once on 2026-06-29 with tracked proof
  `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
  `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`.
- MCR-720 Matrix-only real-service smoke preflight runbook, skipped-test
  scaffold, and manual-only disposable Synapse compose scaffold have merged.
- MCR-720 Matrix-only real smoke passed once on 2026-06-29 for run id
  `mcr-720-20260629t130000z-matrix-smoke-02`. Scope was local disposable
  Synapse, local AppService listener, and one AppService transaction.
- MCR-720 proof exists under
  `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02`.
  Decisive files include `transaction.exit_code` (`exit_code=0`),
  `transaction.stdout` (`status=200` with `{"code":"ok","retryable":false}`),
  listener pre-transaction `kill -0`/`lsof`/bound checks, cleanup
  `docker-compose-down.cleanup.exit_code`, cleanup lsof proofs for
  `8008`/`8448`/`9009`, `generated-cleanup.txt`, and `cleanup-paths.stdout`.
- Non-blocking note: the first run failed because the listener process was not
  alive when Synapse submitted the transaction. The second run used a durable
  listener and direct transaction exit-code capture.
- MCR-730 disposable GitHub PR create smoke passed once on 2026-06-29. PR #1 in
  `Notyet1307/github-pr-smoke-sandbox` was created, closed unmerged, and its
  disposable base/head branches were deleted while sandbox `main` stayed at
  `4438b7a905d12fead4f539e6faf349b8a2464f60`.
- MCR-850 approved vertical smoke passed once on 2026-06-29 for run id
  `mcr-850-20260629t170000z-vertical-smoke-01`. Evidence is retained at
  `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01`.
  The Matrix path was local fixture/runtime only; no Synapse/AppService service
  started. Codex exec was exactly one attempt with exit code 0 using
  `codex exec --json --sandbox workspace-write --output-schema ./schemas/codex/codex-exec-smoke-result.schema.json -`
  and env keys `PATH`, `CODEX_HOME`. GitHub used disposable sandbox PR #2; PR
  #2 was closed with `merged=false`, disposable branches were deleted, open PR
  count for that head was 0, and sandbox `main` remained
  `4438b7a905d12fead4f539e6faf349b8a2464f60`.

Not yet complete:

- Production Matrix integration.
- Persistent Runtime service.
- Production durable Runtime Store behavior, DB persistence, Postgres
  migrations, multi-writer locking, and replay recovery.
- Real room/user lifecycle automation.
- Production GitHub integration and any Runtime-owned real GitHub write path.
- Additional GitHub PR smoke beyond the completed MCR-730 and MCR-850
  disposable sandbox runs.
- Any production-like Codex worker execution.
- GitHub PR/API, deploy, and live memory paths.
- Disposable Synapse compose remains manual-only and no-default-start; the
  passed MCR-720 proof does not make it production-ready.
- MCR-850 does not make the vertical path production-ready and does not add
  persistent Runtime service operation, production Matrix, DB/Postgres
  migration, merge, deploy, live memory write, production main push, or secret
  dump.

Manual gate for any real smoke:

- Human owner explicitly approves the specific smoke action.
- Credentials are disposable and scoped.
- Targets are non-production and disposable where practical.
- The run records command, exit code, artifact/log refs, cleanup, risk, and
  rollback notes.
- For GitHub PR smoke, the target is a throwaway repository or explicitly
  disposable branch policy, not production `main`.
- For GitHub PR smoke, proof records command shape, PR URL, branch, base SHA,
  head SHA, approval id, and close/delete branch cleanup status.
- Forbidden GitHub smoke actions are merge PR, push production `main`, deploy,
  secret dump, and live memory write.

Do not treat the MCR-310 proof as approval for additional real Codex runs or as
real Matrix, production GitHub, deploy, or live memory validation. Do not treat
the MCR-720 proof as production Matrix readiness, persistent Runtime validation,
room/user lifecycle automation, production GitHub, deploy, or live memory
validation. Do not treat the MCR-730 proof as Runtime GitHub adapter
implementation, merge approval, deploy approval, or live memory validation. Do
not treat the MCR-850 proof as production readiness, default automation,
persistent Runtime validation, production Matrix/GitHub readiness, DB/Postgres
migration approval, merge approval, deploy approval, or live memory validation.
