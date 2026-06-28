# Codex exec before SDK

Status: accepted

Task ID: ADR-0006

Roadmap: Phase 12 / Development entry architecture follow-up

## Decision

The MVP real Codex execution path will use the Codex CLI first:

```bash
codex exec \
  --json \
  --sandbox workspace-write \
  --output-schema ./schemas/codex/repo-patch-result.schema.json
```

A later Codex SDK migration is allowed only after the MVP runner has proven the
same runtime controls, proof capture, and failure semantics with the CLI path.

## Context

The architecture recommends Codex as a scoped engineering worker, not the Runtime
source of truth. Phase 6 already defines the `repo.patch.codex` worker contract:
Runtime creates a Work Cell, launches Codex with `cwd = worktree_path`, captures
the JSONL stream, and requires final JSON matching
`schemas/codex/repo-patch-result.schema.json`.

The development entry review allows local fake MVP implementation through
MCR-700, but keeps real Codex execution blocked because this ADR was missing.
That blocker is architecture-level: the decision must be explicit before MCR-310
or any production-like Codex worker run can depend on real Codex behavior.

## Why CLI First For MVP

The CLI is the smallest executable contract that matches the existing Phase 6
analysis:

- `--json` gives the Runtime a stream it can store as worker evidence.
- `--output-schema` binds the final worker result to the existing Codex output
  schema.
- `--sandbox workspace-write` keeps the initial implementation aligned with the
  repo patch permission envelope.
- A process boundary makes `cwd`, environment, timeout, stdout/stderr capture,
  and exit code handling straightforward to test in the runner.
- It avoids designing SDK lifecycle, resume, thread ownership, and streamed
  event abstractions before the MVP proves they are needed.

## Why SDK Migration Is Deferred

The SDK is the likely upgrade path for durable server integration, persistent
threads, resume behavior, richer streamed events, and product-level Codex
controls. Those are not required to prove the MVP repo patch loop.

Migrating too early would add a second integration surface while the Runtime
still needs to prove worktree provenance, policy enforcement, proof capture,
approval gates, and fake E2E behavior. The SDK migration should be its own later
architecture and implementation task with compatibility tests against the CLI
contract recorded here.

## Required Runtime Controls

Prompt text is not permission enforcement. The Runtime or worker-runner must
enforce these controls outside the worker prompt:

- create or select the isolated worktree before launching Codex;
- launch Codex with `cwd` set to the Work Cell `worktree_path`;
- reject main checkout paths as Codex working directories;
- pass `--sandbox workspace-write`;
- pass `--output-schema ./schemas/codex/repo-patch-result.schema.json`;
- capture JSONL, final JSON, command exit code, diff, validation output, and
  worktree provenance as proof inputs;
- enforce allowed paths and forbidden paths before review readiness;
- provide no production secrets or secret-bearing environment to the process;
- forbid direct main checkout edits;
- forbid push, merge, PR creation, deployment, live memory writes, and other
  external writes unless a later task adds explicit runtime gates and
  action-scoped human approval for that action.

## Consequences

MCR-310 should implement a command builder and manual smoke runner around the
CLI contract before any SDK adapter exists. MCR-720 and any real-service Codex
smoke test must depend on that proof.

The Runtime must treat Codex output as worker evidence, not task state. Success
requires schema-valid final JSON, passing validation evidence, policy checks,
and proof verification. Failed, blocked, or incomplete worker output must not
be promoted to review readiness.

The future SDK adapter must preserve the same observable contract: worktree cwd,
sandbox-equivalent policy boundary, schema-valid final result, event/proof
capture, no secrets, no main checkout edits, and no external action without a
runtime gate.

## Blocked Until This ADR Exists

Until this ADR exists and is accepted, these remain blocked:

- MCR-310 Real Codex Exec Smoke Runner;
- MCR-720 real-service smoke tests that depend on real Codex execution;
- any production-like Codex worker execution;
- any SDK migration task that would replace the MVP CLI contract before it is
  proven.

This ADR removes only the missing architecture decision blocker. MCR-310 still
depends on its backlog prerequisites, including MCR-300, MCR-400, and MCR-700.

## This ADR Does Not Authorize

This ADR does not authorize runtime apps, worker-runner implementation, database
code, Matrix integration, real Codex execution, GitHub automation, PR creation,
push, merge, deployment, secret access, live memory writes, or a Codex SDK
migration.

It also does not make worktree isolation a security boundary. Worktree isolation
is development isolation; sandbox, policy, allowed paths, forbidden paths,
secret isolation, proof verification, and human approval remain the security and
governance controls.
