# Repository Inventory

Version: 2026-06-27

## Summary

This repository currently contains the planning and contract-baseline material for Matrix Codex Capability Runtime. It is not yet a runtime implementation repository.

Evidence:

```text
branch: codex/docs-schema-contracts
remote: https://github.com/Notyet1307/Carpet.git
visibility: private
current stage: docs, analysis, schemas, fixtures, contract tests
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

### Git Hygiene

- `.gitignore`
  - Ignores `.DS_Store`.
  - Needs Node and local runtime ignores before package installation and test setup.

## Missing Assets

The repository does not yet contain:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `schemas/**`
- `fixtures/**`
- `tests/contracts/**`
- `runtime/capabilities.yaml`
- `runtime/policies/**`
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
- No schema or fixture validation exists yet, so event/proof contracts are not enforceable.
- No development entry gate can pass until schemas, fixtures, state-machine notes, policy notes, and contract tests exist.

## Recommended Next Work

1. Add Node/pnpm contract-test baseline.
2. Add JSON Schemas for Matrix event envelope, `task.created`, proof ledger entries, and Codex patch results.
3. Add valid and invalid fixtures.
4. Add contract tests that fail invalid fixtures and pass valid fixtures.
