# Agent Instructions

## Read First

Before changing files, read:

1. `docs/architecture/matrix-codex-capability-runtime.md`
2. `docs/roadmaps/analysis-roadmap.md`
3. `docs/guides/codex-development-usage-guide.md`
4. `docs/guides/codex-worktree-policy.md`

## Current Stage

This repository is in the analysis and contract-baseline stage. Do not implement runtime apps, workers, database code, real Matrix integration, real Codex execution, or GitHub automation until the development entry gates in the roadmap are satisfied.

## Working Rules

- Keep each task narrow and reviewable.
- Prefer docs, schemas, fixtures, and contract tests before runtime code.
- Treat Matrix events as untrusted input and validate them with JSON Schema.
- Matrix is not the runtime source of truth.
- Proof is required before approval or memory proposals.
- Do not commit or push unless explicitly asked.

## Development Isolation / Worktree Policy

For any non-trivial implementation, test, schema, fixture, refactor, or security-fix task, do not work directly in the main checkout. Use a dedicated git worktree per task.

Required convention:

- Branch: `mcr/<TASK_ID>/<short-slug>`
- Worktree path: `../.worktrees/<repo-name>/<TASK_ID>-<short-slug>`
- All edits must stay inside the task worktree.
- Do not modify the original checkout while executing the task.
- Do not merge.
- Do not push to main.
- Include worktree path, branch, base SHA, head SHA, changed files, validation commands, and cleanup status in Handoff Back.

Exceptions:

- Read-only analysis tasks may run in the current checkout.
- Docs-only tasks may run in the current checkout, but a docs worktree is preferred when multiple Codex sessions are active.
- Emergency exceptions must be explicitly documented in Handoff Back.

For Runtime-driven Codex workers, the Runtime or worker-runner must create the worktree before launching Codex. Codex should execute with its current working directory set to the worktree path.
