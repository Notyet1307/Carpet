# Proof ledger before memory write

Status: accepted

Task ID: Analysis-P8-proof-approval-contract

Roadmap: Phase 8 / Proof Ledger 与 Approval 分析

Memory updates must pass through proof before they can become live memory. A
worker may propose memory updates, but the proposal is not a write. The proposal
must cite the proof that justifies it, and any later `memory_write` approval must
cite both the same proof and the concrete memory proposal id.

This keeps Memory as a controlled learning surface instead of an automatic sink
for agent summaries. It also preserves the architecture boundary: Runtime owns
proof and approval records, while Matrix may show `memory.update.proposed` as an
audit projection. Matrix history, chat summaries, and worker final messages are
not sufficient evidence for live memory changes.

The Phase 8 contract baseline enforces this with
`schemas/proof/approval.schema.json`: `memory_write` approval requires
`proof_id`, `target.proposal_id`, and `target.memory_scope`. The existing Matrix
memory proposal schema already requires `proof_id` and operation `propose`.

This ADR does not authorize a memory writer. Live memory writes remain deferred
until the development entry gates and a future memory proposal flow are complete.
