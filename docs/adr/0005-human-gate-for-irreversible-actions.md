# Human gate for irreversible actions

Status: accepted

Task ID: Analysis-P8-proof-approval-contract

Roadmap: Phase 8 / Proof Ledger 与 Approval 分析

Irreversible or externally visible actions require human approval scoped to one
specific action. The MVP gated actions are `push_branch`, `create_pr`,
`external_write`, `secret_access`, and `memory_write`.

Approval of a task is not approval of every action inside that task. An approval
record must name the action, task, proof, human actor, target, conditions,
creation time, and expiry time. The approval expires so it cannot be replayed as
open-ended permission.

Before approval, the system may generate local patches, run validation, create
proof, and propose memory changes. Without matching proof and matching approval,
the system must not push a branch, create a PR, write externally, access
secrets, or write live memory. Direct push to `main`, merge, production deploy,
and production secret reads remain forbidden.

This ADR does not authorize an approval service, GitHub automation, secret
broker, Matrix gateway, worker runner, or memory writer. It only records the
contract baseline those future implementations must satisfy.
