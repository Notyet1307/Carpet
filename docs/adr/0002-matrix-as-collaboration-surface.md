# Matrix as collaboration surface

Status: accepted

Task ID: Analysis-P1-2

Roadmap: Phase 1 / Matrix collaboration ADR

Matrix is the collaboration protocol, audit timeline, human approval surface, and agent check-in surface for the Matrix Codex Capability Runtime. This records the Matrix boundary already described by the [architecture](../architecture/matrix-codex-capability-runtime.md), the [product language baseline](../analysis/02-product-language.md), and the [analysis roadmap](../roadmaps/analysis-roadmap.md).

Matrix rooms are where people and agents observe work, submit commands, review proof summaries, approve specific actions, and inspect incidents. Matrix custom events can carry intake, progress, proof summaries, approval requests, approval decisions, memory proposals, and blocked or failed states. Those events are part of the visible audit trail and collaboration workflow.

Matrix is not the task state database, permission engine, worker lifecycle manager, proof source of truth, or secret store. Room history must not be replayed as durable runtime state. A Matrix message must not grant broad permission by implication. Matrix must not own worktree creation, worker dispatch, policy decisions, proof ledger records, artifact storage, or secrets.

The Runtime remains the source of truth for task state, policy, proof ledger, and worker orchestration. Runtime-owned storage records task lifecycle, task graph nodes, policy decisions, Work Cell state, worker runs, proof entries, artifact references, approvals, and memory proposals. Matrix receives projections from Runtime state and sends commands into the Runtime boundary; it does not replace that boundary.

Matrix room events are projections and commands, not trusted state. Every inbound Matrix event must be treated as untrusted input, authenticated at the gateway boundary where applicable, checked for replay or duplicate delivery, validated against JSON Schema, and translated into Runtime commands before it can affect task state. Invalid, ambiguous, unsupported, or unauthorized events must be rejected or converted into visible incidents instead of being applied directly.

This ADR does not authorize Matrix gateway implementation yet. The repository remains in the analysis and contract-baseline stage until the roadmap development entry gates are satisfied. Gateway implementation still requires the later Matrix event contracts, AppService gateway analysis, policy model, proof ledger model, and contract tests described in the roadmap.
