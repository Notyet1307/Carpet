# Development Entry Review

Version: 2026-06-29 status sync

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
persistent Runtime service, real room/user lifecycle automation, GitHub
PR/API, deploy, and live memory write remain not done. Any further real smoke
still requires action-scoped human approval, disposable scoped credentials,
opt-in execution, cleanup notes, and captured proof.

MCR-310 Codex proof remains separate and does not authorize Matrix smoke.
MCR-720 Matrix proof remains separate and does not authorize production Matrix,
GitHub, deploy, live memory, or default real-service execution.

MCR-730 GitHub PR smoke is currently NO-GO. The local preflight found a broad
main-account `gh` credential with `repo` and `workflow` scope rather than a
disposable/scoped smoke credential. The current GitHub PR path is still
`packages/github-adapter` fake/contract-only; it records simulated PRs in
memory and does not call GitHub.

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

The guarded MCR-310 real Codex exec smoke has produced one Codex-only proof.
MCR-720 has produced one Matrix-only local disposable proof. These do not
introduce an automatic commander loop, a separate review lane, default real
Codex execution, production Matrix integration, real GitHub PR/API calls,
deploy, or live memory writes.

## Original Entry Verdict

Limited development entry was ready for local fake MVP implementation through
MCR-700. That local fake implementation has since merged.

## Gate A: Contract Lock

Status: pass.

Evidence:

- Matrix schemas exist under `schemas/matrix/*.schema.json`.
- Runtime schemas exist under `schemas/runtime/*.schema.json`.
- Codex output schema exists at `schemas/codex/repo-patch-result.schema.json`.
- Proof and approval schemas exist under `schemas/proof/*.schema.json`.
- Fixture coverage exists across `fixtures/matrix-events`,
  `fixtures/matrix-transactions`, `fixtures/runtime`, `fixtures/codex`,
  `fixtures/proof`, `fixtures/capabilities`, and `fixtures/policy`.
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

Status: partially satisfied for MCR-310 Codex exec smoke and MCR-720
Matrix-only local disposable smoke only; manual execution still gated for every
further real-service smoke.

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

Not yet complete:

- Production Matrix integration.
- Persistent Runtime service.
- Real room/user lifecycle automation.
- Real GitHub test-service compatibility proof.
- Real GitHub PR smoke. MCR-730 design documents the safety gates, but the run
  remains blocked until a disposable target, scoped credential, and one
  action-scoped approval for a specific run id exist.
- Any production-like Codex worker execution.
- GitHub PR/API, deploy, and live memory paths.
- Disposable Synapse compose remains manual-only and no-default-start; the
  passed MCR-720 proof does not make it production-ready.

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
real Matrix, GitHub, deploy, or live memory validation. Do not treat the
MCR-720 proof as production Matrix readiness, persistent Runtime validation,
room/user lifecycle automation, GitHub, deploy, or live memory validation.
