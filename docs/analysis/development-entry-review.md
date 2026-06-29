# Development Entry Review

Version: 2026-06-29 status sync

Task ID: Analysis-P12-development-entry-review

## Current Closeout Status

Local fake MVP implementation through MCR-700 has merged into `main`. MCR-310
has merged as a guarded scaffold and one manual real Codex exec smoke passed on
2026-06-29. Tracked proof:
`fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
`8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`. MCR-720 remains a guarded,
skipped-by-default scaffold.

No real Matrix, GitHub PR/API, deploy, live memory write, or MCR-720
Matrix-only real-service smoke is marked complete here. Scaffold presence is not
compatibility proof. Any further real smoke still requires action-scoped human
approval, disposable scoped credentials, opt-in execution, cleanup notes, and
captured proof.

MCR-310 Codex proof remains separate and does not authorize Matrix smoke.

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

The guarded MCR-310 real Codex exec smoke has now produced one proof while
Matrix and GitHub remained fake. This does not introduce an automatic commander
loop, a separate review lane, default real Codex execution, real GitHub PR/API
calls, real Matrix writes, deploy, or live memory writes.

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
  exec smoke proof, but MCR-310 Codex proof remains separate and does not
  authorize Matrix smoke, more real Codex, GitHub, secrets, PR creation, merge,
  deploy, or live memory writes.

Smallest follow-up if this gate regresses: split the oversized task and restore
allowed/forbidden files plus tests-first requirements.

## Real-Service Smoke Gate

Status: partially satisfied for MCR-310 Codex exec smoke only; manual execution
still gated for every further real-service smoke.

Evidence now present:

- `docs/adr/0006-codex-exec-before-sdk.md` exists.
- MCR-700 local fake MVP E2E harness has merged.
- MCR-310 guarded Codex exec runner scaffold has merged.
- MCR-310 real Codex exec smoke passed once on 2026-06-29 with tracked proof
  `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
  `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`.
- MCR-720 Matrix-only real-service smoke preflight runbook, skipped-test
  scaffold, and manual-only disposable Synapse compose scaffold have merged.

Not yet complete:

- Real Matrix and GitHub test-service compatibility proof.
- Any production-like Codex worker execution.
- MCR-720 Matrix-only real-service smoke execution; it remains
  scaffold/skipped-by-default unless separately approved.
- Disposable Synapse compose is not proof of compatibility; it is a
  manual-only, no-default-start scaffold for a future approved run.

Manual gate for any real smoke:

- Human owner explicitly approves the specific smoke action.
- Credentials are disposable and scoped.
- Targets are non-production and disposable where practical.
- The run records command, exit code, artifact/log refs, cleanup, risk, and
  rollback notes.

Do not treat the MCR-310 proof as approval for additional real Codex runs or as
real Matrix, GitHub, deploy, or live memory validation. Do not treat MCR-720
scaffold completion as real-service compatibility validation.
