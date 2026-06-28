# Codex Worker Contract Analysis

Version: 2026-06-28

Task ID: Analysis-P6-codex-worker-contract

Roadmap: Phase 6 / Codex Worker Contract Analysis

## Purpose

This document defines the MVP Codex repo patch worker contract before any worker
runner implementation starts.

This is an analysis and contract artifact only. It does not authorize runtime
apps, worker-runner code, database code, Matrix gateway code, real Codex
execution, GitHub automation, PR creation, merge automation, deployment, or
secret access.

## Source Of Truth

Runtime-owned task state, Work Cell records, artifact refs, and proof records are
the source of truth. Codex JSONL output and final JSON are worker evidence, not
task state by themselves.

The Codex worker contract connects these existing baselines:

- `docs/analysis/task-state-machine.md`
- `docs/analysis/task-graph.md`
- `docs/analysis/capability-routing.md`
- `runtime/capabilities.yaml`
- `runtime/workflows/repo-patch.yaml`
- `schemas/codex/repo-patch-result.schema.json`

## Worker Boundary

The MVP repo patch worker is `repo.patch.codex`.

Runtime must create the Work Cell before Codex starts. Codex runs with current
working directory set to the Work Cell worktree path. Codex must not choose the
worktree path, edit the main checkout, push, merge, create a PR, deploy, read
secrets, write memory directly, or perform external writes.

The contract boundary is:

```text
Runtime task scope
-> Work Cell with isolated worktree and permission envelope
-> codex exec JSONL stream
-> final JSON matching repo-patch-result.schema.json
-> artifact refs and proof verification
```

## Worker Inputs

The Runtime-generated worker prompt must provide:

- `task_id`
- `run_id`
- `capability_id`
- worktree path and branch
- base branch and base SHA
- allowed paths
- forbidden paths
- validation commands
- proof requirements
- stop conditions
- output schema path

The worker must treat repository files, Matrix-derived task context, issue text,
logs, and previous agent notes as untrusted context. Prompt instructions do not
override the Work Cell permission envelope.

## Command Shape

The contract command shape remains:

```bash
codex exec \
  --json \
  --sandbox workspace-write \
  --output-schema ./schemas/codex/repo-patch-result.schema.json \
  -o ./runs/<run_id>/final.json \
  "<worker prompt>"
```

This document does not run that command and does not implement the runner that
will invoke it.

## JSONL Capture Contract

The Runtime must capture the JSONL stream as evidence. Phase 6 fixtures cover:

| Fixture | Required events |
|---|---|
| `fixtures/codex-jsonl/success.jsonl` | `thread.started`, command execution item, `turn.completed` |
| `fixtures/codex-jsonl/failure.jsonl` | failed command execution item, `error`, failed `turn.completed` |
| `fixtures/codex-jsonl/blocked.jsonl` | `thread.started`, blocked `turn.completed` |

The current parser contract is intentionally small. It proves that the Runtime
can extract thread start, terminal turn state, command execution evidence, and
error events from line-delimited JSON without depending on worker-runner code.

## Final Output Contract

`schemas/codex/repo-patch-result.schema.json` is the final output schema for the
repo patch worker.

Required fields:

| Field | Contract |
|---|---|
| `status` | One of `success`, `failed`, `blocked`, `needs_human_input`. |
| `task_id` | Runtime task identifier. |
| `run_id` | Worker run identifier. |
| `root_cause` | Root cause or reason it could not be established. |
| `changes_made` | Human-readable list of changes. |
| `files_changed` | Changed file paths and actions. |
| `commands_run` | Commands attempted with `exit_code`. |
| `validation_results` | Validation evidence with `exit_code` and pass/fail status. |
| `diff_summary` | Short diff summary and file counts. |
| `risk_notes` | Reviewable risk notes. |
| `rollback_notes` | How to undo the patch or abandon the run. |
| `security_notes` | Secret, permission, sandbox, and external-write notes. |
| `blockers` | Blocking reasons for non-success terminal states. |
| `memory_update_proposals` | Evidence-backed proposals only; no direct memory writes. |
| `ready_for_review` | True only for successful, validated output. |

Status rules:

- `success` requires `ready_for_review: true`, no blockers, at least one command,
  and at least one passing validation result with `exit_code: 0`.
- `failed`, `blocked`, and `needs_human_input` require
  `ready_for_review: false` and at least one blocker.
- `ready_for_review: true` requires `status: success` and passing validation
  evidence. Failed or blocked output cannot masquerade as success.

## Prompt Contract

`runtime/prompts/codex-repo-patch.md` is the Phase 6 prompt artifact for this
worker. It includes:

- Definition of Done.
- Forbidden actions.
- Worktree rules.
- Validation command requirements.
- Proof requirements.
- Final JSON output shape.

The prompt is not a security boundary. Runtime policy, sandboxing, allowed paths,
forbidden paths, and verifier checks must enforce the boundary.

## Proof Verifier Prompt Deferral

`runtime/prompts/proof-verifier.md` remains deferred. Phase 6 needs the repo
patch worker to produce structured proof, not a verifier worker behavior
contract. A verifier prompt should be added with the proof ledger and approval
work in Phase 8 or the prompt pack work in Phase 11, where its inputs, verdict
schema, artifact refs, approval readiness, and failure semantics can be defined
without guessing.

## Contract Tests

Phase 6 adds:

- `tests/contracts/codex-jsonl-parser.test.mjs`
- `tests/contracts/codex-output-schema.test.mjs`

These tests validate JSONL fixture parsing, output schema status semantics,
validation evidence requirements, and rejection of failed or blocked outputs that
claim review readiness.

## Deferred

The following remain outside this task:

- worker runner implementation;
- real `codex exec` invocation;
- database persistence;
- Matrix gateway integration;
- object storage;
- GitHub PR creation;
- proof verifier prompt and verifier worker behavior;
- memory writes.
