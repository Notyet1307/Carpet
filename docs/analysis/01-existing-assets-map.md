# Existing Assets Map

Version: 2026-06-27

## Classification

Assets are classified as:

- `keep`: keep in place as canonical repository material.
- `migrate`: move or transform into the target architecture.
- `reference`: use as design input, not runtime code.
- `ignore`: do not use for MVP.

## Asset Map

| Asset | Classification | Target | Reason |
|---|---|---|---|
| `AGENTS.md` | keep | `AGENTS.md` | Repo-local operating rules are needed before any Codex task runs. |
| `README.md` | keep | `README.md` | Human entry point for the current stage and document map. |
| `docs/architecture/matrix-codex-capability-runtime.md` | keep | `docs/architecture/matrix-codex-capability-runtime.md` | Canonical architecture and boundary document. |
| `docs/roadmaps/analysis-roadmap.md` | keep | `docs/roadmaps/analysis-roadmap.md` | Canonical analysis-stage roadmap and development entry gate. |
| `docs/guides/codex-development-usage-guide.md` | keep | `docs/guides/codex-development-usage-guide.md` | Canonical Codex operating guide. |
| `docs/guides/codex-worktree-policy.md` | keep | `docs/guides/codex-worktree-policy.md` | Canonical worktree isolation policy for interactive and Runtime-driven Codex work. |
| `.gitignore` | keep | `.gitignore` | Ignores `.DS_Store`, Node dependencies, coverage, and `.mcr/` scratch state. |
| `.DS_Store` | ignore | none | macOS Finder metadata, not project material. |
| GitHub private repo `Notyet1307/Carpet` | keep | GitHub remote `origin` | Repository source of record for committed project artifacts. |
| `Notyet1307/codex-multica` reference | reference | future `docs/analysis/01-existing-assets-map.md` updates or migration task | Mentioned in architecture as a source of reusable patterns, but no local checkout exists here. Do not imply its files are present. |
| Matrix specification references | reference | schema and gateway analysis tasks | Use to shape event contracts; do not vendor specification material. |
| Codex SDK and CLI references | reference | future Codex worker contract tasks | Use after schema and fake JSONL parser exist; do not call real Codex in the current stage. |
| Superpowers references | reference | workflow and prompt analysis tasks | Translate workflow discipline into runtime-enforced contracts; do not copy prompt discipline as policy. |

## Created Baseline Assets

These baseline assets now exist:

| Target | Source | Purpose |
|---|---|---|
| `package.json` | development guide | Provide minimal pnpm scripts for contract tests. |
| `pnpm-workspace.yaml` | development guide | Establish workspace shape without apps or workers. |
| `tsconfig.base.json` | development guide | Reserve TypeScript strict baseline for future runtime packages. |
| `schemas/matrix/event-envelope.schema.json` | architecture event contract | Define shared event envelope. |
| `schemas/matrix/task.created.schema.json` | architecture and roadmap | Define MVP task intake event. |
| `schemas/proof/proof-ledger-entry.schema.json` | architecture proof ledger | Define minimum proof entry. |
| `schemas/codex/repo-patch-result.schema.json` | Codex worker contract | Define final structured Codex worker output. |
| `schemas/runtime/work-cell.schema.json` | worktree policy baseline | Define isolated Work Cell worktree provenance. |
| `runtime/policies/default.yaml` | worktree policy baseline | Define worktree requirements by task type. |
| `runtime/capabilities.yaml` | worktree policy baseline | Mark implementation-class capabilities as requiring isolated worktrees. |
| `fixtures/**` | schema baseline | Provide valid and invalid examples. |
| `tests/contracts/schema-fixtures.test.mjs` | test strategy | Enforce that fixtures match schemas. |

## Remaining Migration Targets

The next assets to create are:

| Target | Source | Purpose |
|---|---|---|
| `schemas/matrix/approval.requested.schema.json` | roadmap Phase 3 and Phase 8 | Define non-ambiguous approval request events. |
| `schemas/matrix/approval.granted.schema.json` | roadmap Phase 3 and Phase 8 | Define action-scoped human approval events. |
| `schemas/runtime/task.schema.json` | roadmap Phase 4 | Define persisted task state shape. |
| `schemas/runtime/task-state-transition.schema.json` | roadmap Phase 4 | Define legal and illegal task transitions. |
| `schemas/runtime/capability.schema.json` | roadmap Phase 5 | Define capability registry entries. |
| `runtime/workflows/repo-patch.yaml` | roadmap Phase 5 and Phase 6 | Define repo patch workflow graph. |
| `runtime/workflows/ci-recovery.yaml` | roadmap Phase 5 and Phase 6 | Define CI recovery workflow graph. |

## Explicit Non-Migrations

Do not create these yet:

- `apps/matrix-appservice/**`
- `apps/runtime-api/**`
- `apps/worker-runner/**`
- `packages/capability-router/**`
- `packages/proof-ledger/**`
- `workers/codex-exec-worker/**`
- `infra/**`
- real Matrix registration files
- real secrets or `.env`
- real GitHub PR automation
