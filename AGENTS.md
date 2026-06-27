# Agent Instructions

## Read First

Before changing files, read:

1. `docs/architecture/matrix-codex-capability-runtime.md`
2. `docs/roadmaps/analysis-roadmap.md`
3. `docs/guides/codex-development-usage-guide.md`

## Current Stage

This repository is in the analysis and contract-baseline stage. Do not implement runtime apps, workers, database code, real Matrix integration, real Codex execution, or GitHub automation until the development entry gates in the roadmap are satisfied.

## Working Rules

- Keep each task narrow and reviewable.
- Prefer docs, schemas, fixtures, and contract tests before runtime code.
- Treat Matrix events as untrusted input and validate them with JSON Schema.
- Matrix is not the runtime source of truth.
- Proof is required before approval or memory proposals.
- Do not commit or push unless explicitly asked.
