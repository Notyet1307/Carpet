# TypeScript-first runtime

Status: accepted

The Matrix Codex Capability Runtime will be TypeScript-first, not TypeScript-only. This records the language boundary already set by the [architecture](../architecture/matrix-codex-capability-runtime.md) and required by the [analysis roadmap](../roadmaps/analysis-roadmap.md): TypeScript is the default language for runtime contracts and orchestration, while limited non-TypeScript tooling remains allowed where it is cheaper and safer.

TypeScript fits the main runtime because the system is mostly event, API, schema, and worker orchestration work, not CPU-bound computation. The TypeScript path covers the Matrix Application Service gateway, Runtime API, task state and capability contracts, JSON Schema/Ajv or Zod validation for Matrix and runtime events, Codex worker orchestration, GitHub integration through Octokit or CLI wrappers, and OpenTelemetry instrumentation across Matrix, Runtime, Work Cell, and Worker boundaries.

Allowed exceptions are narrow: one-off Python migration or data cleanup scripts, existing validators while they are still being migrated or reused, and shell readiness or CI scripts. These exceptions do not become a second runtime stack, do not own runtime state, and must not bypass schema validation, proof, policy, worktree isolation, or human approval gates.

This ADR does not authorize runtime implementation yet. The repository remains in the analysis and contract-baseline stage until the roadmap development entry gates are satisfied.
