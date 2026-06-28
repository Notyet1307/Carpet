# Capability Routing Baseline

Version: 2026-06-28

Task ID: Analysis-P5-capability-registry

Roadmap: Phase 5 / Capability Registry baseline

## Purpose

This document defines the MVP capability registry and routing contract before
runtime router implementation starts.

This is an analysis and contract artifact only. It does not authorize runtime
apps, router packages, worker runners, database code, Matrix gateway code, Codex
execution, GitHub automation, or real external actions.

## Source Notes

`multica/agents.yaml` is absent in this checkout. No migration seed was read or
invented for this baseline.

The baseline uses these current sources:

- `docs/architecture/matrix-codex-capability-runtime.md`
- `docs/roadmaps/analysis-roadmap.md`
- `docs/analysis/task-graph.md`
- `runtime/workflows/repo-patch.yaml`
- `runtime/workflows/ci-recovery.yaml`
- existing worktree fields in `runtime/capabilities.yaml`
- `runtime/policies/default.yaml`

## Registry Contract

The source of truth is `runtime/capabilities.yaml`, validated by
`schemas/runtime/capability.schema.json`.

Each capability defines:

- stable `id`
- human display metadata
- input and output schema refs
- `worker_type`
- allowed and denied permissions
- proof requirement
- verifier capability
- human gate requirement
- risk level
- policy ref
- isolated worktree execution fields where Codex writes repository changes

`repo.patch.codex`, `ci.recovery`, and `security.review` keep the existing
worktree policy fields:

- `requires_isolated_worktree: true`
- `worktree_created_by: runtime`
- `codex_cwd: worktree_path`
- `allow_main_checkout_edits: false`

## MVP Capability Set

The MVP set is:

- `spec.scope`
- `repo.patch.codex`
- `ci.recovery`
- `test.run`
- `proof.verify`
- `memory.propose`
- `security.review`
- `release.notes`

`github.pr.create` is also registered because current Phase 4 workflow fixtures
already reference `capability.github.pr.create@v1`. It is contract-only and
human-gated; it does not implement GitHub automation.

## Routing Rules

Baseline routing is manifest-based:

1. Match by `task_types`.
2. Filter out capabilities whose denied permissions conflict with task scope.
3. Prefer the narrowest capability that can produce the required output schema.
4. For repository mutation, select only a capability with isolated worktree
   execution.
5. For high-risk or external-action work, require proof plus a scoped human
   gate before the action node can proceed.
6. For memory work, route to `memory.propose`; direct memory writes are denied.
7. If no capability matches safely, route back to `spec.scope` or block with a
   readable reason.

## Workflow References

Current workflows reference these capabilities:

- `runtime/workflows/repo-patch.yaml`
  - `repo.patch.codex`
  - `proof.verify`
  - `github.pr.create`
- `runtime/workflows/ci-recovery.yaml`
  - `ci.recovery`
  - `test.run`
  - `proof.verify`
  - `github.pr.create`

Contract tests require every workflow capability ref to exist in the registry.

## Deferred

Deferred to later phases:

- runtime capability router package
- task graph compiler implementation
- worker dispatch code
- database persistence
- Matrix gateway integration
- GitHub PR creation automation
- capability scoring or dynamic selection
