# MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Matrix Codex Capability Runtime MVP from local contracts to
a local fake end-to-end flow before any real external service integration.

**Architecture:** Matrix remains collaboration/input/projection only. Runtime
owns task state, policy, work cells, proof, approval, and memory proposal state.
External effects stay behind fake adapters until proof, policy, approval, and
local fake E2E pass.

**Tech Stack:** TypeScript-first, pnpm workspaces, Node built-in test runner,
Ajv/JSON Schema, fake adapters first, real Codex/Matrix/GitHub only after
explicit gates.

## Global Constraints

- Do not modify the main checkout for implementation tasks.
- Use one dedicated worktree per implementation task.
- Add or update tests before implementation.
- Keep allowed files narrow and list forbidden files explicitly.
- Matrix events are untrusted input.
- Matrix is not runtime source of truth.
- Prompt text is not permission enforcement.
- Proof requires concrete command, exit code, artifact/log refs, risk notes, and
  rollback notes.
- Approval is action-scoped.
- Memory update is proposal-only.
- Further production Matrix integration, real Codex exec, production GitHub PR
  creation, merge, deploy, secret access, and live memory writes are not allowed
  until their explicit follow-up gates pass.

## Current Closeout Status

As of 2026-06-29, local fake MVP work through MCR-700 is merged on `main`.
MCR-310 scaffold is merged and one manual real Codex exec smoke has passed.
Tracked proof: `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in
commit `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`. MCR-720 has one
Matrix-only local disposable smoke pass on 2026-06-29.

MCR-104 adds the durable Runtime Store schema contract for task snapshots,
append-only transitions, idempotency keys, proof refs, approval refs, and
artifact refs. It is contract-only: no Postgres startup, database service, SQL
migration, Matrix/GitHub/Codex call, or live memory write is introduced.

MCR-105 is merged at commit `2f57b7dfa62a15ec05d7d5b3e01adc5fd54ee137`.
It adds a Runtime Store snapshot exporter from the in-memory task store to the
durable schema envelope. The export is schema-valid and ref-only: it carries
task, transition, idempotency, proof, approval, and artifact references, not raw
logs, diffs, Matrix event bodies, token material, or live memory writes. It does
not add DB persistence, Postgres, migrations, a persistent Runtime service, or
Matrix/GitHub/Codex external calls.

MCR-106 adds the smallest Runtime Store file snapshot persistence adapter. It
writes and reads schema-valid `RuntimeStoreSnapshot` JSON files using a temp
file plus rename, and validates snapshots on write and read. The adapter is a
single-writer local proof only: concurrent writers need later unique temp names
or locking. It does not add DB persistence, Postgres, migrations, a persistent
Runtime service, Matrix/GitHub/Codex calls, live memory writes, production
durable Runtime Store semantics, or replay recovery.

MCR-720 scope was exactly local disposable Synapse, a local AppService listener,
and one AppService transaction. Evidence:
`/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02`.
Key proof files include `transaction.exit_code`, `transaction.stdout`,
listener pre-transaction `kill -0`/`lsof`/bound checks,
`docker-compose-down.cleanup.exit_code`, cleanup lsof proofs for
`8008`/`8448`/`9009`, `generated-cleanup.txt`, and `cleanup-paths.stdout`.

Production Matrix integration, persistent Runtime service, real room/user
lifecycle automation, production GitHub PR/API, deploy, and live memory write
have not passed by this plan. Further real-service smoke execution remains a
manual compatibility check requiring action-scoped human approval, disposable
scoped credentials, and captured proof. MCR-310 Codex proof remains separate and
does not authorize Matrix smoke.

MCR-730 has one completed disposable GitHub PR create smoke on 2026-06-29:
PR #1 in `Notyet1307/github-pr-smoke-sandbox` was created, then closed without
merge. Sandbox `main` stayed at
`4438b7a905d12fead4f539e6faf349b8a2464f60`; disposable base/head branch refs no
longer exist; `protect-main` remained active. The Runtime GitHub PR path remains
fake/contract-only.

MCR-850 has one approved real vertical smoke pass on 2026-06-29 for run id
`mcr-850-20260629t170000z-vertical-smoke-01`. Evidence is retained locally at
`/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01`.
The run used the Matrix local fixture/runtime path, not a real Synapse or
AppService service. Codex exec ran exactly once with exit code 0 using
`codex exec --json --sandbox workspace-write --output-schema ./schemas/codex/codex-exec-smoke-result.schema.json -`
and explicit env keys `PATH` and `CODEX_HOME` only. GitHub used disposable
sandbox PR #2 in `Notyet1307/github-pr-smoke-sandbox`; cleanup closed PR #2
with `merged=false`, deleted disposable base/head branches, and left open PR
count for that head at 0. Sandbox `main` stayed at
`4438b7a905d12fead4f539e6faf349b8a2464f60`; generated smoke files were removed
after commander review while the evidence directory was kept. This is
compatibility proof only, not production readiness.

MCR-1056 completed and merged in commit
`4406e79a6a324b492de845f1c0a071f3eadfc809`. It added the root command
`pnpm mvp:local`, which runs the local fake MVP path and writes
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`. This is a local fake MVP
root command only: it does not call real Matrix, Codex, GitHub, DB, or live
memory. It is not production MVP, not a real-service smoke, not database
persistence, and not authorization to continue GitHub adapter expansion. The
one-command local experience is documented and accepted in
`docs/runbooks/local-fake-mvp.md` by MCR-1058. MCR-1059 completed as a
read-only GO audit at repository SHA
`fc6a1c1bf4c902c0b7cfb5f4da86e2010dc62c80`: `pnpm mvp:local` matched the
runbook Minimum Acceptance, generated the ignored
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`, and reported
`task_state=completed`, `proof_status=verified`, `approval_status=consumed`,
`pr_count=1`, and `memory_status=proposed`; `pnpm test:contracts` and `pnpm
schemas:validate` were 84/84, and `git diff --check` exited 0. MCR-1060 records
that audit result in source-of-truth docs only. MCR-1061 completed the design
decision: the root command should write ignored generated
`.mcr/runs/local-fake-mvp/summary.json` beside the existing snapshot, not
`summary.log` or a separate handoff evidence record. MCR-1062 completed and
merged in commit `1d6225595191db3a59ffa05546c6aad59a2e7b7c`: `pnpm mvp:local`
now writes two ignored generated artifacts,
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and
`.mcr/runs/local-fake-mvp/summary.json`, and stdout uses the same structured
summary shape. `summary.json` is the stable handoff summary; acceptance does not
require `tee` or `summary.log`. MCR-1064 completed as a read-only GO audit on
base commit `1eb7d748ef72a9b29c16953ff7310fd00c9ad5e2`: `pnpm mvp:local`
exited 0, both ignored local fake artifacts existed, `summary.json` reported
`task_state=completed`, `transition_count=14`, `proof_status=verified`,
`approval_status=consumed`, `pr_count=1`, `memory_status=proposed`, and
`fake_only=true`, the snapshot reported `source_of_truth=runtime`, and
contract/schema validation remained 84/84 with `git diff --check` passing.
The next bounded work should be MCR-1066, a docs/read-only operator handoff and
artifact retention/cleanup policy pass for the single-command local fake MVP,
not GitHub adapter expansion. This does not authorize real services,
DB/Postgres, live memory, or GitHub adapter expansion.

Target system alignment now lives in
`docs/analysis/target-system-design.md`. The MCR-310 smoke closes one Codex exec
compatibility proof only; MCR-720 closes one Matrix-only local disposable proof;
MCR-730 closes one sandbox GitHub PR create/cleanup proof; MCR-850 closes one
approved disposable vertical smoke proof over local fixture/runtime Matrix,
Codex exec, proof/approval, sandbox GitHub PR create, and cleanup boundaries.
Runtime GitHub remains fake outside approved smoke paths, and memory stays
proposal-only. Do not add an automatic commander loop or independent review
lane.

---

## Wave 0: Entry Fixups

- [x] Create ADR-0006 for Codex exec before SDK.

This was not an implementation task. It closed the architecture decision needed
before adding the guarded MCR-310 scaffold.

## Wave 1: Contracts And Foundation

- [x] MCR-030 TypeScript Package Foundation
- [x] MCR-031 Shared Schema Validator Helper

Exit criteria:

- Package tests run under Node's built-in test runner.
- Existing contract and schema validation commands still pass.
- No app, worker, database, Matrix, Codex, GitHub, or E2E runtime behavior is
  introduced.

## Wave 2: Fake Collaboration Boundary

- [x] MCR-200 Fake Matrix Transaction Handler
- [x] MCR-201 Fake Matrix Projection Adapter

Exit criteria:

- Fake transaction fixtures can enqueue normalized runtime events.
- Invalid auth, invalid schema, unknown room, duplicate transaction, duplicate
  event, and spoofed actor cases are covered.
- Projection events contain summaries and refs only.

## Wave 3: Runtime Core

- [x] MCR-100 Runtime State Machine Package
- [x] MCR-101 In-Memory Runtime Task Store
- [x] MCR-104 Durable Runtime Store Schema Contract
- [x] MCR-105 Runtime Store Snapshot Exporter
- [x] MCR-106 Runtime Store File Snapshot Persistence
- [x] MCR-250 Capability Registry Loader And Router
- [x] MCR-260 Minimal Policy Engine
- [x] MCR-270 Work Cell Manager With Fake Worktree Manager

Exit criteria:

- State transitions, idempotency, routing, policy decisions, and Work Cell
  provenance are executable through local tests.
- Durable Runtime Store records are schema-contracted before any database
  implementation, and unsafe raw logs, raw diffs, secrets, Matrix event bodies,
  and GitHub token material are rejected by contract fixtures.
- The in-memory Runtime Store can export a schema-valid, ref-only durable
  snapshot; that snapshot can be written to and read from local JSON files with
  temp-file-plus-rename validation. Database persistence remains future work.
- The file snapshot adapter is single-writer only; concurrent writers need later
  unique temp names or locking.
- No database, real git worktree execution, real worker process, or external
  adapter exists yet.

## Wave 4: Worker, Proof, Approval, External Fakes

- [x] MCR-300 Fake Codex Worker Runner
- [x] MCR-400 Proof Ledger And Verifier
- [x] MCR-500 Approval Gate
- [x] MCR-510 Fake GitHub PR Adapter
- [x] MCR-600 Memory Proposal Flow

Exit criteria:

- Worker success, failure, blocked, and malformed outputs are distinct.
- Proof is verified before approval.
- PR creation is simulated only after matching approval.
- Merge remains unavailable.
- Memory proposals are generated but never applied.

## Wave 5: Local Fake E2E

- [x] MCR-700 Local Fake MVP E2E Harness

Exit criteria:

- Local fake E2E covers `task.created -> worker.dispatched -> artifact/proof ->
  verification.completed -> approval.requested -> simulated PR creation`.
- Failure scenarios cover invalid Matrix input, duplicate input, worker failure,
  blocked worker, fake proof, policy bypass, approval replay, and secret-bearing
  logs.
- Every external side effect is fake and locally inspectable.

## Wave 6: Real-Service Smoke Scaffolds And Manual Gates

- [x] MCR-310 Real Codex Exec Smoke Runner scaffold plus one manual real Codex
  exec smoke pass on 2026-06-29
- [x] MCR-720 Real-Service Compatibility Smoke Tests scaffold, including
  manual-only disposable Synapse compose scaffold, plus one Matrix-only local
  disposable smoke pass on 2026-06-29
- [x] MCR-730 GitHub Disposable PR Smoke Run, including one sandbox PR create
  pass and close/delete cleanup proof on 2026-06-29
- [x] MCR-850 One Real-Service MVP Vertical Smoke, including one approved
  compatibility pass and cleanup proof on 2026-06-29

Satisfied scaffold prerequisites:

- ADR-0006 exists.
- MCR-700 passes.
- MCR-310 proof exists at
  `fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
  `8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`.
- MCR-720 proof exists at
  `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-720-matrix-real-smoke-02/.mcr/runs/mcr-720-20260629t130000z-matrix-smoke-02`.
  The passed scope was local disposable Synapse, local AppService listener, and
  one AppService transaction.
- MCR-720 first run failed due listener lifecycle; the second run used a durable
  listener and direct transaction exit-code capture.
- MCR-730 proof: PR #1 at
  `https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/1`; base branch
  `mcr-730-base-mcr-730-20260629t140000z-github-pr-smoke-01`; head branch
  `mcr-730-head-mcr-730-20260629t140000z-github-pr-smoke-01`; sandbox `main`
  SHA before/after cleanup
  `4438b7a905d12fead4f539e6faf349b8a2464f60`; PR closed unmerged; both
  disposable branches deleted; `protect-main` ruleset active.
- MCR-850 proof exists at
  `/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01`.
  The passed scope was Matrix local fixture/runtime path, exactly one approved
  Codex exec attempt with exit code 0, proof verification, approval, disposable
  sandbox GitHub PR #2 create, and cleanup. No real Synapse/AppService service
  was started; ports `8008`, `8448`, and `9009` had no listeners after cleanup.
  Generated smoke files were deleted after commander review and evidence was
  retained locally.

Remaining manual smoke entry criteria for any further run:

- Human owner explicitly approves each further real-service smoke.
- Credentials are disposable and scoped.
- Targets are non-production and disposable where practical.
- GitHub PR smoke target is a throwaway repository or explicitly disposable
  branch policy, never production `main`.
- GitHub PR smoke credential is scoped/disposable, not a broad main-account
  token by default.
- GitHub PR smoke approval is one action-scoped human approval per `run_id`.

Manual smoke exit criteria:

- Real-service tests are opt-in and skipped by default.
- Smoke evidence is recorded as compatibility proof, not the correctness source.
- No merge, deploy, or live memory write is automated.
- GitHub PR smoke proof records command shape, PR URL, source branch, base SHA,
  head SHA, approval id, and close/delete branch cleanup status.
- MCR-720 remains manual and skipped-by-default for future runs unless
  separately approved.
- MCR-310 Codex proof remains separate and does not authorize Matrix smoke.
- Disposable Synapse compose has no default service start and is not
  production-ready by itself.
- MCR-850 is compatibility proof only. It does not authorize merge, deploy,
  DB/Postgres migration, live memory write, production main push, secret dump,
  production Matrix integration, or persistent Runtime service operation.

## Closed Real-Service MVP Vertical Slices

MCR-800 through MCR-850 is closed out. Keep this section as historical context
for the completed vertical-slice wave, not as the current next-task queue. The
current post-MVP backlog and first recommended task are in
`docs/roadmaps/post-mvp-roadmap.md`.

Postgres, DB migrations, queues, object storage, production deploy, commander
automation, independent review lanes, and live memory writes remain out of scope
unless a later explicit card authorizes them with allowed files, forbidden
actions, gates, and proof.

### MCR-800: Runtime Orchestrator CLI With File Snapshot Store

Problem solved: there is no small Runtime-owned entrypoint that composes the
existing local components and persists the resulting Runtime snapshot.

Why now: Wave 0-6 proved components and manual smokes separately; the next work
needs one boring local command before any default real Matrix, Codex, or GitHub
path.

Allowed files: `apps/runtime-orchestrator/**`, package index exports for
existing packages only when needed, `tests/e2e/runtime-orchestrator-cli.test.ts`,
and package/workspace metadata required to register that app.

Forbidden files: schemas, fixtures, lockfiles unless package metadata requires
them, DB/Postgres/migrations, real Matrix/GitHub/Codex adapters, deploy or CI
automation, live memory paths, commander automation, and independent review lane
docs or code.

Acceptance criteria: a local CLI runs the existing fake/local flow from a checked
fixture or task brief through runtime validation, routing, policy, fake worker,
proof verification, action-scoped approval request, fake PR adapter, memory
proposal, and MCR-106 file snapshot write/read. It must reject main-checkout
work cells and must not call real Matrix, Codex, GitHub, deploy, secret, or live
memory APIs by default.

Validation commands: package test for the new orchestrator,
`pnpm test:contracts`, `pnpm schemas:validate`, and `git diff --check`.

Risk notes: keep this as composition glue. Do not introduce a service framework,
HTTP API, queue, scheduler, DB abstraction, or config system until a later slice
proves the CLI cannot carry the MVP.

Fake/scaffold/real boundary: real Runtime orchestration and real file snapshot
persistence; fake Matrix, fake Codex worker by default, fake GitHub, fake
approval identity, and memory proposal only.

### MCR-810: Approved Codex Exec Adapter In Runtime Orchestrator

Problem solved: MCR-310 proves a guarded Codex smoke once, but the Runtime
orchestrator still cannot choose that runner as an approved adapter for one task.

Why now: after MCR-800 owns the local task path and snapshot, the smallest real
worker upgrade is to replace only the fake Codex worker behind the same policy,
proof, and approval gates.

Allowed files: `apps/runtime-orchestrator/**`, `apps/worker-runner/**`, focused
tests for adapter selection and proof capture, and runbook notes for the manual
approved smoke command.

Forbidden files: Matrix real integration, GitHub real adapter, DB/Postgres,
production secrets, default-on Codex execution, deploy, merge, PR creation, live
memory writes, and broad credential plumbing.

Acceptance criteria: the default CLI still uses the fake worker. With an explicit
run id, scoped env, non-main worktree, output schema, and action-scoped approval
fixture, Runtime may invoke the existing guarded Codex exec runner and persist
proof refs in the file snapshot. Missing approval, main-checkout cwd, secret
env, or absent smoke flag blocks before process execution.

Validation commands: worker-runner/orchestrator package tests, one approved
manual smoke only if the owner explicitly requests it, `pnpm test:contracts`,
`pnpm schemas:validate`, and `git diff --check`.

Risk notes: this proves a Runtime-owned Codex adapter path, not production Codex
execution. Keep GitHub fake so a bad worker result cannot create external PRs.

Fake/scaffold/real boundary: real Codex process only for an approved opt-in run;
Matrix and GitHub remain fake, approval remains action-scoped fixture or manual
record, file snapshot remains the Runtime store.

### MCR-820: Matrix Ingress To Runtime Orchestrator

Problem solved: MCR-720 proves one local AppService transaction, but the Runtime
orchestrator does not yet consume Matrix ingress as one Runtime-owned task path.

Why now: after the CLI can own task state, Matrix can become an untrusted input
adapter without becoming the source of truth.

Allowed files: `apps/matrix-appservice/**`, `apps/runtime-orchestrator/**`,
focused e2e tests that inject a local transaction into the orchestrator, and the
existing real-service smoke runbook if command wording changes.

Forbidden files: production homeserver setup, room/user lifecycle automation,
real GitHub adapter, default real Codex execution, DB/Postgres, deploy, live
memory writes, and commander automation.

Acceptance criteria: a local Matrix transaction can enqueue or submit one
Runtime task into the orchestrator, which writes the canonical state to the file
snapshot. Invalid auth, invalid schema, duplicate transaction/event, unknown
room, and spoofed actor data stop before Runtime work. Matrix room history is
never read as task state.

Validation commands: matrix-appservice/orchestrator package tests, normal
skipped real-service smoke test output, `pnpm test:contracts`,
`pnpm schemas:validate`, and `git diff --check`.

Risk notes: do not solve production room lifecycle here. Local disposable
Matrix proof is enough to validate ingress shape.

Fake/scaffold/real boundary: real local Matrix ingress adapter against
disposable/local targets only; Runtime store is real file snapshot; Codex and
GitHub remain fake by default.

### MCR-830: Runtime Approval Projection And Intake

Problem solved: approval is currently local/fake; the next external action needs
a Runtime-owned way to project a specific approval request and bind one returned
approval to the same proof/action/run id.

Why now: GitHub PR creation must not be implemented until proof-before-approval
and approval-before-external-action are enforced across the real-service path.

Allowed files: `apps/runtime-orchestrator/**`, `apps/matrix-appservice/**`,
`packages/approval-gate/**`, focused approval projection/intake tests, and
runbook notes for manual approval evidence.

Forbidden files: independent review lane, commander automation, broad approval
phrases, merge/deploy approval, DB/Postgres, GitHub PR creation, default real
Codex, and live memory writes.

Acceptance criteria: Runtime emits a projection containing proof id, action,
run id, expiry, target, rollback notes, and risk notes. Intake accepts only a
matching action-scoped approval and rejects vague approval, expired approval,
wrong proof id, wrong action, replay, and approval for merge/deploy/live memory.

Validation commands: approval-gate/matrix/orchestrator package tests,
`pnpm test:contracts`, `pnpm schemas:validate`, and `git diff --check`.

Risk notes: this is not a new review system. It is only the existing proof and
approval gate crossing a Matrix projection boundary.

Fake/scaffold/real boundary: real approval shape and local/disposable Matrix
projection/intake; no real GitHub write yet, no deploy, no live memory write.

### MCR-840: Runtime-Owned GitHub PR Create Adapter For Disposable Targets

Problem solved: MCR-730 proves a manual sandbox `gh pr create`; Runtime still
has only the fake GitHub adapter and cannot create a PR after verified proof and
matching approval.

Why now: once Runtime can persist state, produce proof, and bind approval, the
next real external write can be a disposable PR create with no merge path.

Allowed files: `packages/github-adapter/**`, `apps/runtime-orchestrator/**`,
focused tests for command/API wrapper gating, and the GitHub smoke runbook.

Forbidden files: production repo defaults, push to production `main`, merge,
deploy, broad account tokens, secret dumps, DB/Postgres, live memory writes, and
commander automation.

Acceptance criteria: the adapter is disabled by default and can target only an
explicit disposable repo or disposable branch policy. It requires verified proof
and action-scoped approval for `create_pr`, records command/API shape, PR URL,
base/head refs and SHAs, cleanup status, and refuses merge, production main,
deploy, secret access, and live memory write.

Validation commands: github-adapter/orchestrator package tests, one approved
manual disposable PR smoke only if the owner explicitly requests it,
`pnpm test:contracts`, `pnpm schemas:validate`, and `git diff --check`.

Risk notes: prefer the existing `gh` proof shape before adding Octokit. Add a
library only when command wrapping is insufficient for required evidence.

Fake/scaffold/real boundary: real PR creation only against a disposable target
after proof and approval; no merge, deploy, production repo default, or memory
write. Matrix may be local/disposable only.

### MCR-850: One Real-Service MVP Vertical Smoke

Status: passed once on 2026-06-29 for run id
`mcr-850-20260629t170000z-vertical-smoke-01`; keep as compatibility proof only.

Problem solved: the repo has separate proofs for Codex, Matrix, and GitHub, but
not one Runtime-owned vertical proof that preserves all boundaries end to end.

Why now: after MCR-800 through MCR-840, the smallest integrated proof is one
approved disposable run, not a production service.

Allowed files: `tests/e2e/real-service-smoke.skip.ts`, `docs/runbooks/**`,
`apps/runtime-orchestrator/**` only for narrow wiring fixes found by the smoke,
and proof fixtures only if the run records checked-in redacted evidence.

Forbidden files: default-on real-service tests, DB/Postgres/migrations,
production Matrix/GitHub targets, merge, deploy, live memory writes, commander
automation, independent review lanes, and broad credential handling.

Acceptance criteria: with explicit human approval and disposable scoped
credentials, one skipped-by-default smoke demonstrates Matrix ingress or local
task fixture -> Runtime file snapshot -> approved Codex exec -> proof
verification -> approval -> disposable GitHub PR create -> cleanup/projection.
The proof must show no merge, no deploy, no production main push, no secret dump,
and no live memory write.

Validation commands: normal local run proves the smoke is skipped by default,
the approved manual smoke command only if requested, `pnpm test:contracts`,
`pnpm schemas:validate`, and `git diff --check`.

Risk notes: this is compatibility evidence, not production readiness. Any
failure should become the next narrow card rather than broad service redesign.

Passed proof: Matrix used a local fixture/runtime path rather than real
Synapse/AppService. Codex exec ran exactly once with exit code 0 using
`codex exec --json --sandbox workspace-write --output-schema ./schemas/codex/codex-exec-smoke-result.schema.json -`
and explicit env keys `PATH` and `CODEX_HOME`. GitHub created disposable sandbox
PR #2 in `Notyet1307/github-pr-smoke-sandbox`; cleanup closed it unmerged,
deleted disposable base/head branches, left open PR count for that head at 0,
and kept sandbox `main` unchanged at
`4438b7a905d12fead4f539e6faf349b8a2464f60`. Generated smoke files were deleted;
evidence remains at
`/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-850-real-vertical-smoke-01/.mcr/runs/mcr-850-20260629t170000z-vertical-smoke-01`.

Fake/scaffold/real boundary: one real disposable vertical proof under manual
approval; Matrix local fixture/runtime path remains distinct from real Synapse;
Runtime file snapshot remains source of truth; memory remains proposal-only.
No merge, deploy, DB/Postgres migration, live memory write, production main
push, or secret dump was authorized or performed.

## Operating Cadence

For each item:

1. Create the task worktree from current `origin/main`.
2. Add the named failing tests first.
3. Implement the smallest code needed to pass.
4. Run the package test plus `pnpm test:contracts`, `pnpm schemas:validate`, and
   `git diff --check`.
5. Handoff with worktree path, branch, base SHA, head SHA, changed files,
   validation results, cleanup status, risk notes, rollback notes, and blockers.

## Source Documents

- `docs/analysis/09-mvp-backlog.md`
- `docs/analysis/08-test-strategy.md`
- `tests/e2e/mvp-scenarios.md`
- `docs/analysis/development-entry-review.md`
- `docs/guides/codex-development-usage-guide.md`
- `docs/guides/codex-worktree-policy.md`
