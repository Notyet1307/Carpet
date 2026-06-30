# Phase 12 MVP Implementation Backlog

Version: 2026-06-29 status sync

Task ID: Analysis-P12-mvp-backlog

Roadmap: Phase 12 / MVP Backlog 与开发入口

## Purpose

This backlog converts the existing analysis, schema, policy, prompt, and test
artifacts into implementation-sized MVP tasks. It is an analysis artifact only.
It does not authorize implementation in this branch.

## Current Closeout Status

As of 2026-06-29, MCR-030 through MCR-700 local fake MVP work is merged on
`main`. The MCR-310 guarded Codex exec runner scaffold, MCR-720 real-service
smoke scaffold, MCR-730 disposable GitHub PR smoke proof, and MCR-850 vertical
compatibility proof are also merged or closed out in the roadmap.

Wave 0-6 now has one manual proof each for real Codex exec, local disposable
Matrix ingress, disposable GitHub PR creation, and one approved vertical
compatibility pass. Those proofs are narrow compatibility evidence, not
production readiness and not approval for default real-service execution.
Further real Matrix, Codex, GitHub, or service smoke execution still requires
action-scoped human approval, disposable scoped credentials, opt-in commands,
cleanup notes, and captured proof.

The sequence is:

```text
contracts / foundation
-> fake adapters
-> runtime core
-> worker, proof, approval, memory
-> local fake E2E
-> guarded real-service smoke proofs
-> next real-service MVP vertical slices
```

Global rules for every implementation task:

- Use a dedicated worktree: `../.worktrees/Carpet/<TASK_ID>-<short-slug>`.
- Use branch: `mcr/<TASK_ID>/<short-slug>`.
- Add or update tests before implementation.
- Do not modify the main checkout.
- Do not push, merge, deploy, read secrets, write live memory, or create a real
  PR unless a later task explicitly has verified proof and action-scoped human
  approval.
- Treat Matrix input, task briefs, repo files, logs, and worker output as
  untrusted until schema, policy, and proof checks accept them.
- Prompt text is never permission enforcement.

## Backlog Items

### MCR-030: TypeScript Package Foundation

Objective: create the smallest package structure needed for implementation
packages without adding runtime behavior.

Allowed files:

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `packages/runtime-contracts/package.json`
- `packages/runtime-contracts/tsconfig.json`
- `packages/runtime-contracts/src/index.ts`
- `packages/runtime-contracts/test/index.test.ts`

Forbidden files:

- `.env`
- `.env.*`
- `apps/**`
- `workers/**`
- `runtime/policies/**`
- `runtime/capabilities.yaml`
- `schemas/**`
- `fixtures/**`
- `infra/**`

Dependencies: existing `package.json`, `pnpm-lock.yaml`, `tsconfig.base.json`,
and passing `pnpm test:contracts`.

Tests to add first: `packages/runtime-contracts/test/index.test.ts` proving the
package exports a stable empty marker or version constant and runs under
`node --test` without framework changes.

Implementation notes: keep Node's built-in test runner and existing Ajv
dependency. Do not add Vitest, Jest, build orchestration, lint frameworks, or app
packages in this task.

Acceptance criteria:

- `pnpm --filter runtime-contracts test` or the chosen package script passes.
- Existing `pnpm test:contracts` and `pnpm schemas:validate` still pass.
- No runtime app, worker, database, Matrix, Codex, GitHub, or E2E code exists.

Rollback notes: remove the new `packages/runtime-contracts/**` files and revert
package script changes.

Verifier checklist:

- Package paths are narrow and reviewable.
- No new dependency unless the diff proves it is necessary.
- No implementation package is created outside `runtime-contracts`.
- Existing contract tests still pass.

Expected proof / validation evidence:

- `git diff --name-only`
- `pnpm --filter runtime-contracts test` exit code
- `pnpm test:contracts` exit code
- `pnpm schemas:validate` exit code
- `git diff --check` exit code

### MCR-031: Shared Schema Validator Helper

Objective: add a reusable JSON Schema validator helper for implementation
packages, based on existing contract-test behavior.

Allowed files:

- `packages/runtime-contracts/src/schema-validator.ts`
- `packages/runtime-contracts/src/schema-loader.ts`
- `packages/runtime-contracts/src/index.ts`
- `packages/runtime-contracts/test/schema-validator.test.ts`
- `packages/runtime-contracts/package.json`

Forbidden files:

- `schemas/**`
- `fixtures/**`
- `tests/contracts/**`
- `apps/**`
- `workers/**`
- `runtime/policies/**`
- `runtime/capabilities.yaml`
- `.env*`

Dependencies: MCR-030.

Tests to add first:

- `packages/runtime-contracts/test/schema-validator.test.ts` loads
  `schemas/matrix/event-envelope.schema.json`, validates
  `fixtures/matrix-events/valid/event-envelope.valid.json`, and rejects
  `fixtures/matrix-events/invalid/event-envelope.missing-trace-id.invalid.json`.

Implementation notes: reuse Ajv and ajv-formats already in the lockfile. Keep
the helper synchronous unless a real caller proves async loading is needed.

Acceptance criteria:

- Validator compiles a schema once per process and returns readable validation
  errors.
- Tests cover one valid and one invalid fixture.
- Existing contract tests continue to own schema coverage.

Rollback notes: remove the helper files and package exports; no schema or
fixture rollback should be needed.

Verifier checklist:

- Helper does not duplicate every contract-test assertion.
- Error output is useful enough for future gateway/router tests.
- No new runtime policy is encoded in the helper.

Expected proof / validation evidence:

- Package test output
- Existing contract test output
- `git diff --check`

### MCR-200: Fake Matrix Transaction Handler

Objective: implement a fixture-driven Matrix AppService transaction handler
without connecting real Synapse.

Allowed files:

- `apps/matrix-appservice/package.json`
- `apps/matrix-appservice/tsconfig.json`
- `apps/matrix-appservice/src/transaction-handler.ts`
- `apps/matrix-appservice/src/runtime-event-mapper.ts`
- `apps/matrix-appservice/test/transaction-handler.test.ts`
- `packages/runtime-contracts/src/index.ts`

Forbidden files:

- real Matrix registration files
- `.env*`
- production secrets
- `apps/runtime-api/**`
- `workers/**`
- `packages/github-adapter/**`
- database migrations
- `runtime/policies/**`

Dependencies: MCR-031 and the existing
`docs/analysis/matrix-appservice-gateway.md` contract.

Tests to add first:

- `apps/matrix-appservice/test/transaction-handler.test.ts`
  - valid `fixtures/matrix-transactions/success.json` enqueues one runtime event;
  - invalid `hs_token` rejects before schema parsing;
  - duplicate transaction and duplicate event enqueue no second runtime event;
  - invalid schema and unknown room enqueue no runtime task work.

Implementation notes: use in-memory `IdempotencyStore`,
`FakeRuntimeEventQueue`, and fixture token values. Do not start an HTTP server
until the handler contract is green.

Acceptance criteria:

- Handler validates token, transaction id, event id, room mapping, schema, and
  sender-derived actor provenance in the documented order.
- Runtime event output validates against `schemas/runtime/runtime-event.schema.json`.
- Matrix remains input/projection only.

Rollback notes: remove `apps/matrix-appservice/**`; no schema or fixture changes
should be needed.

Verifier checklist:

- Invalid auth does not parse event intent.
- Unknown rooms and invalid schema do not enqueue runtime work.
- Spoofed actor content cannot override Matrix sender provenance.
- No real network, homeserver, or secret access.

Expected proof / validation evidence:

- App package test output
- `pnpm test:contracts`
- `pnpm schemas:validate`
- `git diff --check`

### MCR-201: Fake Matrix Projection Adapter

Objective: add a fake projection adapter that records Runtime projection
requests as safe Matrix summaries.

Allowed files:

- `apps/matrix-appservice/src/projection-adapter.ts`
- `apps/matrix-appservice/test/projection-adapter.test.ts`
- `apps/matrix-appservice/src/index.ts`

Forbidden files:

- real Matrix send client
- real AppService registration
- `.env*`
- raw proof logs
- raw worker stdout/stderr bodies
- object storage implementation
- database migrations

Dependencies: MCR-200.

Tests to add first:

- `apps/matrix-appservice/test/projection-adapter.test.ts`
  - accepts safe `task.accepted`, `proof.submitted`, and `incident.created`
    projection summaries;
  - rejects raw validation logs, raw inbound event bodies, and raw diff bodies by
    fixture or field check;
  - records idempotency keys for repeated projection requests.

Implementation notes: this is a fake adapter for tests. It should expose a
recorded-calls array or query method, not a Matrix client.

Acceptance criteria:

- Projection payloads validate against existing Matrix schemas.
- Adapter cannot infer Runtime state from Matrix history.
- Unsafe raw bodies are rejected or kept outside projection records.

Rollback notes: remove projection adapter files; MCR-200 handler remains intact.

Verifier checklist:

- No real Matrix API calls.
- Projection data contains refs and summaries only.
- Idempotency is explicit.

Expected proof / validation evidence:

- App projection tests
- Contract tests
- Schema validation
- `git diff --check`

### MCR-100: Runtime State Machine Package

Objective: implement the pure task transition validator from the Phase 4
contract.

Allowed files:

- `packages/state-machine/package.json`
- `packages/state-machine/tsconfig.json`
- `packages/state-machine/src/task-state-machine.ts`
- `packages/state-machine/src/index.ts`
- `packages/state-machine/test/task-state-machine.test.ts`

Forbidden files:

- database code
- Matrix gateway code
- worker runner code
- GitHub adapter code
- `runtime/workflows/**`
- `runtime/policies/**`
- `schemas/**`

Dependencies: MCR-030, `docs/analysis/task-state-machine.md`,
`schemas/runtime/task-state-transition.schema.json`, and
`tests/contracts/task-state-machine.test.mjs`.

Tests to add first:

- `packages/state-machine/test/task-state-machine.test.ts`
  - accepts the MVP happy path;
  - rejects approval before verified proof;
  - rejects terminal-state transitions;
  - treats duplicate transition idempotency as no-op when input is identical.

Implementation notes: keep this as pure functions over transition records. Do
not introduce a store, queue, or Runtime API here.

Acceptance criteria:

- State names and legal transitions match the schema and analysis document.
- Invalid actor, missing artifact/proof/approval refs, and unknown states fail.
- No external I/O.

Rollback notes: remove `packages/state-machine/**`.

Verifier checklist:

- No Matrix room history is used as state.
- PR creation transition requires verified proof and action-scoped approval.
- Terminal states stay terminal.

Expected proof / validation evidence:

- State-machine package tests
- Existing contract tests
- Schema validation
- `git diff --check`

### MCR-101: In-Memory Runtime Task Store

Objective: add an in-memory Task Store for local integration tests before any
database decision or migration.

Allowed files:

- `packages/runtime-store/package.json`
- `packages/runtime-store/tsconfig.json`
- `packages/runtime-store/src/in-memory-task-store.ts`
- `packages/runtime-store/src/index.ts`
- `packages/runtime-store/test/in-memory-task-store.test.ts`

Forbidden files:

- database migrations
- SQL schema files
- production persistence
- Matrix gateway code
- GitHub adapter code
- worker runner code
- `.env*`

Dependencies: MCR-100.

Tests to add first:

- `packages/runtime-store/test/in-memory-task-store.test.ts`
  - persists one task snapshot and append-only transition records;
  - rejects stale expected-state writes;
  - makes duplicate command idempotency return the prior result;
  - stores artifact/proof/approval ids as refs, not bodies.

Implementation notes: use `Map` and plain objects. Add a `ponytail:` comment if
the store uses a process-local lock or O(n) lookup; replace it only when real
concurrency needs prove it.

Acceptance criteria:

- Store is deterministic and resettable for tests.
- Runtime source-of-truth fields are explicit.
- No Postgres, Redis, queue, or migration code.

Rollback notes: remove `packages/runtime-store/**`.

Verifier checklist:

- Matrix events are references, not state source.
- Proof and artifact bodies are not stored inline.
- Stale transition tests fail before implementation and pass after.

Expected proof / validation evidence:

- Runtime-store package tests
- State-machine package tests
- Contract tests
- `git diff --check`

### MCR-250: Capability Registry Loader And Router

Objective: load `runtime/capabilities.yaml` and select the narrowest safe
capability for scoped tasks.

Allowed files:

- `packages/capability-router/package.json`
- `packages/capability-router/tsconfig.json`
- `packages/capability-router/src/registry-loader.ts`
- `packages/capability-router/src/router.ts`
- `packages/capability-router/src/index.ts`
- `packages/capability-router/test/router.test.ts`

Forbidden files:

- `runtime/capabilities.yaml`
- `runtime/policies/**`
- `schemas/**`
- worker runner code
- GitHub adapter code
- Matrix gateway code
- database migrations

Dependencies: MCR-031 and existing `runtime/capabilities.yaml`.

Tests to add first:

- `packages/capability-router/test/router.test.ts`
  - routes CI failure evidence to `ci.recovery`;
  - routes generic repo patch work to `repo.patch.codex`;
  - routes security review to `security.review` without write permission;
  - rejects unsupported or overbroad capabilities;
  - marks external-write capability paths as human-gated.

Implementation notes: manifest-based matching only. No scoring model, LLM
router, dynamic capability marketplace, or policy mutation.

Acceptance criteria:

- Workflow capability refs resolve.
- Implementation capabilities that write repo patches require isolated worktree
  fields.
- Unknown or unsafe tasks return a blocked routing result with reason.

Rollback notes: remove `packages/capability-router/**`.

Verifier checklist:

- `ci.recovery` is not selected for generic code changes.
- Denied permissions are respected before Work Cell creation.
- Router does not grant permissions; it only selects capability candidates.

Expected proof / validation evidence:

- Router tests
- `tests/contracts/capability-schema.test.mjs`
- Contract tests
- `git diff --check`

### MCR-260: Minimal Policy Engine

Objective: implement a data-driven deny-by-default policy evaluator for local
runtime decisions.

Allowed files:

- `packages/policy-engine/package.json`
- `packages/policy-engine/tsconfig.json`
- `packages/policy-engine/src/policy-loader.ts`
- `packages/policy-engine/src/policy-engine.ts`
- `packages/policy-engine/src/index.ts`
- `packages/policy-engine/test/policy-engine.test.ts`

Forbidden files:

- `runtime/policies/**`
- `fixtures/policy/**`
- `.env*`
- secret broker code
- GitHub adapter code
- Matrix gateway code
- worker runner command execution

Dependencies: MCR-031 and existing `runtime/policies/default.yaml`,
`runtime/policies/repo-patch.yaml`, and `fixtures/policy/**`.

Tests to add first:

- `packages/policy-engine/test/policy-engine.test.ts`
  - default decision is deny;
  - local repo patch inside an isolated worktree is allowed;
  - external write without approval is denied;
  - fake proof, prompt injection, dangerous command, production secret, path
    traversal, approval replay, and secret-bearing log fixtures are denied.

Implementation notes: encode the existing fixture semantics directly. Do not add
OPA, OpenFGA, a secret broker, or a policy language.

Acceptance criteria:

- Every decision includes `allow`, `deny`, or `approval_required`, plus reason
  and policy id.
- Prompt constraints are not treated as enforcement.
- Command allowlisting is represented for the worker runner to enforce later.

Rollback notes: remove `packages/policy-engine/**`.

Verifier checklist:

- Default-deny remains the fallback.
- Direct memory write and secret access are always denied.
- Approval replay and fake proof are denied by data, not prompt text.

Expected proof / validation evidence:

- Policy-engine tests
- `tests/contracts/policy-decisions.test.mjs`
- Full contract suite
- `git diff --check`

### MCR-270: Work Cell Manager With Fake Worktree Manager

Objective: create Work Cell records and deterministic fake worktree provenance
for local tests.

Allowed files:

- `packages/work-cell-manager/package.json`
- `packages/work-cell-manager/tsconfig.json`
- `packages/work-cell-manager/src/work-cell-manager.ts`
- `packages/work-cell-manager/src/fake-worktree-manager.ts`
- `packages/work-cell-manager/src/index.ts`
- `packages/work-cell-manager/test/work-cell-manager.test.ts`

Forbidden files:

- real `git worktree` execution
- shell command runner
- Codex process runner
- database migrations
- `.env*`
- main checkout edits
- GitHub adapter code

Dependencies: MCR-101, MCR-250, MCR-260, and
`schemas/runtime/work-cell.schema.json`.

Tests to add first:

- `packages/work-cell-manager/test/work-cell-manager.test.ts`
  - creates branch/path/base SHA/cwd provenance from a task id;
  - rejects main checkout paths and main branch task branches;
  - stores cleanup policy and cleanup status;
  - fails if policy decision is deny.

Implementation notes: use fake worktree creation only. Real filesystem worktree
creation belongs to a later worker-runner or integration task.

Acceptance criteria:

- Work Cell output validates against `schemas/runtime/work-cell.schema.json`.
- `codex_cwd` equals `worktree_path`.
- Cleanup status is explicit.

Rollback notes: remove `packages/work-cell-manager/**`.

Verifier checklist:

- Worktree isolation is not described as a security boundary.
- Policy denial prevents Work Cell creation.
- No real git command runs in unit tests.

Expected proof / validation evidence:

- Work-cell manager tests
- Runtime schema fixture tests
- Contract tests
- `git diff --check`

### MCR-300: Fake Codex Worker Runner

Objective: run the worker lifecycle against fake Codex JSONL and final output
fixtures.

Allowed files:

- `apps/worker-runner/package.json`
- `apps/worker-runner/tsconfig.json`
- `apps/worker-runner/src/codex-jsonl-parser.ts`
- `apps/worker-runner/src/fake-codex-process.ts`
- `apps/worker-runner/src/worker-runner.ts`
- `apps/worker-runner/src/index.ts`
- `apps/worker-runner/test/worker-runner.test.ts`

Forbidden files:

- real `codex exec` invocation
- network calls
- GitHub adapter code
- Matrix gateway code
- database migrations
- `.env*`
- production secret access
- live memory writes

Dependencies: MCR-270, MCR-031, and existing Codex JSONL/output fixtures.

Tests to add first:

- `apps/worker-runner/test/worker-runner.test.ts`
  - replays `fixtures/codex-jsonl/success.jsonl` and valid final output;
  - maps failure JSONL to failed worker result;
  - maps blocked JSONL to blocked or needs-human-input result;
  - rejects missing validation evidence and forbidden path changes;
  - records command exit codes and artifact refs.

Implementation notes: the fake runner should not shell out. Real Codex execution
belongs to the later MCR-310 opt-in scaffold and still requires human approval,
disposable scope, and proof capture before any manual smoke run.

Acceptance criteria:

- Success, failed, blocked, and malformed worker outputs are distinguishable.
- Worker result can feed proof ledger without inventing missing evidence.
- Logs are refs, not raw Matrix projection bodies.

Rollback notes: remove `apps/worker-runner/**`.

Verifier checklist:

- No `codex exec` process is spawned.
- Failed/blocked outputs cannot claim review readiness.
- Forbidden path and missing validation checks are enforced outside prompt text.

Expected proof / validation evidence:

- Worker-runner tests
- Codex contract tests
- Full contract suite
- `git diff --check`

### MCR-400: Proof Ledger And Verifier

Objective: create proof entries from worker artifacts and verify proof before
approval.

Allowed files:

- `packages/proof-ledger/package.json`
- `packages/proof-ledger/tsconfig.json`
- `packages/proof-ledger/src/proof-ledger.ts`
- `packages/proof-ledger/src/proof-verifier.ts`
- `packages/proof-ledger/src/index.ts`
- `packages/proof-ledger/test/proof-verifier.test.ts`

Forbidden files:

- raw log storage in Matrix
- GitHub adapter code
- approval service code
- memory writer code
- database migrations
- `.env*`
- changes to proof schemas unless split into a schema task first

Dependencies: MCR-300, MCR-260, and
`schemas/proof/proof-ledger-entry.schema.json`.

Tests to add first:

- `packages/proof-ledger/test/proof-verifier.test.ts`
  - accepts proof with artifact refs, hashes, worktree provenance, validation
    exit codes, risk notes, and rollback notes;
  - rejects fake proof, missing validation, path traversal artifact refs,
    forbidden path changes, mismatched task/run IDs, and secret-bearing logs.

Implementation notes: persist in memory for this slice. Do not implement object
storage; use fake artifact refs and hashes.

Acceptance criteria:

- A task cannot reach approval readiness without verified proof.
- Proof summary is projection-safe.
- Failed verification has a reason that can be audited.

Rollback notes: remove `packages/proof-ledger/**`.

Verifier checklist:

- Proof is evidence, not a worker summary.
- Validation command, exit code, and log/artifact refs are required.
- Secret-bearing logs and raw bodies cannot be accepted as proof.

Expected proof / validation evidence:

- Proof-ledger tests
- Proof schema contract tests
- Policy decision tests
- Full contract suite
- `git diff --check`

### MCR-500: Approval Gate

Objective: implement action-scoped approval records and gating for PR creation
requests.

Allowed files:

- `packages/approval-gate/package.json`
- `packages/approval-gate/tsconfig.json`
- `packages/approval-gate/src/approval-gate.ts`
- `packages/approval-gate/src/index.ts`
- `packages/approval-gate/test/approval-gate.test.ts`

Forbidden files:

- real Matrix approval ingestion
- GitHub API calls
- merge automation
- deploy automation
- secret access
- live memory writes
- database migrations
- `.env*`

Dependencies: MCR-400, MCR-260, and `schemas/proof/approval.schema.json`.

Tests to add first:

- `packages/approval-gate/test/approval-gate.test.ts`
  - blocks `create_pr` before approval;
  - accepts only human action-scoped approval matching task id, proof id,
    action, target, and expiry;
  - rejects replayed, expired, proofless, vague, wrong-actor, and wrong-target
    approvals;
  - never allows merge.

Implementation notes: use in-memory approval store and deterministic clock.
Matrix ingestion remains fake until a later integration task.

Acceptance criteria:

- Approval unlocks one action only.
- Approval does not imply task completion, merge, deploy, secret access, or
  memory write.
- Denial and timeout are explicit terminal outcomes for that action.

Rollback notes: remove `packages/approval-gate/**`.

Verifier checklist:

- No broad approval language is accepted.
- Replay protection is represented and tested.
- Merge remains unavailable.

Expected proof / validation evidence:

- Approval-gate tests
- Approval schema tests
- Policy decision tests
- Full contract suite
- `git diff --check`

### MCR-510: Fake GitHub PR Adapter

Objective: add a fake GitHub adapter that records simulated PR creation after
verified proof and approval.

Allowed files:

- `packages/github-adapter/package.json`
- `packages/github-adapter/tsconfig.json`
- `packages/github-adapter/src/fake-github-adapter.ts`
- `packages/github-adapter/src/index.ts`
- `packages/github-adapter/test/github-adapter.test.ts`
- `tests/integration/approval-pr-flow.test.ts`

Forbidden files:

- real Octokit or GitHub CLI calls
- branch push automation
- merge API
- GitHub token handling
- `.env*`
- deploy code
- database migrations

Dependencies: MCR-500 and MCR-400.

Tests to add first:

- `packages/github-adapter/test/github-adapter.test.ts`
  - records no PR call before approval;
  - records one simulated PR request after matching approval;
  - rejects proofless PR body and main-to-main target confusion;
  - exposes no merge method.
- `tests/integration/approval-pr-flow.test.ts` covers proof -> approval ->
  simulated PR creation.

Implementation notes: keep it fake and in-memory. Do not add Octokit until a
later real-service smoke task explicitly allows it.

Acceptance criteria:

- PR request includes task id, proof id, validation summary, risk notes, and
  rollback notes.
- Duplicate approved request is idempotent.
- Merge and direct main push are unavailable.

Rollback notes: remove `packages/github-adapter/**` and the integration test.

Verifier checklist:

- No network or GitHub credentials.
- PR creation is impossible before approval.
- Adapter cannot merge.

Expected proof / validation evidence:

- GitHub adapter tests
- Approval PR integration test
- Contract suite
- `git diff --check`

### MCR-600: Memory Proposal Flow

Objective: generate evidence-backed memory proposals from verified proof without
writing live memory.

Allowed files:

- `workers/memory-curator-worker/package.json`
- `workers/memory-curator-worker/tsconfig.json`
- `workers/memory-curator-worker/src/memory-proposal-flow.ts`
- `workers/memory-curator-worker/src/index.ts`
- `workers/memory-curator-worker/test/memory-proposal-flow.test.ts`

Forbidden files:

- `AGENTS.md`
- `.agents/**`
- live memory directories
- runtime policy files
- prompts
- `.env*`
- GitHub adapter code
- approval writer code

Dependencies: MCR-400, MCR-500, and
`schemas/matrix/memory.update.proposed.schema.json`.

Tests to add first:

- `workers/memory-curator-worker/test/memory-proposal-flow.test.ts`
  - emits `memory.update.proposed` only from verified proof;
  - requires scope, statement, evidence ref, confidence, and review target;
  - rejects automatic memory write attempts;
  - returns a no-update rationale when proof contains no reusable lesson.

Implementation notes: keep proposal generation deterministic for tests. No LLM,
no live memory write, no AGENTS edit.

Acceptance criteria:

- Every proposal points to a proof id.
- Proposal output validates against the Matrix memory proposal schema.
- Direct memory write remains impossible.

Rollback notes: remove `workers/memory-curator-worker/**`.

Verifier checklist:

- Proposal is not applied.
- Evidence ref is mandatory.
- Scope is narrow and reviewable.

Expected proof / validation evidence:

- Memory curator tests
- Matrix schema fixture tests
- Policy decision tests
- Full contract suite
- `git diff --check`

### MCR-700: Local Fake MVP E2E Harness

Objective: run the complete local fake MVP scenario without real Matrix, Codex,
GitHub, database, secrets, or memory writes.

Allowed files:

- `tests/e2e/local-fake-mvp.test.ts`
- `tests/e2e/fakes/fake-matrix-homeserver.ts`
- `tests/e2e/fakes/fake-runtime-event-queue.ts`
- `tests/e2e/fakes/fake-artifact-store.ts`
- `tests/e2e/fakes/index.ts`
- `apps/matrix-appservice/src/index.ts`
- `apps/worker-runner/src/index.ts`
- `packages/state-machine/src/index.ts`
- `packages/runtime-store/src/index.ts`
- `packages/capability-router/src/index.ts`
- `packages/policy-engine/src/index.ts`
- `packages/work-cell-manager/src/index.ts`
- `packages/proof-ledger/src/index.ts`
- `packages/approval-gate/src/index.ts`
- `packages/github-adapter/src/index.ts`
- `workers/memory-curator-worker/src/index.ts`

Forbidden files:

- real Synapse/AppService registration
- real `codex exec`
- real GitHub API calls
- database migrations
- live memory writes
- `.env*`
- deploy or CI automation

Dependencies: MCR-201, MCR-101, MCR-250, MCR-260, MCR-270, MCR-300,
MCR-400, MCR-500, MCR-510, and MCR-600.

Tests to add first:

- `tests/e2e/local-fake-mvp.test.ts`
  - happy path from Matrix `task.created` fixture to simulated PR creation;
  - no PR call before approval;
  - invalid Matrix event enqueues no runtime work;
  - worker failure and blocked output do not request approval;
  - fake proof, policy bypass, approval replay, and secret-bearing logs stop the
    flow before PR creation.

Implementation notes: compose existing package APIs and fakes. Do not add a
runner framework beyond Node test unless earlier foundation proves it is needed.

Acceptance criteria:

- E2E follows `tests/e2e/mvp-scenarios.md`.
- Every external side effect is fake and locally inspectable.
- Matrix is input/projection only; Runtime store remains source of truth.
- Memory proposal may be emitted but no live write occurs.

Rollback notes: remove `tests/e2e/local-fake-mvp.test.ts` and `tests/e2e/fakes/**`.

Verifier checklist:

- Full happy path is covered.
- Failure paths cover invalid Matrix, duplicate input, worker failure, fake
  proof, policy bypass, approval replay, and secret logs.
- No real external adapter is called.

Expected proof / validation evidence:

- Local fake E2E test output
- Full package tests
- `pnpm test:contracts`
- `pnpm schemas:validate`
- `git diff --check`

### MCR-310: Real Codex Exec Smoke Runner

Status: scaffold merged, with one manual real Codex exec smoke proof recorded on
2026-06-29. The guarded command builder, unit test, runbook, and proof exist,
but real Codex execution is still not the default worker path. Any further
manual run still requires human approval, a disposable low-risk target, scoped
environment, cleanup notes, and proof capture.

Objective: add a manually triggered real Codex exec smoke runner for a
disposable low-risk task, behind an explicit feature flag.

Allowed files:

- `apps/worker-runner/src/codex-exec-runner.ts`
- `apps/worker-runner/test/codex-exec-runner.test.ts`
- `docs/runbooks/codex-exec-smoke.md`

Forbidden files:

- automatic real Codex execution in E2E
- production secrets
- GitHub PR creation
- Matrix real-service integration
- deploy automation
- live memory writes
- default-on feature flags

Dependencies: ADR follow-up `docs/adr/0006-codex-exec-before-sdk.md`,
MCR-300, MCR-400, and MCR-700.

Tests to add first:

- `apps/worker-runner/test/codex-exec-runner.test.ts`
  - builds the command with `cwd = worktree_path`;
  - includes `--json`, `--sandbox workspace-write`, and `--output-schema`;
  - refuses to run without explicit smoke flag;
  - rejects main checkout cwd and secret-bearing env.

Implementation notes: unit-test the command builder and safety gates first. The
manual smoke run belongs in the runbook and must use a disposable repo or
fixture-only task.

Acceptance criteria:

- Real Codex path is opt-in and disabled by default.
- Runner records JSONL, final output, validation evidence, and proof refs.
- No PR, merge, deploy, secret, or live memory action occurs.

Rollback notes: remove the runner and runbook; fake worker path remains the MVP
default.

Verifier checklist:

- ADR exists and explicitly chooses CLI before SDK for MVP.
- Feature flag is required.
- Worktree cwd and output schema are enforced by code, not prompt text.

Expected proof / validation evidence:

- Command-builder tests
- Manual smoke log, if run
- Proof entry for the smoke task
- Full contract suite
- `git diff --check`

### MCR-720: Real-Service Compatibility Smoke Tests

Status: scaffold merged, with one Matrix-only local disposable smoke proof
recorded on 2026-06-29. MCR-730 separately records one disposable GitHub PR
create/cleanup proof. These are compatibility proofs only; manual execution
remains blocked on action-scoped human approval and disposable scoped
credentials for every further run.

Objective: document and run minimal compatibility smoke tests for real Matrix,
real Codex, and GitHub test-repo PR creation after fake E2E is stable.

Allowed files:

- `docs/runbooks/real-service-smoke-tests.md`
- `tests/e2e/real-service-smoke.skip.ts`

Forbidden files:

- production credentials
- default-on real-service tests
- merge automation
- deploy automation
- live memory writes
- broad GitHub permissions

Dependencies: MCR-700, MCR-310, action-scoped human approval, and disposable
service credentials.

Tests to add first:

- `tests/e2e/real-service-smoke.skip.ts`
  - remains skipped by default;
  - asserts required environment variables are absent in normal local runs;
  - names the manual command required to opt in.

Implementation notes: this is compatibility testing, not the correctness source.
Core correctness remains the fake E2E harness.

Acceptance criteria:

- Smoke tests are opt-in and skipped by default.
- Runbook names credential scope, cleanup, rollback, and evidence capture.
- GitHub merge remains manual and unavailable to the agent.

Rollback notes: remove the runbook and skipped test; no runtime package rollback
required.

Verifier checklist:

- No production secret names or values are committed.
- Smoke tests cannot run accidentally.
- Results are treated as compatibility evidence only.

Expected proof / validation evidence:

- Skipped-test output in normal validation
- Manual smoke evidence if approved and run
- Cleanup log
- `git diff --check`

## Closed Real-Service MVP Vertical Slice Wave

The MCR-800 through MCR-850 vertical-slice wave in
`docs/roadmaps/mvp-implementation-plan.md#next-real-service-mvp-vertical-slices`
is complete and closed out. Do not restart MCR-800 as the next implementation
task.

MCR-730 produced one disposable sandbox GitHub PR create/cleanup proof. MCR-850
produced one approved vertical compatibility proof across the local
fixture/runtime Matrix path, one approved Codex exec attempt, proof/approval,
disposable sandbox GitHub PR creation, and cleanup.

MCR-850 remains compatibility proof only, not production readiness. It does not
authorize production Matrix/GitHub, DB/Postgres migration, merge, deploy, live
memory, production main push, secret dump, or default automation.

Next work should start from `docs/roadmaps/post-mvp-roadmap.md`. Its first
recommended task is MCR-901 Post-MVP Source-of-Truth Audit. Do not infer
production work from the compatibility pass.

## Closed Architecture Follow-Up

ADR-0006 exists at `docs/adr/0006-codex-exec-before-sdk.md`, closing the
previous architecture-decision blocker for adding the MCR-310 scaffold.

This does not approve production service integration. MCR-310, MCR-720, MCR-730,
and MCR-850 remain manual, opt-in compatibility proof paths unless a human owner
approves disposable credentials and the run records bounded proof.
