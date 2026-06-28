# Proof Ledger and Approval Gate Analysis

Version: 2026-06-28

Task ID: Analysis-P8-proof-approval-contract

Roadmap: Phase 8 / Proof Ledger 与 Approval 分析

## Purpose

This document defines the MVP proof ledger and approval gate contract baseline.
It closes the missing approval side of Phase 8 without implementing an approval
service, GitHub adapter, database, Matrix gateway, worker, or memory writer.

## Source Of Truth

Runtime-owned records are the source of truth for proof and approval. Matrix
events are projections and commands. GitHub artifacts are external outputs.
Memory updates start as proposals, not live writes.

The contract boundary is:

```text
worker output
-> proof ledger entry
-> proof verification
-> action-scoped approval
-> one approved gated action
```

An approval does not approve a task, a worker, or future follow-up actions. It
approves one concrete action against one proof reference for a bounded period.

## Proof Ledger Baseline

`schemas/proof/proof-ledger-entry.schema.json` remains the proof ledger entry
baseline. It requires task/run/trace identity, Work Cell provenance, artifact
refs, validation evidence, risk notes, rollback notes, and creation time.

Proof is evidence, not a summary. A human reviewer must be able to inspect:

- which task and run produced the proof;
- which capability executed;
- which worktree, branch, base SHA, and head SHA were used;
- which artifacts were produced;
- which validation commands ran and with which exit codes;
- which risks and rollback steps remain.

## Approval Record Contract

`schemas/proof/approval.schema.json` defines the approval record consumed by the
future approval gate. Required fields are:

```text
approval_id
task_id
proof_id
action
actor
target
conditions
created_at
expires_at
```

The approved `action` is one of:

```text
push_branch
create_pr
external_write
secret_access
memory_write
```

`actor.type` is `human`. `proof_id` is required before approval. `expires_at` is
required so approval cannot become an unbounded reusable token. `conditions`
records the narrow terms a future executor must satisfy.

`target` makes the approval concrete:

| Action | Target requirement |
|---|---|
| `push_branch` | non-main git branch ref |
| `create_pr` | source branch ref and base branch ref |
| `external_write` | external system, operation, and target ref |
| `secret_access` | secret ref and purpose |
| `memory_write` | memory proposal id and memory scope |

## Gate Policy

Allowed before human approval:

- generate a patch inside the scoped worktree;
- create or update the local task branch;
- run validation commands;
- create artifacts and proof entries;
- propose memory updates as records or Matrix events.

Requires action-scoped approval:

- push a branch;
- create a PR;
- write to an external system;
- access a secret;
- write an approved memory proposal into live memory.

Forbidden in this analysis stage:

- direct push to `main`;
- merge PR;
- deploy production;
- read production secrets;
- write live memory without a proposal and proof-backed approval;
- implement a runtime approval engine, GitHub automation, database, Matrix
  gateway, worker, or memory writer.

## Memory Write Rule

Memory learning is two-step:

```text
proof ledger entry
-> memory.update.proposed with proof_id
-> approval action memory_write with the same proof_id and proposal_id
-> future memory writer may apply only that approved proposal
```

A memory proposal without a proof reference is invalid at the Matrix contract
layer. A memory write approval without `proof_id` and `target.proposal_id` is
invalid at the proof approval contract layer.

## Contract Tests

Phase 8 adds `tests/contracts/proof-ledger-entry.test.mjs`.

The test proves:

- the approval schema accepts valid approvals for all five gated actions;
- vague whole-task approvals are rejected;
- proofless approvals are rejected;
- approval records require bounded validity;
- memory write approval requires a memory proposal target;
- gated irreversible actions fail contract checks without proof or matching
  approval.

## Deferred

The following remain outside Phase 8 contract baseline:

- approval service implementation;
- approval replay protection implementation;
- GitHub PR adapter;
- branch push automation;
- external write adapter;
- secret broker;
- database persistence;
- Matrix approval event ingestion;
- memory writer.
