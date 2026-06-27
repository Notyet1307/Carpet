# Bounded Contexts And Component Interfaces

Version: 2026-06-27

Task ID: Analysis-P2-1

Roadmap: Phase 2 / Codex Task Card 2.1

## Purpose

This document decomposes Matrix Codex Capability Runtime into MVP bounded
contexts and testable component interfaces before runtime implementation starts.
It follows the product language baseline:

```text
Intent -> Task -> Task Graph -> Capability -> Work Cell -> Worker
       -> Artifact -> Proof -> Verifier -> Approval -> Memory Proposal
```

This is an analysis artifact only. It does not authorize runtime apps, workers,
database migrations, Matrix integration, Codex execution, GitHub automation,
schema changes, or fixture changes.

## Boundary Rules

- Matrix is a collaboration and projection surface, not the runtime source of
  truth.
- Runtime-owned storage is the source of truth for task state, work cell state,
  policy decisions, proof entries, approvals, and memory proposals.
- Proof logs are artifacts in the Object Store Adapter and references in the
  Proof Ledger. Matrix may show proof summaries and artifact references, but it
  must not store raw proof logs directly.
- Every inbound Matrix event is untrusted input until the Matrix AppService
  Gateway authenticates, deduplicates, validates, and translates it into a
  Runtime command.
- No component owns the whole runtime. Each component owns one narrow interface
  and can be tested through that interface.
- Worktree isolation is a development isolation boundary, not a complete
  security boundary. Policy, sandboxing, allowed paths, forbidden paths, secret
  isolation, and approval gates still apply.

## Bounded Contexts

### Collaboration Context

Scope:

- Matrix Homeserver
- Matrix AppService Gateway

The Collaboration Context accepts human-visible input and publishes runtime
projections. It does not decide task state, permissions, worker lifecycle, proof
truth, or memory writes.

### Runtime Orchestration Context

Scope:

- Runtime API
- Task Store
- Capability Router
- Policy Engine
- Work Cell Manager

The Runtime Orchestration Context owns task lifecycle, graph compilation,
capability selection, policy checks, and Work Cell lifecycle. It persists state
through the Task Store rather than reconstructing state from Matrix room
history.

### Worker Execution Context

Scope:

- Codex Worker Runner

The Worker Execution Context runs a selected worker inside a Work Cell. It
returns structured results, artifacts, logs, and exit codes. It does not approve
itself, mutate task state directly, or broaden its permission envelope.

### Evidence And Approval Context

Scope:

- Proof Ledger
- Approval Service
- Memory Proposal Service

The Evidence And Approval Context turns worker claims into reviewable proof,
action-scoped approval requests, and evidence-backed memory proposals. Approval
is per action, not a vague approval for a whole task.

### External Adapter Context

Scope:

- GitHub Adapter
- Object Store Adapter

The External Adapter Context hides external side effects behind narrow
interfaces. Adapters are called only after Runtime policy allows the action.

## Component Interfaces

### Matrix Homeserver

Responsibility:

- Host Matrix rooms, room history, custom events, human messages, approval
  messages, and visible audit timeline projections.

Inputs:

- Human messages.
- Matrix custom events from users, agents, and the AppService Gateway.
- Runtime projection events sent through the AppService Gateway.

Outputs:

- Room events delivered to the Matrix AppService Gateway.
- Human-visible projections for task status, proof summaries, approval requests,
  approval decisions, memory proposals, and incidents.

Owned state:

- Matrix room history, room membership, event IDs, senders, timestamps, and room
  aliases.
- No runtime task state, worker state, policy state, proof log body, artifact
  body, approval truth, or memory truth.

External dependencies:

- Matrix homeserver implementation and its authentication, delivery, room, and
  federation behavior.

Failure modes:

- Duplicate event delivery.
- Delayed or missing event delivery.
- Malformed or unsupported custom event content.
- Unauthorized sender or spoofed-looking content.
- Room history unavailable or redacted.

Test strategy:

- Contract tests with valid and invalid Matrix event fixtures.
- Idempotency tests at the gateway seam using duplicate Matrix event IDs.
- Projection tests that assert Matrix receives summaries and references, not raw
  proof logs or runtime database rows.

### Matrix AppService Gateway

Responsibility:

- Authenticate homeserver transactions, validate Matrix events, enforce
  idempotency, translate allowed events into Runtime commands, and project
  Runtime summaries back to Matrix.

Inputs:

- Homeserver transactions.
- Matrix room events and custom event envelopes.
- Runtime projection requests from the Runtime API.

Outputs:

- Validated Runtime commands such as task intake, approval decision, or command
  rejection.
- Matrix projection events for status, proof summaries, approval requests,
  memory proposals, and incidents.

Owned state:

- Idempotency records for received Matrix event IDs or transaction IDs.
- Gateway delivery status for outbound projections.
- No durable task lifecycle, proof ledger, approval decision truth, worker run
  truth, or artifact contents.

External dependencies:

- Matrix Homeserver.
- Runtime API.
- JSON Schema validator.

Failure modes:

- Invalid homeserver token.
- Event schema validation failure.
- Duplicate transaction.
- Runtime API unavailable.
- Matrix send failure for projection events.

Test strategy:

- Gateway contract tests using Matrix event fixtures.
- Replay tests proving duplicate events produce one Runtime command.
- Projection tests proving rejected events become visible incidents without
  changing Runtime state.

### Runtime API

Responsibility:

- Expose the Runtime command/query seam for intake, status, projection,
  approval, Work Cell dispatch, proof submission, and memory proposal workflows.

Inputs:

- Validated commands from the Matrix AppService Gateway.
- Worker runner callbacks or result submissions.
- Verifier, approval, adapter, and memory proposal commands.
- Runtime queries for status projections.

Outputs:

- Task Store writes and reads.
- Calls to Capability Router, Policy Engine, Work Cell Manager, Proof Ledger,
  Approval Service, Memory Proposal Service, and adapters.
- Projection requests back to the Matrix AppService Gateway.

Owned state:

- Request-level trace context, authentication context, and command result shape.
- No independent task database, policy database, artifact body, or hidden worker
  queue state outside the Task Store and owning components.

External dependencies:

- Matrix AppService Gateway.
- Task Store.
- Runtime orchestration components.
- Observability/logging backend.

Failure modes:

- Command rejected by validation or authorization.
- Task Store unavailable.
- Partial orchestration failure after a command begins.
- Duplicate command with same idempotency key.

Test strategy:

- Command handler tests with fake Task Store and fake component interfaces.
- Idempotency tests for repeated command IDs.
- Integration contract tests proving each command has one owning component and
  one persisted state transition.

### Task Store

Responsibility:

- Persist the Runtime source of truth for workspaces, Matrix event references,
  tasks, task nodes, work cells, worker runs, artifacts, proof entries,
  approvals, memory proposals, policy decision references, and state
  transitions.

Inputs:

- Runtime API commands.
- State transition requests from Work Cell Manager, Proof Ledger, Approval
  Service, and Memory Proposal Service.
- Query requests for status projections and verification.

Outputs:

- Persisted records.
- State snapshots for Runtime queries.
- Append-only transition evidence for proof and replay.

Owned state:

- Runtime task state and lifecycle.
- Runtime-owned references to Matrix events, worktree paths, artifact URIs,
  proof IDs, approval IDs, memory proposal IDs, and worker run IDs.
- It stores references to raw logs and artifacts, not the logs or large artifact
  bodies themselves.

External dependencies:

- Postgres or the later chosen Runtime database.
- Migration and backup mechanism once implementation is allowed.

Failure modes:

- Transaction conflict.
- Lost update if transition preconditions are not checked.
- Schema mismatch between stored records and contract fixtures.
- Database unavailable.

Test strategy:

- State transition contract tests.
- Repository tests with transaction rollback around each state mutation.
- Concurrency tests for idempotent intake and work cell status updates.
- Tests proving Matrix room history is never replayed as task state.

### Capability Router

Responsibility:

- Select a Capability Version for a task node based on declared inputs,
  outputs, risk level, permissions, required proof, verifier, and policy
  bindings.

Inputs:

- Scoped task node.
- Capability registry snapshot.
- Runtime context such as repo, allowed files, forbidden files, risk, and
  validation commands.
- Policy Engine allow/deny result.

Outputs:

- Selected capability ID and version.
- Required worker type, proof requirements, validation expectations, and
  verifier.
- Routing rejection with reason when no safe capability matches.

Owned state:

- No durable runtime state.
- May use a read-only registry snapshot or cache keyed by capability version.

External dependencies:

- Capability registry artifact.
- Policy Engine.
- Task Store for persisted selected capability references.

Failure modes:

- Unknown capability.
- Capability version missing or malformed.
- Multiple matching capabilities without a deterministic tie-breaker.
- Capability asks for permissions denied by policy.

Test strategy:

- Pure function tests for routing decisions.
- Invalid registry fixture tests.
- Deny tests proving risky permissions are rejected before Work Cell creation.

### Policy Engine

Responsibility:

- Evaluate whether a requested Runtime action is allowed, denied, or requires
  approval based on task context, capability, actor, resource, risk level, and
  default-deny rules.

Inputs:

- Action request such as worktree.write, test.run, pr.create, memory.propose,
  or external.write.
- Actor and capability context.
- Task, Work Cell, and artifact metadata.
- Policy document or compiled policy bundle.

Outputs:

- Policy decision: allow, deny, or approval_required.
- Decision reason and policy version.
- Required approval action when applicable.

Owned state:

- No task lifecycle state.
- Policy version/cache and decision records persisted through the Task Store or
  future policy decision table.

External dependencies:

- Policy document or policy bundle.
- Task Store for contextual facts.
- Approval Service when approval is required.

Failure modes:

- Missing policy version.
- Unsupported action.
- Ambiguous rule match.
- Policy bundle unavailable.
- Stale context used for decision.

Test strategy:

- Deny-by-default contract tests.
- Table-driven tests for high-risk actions such as pr.create, merge, deploy,
  secret.read, and memory.write_live.
- Golden tests that assert every decision includes policy version and reason.

### Work Cell Manager

Responsibility:

- Create, track, and clean up one temporary Work Cell for one task node, binding
  context pack, selected Capability, worker type, worktree path, sandbox
  profile, permission envelope, budget, timeout, and validation commands.

Inputs:

- Task node and selected Capability Version.
- Policy Engine decision.
- Worktree policy and task allowed/forbidden paths.
- Runtime context pack and validation command list.

Outputs:

- Work Cell record.
- Worker launch request for the Codex Worker Runner.
- Work Cell lifecycle updates.
- Cleanup result.

Owned state:

- Work Cell lifecycle state.
- Worktree path, branch, base branch, base SHA, cleanup policy, timeout, budget,
  sandbox profile, permission envelope, and Codex cwd.
- It does not own worker stdout/stderr bodies, proof truth, approval decisions,
  or task completion truth.

External dependencies:

- Task Store.
- Git worktree creation mechanism.
- Codex Worker Runner.
- Object Store Adapter for context pack and log/artifact references when needed.

Failure modes:

- Worktree path already exists.
- Branch conflict.
- Base SHA unavailable.
- Sandbox setup failure.
- Cleanup failure.
- Worker timeout or cancellation.

Test strategy:

- Work Cell schema and fixture tests.
- Fake worktree creator tests for branch/path/base SHA provenance.
- Timeout and cleanup tests.
- Tests proving Codex cwd equals the worktree path and never the main checkout.

### Codex Worker Runner

Responsibility:

- Start Codex in the Work Cell cwd with the task brief, stream output, collect
  JSONL/logs, parse final output, capture exit code, and submit worker result
  artifacts to Runtime.

Inputs:

- Work Cell launch request.
- Task brief, context pack, capability prompt, allowed files, forbidden files,
  validation commands, timeout, and budget.
- Policy envelope from the Work Cell.

Outputs:

- Worker run record update.
- Structured Codex result.
- Stdout/stderr/JSONL log references.
- Artifact references such as diff, changed files, test logs, and generated
  docs.
- Failure result when Codex blocks, times out, exits non-zero, or violates the
  contract.

Owned state:

- Process lifecycle for a worker run.
- Stream offsets and local temporary files until uploaded.
- No task approval, policy decisions, durable proof truth, or memory truth.

External dependencies:

- Codex CLI or later Codex SDK.
- Work Cell filesystem.
- Object Store Adapter.
- Runtime API.

Failure modes:

- Codex command not found.
- Invalid final output.
- Worker exceeds timeout or budget.
- Worker writes forbidden paths.
- Validation command fails.
- Log upload fails.

Test strategy:

- Fake Codex JSONL parser tests.
- Process runner tests using a fake executable.
- Contract tests for success, failed, blocked, and malformed final output.
- Path guard tests proving forbidden writes are detected before proof approval.

### Proof Ledger

Responsibility:

- Record proof entries that bind claims to artifacts, commands, exit codes,
  validation results, policy decisions, worktree provenance, risk notes,
  rollback notes, and verifier results.

Inputs:

- Worker result and artifact references.
- Validation command results.
- Policy decision references.
- Worktree provenance.
- Verifier outcome.

Outputs:

- Proof entry ID.
- Proof summary for Matrix projection.
- Verification status for Approval Service and Memory Proposal Service.
- Rejection reason when proof is incomplete or inconsistent.

Owned state:

- Proof entries and verification status.
- References to logs, artifacts, diffs, and command outputs.
- It does not store raw proof logs in Matrix; raw logs live behind Object Store
  references.

External dependencies:

- Task Store.
- Object Store Adapter.
- Verifier capability.
- Matrix AppService Gateway for proof summary projection through Runtime API.

Failure modes:

- Missing required proof field.
- Artifact hash mismatch.
- Log reference unavailable.
- Verification failed.
- Proof references a task, run, or capability that does not match the Task
  Store records.

Test strategy:

- Proof schema and fixture tests.
- Hash/reference consistency tests.
- Negative tests for missing validation, missing worktree provenance, and
  mismatched task/run IDs.
- Projection tests proving Matrix receives proof summary and object refs only.

### Approval Service

Responsibility:

- Request, record, and enforce action-scoped approvals for high-risk or
  irreversible actions such as pr.create, merge, deploy, security exceptions,
  and policy exceptions.

Inputs:

- Policy decision requiring approval.
- Proof Ledger verification status.
- Requested action, actor, task ID, proof ID, and conditions.
- Approval or denial command from the Matrix AppService Gateway.

Outputs:

- Approval request projection.
- Approval decision record.
- Release of one specific gated action when approved.
- Denial or timeout reason when not approved.

Owned state:

- Approval request and decision records.
- Conditions attached to the approved action.
- It does not own task completion, proof contents, or broad permission grants.

External dependencies:

- Task Store.
- Proof Ledger.
- Matrix AppService Gateway.
- Policy Engine.

Failure modes:

- Approval requested without verified proof.
- Approval decision references wrong action or proof ID.
- Ambiguous Matrix reply.
- Approval expires.
- Duplicate approval decision.

Test strategy:

- Action-scoped approval contract tests.
- Tests proving a vague Matrix message cannot unlock multiple actions.
- Tests proving pr.create remains blocked before approval and allowed only for
  the approved task/action/proof tuple.

### Memory Proposal Service

Responsibility:

- Produce, record, and project evidence-backed memory proposals after proof is
  verified and policy permits proposal creation.

Inputs:

- Verified proof entry.
- Task outcome and risk notes.
- Candidate memory update content and target scope.
- Policy decision for memory.propose.

Outputs:

- Memory proposal record.
- Matrix projection for human review.
- Rejection reason for unsupported scope, missing evidence, or disallowed target.

Owned state:

- Memory proposal status and evidence reference.
- No live memory writes, prompt edits, policy edits, or AGENTS.md edits.

External dependencies:

- Proof Ledger.
- Task Store.
- Matrix AppService Gateway.
- Optional future memory review repository or document target.

Failure modes:

- Missing proof evidence.
- Proposal attempts live memory write.
- Proposal scope too broad.
- Duplicate or contradictory proposal.

Test strategy:

- Proposal validation tests for required evidence proof ID.
- Deny tests for memory.write_live and direct prompt/policy mutation.
- Projection tests showing proposals are review items, not automatic changes.

### GitHub Adapter

Responsibility:

- Perform narrow GitHub operations such as reading repository metadata, checking
  CI status, creating a PR, and adding comments after Runtime policy and
  approval allow the exact action.

Inputs:

- Approved action request from Runtime.
- Branch, commit, proof ID, title, body, labels, and repository target.
- GitHub credential provided by the execution environment.

Outputs:

- GitHub resource reference such as PR URL, check URL, comment URL, or failure
  reason.
- Adapter result persisted through Runtime.

Owned state:

- No durable runtime source of truth.
- May keep request/response correlation IDs and retry metadata.

External dependencies:

- GitHub API or GitHub CLI.
- Network and credential provider.
- Policy Engine and Approval Service decisions supplied by Runtime.

Failure modes:

- Missing or insufficient GitHub credential.
- API rate limit or network failure.
- Branch not pushed.
- PR already exists.
- Action not approved.

Test strategy:

- Fake GitHub adapter tests first.
- Contract tests for approved and denied action requests.
- Retry/idempotency tests for duplicate PR create requests.
- Tests proving adapter cannot merge or push unless a future policy explicitly
  adds that action.

### Object Store Adapter

Responsibility:

- Store and retrieve large artifacts and logs by URI and content hash, including
  worker JSONL, stdout, stderr, diffs, validation logs, and context packs.

Inputs:

- Artifact body, media type, task ID, run ID, artifact type, and expected hash
  when known.
- Read requests by URI and expected hash.

Outputs:

- Artifact URI, sha256, size, media type, and storage metadata.
- Artifact bytes or read failure.

Owned state:

- Artifact and log bodies in object storage.
- It does not own proof semantics, task state, Matrix history, or approval
  status.

External dependencies:

- Local filesystem, S3-compatible storage, or later chosen object storage.
- Hashing library.
- Runtime credential/permission envelope.

Failure modes:

- Upload failure.
- Hash mismatch.
- Object missing.
- Unauthorized read/write.
- Retention policy removes an object needed by active proof.

Test strategy:

- Fake object store tests with hash verification.
- Tests for missing object, hash mismatch, and unauthorized access.
- Proof Ledger integration tests proving proof entries store object refs and
  hashes, not raw Matrix log bodies.

## Cross-Component Interfaces

| Interface | Producer | Consumer | Payload | State owner |
|---|---|---|---|---|
| Matrix event envelope | Matrix Homeserver | Matrix AppService Gateway | Matrix event ID, room, sender, type, content | Matrix Homeserver owns room event; Task Store may reference it |
| Runtime command | Matrix AppService Gateway | Runtime API | Validated command, actor, idempotency key, trace ID | Runtime API routes; Task Store persists effects |
| Task state transition | Runtime API / managers | Task Store | Entity ID, expected state, next state, reason | Task Store |
| Capability selection | Runtime API | Capability Router | Task node, registry version, policy context | Task Store records selected capability |
| Policy decision | Runtime API / managers | Policy Engine | Action, actor, resource, capability, task context | Task Store records decision reference |
| Work Cell launch | Work Cell Manager | Codex Worker Runner | Work Cell ID, cwd, prompt/context, policy envelope | Work Cell Manager owns lifecycle |
| Artifact reference | Codex Worker Runner / adapters | Object Store Adapter / Proof Ledger | URI, sha256, media type, task/run ID | Object Store owns body; Proof Ledger owns evidence reference |
| Proof entry | Codex Worker Runner / verifier | Proof Ledger | Worktree provenance, artifacts, commands, results, risks | Proof Ledger |
| Approval request/decision | Approval Service / Gateway | Matrix / Runtime | action, task ID, proof ID, actor, conditions | Approval Service |
| Memory proposal | Memory Proposal Service | Matrix / future memory review target | scope, proposed updates, evidence proof ID | Memory Proposal Service |

## Overlap Checks

- Runtime API coordinates commands but does not become a universal runtime; state
  is owned by Task Store and domain services.
- Task Store persists state but does not select capabilities, evaluate policy,
  run workers, approve actions, or interpret proof.
- Capability Router selects a capability but does not grant permission; Policy
  Engine decides allow/deny/approval_required.
- Work Cell Manager creates execution envelopes but does not parse Codex output
  or approve completion.
- Codex Worker Runner executes work but does not own completion, approval, or
  durable proof truth.
- Proof Ledger records evidence and verification status but does not store raw
  logs in Matrix and does not approve high-risk actions.
- Approval Service approves one action against one proof record; it does not
  approve an entire task or grant ongoing permissions.
- Memory Proposal Service proposes updates only; it never writes live memory.
- GitHub Adapter and Object Store Adapter perform side effects only behind
  Runtime policy decisions and narrow adapter interfaces.

## First Test Boundaries

- Matrix AppService Gateway: fixture-driven event validation, auth failure,
  replay/idempotency, and projection summary shape.
- Runtime API: command idempotency and one state transition per accepted command.
- Task Store: legal/illegal state transitions and optimistic concurrency.
- Capability Router: safe selection, unknown capability rejection, policy denied
  capability rejection.
- Policy Engine: deny-by-default and approval_required decisions for high-risk
  actions.
- Work Cell Manager: worktree provenance, cwd equals worktree path, cleanup
  status, timeout path.
- Codex Worker Runner: fake JSONL success/failed/blocked/malformed outputs and
  forbidden path detection.
- Proof Ledger: required fields, artifact hash/reference consistency, missing
  validation rejection.
- Approval Service: action-scoped approval, duplicate decision handling, approval
  timeout.
- Memory Proposal Service: verified proof required, proposal scope validation,
  live write denial.
- GitHub Adapter: fake PR create after approval, denied PR create before
  approval, idempotent duplicate request.
- Object Store Adapter: upload/read by hash, hash mismatch, missing object, and
  unauthorized access.

## Diagrams

Mermaid source diagrams are stored at:

- `docs/diagrams/context.mmd`
- `docs/diagrams/runtime-container.mmd`
- `docs/diagrams/mvp-sequence.mmd`
