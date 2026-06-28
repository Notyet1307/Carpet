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
- Real Matrix, real Codex exec, real GitHub PR creation, merge, deploy, secret
  access, and live memory writes are not allowed until their explicit follow-up
  gates pass.

---

## Wave 0: Entry Fixups

- [ ] Create ADR-0006 for Codex exec before SDK.

This is not an implementation task. It is required before MCR-310 real Codex
exec smoke work. Local fake MVP tasks may proceed without it.

## Wave 1: Contracts And Foundation

- [ ] MCR-030 TypeScript Package Foundation
- [ ] MCR-031 Shared Schema Validator Helper

Exit criteria:

- Package tests run under Node's built-in test runner.
- Existing contract and schema validation commands still pass.
- No app, worker, database, Matrix, Codex, GitHub, or E2E runtime behavior is
  introduced.

## Wave 2: Fake Collaboration Boundary

- [ ] MCR-200 Fake Matrix Transaction Handler
- [ ] MCR-201 Fake Matrix Projection Adapter

Exit criteria:

- Fake transaction fixtures can enqueue normalized runtime events.
- Invalid auth, invalid schema, unknown room, duplicate transaction, duplicate
  event, and spoofed actor cases are covered.
- Projection events contain summaries and refs only.

## Wave 3: Runtime Core

- [ ] MCR-100 Runtime State Machine Package
- [ ] MCR-101 In-Memory Runtime Task Store
- [ ] MCR-250 Capability Registry Loader And Router
- [ ] MCR-260 Minimal Policy Engine
- [ ] MCR-270 Work Cell Manager With Fake Worktree Manager

Exit criteria:

- State transitions, idempotency, routing, policy decisions, and Work Cell
  provenance are executable through local tests.
- No database, real git worktree execution, real worker process, or external
  adapter exists yet.

## Wave 4: Worker, Proof, Approval, External Fakes

- [ ] MCR-300 Fake Codex Worker Runner
- [ ] MCR-400 Proof Ledger And Verifier
- [ ] MCR-500 Approval Gate
- [ ] MCR-510 Fake GitHub PR Adapter
- [ ] MCR-600 Memory Proposal Flow

Exit criteria:

- Worker success, failure, blocked, and malformed outputs are distinct.
- Proof is verified before approval.
- PR creation is simulated only after matching approval.
- Merge remains unavailable.
- Memory proposals are generated but never applied.

## Wave 5: Local Fake E2E

- [ ] MCR-700 Local Fake MVP E2E Harness

Exit criteria:

- Local fake E2E covers `task.created -> worker.dispatched -> artifact/proof ->
  verification.completed -> approval.requested -> simulated PR creation`.
- Failure scenarios cover invalid Matrix input, duplicate input, worker failure,
  blocked worker, fake proof, policy bypass, approval replay, and secret-bearing
  logs.
- Every external side effect is fake and locally inspectable.

## Wave 6: Blocked Real-Service Smoke Work

- [ ] MCR-310 Real Codex Exec Smoke Runner
- [ ] MCR-720 Real-Service Compatibility Smoke Tests

Entry criteria:

- ADR-0006 exists.
- MCR-700 passes.
- Human owner explicitly approves each real-service smoke.
- Credentials are disposable and scoped.

Exit criteria:

- Real-service tests are opt-in and skipped by default.
- Smoke evidence is recorded as compatibility proof, not the correctness source.
- No merge, deploy, or live memory write is automated.

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
