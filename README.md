# Carpet

Matrix Codex Capability Runtime planning and contract baseline.

## Status

Current stage: analysis, documentation, schemas, fixtures, and contract tests.

Runtime implementation is intentionally out of scope until the roadmap's development entry gates are met.

## Start Here

- Architecture: `docs/architecture/matrix-codex-capability-runtime.md`
- Analysis roadmap: `docs/roadmaps/analysis-roadmap.md`
- Codex development guide: `docs/guides/codex-development-usage-guide.md`
- Codex worktree policy: `docs/guides/codex-worktree-policy.md`

## Initial Scope

- Repository documentation baseline
- Existing asset inventory
- Matrix event schema baseline
- Proof and Codex output schema baseline
- Worktree policy baseline
- Contract tests for valid and invalid fixtures

## Commands

After the contract-test baseline exists:

```bash
pnpm install
pnpm test:contracts
```
