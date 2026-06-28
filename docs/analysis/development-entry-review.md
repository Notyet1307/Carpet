# Development Entry Review

Version: 2026-06-28

Task ID: Analysis-P12-development-entry-review

## Verdict

Limited development entry is ready for local fake MVP implementation through
MCR-700.

Real Codex exec and real-service smoke work remain blocked until the missing
Codex exec before SDK ADR is written and approved. This is a separate
architecture decision, not an implementation detail.

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

- Runtime policy engine implementation does not exist yet. The first policy
  implementation task must implement the current data contract, not change it.
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

- Implementation tasks still need package-local unit/integration tests. Contract
  tests alone are not enough for runtime code.

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

- MCR-310 and MCR-720 are intentionally blocked. They must not be used to sneak
  real Codex, Matrix, GitHub, secrets, PR creation, merge, deploy, or live memory
  writes into earlier fake MVP tasks.

Smallest follow-up if this gate regresses: split the oversized task and restore
allowed/forbidden files plus tests-first requirements.

## Non-Gate Architecture Blocker

Blocker: `docs/roadmaps/analysis-roadmap.md` still lists
`Codex exec before SDK 的 ADR 已通过` as incomplete. The architecture document
currently recommends `codex exec --json --sandbox workspace-write --output-schema`
for MVP and later SDK migration, but there is no ADR file in `docs/adr/` that
locks that decision.

Blocked scope:

- MCR-310 Real Codex Exec Smoke Runner.
- MCR-720 real-service smoke tests that depend on real Codex execution.
- Any production-like Codex worker execution.

Not blocked:

- MCR-030 through MCR-700 local fake MVP implementation, provided each task
  follows its allowed files and fake-adapter constraints.

Smallest follow-up task:

```text
Task: ADR-0006 Codex exec before SDK
Allowed files:
- docs/adr/0006-codex-exec-before-sdk.md
- docs/roadmaps/analysis-roadmap.md only for the matching checklist line
Forbidden files:
- apps/**
- workers/**
- packages/**
- runtime/**
- schemas/**
- fixtures/**
Validation:
- pnpm test:contracts
- pnpm schemas:validate
- git diff --check
```

## Development Entry Conditions For First Implementation Task

The first implementation task should be MCR-030.

Required task packet:

- worktree path and branch;
- exact base SHA;
- allowed files and forbidden files from the backlog;
- tests to add first;
- validation commands;
- proof requirements;
- Handoff Back template with worktree path, branch, base SHA, head SHA, changed
  files, validation results, cleanup status, risk notes, rollback notes, and
  blockers.

Do not start with Matrix, Codex, GitHub, database, or E2E code. That would skip
the foundation and fake-adapter sequence.
