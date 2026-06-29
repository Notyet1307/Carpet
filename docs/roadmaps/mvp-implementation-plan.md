# MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Matrix Codex Capability Runtime MVP from local contracts to
a local fake end-to-end flow before any real external service integration.

**Architecture:** Matrix remains collaboration/input/projection only. Runtime
owns task state, policy, work cells, proof, approval, and memory proposal state.
External effects stay behind fake adapters until proof, policy, approval, and
local fake E2E pass.

**Tech Stack:** TypeScript-first, pnpm workspaces, Node built-in test runner,
Ajv/JSON Schema, fake adapters first, real Codex/Matrix/GitHub only after
explicit gates.

## Global Constraints

- Do not modify the main checkout for implementation tasks.
- Use one dedicated worktree per implementation task.
- Add or update tests before implementation.
- Keep allowed files narrow and list forbidden files explicitly.
- Matrix events are untrusted input.
- Matrix is not runtime source of truth.
- Prompt text is not permission enforcement.
- Proof requires concrete command, exit code, artifact/log refs, risk notes, and
  rollback notes.
- Approval is action-scoped.
- Memory update is proposal-only.
- Further real Matrix, real Codex exec, real GitHub PR creation, merge, deploy,
  secret access, and live memory writes are not allowed until their explicit
  follow-up gates pass.

## Current Closeout Status

As of 2026-06-29, local fake MVP work through MCR-700 is merged on `main`.
MCR-310 scaffold is merged and one manual real Codex exec smoke has passed.
Tracked proof: `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in
commit `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`. MCR-720 remains only a
guarded runbook and skipped-test scaffold.

No real Matrix, GitHub PR/API, deploy, live memory write, or MCR-720
real-service smoke has passed by this plan. Further real-service smoke execution
remains a manual compatibility check requiring action-scoped human approval,
disposable scoped credentials, and captured proof.
MCR-310 Codex proof remains separate and does not authorize Matrix smoke.

Target system alignment now lives in
`docs/analysis/target-system-design.md`. The MCR-310 smoke closes one Codex exec
compatibility proof only; Matrix and GitHub remain fake, and memory stays
proposal-only. Do not add an automatic commander loop or independent review
lane.

---

## Wave 0: Entry Fixups

- [x] Create ADR-0006 for Codex exec before SDK.

This was not an implementation task. It closed the architecture decision needed
before adding the guarded MCR-310 scaffold.

## Wave 1: Contracts And Foundation

- [x] MCR-030 TypeScript Package Foundation
- [x] MCR-031 Shared Schema Validator Helper

Exit criteria:

- Package tests run under Node's built-in test runner.
- Existing contract and schema validation commands still pass.
- No app, worker, database, Matrix, Codex, GitHub, or E2E runtime behavior is
  introduced.

## Wave 2: Fake Collaboration Boundary

- [x] MCR-200 Fake Matrix Transaction Handler
- [x] MCR-201 Fake Matrix Projection Adapter

Exit criteria:

- Fake transaction fixtures can enqueue normalized runtime events.
- Invalid auth, invalid schema, unknown room, duplicate transaction, duplicate
  event, and spoofed actor cases are covered.
- Projection events contain summaries and refs only.

## Wave 3: Runtime Core

- [x] MCR-100 Runtime State Machine Package
- [x] MCR-101 In-Memory Runtime Task Store
- [x] MCR-250 Capability Registry Loader And Router
- [x] MCR-260 Minimal Policy Engine
- [x] MCR-270 Work Cell Manager With Fake Worktree Manager

Exit criteria:

- State transitions, idempotency, routing, policy decisions, and Work Cell
  provenance are executable through local tests.
- No database, real git worktree execution, real worker process, or external
  adapter exists yet.

## Wave 4: Worker, Proof, Approval, External Fakes

- [x] MCR-300 Fake Codex Worker Runner
- [x] MCR-400 Proof Ledger And Verifier
- [x] MCR-500 Approval Gate
- [x] MCR-510 Fake GitHub PR Adapter
- [x] MCR-600 Memory Proposal Flow

Exit criteria:

- Worker success, failure, blocked, and malformed outputs are distinct.
- Proof is verified before approval.
- PR creation is simulated only after matching approval.
- Merge remains unavailable.
- Memory proposals are generated but never applied.

## Wave 5: Local Fake E2E

- [x] MCR-700 Local Fake MVP E2E Harness

Exit criteria:

- Local fake E2E covers `task.created -> worker.dispatched -> artifact/proof ->
  verification.completed -> approval.requested -> simulated PR creation`.
- Failure scenarios cover invalid Matrix input, duplicate input, worker failure,
  blocked worker, fake proof, policy bypass, approval replay, and secret-bearing
  logs.
- Every external side effect is fake and locally inspectable.

## Wave 6: Real-Service Smoke Scaffolds And Manual Gates

- [x] MCR-310 Real Codex Exec Smoke Runner scaffold plus one manual real Codex
  exec smoke pass on 2026-06-29
- [x] MCR-720 Real-Service Compatibility Smoke Tests scaffold, including
  manual-only disposable Synapse compose scaffold

Satisfied scaffold prerequisites:

- ADR-0006 exists.
- MCR-700 passes.
- MCR-310 proof exists at
  `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
  `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`.

Remaining manual smoke entry criteria:

- Human owner explicitly approves each further real-service smoke.
- Credentials are disposable and scoped.
- Targets are non-production and disposable where practical.

Manual smoke exit criteria:

- Real-service tests are opt-in and skipped by default.
- Smoke evidence is recorded as compatibility proof, not the correctness source.
- No merge, deploy, or live memory write is automated.
- MCR-720 remains scaffold/skipped-by-default unless separately approved.
- MCR-310 Codex proof remains separate and does not authorize Matrix smoke.
- Disposable Synapse compose has no default service start and is not
  compatibility proof by itself.

## Operating Cadence

For each item:

1. Create the task worktree from current `origin/main`.
2. Add the named failing tests first.
3. Implement the smallest code needed to pass.
4. Run the package test plus `pnpm test:contracts`, `pnpm schemas:validate`, and
   `git diff --check`.
5. Handoff with worktree path, branch, base SHA, head SHA, changed files,
   validation results, cleanup status, risk notes, rollback notes, and blockers.

## Source Documents

- `docs/analysis/09-mvp-backlog.md`
- `docs/analysis/08-test-strategy.md`
- `tests/e2e/mvp-scenarios.md`
- `docs/analysis/development-entry-review.md`
- `docs/guides/codex-development-usage-guide.md`
- `docs/guides/codex-worktree-policy.md`
