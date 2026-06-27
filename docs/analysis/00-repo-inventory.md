# Repository Inventory

Version: 2026-06-27

## Summary

This repository currently contains the planning and contract-baseline material for Matrix Codex Capability Runtime. It is not yet a runtime implementation repository.

Evidence:

```text
branch: codex/docs-schema-contracts
remote: https://github.com/Notyet1307/Carpet.git
visibility: private
current stage: docs, analysis, schema baseline, worktree policy baseline, fixtures, contract tests
```

## Current Assets

### Repository Rules

- `AGENTS.md`
  - Repo-local agent instructions.
  - Defines required reading order and current non-implementation stage.
  - Prevents premature runtime, worker, Matrix, Codex exec, database, and GitHub automation work.

### Project Entry

- `README.md`
  - Human entry point.
  - Links to architecture, roadmap, and Codex development guide.
  - Lists the initial scope and contract-test commands.

### Architecture Documents

- `docs/architecture/matrix-codex-capability-runtime.md`
  - System north star.
  - Defines Matrix as collaboration and audit surface, TypeScript Runtime as the Agent OS kernel, Codex as engineering worker, GitHub as code and PR gate, and Proof Ledger as accountability layer.
  - Defines core domain language: Intent, Task, Task Graph, Capability, Work Cell, Worker, Artifact, Proof, Verifier, Approval, Memory Proposal, Capability Version.

### Roadmap Documents

- `docs/roadmaps/analysis-roadmap.md`
  - Analysis-stage execution plan.
  - Defines phases for repository orientation, product language, bounded contexts, Matrix event contracts, state machine, capability registry, Codex worker contract, proof ledger, security model, test strategy, prompt design, and MVP backlog.
  - Explicitly blocks runtime implementation until contract, state, policy, test, and backlog gates are satisfied.

### Codex Operating Guide

- `docs/guides/codex-development-usage-guide.md`
  - Operating manual for Codex-driven development.
  - Defines task packets, roles, allowed files, forbidden files, validation commands, review gates, handoff format, and recommended first tasks.
- `docs/guides/codex-worktree-policy.md`
  - Worktree policy addendum.
  - Defines interactive Codex worktree rules and Runtime-driven worker-runner responsibilities.
  - Separates worktree isolation from sandbox and approval boundaries.

### Git Hygiene

- `.gitignore`
  - Ignores `.DS_Store`, `node_modules/`, `coverage/`, and `.mcr/`.
  - Keeps generated dependencies and local runtime scratch state out of git.

### Contract Test Baseline

- `package.json`
  - Defines the private package and minimum scripts for contract validation.
  - Uses Node's built-in test runner.
- `pnpm-workspace.yaml`
  - Establishes a pnpm workspace without creating runtime packages yet.
- `pnpm-lock.yaml`
  - Locks the schema validation dependencies.
- `tsconfig.base.json`
  - Reserves a strict TypeScript baseline for later runtime packages.
- `tests/contracts/schema-fixtures.test.mjs`
  - Loads schemas with Ajv.
  - Verifies that valid fixtures pass and invalid fixtures fail.

### Schemas

- `schemas/matrix/event-envelope.schema.json`
  - Shared Matrix runtime event envelope.
  - Requires trace, workspace, actor, idempotency, and JSON payload metadata.
- `schemas/matrix/task.created.schema.json`
  - MVP task intake event.
  - Requires goal, context, scope, acceptance criteria, proof requirements, and risk.
- `schemas/proof/proof-ledger-entry.schema.json`
  - Minimum proof ledger entry.
  - Requires worktree provenance, artifact references, and validation evidence.
- `schemas/codex/repo-patch-result.schema.json`
  - Structured result expected from a future Codex repo-patch worker.
- `schemas/runtime/work-cell.schema.json`
  - Minimum Work Cell contract for isolated worktree execution.
  - Requires Runtime/Human worktree creator, base branch/SHA, task branch, path, Codex cwd, and cleanup policy.

### Runtime Policy Baseline

- `runtime/policies/default.yaml`
  - Defines the worktree policy baseline.
  - Marks code, test, schema, fixture, refactor, and security-fix tasks as requiring isolated worktrees.
- `runtime/capabilities.yaml`
  - Seeds implementation-class capabilities with `requires_isolated_worktree: true`.

### Fixtures

- `fixtures/matrix-events/valid/**`
  - Valid event-envelope and task-created examples.
- `fixtures/matrix-events/invalid/**`
  - Invalid examples for missing trace ID and empty task goal.
- `fixtures/proof/valid/**`
  - Valid proof ledger entry example.
- `fixtures/proof/invalid/**`
  - Invalid proof without validation evidence.
- `fixtures/codex/valid/**`
  - Valid Codex repo patch result example.
- `fixtures/codex/invalid/**`
  - Invalid Codex result without summary.
- `fixtures/runtime/valid/**`
  - Valid Work Cell worktree provenance example.
- `fixtures/runtime/invalid/**`
  - Invalid Work Cell example that attempts to allow main-checkout edits.

## Missing Assets

The repository does not yet contain:

- `runtime/workflows/**`
- `docs/adr/**`
- `docs/diagrams/**`
- `apps/**`
- `packages/**`
- `workers/**`
- database migrations
- Matrix AppService registration
- real Codex worker code
- GitHub automation code

## External References Not Present Locally

The architecture documents reference `Notyet1307/codex-multica`, Superpowers, Matrix specifications, and Codex documentation. Those are reference inputs only. No local `codex-multica` checkout, Multica runtime, `.agents/skills`, `.github/workflows`, or scripts are present in this repository.

## Current Risks

- The repository can be mistaken for an implementation repo even though it is currently documentation-only.
- The architecture references external assets that have not been vendored or mapped into this repository.
- Current schemas are a baseline only; approval events, state-machine schemas, capability schemas, and broader work-cell semantics are still missing.
- No development entry gate can pass until state-machine notes, broader policy notes, broader contract tests, and MVP backlog slices exist.

## Recommended Next Work

1. Add state-machine analysis and transition tables.
2. Add capability schema baseline.
3. Add approval event schemas and fixtures.
4. Add policy baseline with deny-by-default rules.
