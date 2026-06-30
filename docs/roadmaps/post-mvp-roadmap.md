# Post-MVP Roadmap Backlog

Version: 2026-06-30

Task ID: MCR-900

## Purpose

MCR-800 through MCR-850 is closed out. MCR-850 is compatibility proof only, not
production readiness. This backlog defines the next smallest bounded tasks so
future sessions do not infer production Matrix, GitHub, DB, deploy, live memory,
or default automation work from the smoke pass.

## First Recommended Task

After MCR-1068, the First Recommended Task is MCR-1069 Local Fake MVP Operator
Handoff Stop-Condition And Next-Phase Review. MCR-1067 completed as a read-only
GO audit on base commit `f3d8c39e6fd158305c9d2b0ee945d19057df05f1`: the
`package.json` root alias matched `docs/runbooks/local-fake-mvp.md`,
`pnpm mvp:local` exited 0, `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`
and `.mcr/runs/local-fake-mvp/summary.json` existed and were ignored by
`.gitignore:4:.mcr/`, `summary.json` reported `command=pnpm mvp:local`,
`snapshot_path=.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`,
`task_id=task_mcr_800_runtime_orchestrator_cli`, `task_state=completed`,
`transition_count=14`, `proof_status=verified`, `approval_status=consumed`,
`pr_count=1`, `memory_status=proposed`, `fake_only=true`, and validation notes
for `runtime snapshot written` plus `local fake adapters only`. The snapshot
reported `source_of_truth=runtime`, 1 completed task, 14 transitions, verified
proof, consumed `create_pr` approval, artifact kinds `log`, `log`, `report`,
and `pr`, and one PR artifact. Cleanup wording remained bounded to
`rm -rf .mcr/runs/local-fake-mvp/` and did not authorize cleaning source/docs/
schemas/fixtures/package/runtime files or copying raw logs, raw diff, token/env,
secret, or live memory body content. Boundary scan stayed local fake only;
`pnpm test:contracts` was 84/84, `pnpm schemas:validate` was 84/84, `git diff
--check` exited 0, and the audit worktree had no tracked diff. This means the
single-command local fake MVP operator handoff is ready for the local fake path
only. It does not prove or authorize real Matrix, Codex, GitHub, DB/Postgres,
live memory, real services, production readiness, or GitHub adapter expansion.
MCR-1069 should be read-only/docs-only: confirm the local fake operator path has
a stop condition, remove any remaining active local fake closeout loop, and
choose the next phase from current roadmap facts instead of returning to GitHub
adapter expansion by default.
MCR-1020 remaining GitHub adapter local refusal hardening is completed, merged,
and accepted by the MCR-1030 docs-only readiness audit. It added local executable
coverage for GH-REF-013, GH-REF-015, GH-REF-016, and GH-REF-017.
MCR-901 is complete, MCR-910 and MCR-920 have design artifacts, MCR-930 has a
policy artifact for evidence retention and cleanup, MCR-940 has a hardening
plan artifact, MCR-950 has a refusal matrix artifact, MCR-960 has a docs-only
test-plan artifact, MCR-970 adds the first local refusal fixtures and tests,
MCR-980 hardens the deferred local refusal source boundary, MCR-990 adds the
local forbidden-action fixture slice for GH-REF-021 through GH-REF-026,
MCR-1000 documents the approval mismatch source/harness gap, MCR-1010 closes
GH-REF-004 through GH-REF-009 as executable local `approval_mismatch` fixtures,
and MCR-1020 closes GH-REF-013, GH-REF-015, GH-REF-016, and GH-REF-017 as local
target/ref/protection/dirty-worktree refusals. MCR-1030 confirms all GH-REF-001
through GH-REF-026 local refusal fixtures are supported and assert no runner
calls. MCR-1040 turned the generic "later planning" instruction into a concrete
planning-only card for bounded adapter expansion. MCR-1041 is now the design
artifact for local interface/redaction ordering: both are required, but
command/API redaction comes first and injected runner/client interface tightening
comes second. MCR-1042 completed and was accepted as the local-only redacted
command/API summary contract slice in commit
`fcdd4caff37ecbca64b34635e209afb5fa4b9fd7`. MCR-1043 is this docs-only
closeout so future workers do not repeat MCR-1042. MCR-1044 completed and was
merged in commit `367c625fe05e76e865ed2dab45f0f4d19ceb0167` as the
local-only injected runner interface tightening slice. MCR-1045 is the
docs-only closeout that records that status and keeps the next step bounded.
MCR-1046 completed as a GO read-only audit. Its proof basis is the clean rerun
only: validation was green, stale-text grep confirmed MCR-1044 was no longer an
active next task, docs did not authorize real GitHub, and source-drift grep
found no real GitHub, network, or process execution path. MCR-1047 completed and
merged in commit `56f76f7a6354f074589fc126076ba767711689f5`; it changed only
`tests/e2e/runtime-orchestrator-cli.test.ts` so runtime-orchestrator GitHub PR
integration reads the public `api_summary` runner result. Source changes needed:
no. MCR-1049 completed the docs/design decision: keep the fallback only as
bounded github-adapter internal compatibility, but further restrict it before any
later removal decision. MCR-1050 completed that local-only restriction and
merged at commit `d584579566782aa7cbd51c00e59e53966b64b95d`: fallback now
applies only when the runner result lacks `api_summary`; present invalid or
mismatched `api_summary` returns `pr_url_missing`; runtime-orchestrator remains
on the public `api_summary`; no real GitHub, network-capable client, external
process execution path, Octokit, `fetch`, `gh api`, or `gh pr create` path was
added. MCR-1051 is this docs-only closeout so future workers do not repeat
MCR-1050. MCR-1052 completed as a GO read-only audit at repository SHA
`621b3b660384a7fb11c2f0827c569a8ca1f3248b`: github-adapter tests were 46/46,
runtime-orchestrator tests were 13/13,
`pnpm test:contracts` 84/84, `pnpm schemas:validate` 84/84, `pnpm test` 233/233,
and `git diff --check` all passed; source/docs inspection found no real
GitHub, network-capable client, or external process execution path, and
runtime-orchestrator still uses public `api_summary`. MCR-1053 is this docs-only
closeout so future workers do not repeat MCR-1052. MCR-1054 completed the
read-only/design-only removal decision: keep the fallback as bounded
github-adapter internal compatibility, do not propose source removal now, and
require any future removal attempt to start from new local evidence plus an
explicit source/test allowlist. MCR-1055 GitHub adapter backlog review is now
later/backlog, not the active next step. MCR-1056 completed and merged in commit
`4406e79a6a324b492de845f1c0a071f3eadfc809`, adding the root command
`pnpm mvp:local`. That command is a local fake MVP root command: it writes
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` through the local fake
runtime-orchestrator flow and does not call real Matrix, Codex, GitHub, DB, or
live memory. It is not production MVP, not a real-service smoke, not database
persistence, and not authorization to continue GitHub adapter expansion.
MCR-1058 added `docs/runbooks/local-fake-mvp.md` as the docs-only acceptance
and runbook closeout for that command. MCR-1059 completed as a read-only GO
audit at repository SHA `fc6a1c1bf4c902c0b7cfb5f4da86e2010dc62c80`: `pnpm
mvp:local` matched the runbook Minimum Acceptance, generated the ignored
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`, and reported
`task_state=completed`, `proof_status=verified`, `approval_status=consumed`,
`pr_count=1`, and `memory_status=proposed`. `pnpm test:contracts` and `pnpm
schemas:validate` were 84/84, and `git diff --check` exited 0. MCR-1060 is the
docs-only closeout for that audit result. MCR-1061 completed the docs/design
decision: the root command should write ignored generated
`.mcr/runs/local-fake-mvp/summary.json` beside the existing snapshot, not
`summary.log` or a separate handoff evidence record. MCR-1062 completed and
merged in commit `1d6225595191db3a59ffa05546c6aad59a2e7b7c`: `pnpm mvp:local`
now writes both ignored artifacts,
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and
`.mcr/runs/local-fake-mvp/summary.json`, and prints the same structured summary
to stdout. `summary.json` is the stable handoff summary, so acceptance no
longer requires `tee` or `summary.log`. MCR-1063 is this docs-only closeout.
MCR-1064 completed as a read-only GO audit on base commit
`1eb7d748ef72a9b29c16953ff7310fd00c9ad5e2`, using evidence from
`/Users/yet/Test_drive_sales/.worktrees/Carpet/AUDIT-local-mvp-single-command-readiness-rerun`.
The audit confirmed `pnpm mvp:local` exits 0, writes the ignored snapshot and
`summary.json`, preserves Runtime as source of truth, keeps memory
proposal-only, and leaves no tracked changes in the audit worktree. MCR-1065 is
this docs-only closeout. MCR-1067 later completed as a read-only GO
operator-friendliness audit on base commit
`f3d8c39e6fd158305c9d2b0ee945d19057df05f1`; MCR-1068 is the docs-only closeout
for that result. Production GitHub implementation remains unauthorized.

## Cards

### MCR-901: Post-MVP Source-of-Truth Audit

Status: completed; audit result GO. Historical card retained for source-of-truth
traceability.

- Problem solved: closed smoke work is spread across roadmap, runbooks, and
  analysis docs, which can cause workers to follow stale "next" directions.
- Why now: MCR-850 closed the compatibility wave; the next task must verify the
  docs agree before any new implementation begins.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/roadmaps/analysis-roadmap.md`, `docs/roadmaps/mvp-implementation-plan.md`,
  `docs/analysis/09-mvp-backlog.md`, `docs/analysis/target-system-design.md`.
- Forbidden files/actions: runtime, app, schema, fixture, test, DB, Matrix,
  GitHub, deploy, live memory, Codex exec, commit, push, merge, PR.
- Acceptance criteria: one audit note or roadmap update lists the authoritative
  source for MCR-310, MCR-720, MCR-730, MCR-850, and the next chosen card; no
  doc says MCR-800 or real Codex exec smoke is next.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, plus `rg` evidence for stale next-task text.
- Fake/scaffold/real boundary: docs-only; no service, smoke, or adapter work.

### MCR-910: Production Runtime Store Design Before DB

Status: design artifact added in `docs/analysis/runtime-store-db-design.md`;
implementation remains unauthorized.

- Problem solved: the repo has local file snapshot persistence, but no bounded
  design for DB transactions, replay, locking, retention, and proof refs.
- Why now: DB/Postgres implementation would otherwise be guessed from the file
  adapter and could weaken Runtime as source of truth.
- Allowed files: `docs/analysis/target-system-design.md`,
  `docs/analysis/development-entry-review.md`,
  `docs/roadmaps/post-mvp-roadmap.md`, and a future dedicated analysis doc if
  explicitly approved.
- Forbidden files/actions: DB code, migrations, docker services, production
  Runtime service, Matrix/GitHub/Codex calls, live memory, deploy.
- Acceptance criteria: design names the minimal tables or records, transaction
  boundary, idempotency rules, replay recovery, lock model, retention, and
  raw-data exclusions before any migration task is allowed.
- Validation/proof: docs diff, stale-text `rg`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `git diff --check`.
- Fake/scaffold/real boundary: design only; MCR-106 file snapshot remains the
  only implemented persistence path.

### MCR-920: Matrix Room/User Lifecycle Design Before Integration

Status: design artifact added in
`docs/analysis/matrix-room-user-lifecycle-design.md`; implementation remains
unauthorized.

- Problem solved: MCR-720 proved one disposable transaction, but room mapping,
  user identity, invitations, permissions, and cleanup are not designed for real
  Matrix use.
- Why now: real Matrix integration must not start from a smoke scaffold or from
  Matrix as a task-state source.
- Allowed files: `docs/analysis/target-system-design.md`,
  `docs/runbooks/real-service-smoke-tests.md`,
  `docs/roadmaps/post-mvp-roadmap.md`, and a future dedicated analysis doc if
  explicitly approved.
- Forbidden files/actions: production homeserver setup, AppService deployment,
  room/user automation code, real Matrix send path, secrets, DB, deploy.
- Acceptance criteria: design fixes room lifecycle, user provenance, approval
  identity binding, cleanup, and what Matrix may project versus what Runtime
  must own.
- Validation/proof: docs diff, `rg` for forbidden production claims,
  `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`.
- Fake/scaffold/real boundary: design only; MCR-720 stays local disposable
  compatibility proof.

### MCR-930: Evidence Retention And Cleanup Policy

Status: policy artifact added in
`docs/runbooks/evidence-retention-and-cleanup.md`; no evidence migration,
service run, cleanup automation, or raw evidence check-in is authorized.

- Problem solved: `.mcr` run evidence exists locally, but retention, redaction,
  cleanup, and checked-in proof rules are not a single policy.
- Why now: more real-service proof without retention rules risks secret leakage
  or losing decisive evidence.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/runbooks/real-service-smoke-tests.md`,
  `docs/runbooks/codex-exec-smoke.md`, `docs/runbooks/github-pr-smoke.md`,
  and a future dedicated runbook if explicitly approved.
- Forbidden files/actions: secret dump, moving raw evidence into git, live
  service runs, cleanup scripts that delete evidence automatically, DB/object
  storage implementation.
- Acceptance criteria: policy states what evidence is kept, redacted, ignored,
  deleted, or checked in; it covers Codex JSONL, diffs, Matrix logs, GitHub PR
  proof, cleanup logs, and token/env handling.
- Validation/proof: docs diff, `rg` for token/env dump language,
  `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`.
- Fake/scaffold/real boundary: policy only; no evidence migration or service run.

### MCR-940: Disposable GitHub Adapter Hardening Plan

Status: plan artifact added in
`docs/analysis/github-adapter-hardening-plan.md`; no adapter implementation,
real smoke, PR creation, cleanup command, merge, deploy, production main write,
branch deletion, broad-token path, or live memory path is permitted.

- Problem solved: MCR-730 and MCR-850 proved sandbox PR creation, but production
  GitHub automation and merge paths remain forbidden and need a hardening plan
  before code expands.
- Why now: GitHub is the first high-risk external write after proof and approval;
  it needs target, credential, cleanup, and refusal rules before broader use.
- Allowed files: `docs/runbooks/github-pr-smoke.md`,
  `docs/analysis/target-system-design.md`, `docs/roadmaps/post-mvp-roadmap.md`,
  and a future dedicated analysis doc if explicitly approved.
- Forbidden files/actions: Octokit or `gh` implementation, production repo
  default, merge, deploy, push to production `main`, broad token use, live
  memory, commander automation.
- Acceptance criteria: plan defines disposable target requirements, command/API
  evidence, credential scope, refusal cases, cleanup proof, and the exact later
  code allowlist before an adapter task starts.
- Validation/proof: docs diff, `rg` for production GitHub authorization drift,
  `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`.
- Fake/scaffold/real boundary: planning only; real PR creation remains manual,
  disposable, approval-scoped smoke proof only.

### MCR-950: GitHub Adapter Refusal Contract Matrix

Status: matrix artifact added in
`docs/analysis/github-adapter-refusal-contract-matrix.md`; adapter
implementation, schemas, fixtures, tests, packages, real GitHub writes, merge,
deploy, production main writes, remote ref deletion, token/env dump, and live
memory remain unauthorized.

- Problem solved: MCR-940 defines refusal cases in prose; a future worker still
  needs a named contract matrix before any adapter code hardening starts.
- Why now: GitHub is a high-risk external write boundary, and refusal behavior
  should be reviewable before code tasks touch `packages/github-adapter/**`.
- Allowed files: `docs/analysis/github-adapter-hardening-plan.md`,
  `docs/runbooks/github-pr-smoke.md`, `docs/roadmaps/post-mvp-roadmap.md`, and a
  future dedicated analysis doc if explicitly approved.
- Forbidden files/actions: `packages/github-adapter/**`, runtime/app/code/test,
  schema, fixture, package files, Octokit, `gh pr create`, `gh api` writes,
  push, merge, deploy, production main write, remote branch deletion, token/env
  dump, live memory.
- Acceptance criteria: matrix names each refusal case, required input proof,
  expected refusal code or category, decisive evidence ref, and why it blocks
  before external execution.
- Validation/proof: docs diff, `rg` for production GitHub authorization drift
  and token/env dump language, `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`.
- Fake/scaffold/real boundary: docs/planning only; no adapter code and no real
  GitHub write.

### MCR-960: GitHub Adapter Refusal Contract Test Plan

Status: test-plan artifact added in
`docs/analysis/github-adapter-refusal-test-plan.md`; no adapter implementation,
schemas, fixtures, tests, packages, real GitHub writes, merge, deploy,
production main writes, remote ref deletion, token/env dump, or live memory is
authorized.

- Problem solved: MCR-950 names refusal cases, but the repo still needs a
  smallest docs/contract-test plan that maps each matrix row to future test
  coverage before any `packages/github-adapter/**` implementation task starts.
- Why now: a test plan can define fixture shape, precedence, and expected
  refusal categories without authorizing adapter code or real GitHub writes.
- Allowed files: `docs/analysis/github-adapter-refusal-contract-matrix.md`,
  `docs/analysis/github-adapter-hardening-plan.md`,
  `docs/runbooks/github-pr-smoke.md`, `docs/roadmaps/post-mvp-roadmap.md`, and a
  future dedicated analysis doc if explicitly approved.
- Forbidden files/actions: `packages/github-adapter/**`, runtime/app/code/test,
  schema, fixture, package files, Octokit, `gh pr create`, `gh api` writes,
  push, merge, deploy, production main write, remote branch deletion, token/env
  dump, live memory.
- Acceptance criteria: a docs-only plan maps each MCR-950 matrix row to one
  future contract-test scenario, expected refusal category, minimal fixture
  fields, and any precedence rules; it does not add tests or fixtures.
- Validation/proof: docs diff, `rg` for production GitHub authorization drift
  and token/env dump language, `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`.
- Fake/scaffold/real boundary: docs/contract-test planning only; no adapter
  code, no fixtures, no test files, and no real GitHub write.

### MCR-970: GitHub Adapter Refusal Contract Tests/Fixtures Plan

Status: completed by MCR-970 and closed out by MCR-980 source hardening. Current
adapter fixtures cover GH-REF-001, GH-REF-002, GH-REF-003, GH-REF-010,
GH-REF-011, GH-REF-012, GH-REF-014, GH-REF-018, GH-REF-019, and GH-REF-020.

- Problem solved: MCR-960 defines scenario coverage, but the repo still needs a
  smallest path-authorized implementation plan before any future worker creates
  test or fixture files.
- Why now: jumping directly from docs to adapter code risks broadening the
  GitHub write boundary; the next card should limit scope to refusal contract
  tests and fixtures only.
- Allowed files: `docs/analysis/github-adapter-refusal-test-plan.md`,
  `docs/roadmaps/post-mvp-roadmap.md`, and, only if explicitly approved by the
  task brief, `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
  plus `fixtures/github-adapter/refusals/**`.
- Forbidden files/actions: adapter source implementation, Runtime/app/package
  files, schemas outside an explicit allowlist, Octokit, `gh pr create`, `gh api`
  writes, push, merge, deploy, production main write, remote branch deletion,
  token/env dump, live memory, and real GitHub smoke.
- Acceptance criteria: either a plan or tightly bounded tests/fixtures implement
  the MCR-960 one-denial-cause scenarios first, keep precedence tests explicit,
  and assert category plus evidence refs without raw secrets or raw evidence.
- Validation/proof: docs or test diff, `rg` for GitHub authorization drift and
  token/env dump language, `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`.
- Fake/scaffold/real boundary: contract-test/fixture planning or explicitly
  bounded local tests only; no real GitHub write path.

### MCR-980: GitHub Adapter Deferred Refusal Source Hardening

Status: completed; accepted into the local refusal baseline.

- Problem solved: MCR-970 documents three high-value refusal cases that the
  current adapter input cannot represent without source changes.
- Why now: GH-REF-001, GH-REF-018, and GH-REF-019 are high-risk proof/content
  boundaries. They should be source-hardened before broadening GitHub adapter
  behavior or adding any real-write path.
- Allowed files: `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`,
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`,
  `fixtures/github-adapter/refusals/**`,
  `docs/analysis/github-adapter-refusal-test-plan.md`, and
  `docs/roadmaps/post-mvp-roadmap.md`.
- Forbidden files/actions: Runtime/app/package/schema files, Octokit,
  `gh pr create`, `gh api` writes, push, merge, deploy, production main write,
  remote branch deletion, token/env dump, live memory, and real GitHub smoke.
- Acceptance criteria: adapter returns machine-readable refusal categories for
  missing proof, unsafe PR body, and unsafe evidence before runner execution;
  fixture tests cover those cases without checked-in sensitive material.
- Validation/proof: `pnpm --filter github-adapter test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `git diff --check`, and `rg` evidence for GitHub
  authorization drift and token/env dump language.
- Fake/scaffold/real boundary: local source hardening only; no real GitHub write
  path.

### MCR-990: GitHub Adapter Remaining Refusal Fixture Expansion Plan

Status: completed forbidden-action fixture slice; accepted into the local
refusal baseline.

- Problem solved: MCR-950 had forbidden-action refusal rows that were planned
  but not yet represented as executable local fixtures. GH-REF-021 through
  GH-REF-026 now have supported local fixtures for the adapter's existing
  `forbidden_action` guard.
- Why now: expanding one-denial-cause local fixtures is the smallest next safety
  step before any broader adapter behavior.
- Allowed files: `docs/analysis/github-adapter-refusal-test-plan.md`,
  `docs/roadmaps/post-mvp-roadmap.md`, and, only if explicitly approved by the
  task brief, `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
  plus `fixtures/github-adapter/refusals/**`.
- Forbidden files/actions: adapter real-write behavior, Runtime/app/package
  files outside an explicit allowlist, schemas, Octokit, `gh pr create`,
  `gh api` writes, push, merge, deploy, production main write, remote branch
  deletion, token/env dump, live memory, and real GitHub smoke.
- Acceptance criteria: select the next smallest local refusal cases from the
  MCR-950 matrix, keep each fixture to one denial cause, and assert
  machine-readable refusal before runner execution.
- Validation/proof: `pnpm --filter github-adapter test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `git diff --check`, and `rg` evidence for GitHub
  authorization drift and token/env dump language.
- Fake/scaffold/real boundary: local fixture/test planning or local refusal
  tests only; no real GitHub write path.

### MCR-1000: GitHub Adapter Approval Mismatch Refusal Fixture Plan

Status: completed docs/source-gap plan; superseded by the accepted MCR-1010
source/harness hardening.

- Problem solved: MCR-950 approval mismatch rows GH-REF-004 through GH-REF-009
  are locked as a source/harness gap instead of being represented by fake
  executable fixtures.
- Why now: approval binding is the next smallest uncovered local refusal slice
  after forbidden actions, and it must be distinguished from missing approval
  before target, ref, protection, or dirty-worktree cases broaden the fixture
  surface.
- Allowed files: `docs/analysis/github-adapter-refusal-test-plan.md`,
  `docs/analysis/github-adapter-approval-mismatch-plan.md`, and
  `docs/roadmaps/post-mvp-roadmap.md`.
- Forbidden files/actions: `packages/**`, `apps/**`, `runtime/**`, `schemas/**`,
  `fixtures/**`, `tests/**`, adapter source changes, approval-gate source
  changes, new executable fixtures, new tests, Octokit, `gh pr create`,
  `gh api` writes, fetch calls, push, merge, deploy, production main write,
  remote branch deletion, token/env dump, live memory, and real GitHub smoke.
- Acceptance criteria: state whether the current local harness can honestly
  represent GH-REF-004 through GH-REF-009 as `approval_mismatch`; document the
  exact source/harness gap if not; define MCR-1010 as the smallest future
  source/harness hardening card; keep all approval evidence language redacted
  and ref-only.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and `rg` evidence for stale next-task text, GitHub
  authorization drift, and token/env dump language.
- Fake/scaffold/real boundary: docs/source-gap plan only; no executable fixture
  completion, no adapter real-write behavior, and no real GitHub write path.

### MCR-1010: GitHub Adapter Approval Mismatch Source/Harness Hardening

Status: completed; accepted into the local refusal baseline.

- Problem solved: GH-REF-004 through GH-REF-009 need executable local refusals,
  but current approval-gate source and the runtime-owned GitHub adapter fixture
  harness cannot distinguish `approval_mismatch` from `missing_approval`.
- Why now: MCR-1000 proves a docs-only fixture plan is not enough; the source
  category and fixture harness must be hardened before adding GH-REF-004 through
  GH-REF-009 executable fixtures.
- Allowed files: `packages/approval-gate/src/approval-gate.ts`,
  `packages/approval-gate/test/approval-gate.test.ts`,
  `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`,
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`,
  `fixtures/github-adapter/refusals/GH-REF-004-*.json`,
  `fixtures/github-adapter/refusals/GH-REF-005-*.json`,
  `fixtures/github-adapter/refusals/GH-REF-006-*.json`,
  `fixtures/github-adapter/refusals/GH-REF-007-*.json`,
  `fixtures/github-adapter/refusals/GH-REF-008-*.json`,
  `fixtures/github-adapter/refusals/GH-REF-009-*.json`,
  `schemas/proof/approval.schema.json` only if repository or run binding is
  added to the approval contract, targeted proof approval fixtures and
  `tests/contracts/proof-ledger-entry.test.mjs` only if that schema changes,
  `docs/analysis/github-adapter-refusal-test-plan.md`,
  `docs/analysis/github-adapter-approval-mismatch-plan.md`, and
  `docs/roadmaps/post-mvp-roadmap.md`.
- Forbidden files/actions: adapter real-write behavior beyond local pre-run
  refusals, Runtime/app files outside the explicit allowlist, Octokit,
  `gh pr create`, `gh api` writes, fetch calls, push, merge, deploy, production
  main write, remote branch deletion, broad credential use, secret reads,
  token/env dump, raw approval payload logging, live memory, and real GitHub
  smoke.
- Acceptance criteria: approval-gate source can emit `approval_mismatch` while
  preserving `approval_required` for true missing approval; runtime-owned
  adapter tests and fixtures cover GH-REF-004 through GH-REF-009 as
  one-denial-cause cases; every case refuses before runner execution; no raw
  approval payloads, token values, env dumps, raw logs, or raw API payloads are
  checked in or printed.
- Validation/proof: `pnpm --filter approval-gate test`,
  `pnpm --filter github-adapter test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `git diff --check`, and `rg` evidence for stale
  next-task text, GitHub authorization drift, raw approval payload language, and
  token/env dump language.
- Fake/scaffold/real boundary: local source/harness and fixture hardening only;
  no adapter real-write behavior and no real GitHub write path.

### MCR-1020: Remaining GitHub Adapter Local Refusal Hardening

Status: completed; accepted and closed out by the MCR-1030 docs-only readiness
audit.

- Problem solved: remaining uncovered MCR-950 rows GH-REF-013, GH-REF-015,
  GH-REF-016, and GH-REF-017 need local target/ref/protection/dirty-worktree
  refusals before any broader GitHub adapter work.
- Coverage added: GH-REF-013 maps to `unsafe_target`, GH-REF-015 maps to
  `unsafe_ref`, GH-REF-016 maps to `unknown_protection`, and GH-REF-017 maps to
  `dirty_worktree`; every case refuses before runner execution.
- Closeout evidence: MCR-1030 confirms GH-REF-001 through GH-REF-026 all exist
  under `fixtures/github-adapter/refusals/`, all are `support=supported`, and
  all expect `no_runner_calls=true`; `packages/github-adapter` tests execute
  each local refusal before runner execution.
- Next step: later planning for any bounded adapter expansion. Do not start real
  GitHub or production automation from this completion.
- Fake/scaffold/real boundary: local source/harness and fixture hardening only;
  no real GitHub, no Octokit, no `gh pr create`, no `gh api`, no push, no merge,
  no deploy, no secret reads, and no live memory writes.

### MCR-1030: GitHub Adapter Refusal Matrix Readiness Audit And Closeout Docs

Status: completed docs-only readiness audit; result GO.

- Problem solved: post-MVP docs no longer route workers through stale MCR-1020
  pending-review text after the local refusal matrix landed on `main`.
- Audit result: GH-REF-001 through GH-REF-026 all exist as local refusal
  fixtures, none are deferred, and every supported fixture expects
  `no_runner_calls=true`.
- Semantic closeout: local gates preserve credential precedence, non-consuming
  approval preview, approval non-consumption on local refusal, and
  target/repository/run-correlation checks before any injected runner can run.
- Next step: later planning only. This closeout does not authorize real GitHub,
  production automation, Octokit, `gh pr create`, `gh api`, fetch calls, push,
  merge, deploy, production `main` writes, token/env dumps, secret reads, or
  live memory writes.
- Fake/scaffold/real boundary: docs-only readiness result; no runtime code,
  schema, fixture, package, app, test, real GitHub, or production automation
  change.

### MCR-1040: GitHub Adapter Bounded Expansion Plan

Status: completed planning artifact added in
`docs/analysis/github-adapter-bounded-expansion-plan.md`; implementation remains
unauthorized.

- Problem solved: MCR-1030 leaves the next step as generic later planning,
  which could let a future worker jump from a complete refusal matrix to real
  GitHub adapter work.
- Why now: the refusal matrix is complete locally, so the next durable artifact
  should define the smallest safe expansion boundary before any code task is
  considered.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/analysis/github-adapter-hardening-plan.md`,
  `docs/analysis/github-adapter-refusal-test-plan.md`,
  `docs/analysis/target-system-design.md`, and
  `docs/analysis/github-adapter-bounded-expansion-plan.md`.
- Forbidden files/actions: runtime, app, package, source, test, schema, fixture,
  package-manager files, `.codex.local.env`, real GitHub writes, Octokit,
  `fetch`, `gh api`, `gh pr create`, merge, deploy, branch deletion,
  production `main` write, token reads, secret reads, env dumps, raw payload
  logging, live memory writes, commit, push, PR.
- Acceptance criteria: plan states that the next phase is planning/design only;
  it names the future minimal local-only code slice as injected client/runner
  interface shape or command/API redaction contract; it preserves explicit
  scoped/disposable credential input, approval/proof/run_id/target/ref binding,
  no ambient auth, no runner call on refusals, and redacted evidence refs; it
  includes a next worker prompt seed with allowlist and validation.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and `rg` evidence for GitHub authorization drift.
- Fake/scaffold/real boundary: docs-only planning; no adapter implementation,
  no new tests or fixtures, and no real GitHub write path.

### MCR-1041: GitHub Adapter Local Interface/Redaction Design

Status: completed design artifact in
`docs/analysis/github-adapter-bounded-expansion-plan.md`; implementation remains
outside MCR-1041.

- Problem solved: MCR-1040 defines the bounded expansion boundary, but the exact
  local-only interface or redaction contract is still undecided.
- Why now: before any code slice is considered, the repo needs one reviewable
  design that chooses between an injected client/runner interface shape and a
  command/API redaction contract, or explains why one must precede the other.
- Allowed files: `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`,
  `docs/analysis/github-adapter-refusal-test-plan.md`, and
  `docs/roadmaps/post-mvp-roadmap.md`.
- Forbidden files/actions: `packages/**`, `apps/**`, `workers/**`,
  `runtime/**`, `schemas/**`, `fixtures/**`, `tests/**`, package files,
  lockfiles, `.codex.local.env`, implementation, real GitHub writes, Octokit,
  `fetch`, `gh api`, `gh pr create`, merge, deploy, branch deletion,
  production `main` write, token/env dump, secret read, live memory write,
  commit, push, PR.
- Design result: both boundaries are required, but sequenced. The command/API
  redaction contract comes first; the injected runner/client interface shape
  comes second after the redacted command/API boundary is stable.
- Reason: redaction-first prevents a future runner/client interface from
  standardizing raw token/env, raw stdout/stderr, raw GitHub API payload, raw
  patch, raw diff, raw PR body, or raw approval payload material as acceptable
  inputs or retained proof.
- Acceptance criteria: state that MCR-1041 still cannot implement; choose or
  sequence the local-only interface/redaction design; name the smallest future
  local-only code allowlist only if later approved; preserve explicit
  scoped/disposable credential input, approval/proof/run_id/target/ref binding,
  no ambient auth, no runner call on refusals, and redacted evidence refs;
  include a verifier checklist and validation commands.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and `rg` evidence for GitHub authorization drift.
- Fake/scaffold/real boundary: docs-only local interface/redaction design; no
  adapter implementation, no new tests or fixtures, no network-capable client,
  and no real GitHub write path.

### MCR-1042: GitHub Adapter Redacted Command Contract Local Slice

Status: completed and accepted as a local-only code slice in
`fcdd4caff37ecbca64b34635e209afb5fa4b9fd7`.

- Problem solved: MCR-1041 chose redaction-first sequencing, but the current
  adapter still keeps command building, redaction, runner execution, and proof
  retention in one source file. The next slice should make the redacted
  command/API contract explicit before any runner/client interface expansion.
- Completed result: the Runtime-owned GitHub PR adapter now supports structured
  `api_summary` on success, preserves the legacy local stdout URL extraction
  path only for repo-scoped PR URLs, rebuilds the retained API summary from
  redacted fields, and keeps raw stdout, stderr, token/env material, raw API
  payload, raw patch/diff, raw PR body, and raw approval payload material out of
  returned results and retained proof.
- Accepted files changed: `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`,
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`, and
  `packages/github-adapter/src/index.ts`.
- Accepted proof: `pnpm --filter github-adapter test` 43/43,
  `pnpm --filter runtime-orchestrator test` 13/13, `pnpm test:contracts` 84/84,
  `pnpm schemas:validate` 84/84, `pnpm test` 230/230, and
  `git diff --check`.
- Why now: a small local redaction contract is the narrowest way to reduce leak
  risk without adding real GitHub, network authority, Runtime orchestration, or
  broader adapter behavior.
- Allowed files: `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`,
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`, and
  `packages/github-adapter/src/index.ts` only if exported redaction types need
  the same narrowed boundary.
- Forbidden files/actions: `apps/**`, `workers/**`, `runtime/**`, `schemas/**`,
  `fixtures/**`, package files, lockfiles, `.codex.local.env`, GitHub workflows,
  smoke runners, Matrix/Codex real smokes, Octokit, `fetch`, `gh api`,
  `gh pr create`, real GitHub writes, a network-capable client, merge, deploy,
  branch deletion, production `main` write, token/env dump, secret read, raw
  API payload logging, raw approval payload logging, raw stdout/stderr
  retention, raw patch/diff retention, raw PR body retention, live memory write,
  commit, push, PR.
- Acceptance criteria: define or extract a local redacted command/API summary
  contract; keep token values and env dumps out of returned results and retained
  proof; keep stdout/stderr/API payload evidence as refs or redacted summaries;
  preserve verified proof, action-scoped approval, run_id, target repo,
  base/head refs, explicit scoped/disposable credential input, no ambient auth,
  no runner/client call on refusals, and redacted evidence refs.
- Validation/proof: `pnpm --filter github-adapter test`,
  `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`, and `rg`
  evidence for GitHub authorization drift and raw token/env/payload retention.
- Fake/scaffold/real boundary: local redaction-contract hardening only; no real
  GitHub write, no network-capable client, no Octokit, no `fetch`, no `gh api`,
  no `gh pr create`, no merge, no deploy, no branch deletion, no production
  `main` write, no secret read, and no live memory write.

### MCR-1043: GitHub Adapter Redacted Command Contract Closeout Docs

Status: docs-only closeout card added by MCR-1043; no code, schema, fixture,
test, package, runtime, Matrix, GitHub, Codex, memory, or external action is
authorized by this card.

- Problem solved: MCR-1042 merged into `main`, but this roadmap still pointed
  the first recommended task at MCR-1042 and described it as pending.
- Why now: stale closeout text can cause commander sessions to dispatch a
  completed redaction-contract code slice again instead of moving to the second
  MCR-1041 sequencing step.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`,
  `docs/analysis/github-adapter-refusal-test-plan.md`, and
  `docs/analysis/target-system-design.md`.
- Forbidden files/actions: `packages/**`, `apps/**`, `workers/**`,
  `runtime/**`, `schemas/**`, `fixtures/**`, `tests/**`, package files,
  lockfiles, `.codex.local.env`, real GitHub writes, Octokit, `fetch`,
  `gh api`, `gh pr create`, a network-capable client, merge, deploy, branch
  deletion, production `main` write, token/env dump, secret read, raw payload
  logging, live memory write, commit, push, PR, or live memory update.
- Acceptance criteria: MCR-1042 is recorded as completed and accepted; First
  Recommended Task no longer points to MCR-1042; the next step follows
  MCR-1041 sequencing and points to injected runner/client interface tightening;
  all text keeps the GitHub adapter boundary local-only.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg` evidence.
- Fake/scaffold/real boundary: docs-only status synchronization; no runtime,
  adapter, external service, or live memory behavior changes.

### MCR-1044: GitHub Adapter Injected Runner Interface Tightening

Status: completed, accepted, and merged in commit
`367c625fe05e76e865ed2dab45f0f4d19ceb0167`.

- Problem solved: MCR-1041 required both redaction and interface tightening.
  MCR-1042 completed the redacted command/API summary contract; MCR-1044 then
  tightened the local injected runner boundary around that redacted contract.
- Completed result: exported `RuntimeOwnedGitHubPrRunnerResult` now retains only
  `exit_code` plus `api_summary`; exported `RuntimeOwnedGitHubPrRunner` no
  longer standardizes runner stdout/stderr as public contract fields. Legacy
  stdout PR URL compatibility remains only as an internal local helper.
- Retained proof boundary: proof/evidence still comes from redacted
  `api_summary` fields and evidence refs, not raw stdout, stderr, token/env
  material, raw API payload, raw patch/diff, raw PR body, or raw approval
  payload material.
- Accepted files changed: `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`,
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`, and
  `packages/github-adapter/src/index.ts`.
- Fake/scaffold/real boundary: completed local runner-interface tightening only;
  no real GitHub write, no network-capable client, no Octokit, no `fetch`, no
  `gh api`, no `gh pr create`, no merge, no deploy, no branch deletion, no
  production `main` write, no secret read, and no live memory write.

### MCR-1045: GitHub Adapter Runner Interface Closeout Docs

Status: docs-only closeout card; no code, schema, fixture, test, package,
runtime, Matrix, GitHub, Codex, DB, memory, or external action is authorized by
this card.

- Problem solved: MCR-1044 merged into `main`, but post-MVP roadmap and related
  GitHub adapter analysis docs previously described it as first recommended,
  next, or not started.
- Why now: stale closeout text can cause commander sessions to repeat a
  completed local runner-interface code slice or infer that GitHub adapter work
  is ready to become a real service.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/roadmaps/analysis-roadmap.md`,
  `docs/analysis/target-system-design.md`,
  `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`, and
  `docs/analysis/github-adapter-refusal-test-plan.md`.
- Forbidden files/actions: `packages/**`, `apps/**`, `workers/**`,
  `runtime/**`, `schemas/**`, `fixtures/**`, `tests/**`, package files,
  lockfiles, `.codex.local.env`, real GitHub writes, Octokit, `fetch`,
  `gh api`, `gh pr create`, a network-capable client, merge, deploy, branch
  deletion, production `main` write, token/env dump, secret read, raw payload
  logging, live memory write, commit, push, PR, DB/Postgres, or Matrix/Codex
  real smoke.
- Acceptance criteria: MCR-1044 is recorded as completed and merged at
  `367c625fe05e76e865ed2dab45f0f4d19ceb0167`; no allowed doc routes workers to
  MCR-1044 as an active next task; exported runner facts and retained proof
  boundaries are stated; the next recommendation remains bounded/local/design
  first.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg` evidence.
- Historical next task after MCR-1045 was MCR-1046 GitHub Adapter Expansion
  Readiness Audit; it is now completed/GO. Do not start real GitHub, Octokit, `fetch`,
  `gh api`, `gh pr create`, network-capable client, merge, deploy, production
  `main` write, branch deletion, token/env dump, raw payload logging, DB,
  Matrix/Codex real smoke, or live memory work from this closeout.

### MCR-1046: GitHub Adapter Expansion Readiness Audit

Status: completed; clean read-only audit result GO. It was not an
implementation task.

- Problem solved: after MCR-1042 redacted command/API summary hardening and
  MCR-1044 runner interface tightening, the repo needs one explicit readiness
  audit to verify docs, tests, adapter boundaries, refusal fixtures, and
  runtime-orchestrator integration agree before selecting any new GitHub adapter
  expansion.
- Why now: without an explicit audit card, commander sessions must invent the
  next task, which can drift into implementation or real-service authorization.
- Allowed files/actions: read-only inspection of the current repository,
  especially these docs, `packages/github-adapter/**`,
  `packages/runtime-orchestrator/**`, `fixtures/github-adapter/refusals/**`,
  related contract tests, and package manifests. The audit output should be the
  worker handoff; do not edit files unless a later task explicitly changes this
  card.
- Forbidden files/actions: edits to `packages/**`, `apps/**`, `workers/**`,
  `runtime/**`, `schemas/**`, `fixtures/**`, `tests/**`, package files,
  lockfiles, `.codex.local.env`; real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, merge, deploy, branch deletion,
  production `main` write, token/env dump, secret read, raw payload logging,
  DB/Postgres, Matrix/Codex real smoke, live memory, commit, push, PR.
- Clean rerun facts: validation was green; stale-text grep confirmed MCR-1044
  was no longer an active next task; docs did not authorize real GitHub;
  source-drift grep found no real GitHub, network, or process execution path.
  Do not use any earlier polluted run as proof for this status.
- Acceptance criteria: audit reported GO; no stale MCR-1044-as-next text
  remained; no docs implied real GitHub authorization; local tests were green;
  `rg` confirmed no new real GitHub, network, or process execution path was
  introduced; the audit recommended the next smallest bounded task.
- Validation/proof from the clean rerun: `pnpm --filter github-adapter test`,
  `pnpm --filter runtime-orchestrator test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `pnpm test`, `git diff --check`, stale-text `rg`,
  and `rg` for real GitHub/network/process-path drift.
- Fake/scaffold/real boundary: read-only audit only; no code, fixture, test,
  schema, runtime, package, smoke, external service, or live memory behavior
  changes.

### MCR-1047: Runtime Orchestrator GitHub PR API Summary Alignment

Status: completed and merged in commit
`56f76f7a6354f074589fc126076ba767711689f5`.

- Problem solved: runtime-orchestrator GitHub PR integration coverage still
  depended on the legacy stdout URL fallback even after the runner's public
  result contract moved to `api_summary`.
- Completed result: `tests/e2e/runtime-orchestrator-cli.test.ts` now asserts the
  integration runner uses the public `api_summary` result.
- Files changed: only `tests/e2e/runtime-orchestrator-cli.test.ts`.
- Source changes needed: no.
- Compatibility boundary: legacy stdout PR URL fallback coverage remains only
  inside github-adapter package tests and internal compatibility. It is no
  longer the runtime-orchestrator integration path.
- Fake/scaffold/real boundary: completed test alignment only; no production
  GitHub readiness, no real GitHub call, no network-capable client, no Octokit,
  no `fetch`, no `gh api`, no `gh pr create`, no merge, no deploy, no branch
  deletion, no production `main` write, no secret read, and no live memory write.

### MCR-1049: GitHub Adapter Legacy Stdout Compatibility Decision

Status: completed docs/design/readiness decision. It did not change code and does
not authorize removing code.

- Problem solved: MCR-1047 moved runtime-orchestrator GitHub PR integration to
  public `api_summary`, leaving legacy stdout PR URL fallback as github-adapter
  internal compatibility only. The repo needs a decision before any later worker
  keeps, restricts, or removes that fallback.
- Why now: without a decision card, future workers can either preserve the
  fallback forever by inertia or delete it as "obviously stale" without checking
  compatibility expectations.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/roadmaps/analysis-roadmap.md`,
  `docs/analysis/target-system-design.md`,
  `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`, and
  `docs/analysis/github-adapter-refusal-test-plan.md`.
- Forbidden files/actions: `packages/**`, `apps/**`, `workers/**`,
  `runtime/**`, `schemas/**`, `fixtures/**`, `tests/**`, package files,
  lockfiles, `.codex.local.env`, real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, merge, deploy, branch deletion,
  production `main` write, token/env dump, secret read, raw payload logging,
  DB/Postgres, Matrix/Codex real smoke, live memory, commit, push, PR.
- Acceptance criteria: inventory current legacy stdout fallback references in
  docs and tests without editing source; choose one decision: keep as bounded
  internal compatibility, further restrict it, or propose a later removal task;
  define the follow-up MCR allowlist if code/test changes are needed; state that
  production GitHub readiness remains unauthorized.
- Inventory summary:
  `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts` first accepts a
  valid public `api_summary`, then still has a private legacy stdout URL helper;
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts` covers exported
  runner contract narrowing, legacy stdout compatibility, and cross-repository
  rejection; `tests/e2e/runtime-orchestrator-cli.test.ts` uses `api_summary` in
  the runtime-orchestrator GitHub PR integration and no longer relies on stdout.
- Decision: further restrict the internal fallback. Removal is premature because
  the package still has explicit internal compatibility coverage, but permanent
  keep is too broad. The fallback should only apply when a legacy local runner
  returns no `api_summary`; if an `api_summary` is present but invalid or
  mismatched, the adapter should reject instead of recovering from stdout.
- Follow-up result: MCR-1050 added the local restriction tests and source guard
  in commit `d584579566782aa7cbd51c00e59e53966b64b95d`. MCR-1052 later
  completed the read-only post-restriction audit as GO. The next active step is
  the MCR-1054 read-only/design-only removal decision. Production GitHub
  readiness remains unauthorized.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, stale-text `rg`, and authorization-drift `rg`.
- Fake/scaffold/real boundary: docs/design/readiness only; no code, fixture,
  test, schema, runtime, package, smoke, external service, or live memory
  behavior changes.

### MCR-1050: GitHub Adapter Legacy Stdout Fallback Restriction Tests

Status: completed and merged in commit
`d584579566782aa7cbd51c00e59e53966b64b95d`. This was a local-only
github-adapter restriction slice, not production GitHub readiness.

- Problem: the current adapter has a private legacy stdout PR URL fallback after
  public `api_summary` parsing. That keeps old local runner compatibility, but
  it can let stdout mask a present-but-invalid structured `api_summary`.
- Why now: MCR-1047 moved runtime-orchestrator to public `api_summary`, and
  MCR-1049 decided against immediate removal. The smallest safe next step is to
  lock the fallback behind an absent `api_summary` before any later removal plan.
- Allowed files: `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
  and `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`.
- Forbidden files/actions: `apps/**`, `workers/**`, `runtime/**`, `schemas/**`,
  `fixtures/**`, `tests/e2e/**`, package files, lockfiles, `.codex.local.env`,
  real GitHub, Octokit, `fetch`, `gh api`, `gh pr create`, network-capable
  client, merge, deploy, branch deletion, production `main` write, token/env
  dump, secret read, raw payload logging, DB/Postgres, Matrix/Codex real smoke,
  live memory, commit, push, PR.
- Acceptance criteria: package tests prove legacy stdout fallback succeeds only
  when `api_summary` is absent and stdout contains a repo-scoped PR URL; package
  tests prove an invalid or mismatched present `api_summary` returns
  `pr_url_missing` even when stdout contains a valid repo-scoped PR URL; retained
  results still exclude raw stdout/stderr, token/env material, raw API payloads,
  raw patch/diff, raw PR body, and raw approval payload; exported runner contract
  still does not standardize stdout/stderr; runtime-orchestrator continues to use
  public `api_summary`.
- Validation/proof: `pnpm --filter github-adapter test`,
  `pnpm --filter runtime-orchestrator test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `git diff --check`, stale-text `rg`, and
  authorization-drift `rg`.
- Fake/scaffold/real boundary: local package behavior only; no real GitHub call,
  no network-capable client, no external process runner execution, no
  Matrix/Codex smoke, no DB, and no live memory behavior.

### MCR-1051: GitHub Stdout Fallback Closeout Docs Sync

Status: docs-only closeout prepared for review in branch
`mcr/DOCS/mcr-1051-github-stdout-fallback-closeout`.

- Problem solved: MCR-1050 is merged, but roadmap and analysis docs still point
  future workers at the already completed restriction task.
- Why now: without this closeout, commander sessions can repeat MCR-1050 instead
  of auditing the post-restriction state.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/roadmaps/analysis-roadmap.md`,
  `docs/analysis/target-system-design.md`,
  `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`, and
  `docs/analysis/github-adapter-refusal-test-plan.md`.
- Forbidden files/actions: code, tests, schemas, fixtures, runtime, packages,
  lockfiles, `.codex.local.env`, real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, external process runner execution,
  merge, deploy, branch deletion, production `main` write, token/env dump,
  secret read, raw payload logging, DB/Postgres, Matrix/Codex real smoke, live
  memory, commit, push, PR.
- Acceptance criteria: docs record MCR-1050 as completed and merged at
  `d584579566782aa7cbd51c00e59e53966b64b95d`; docs summarize the completed
  local-only behavior; First Recommended Task no longer points to MCR-1050; next
  step is a read-only audit.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, stale-text `rg`, and authorization-drift `rg`.
- Fake/scaffold/real boundary: docs-only status synchronization; no production
  GitHub implementation or automation permission.

### MCR-1052: GitHub Adapter Post-Restriction Readiness Audit

Status: completed; read-only audit result GO at repository SHA
`621b3b660384a7fb11c2f0827c569a8ca1f3248b`. This did not authorize production
GitHub implementation.

- Problem solved: after MCR-1050, the repo needs one clean audit proving the
  local restriction landed without widening the GitHub boundary.
- Why now: the next safe step is evidence, not new adapter capability.
- Allowed files: none by default; this is a read-only audit. If the audit finds
  docs drift, propose a separate docs-only closeout instead of editing in place.
- Forbidden files/actions: source, tests, schemas, fixtures, runtime, packages,
  lockfiles, `.codex.local.env`, real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, external process runner execution,
  merge, deploy, branch deletion, production `main` write, token/env dump,
  secret read, raw payload logging, DB/Postgres, Matrix/Codex real smoke, live
  memory, commit, push, PR.
- Acceptance criteria: verify MCR-1050 behavior in source/tests; verify no real
  GitHub, network, or process execution path was added; verify
  runtime-orchestrator still uses public `api_summary`; verify docs do not
  authorize production GitHub writes or automation; verify local tests are
  green.
- Validation/proof: `pnpm --filter github-adapter test`,
  `pnpm --filter runtime-orchestrator test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `pnpm test`, `git diff --check`, stale-text `rg`,
  and authorization-drift/source-drift `rg`.
- Audit evidence: `pnpm --filter github-adapter test` 46/46 pass,
  `pnpm --filter runtime-orchestrator test` 13/13 pass,
  `pnpm test:contracts` 84/84 pass, `pnpm schemas:validate` 84/84 pass,
  `pnpm test` 233/233 pass, and `git diff --check` pass. The audit found no
  real GitHub, network-capable client, or external process execution path in
  source; docs/test mentions of those terms are forbidden or negative context;
  runtime-orchestrator still uses public `api_summary`; docs still do not
  authorize production GitHub writes or automation.
- Fake/scaffold/real boundary: read-only audit only; no real GitHub call, no
  network-capable client, no external process runner execution, no production
  automation, and no live memory behavior.

### MCR-1053: GitHub Post-Restriction Audit Closeout Docs

Status: docs-only closeout prepared for review in branch
`mcr/DOCS/mcr-1053-github-post-restriction-audit-closeout`.

- Problem solved: MCR-1052 is GO, but roadmap and analysis docs still pointed
  future workers at the completed audit.
- Why now: stale next-task text can cause commander sessions to repeat a
  completed read-only audit instead of selecting the next bounded decision.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/roadmaps/analysis-roadmap.md`,
  `docs/analysis/target-system-design.md`,
  `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`, and
  `docs/analysis/github-adapter-refusal-test-plan.md`.
- Forbidden files/actions: code, tests, schemas, fixtures, runtime, packages,
  lockfiles, `.codex.local.env`, real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, external process runner execution,
  merge, deploy, branch deletion, production `main` write, token/env dump,
  secret read, raw payload logging, DB/Postgres, Matrix/Codex real smoke, live
  memory, commit, push, PR.
- Acceptance criteria: docs record MCR-1052 as completed/GO at
  `621b3b660384a7fb11c2f0827c569a8ca1f3248b`; docs summarize the audit proof;
  the top-level recommendation no longer points to the completed audit; the next
  recommendation is the smallest safe read-only/design-only task.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, stale-text `rg`, and authorization-drift `rg`.
- Fake/scaffold/real boundary: docs-only status synchronization; no production
  GitHub implementation or automation permission.

### MCR-1054: GitHub Adapter Legacy Stdout Fallback Removal Decision

Status: completed; decision is keep bounded internal compatibility. This was
read-only/design-only and does not authorize source removal or production GitHub
implementation.

- Problem solved: MCR-1049 deferred legacy stdout fallback removal, MCR-1050
  restricted the fallback, and MCR-1052 proved that restriction clean. The repo
  now needs an explicit decision on whether to keep the bounded internal
  compatibility path, propose a later removal slice, or require more local
  evidence first.
- Why now: MCR-1052 closed the safety audit; the next smallest safe step is a
  decision artifact, not new adapter capability.
- Allowed files: `docs/roadmaps/post-mvp-roadmap.md`,
  `docs/roadmaps/analysis-roadmap.md`,
  `docs/analysis/target-system-design.md`,
  `docs/analysis/github-adapter-bounded-expansion-plan.md`,
  `docs/analysis/github-adapter-hardening-plan.md`, and
  `docs/analysis/github-adapter-refusal-test-plan.md`.
- Forbidden files/actions: source, tests, schemas, fixtures, runtime, packages,
  lockfiles, `.codex.local.env`, real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, external process runner execution,
  merge, deploy, branch deletion, production `main` write, token/env dump,
  secret read, raw payload logging, DB/Postgres, Matrix/Codex real smoke, live
  memory, commit, push, PR.
- Acceptance criteria: inventory current legacy stdout fallback references in
  source, package tests, runtime-orchestrator tests, and docs without editing
  source; choose keep, remove-later, or require more local evidence; if a later
  code slice is warranted, define its allowlist and proof commands; state that
  production GitHub writes remain unauthorized.
- Inventory summary: `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
  first accepts a valid public `api_summary`; only when the runner result lacks
  `api_summary` does it call the private legacy stdout URL helper. The package
  tests in `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
  intentionally cover localized legacy stdout compatibility, cross-repository
  rejection, and the MCR-1050 guard that present invalid or mismatched
  `api_summary` returns `pr_url_missing`. `tests/e2e/runtime-orchestrator-cli.test.ts`
  uses public `api_summary` for runtime-orchestrator GitHub PR integration.
  Docs already describe this as github-adapter internal compatibility, not a
  public runner contract or production GitHub readiness signal.
- Decision: keep bounded internal compatibility. Immediate deletion is not
  justified because the only live source reference is already private/local,
  package tests still deliberately cover absent-`api_summary` compatibility,
  runtime-orchestrator no longer relies on stdout, and MCR-1052 found no real
  GitHub, network-capable client, or external process execution path.
- Later removal boundary: no removal slice is proposed now. If future evidence
  proves the absent-`api_summary` compatibility path has no supported local
  consumer, a separate human-approved task must explicitly allow only
  `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts` and
  `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`, and must run
  `pnpm --filter github-adapter test`,
  `pnpm --filter runtime-orchestrator test`, `pnpm test:contracts`,
  `pnpm schemas:validate`, `git diff --check`, stale-text `rg`, and
  authorization/source-drift `rg`. Until that explicit future task exists,
  source removal remains unauthorized.
- Later/backlog task: MCR-1055 Post-GitHub Adapter Backlog Source-of-Truth
  Review. The GitHub stdout fallback question is closed without code work, and
  GitHub adapter backlog review is no longer the active next step while the
  project direction is to make the local fake MVP run from one root command.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, stale-text `rg`, and authorization-drift/source-drift
  `rg`.
- Fake/scaffold/real boundary: read-only/design-only decision; no source
  removal, no real GitHub write path, no network-capable client, and no
  production automation.

### MCR-1055: Post-GitHub Adapter Backlog Source-of-Truth Review

Status: later/backlog after MCR-1056. This is read-only and does not authorize
implementation, source removal, or production GitHub writes.

- Problem solved: the GitHub adapter local-expansion chain now has a bounded
  keep decision for the legacy stdout fallback. Future sessions need a current
  source-of-truth review before selecting the next post-MVP gap, otherwise they
  can infer deletion or production GitHub work from stale GitHub-specific text.
- Why now: MCR-1054 closed the fallback decision without code work. The smallest
  useful next task is to re-read the roadmap and target-system gaps and name the
  next bounded design/contract slice.
- Allowed files: none by default; this is a read-only review. If the review
  finds docs drift, propose a separate docs-only closeout instead of editing in
  place.
- Forbidden files/actions: source, tests, schemas, fixtures, runtime, packages,
  lockfiles, `.codex.local.env`, real GitHub, Octokit, `fetch`, `gh api`,
  `gh pr create`, network-capable client, external process runner execution,
  source removal, merge, deploy, branch deletion, production `main` write,
  token/env dump, secret read, raw payload logging, DB/Postgres,
  Matrix/Codex real smoke, live memory, commit, push, PR.
- Acceptance criteria: verify MCR-1054 is no longer the active First
  Recommended Task; inventory the remaining target-system real gaps from
  `docs/analysis/target-system-design.md` and this backlog; recommend one next
  bounded design/contract task; state that production GitHub writes and legacy
  stdout fallback source removal remain unauthorized unless a later explicit
  task says otherwise.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, stale-text `rg`, and authorization-drift/source-drift
  `rg`.
- Fake/scaffold/real boundary: read-only planning review only; no source,
  fixture, schema, package, runtime, smoke, external-service, or live-memory
  behavior changes.

### MCR-1057: Local Fake MVP Root Command Docs Closeout

Status: docs-only closeout for MCR-1056. This task records
roadmap/source-of-truth text after MCR-1056 and does not authorize
implementation.

- Problem solved: MCR-1056 added the root `pnpm mvp:local` command, but roadmap
  text still pointed the active next task at MCR-1055 GitHub adapter backlog
  review.
- Why now: the current direction is to pause GitHub adapter expansion and make
  the local fake MVP usable through one root command.
- Allowed files: roadmap and analysis docs only.
- Forbidden files/actions: package files, runtime, apps, packages, workers,
  schemas, fixtures, tests, `.mcr`, `.env`, real Matrix, real Codex, real
  GitHub, DB, live memory, commit, push, merge, PR.
- Acceptance criteria: record MCR-1056 commit `4406e79` and `pnpm mvp:local`;
  state that the command writes
  `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`; state it is local fake
  only and does not call real Matrix/Codex/GitHub/DB/live memory; move active
  next work away from GitHub adapter backlog.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg`.
- Fake/scaffold/real boundary: docs-only; no command, runtime, adapter,
  schema, fixture, test, smoke, service, or persistence implementation.

### MCR-1058: Local Fake MVP Root Command Acceptance/Runbook Closeout

Status: completed as docs/runbook closeout in `docs/runbooks/local-fake-mvp.md`.
No implementation was authorized by this card.

- Problem solved: `pnpm mvp:local` exists, but the user-facing single-command
  experience still needs a small acceptance/runbook pass so future sessions know
  exactly how to run it, what file it produces, and what it proves.
- Why now: this follows the new direction toward a one-command local fake MVP
  before returning to any GitHub adapter backlog refinement.
- Allowed files: docs/runbook/readme/roadmap files only, as explicitly scoped by
  the task brief.
- Forbidden files/actions: package files, runtime, apps, packages, workers,
  schemas, fixtures, tests, `.mcr`, `.env`, real Matrix, real Codex, real
  GitHub, DB/Postgres, live memory, production service smoke, commit, push,
  merge, PR.
- Acceptance criteria: document the root command, expected snapshot path,
  fake-only boundary, validation commands, cleanup expectation, and exact claims
  the command does and does not prove.
- Validation/proof: docs diff, `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and `rg` for stale next-task and overclaiming text.
- Fake/scaffold/real boundary: documentation/acceptance only; `pnpm mvp:local`
  remains a local fake MVP root command, not production MVP, not a real-service
  smoke, not DB persistence, and not GitHub adapter authorization.

### MCR-1059: Local Fake MVP Root Command Readiness Audit

Status: completed; read-only audit result GO. Historical card retained for
source-of-truth traceability.

- Problem solved: after the runbook closeout, an independent worker should
  verify the command, generated snapshot, and roadmap state without changing
  code.
- Why now: this is the smallest check before any later backlog refinement.
- Allowed files/actions: read-only inspection of docs, command output, snapshot
  output, git status, and validation results.
- Forbidden files/actions: source edits, package files, runtime, apps, packages,
  workers, schemas, fixtures, tests, `.env`, real Matrix, real Codex, real
  GitHub, DB/Postgres, live memory, commit, push, merge, PR.
- Acceptance criteria: confirm `docs/runbooks/local-fake-mvp.md` matches
  `pnpm mvp:local`, confirm `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`
  is generated and ignored, confirm status summary remains completed/verified/
  consumed/proposed, and confirm docs no longer present MCR-1058 as active.
- Validation/proof: `pnpm mvp:local`, snapshot existence check, snapshot summary
  read, `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`, and
  `git status --short --untracked-files=all`.
- Fake/scaffold/real boundary: read-only readiness audit; no new runtime code,
  no real-service smoke, and no GitHub adapter expansion.

### MCR-1060: Local Fake MVP Root Command Readiness Audit Closeout

Status: completed as docs-only closeout. This card records the MCR-1059 GO
result in roadmap/source-of-truth docs only.

- Problem solved: MCR-1059 proved the root command and runbook match, but docs
  still presented MCR-1059 as the active next task.
- Why now: after a GO audit, source-of-truth docs should stop sending workers
  back to the same read-only audit.
- Allowed files: roadmap/source-of-truth docs only.
- Forbidden files/actions: package files, runtime, apps, packages, workers,
  schemas, fixtures, tests, `.env`, `.mcr`, real Matrix, real Codex, real
  GitHub, DB/Postgres, live memory, commit, push, merge, PR.
- Acceptance criteria: record MCR-1059 GO, mark MCR-1059 completed, state that
  `pnpm mvp:local` runs the local fake MVP and writes the ignored snapshot, keep
  real-service and production boundaries negative, and recommend MCR-1061 as a
  design/read-only next task.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`, `git diff
  --check`, and stale-text `rg`.
- Fake/scaffold/real boundary: docs-only closeout; no new code or command
  behavior.

### MCR-1061: Local Fake MVP Root Command Evidence Artifact Design

Status: completed as docs/design. MCR-1062 later implemented the minimal
`summary.json` artifact in commit
`1d6225595191db3a59ffa05546c6aad59a2e7b7c`; no implementation was authorized or
performed by MCR-1061 itself.

- Problem solved: MCR-1059 showed that `pnpm mvp:local` can be verified by
  stdout plus the ignored snapshot, but the repo has not decided whether the
  root command itself should write a stable evidence artifact such as
  `summary.log`, `summary.json`, or a handoff evidence record.
- Why now: decide the artifact shape before changing command behavior, so later
  workers do not infer evidence format from one audit transcript.
- Allowed files/actions: read-only inspection and docs/design notes only.
- Forbidden files/actions: package files, command implementation, runtime,
  apps, packages, workers, schemas, fixtures, tests, `.env`, `.mcr`, real
  Matrix, real Codex, real GitHub, DB/Postgres, live memory, commit, push,
  merge, PR.
- Acceptance criteria: decide whether a root-command-written
  `summary.log`/`summary.json`/handoff evidence artifact is needed; if yes,
  define the minimum fields, location, ignore/check-in policy, and redaction
  boundary for a later implementation task; if no, document that the current
  stdout-plus-snapshot proof remains sufficient.
- Validation/proof: docs diff, stale-text `rg`, `pnpm test:contracts`, `pnpm
  schemas:validate`, and `git diff --check`.
- Fake/scaffold/real boundary: design only; this does not authorize command
  implementation, production MVP, real Matrix/Codex/GitHub, DB/Postgres, live
  memory, or GitHub adapter expansion.

Decision summary: the artifact should be ignored generated
`.mcr/runs/local-fake-mvp/summary.json`, colocated with
`runtime-store.snapshot.json`. It should include command, generated time,
snapshot path, task id/state, transition count, proof status, approval status,
PR count, memory status, `fake_only=true`, and short validation notes. It must
not store raw Matrix event bodies, worker stdout/stderr, raw diffs/logs,
token/env material, secrets, live memory bodies, or GitHub API response bodies.

### MCR-1062: Local Fake MVP Root Command Evidence Artifact Minimal Implementation

Status: completed and merged in commit
`1d6225595191db3a59ffa05546c6aad59a2e7b7c`.

- Problem solved: MCR-1061 decided the stable evidence artifact shape, and
  MCR-1062 made `pnpm mvp:local` write `summary.json`.
- Why now: replacing `tee summary.log` with generated structured evidence makes
  the local fake MVP root command easier to hand off without changing fake/real
  boundaries.
- Allowed files/actions: the smallest source/test/runbook changes needed to
  write and validate ignored `.mcr/runs/local-fake-mvp/summary.json`.
- Forbidden files/actions: real Matrix, real Codex, real GitHub, DB/Postgres,
  live memory, GitHub adapter expansion, PR creation, merge, deploy, production
  `main` writes, token/env dumps, secret reads, raw payload logging, and
  checking generated `.mcr` evidence into git.
- Acceptance criteria: `pnpm mvp:local` writes both
  `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and
  `.mcr/runs/local-fake-mvp/summary.json`; the summary matches the MCR-1061
  minimum shape; runbook validation reads summary and snapshot with `node -e`
  and no longer depends on `tee`.
- Validation/proof: `pnpm mvp:local`, summary/snapshot `node -e` check,
  `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`, and stale
  text `rg`.
- Fake/scaffold/real boundary: local fake root-command artifact only; no real
  services, DB, adapter expansion, live memory, or production readiness.

Completed outcome: `pnpm mvp:local` now writes two ignored generated artifacts:

```text
.mcr/runs/local-fake-mvp/runtime-store.snapshot.json
.mcr/runs/local-fake-mvp/summary.json
```

`summary.json` is the stable handoff summary and matches the one-line JSON
summary printed to stdout. It is not `summary.log`, and acceptance does not
require `tee`.

### MCR-1063: Local Fake MVP Summary Artifact Closeout Docs Sync

Status: docs-only closeout for MCR-1062. No runtime, code, test, schema,
fixture, service, adapter, DB, real Matrix, real Codex, real GitHub, or live
memory changes are authorized by this card.

- Problem solved: source-of-truth docs still described MCR-1062 as unimplemented
  or next work after it merged on `main`.
- Why now: stale roadmap text can send workers back to an already completed
  implementation instead of auditing the one-command local fake MVP output.
- Allowed files/actions: roadmap, analysis, and runbook docs explicitly scoped
  by the task brief.
- Forbidden files/actions: runtime, package files, apps, workers, schemas,
  fixtures, tests, `.mcr`, `.env`, real Matrix, real Codex, real GitHub,
  DB/Postgres, live memory, commit, push, merge, PR.
- Acceptance criteria: record MCR-1062 commit
  `1d6225595191db3a59ffa05546c6aad59a2e7b7c`; state that `pnpm mvp:local`
  writes both ignored artifacts; state that `summary.json` is the stable
  handoff summary and no `tee summary.log` is required; keep fake-only
  boundaries explicit; recommend a read-only readiness audit next.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg`.
- Fake/scaffold/real boundary: docs-only source-of-truth sync; local fake MVP
  only.

### MCR-1064: Local Fake MVP Single-Command Readiness Audit

Status: completed; read-only audit result GO on base commit
`1eb7d748ef72a9b29c16953ff7310fd00c9ad5e2`.

- Problem solved: after MCR-1062 and MCR-1063, the source of truth should be
  verified from the real command and generated artifacts before scheduling
  another implementation thread.
- Why now: this is the smallest useful next step and avoids drifting back into
  GitHub adapter expansion without a fresh readiness signal.
- Allowed files/actions: read-only inspection of docs, git status, command
  output, ignored `.mcr/runs/local-fake-mvp/` artifacts, and validation output.
- Forbidden files/actions: source edits, package changes, runtime, apps,
  workers, schemas, fixtures, tests, real Matrix, real Codex, real GitHub,
  DB/Postgres, live memory, commit, push, merge, PR.
- Acceptance criteria: `pnpm mvp:local` writes
  `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and
  `.mcr/runs/local-fake-mvp/summary.json`; `summary.json` parses as the stable
  handoff summary and matches stdout structure; no `summary.log` or `tee` path
  is needed; docs do not overclaim real-service readiness.
- Validation/proof: `pnpm mvp:local`, summary/snapshot `node -e` check,
  `pnpm test:contracts`, `pnpm schemas:validate`, `git diff --check`, stale
  docs scan, and generated-output cleanup note.
- Audit evidence: `pnpm mvp:local` exit 0; `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`
  and `.mcr/runs/local-fake-mvp/summary.json` existed and were ignored by
  `.gitignore:4:.mcr/`; summary fields were `command=pnpm mvp:local`,
  `snapshot_path=.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`,
  `task_state=completed`, `transition_count=14`, `proof_status=verified`,
  `approval_status=consumed`, `pr_count=1`, `memory_status=proposed`, and
  `fake_only=true`; snapshot fields showed `source_of_truth=runtime`, 1 task,
  14 transitions, 1 verified proof ref, 1 consumed approval ref, and 4 artifact
  refs including 1 PR ref; active MCR-1062 next-step stale docs matched zero;
  `pnpm test:contracts` was 84/84, `pnpm schemas:validate` was 84/84,
  `git diff --check` exited 0, and the audit worktree had no tracked changes.
- Fake/scaffold/real boundary: read-only local fake MVP audit; "single-command
  local fake MVP ready" means the local fake root command can be handed off as
  one command. It does not mean real Matrix/Codex/GitHub/DB/live memory,
  real-service smoke, production readiness, or GitHub adapter expansion is
  ready or authorized.

### MCR-1065: Local Fake MVP Single-Command Readiness Audit Closeout Docs Sync

Status: docs-only closeout for MCR-1064. No runtime, code, tests, schemas,
fixtures, package files, services, real Matrix, real Codex, real GitHub, DB,
live memory, commit, push, merge, or PR is authorized by this card.

- Problem solved: MCR-1064 returned GO, but source-of-truth docs still had stale
  MCR-1064 recommendation text.
- Why now: after a GO audit, the next work should improve operator handoff and
  generated artifact policy instead of rerunning the same audit or returning to
  GitHub adapter expansion.
- Allowed files: roadmap, analysis, and runbook docs explicitly scoped by the
  task brief.
- Forbidden files/actions: runtime, code, package files, schemas, fixtures,
  tests, generated `.mcr` evidence, real Matrix, real Codex, real GitHub, DB,
  live memory, real services, GitHub adapter expansion, commit, push, merge,
  PR.
- Acceptance criteria: record MCR-1064 as completed/GO at
  `1eb7d748ef72a9b29c16953ff7310fd00c9ad5e2`; preserve the local-fake-only
  boundary; remove stale MCR-1064 next-task wording; recommend a smaller
  docs/read-only follow-up around single-command operator handoff, artifact
  retention, and cleanup policy.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg`.
- Fake/scaffold/real boundary: docs-only status synchronization; no behavior or
  service change.

### MCR-1066: Local Fake MVP Single-Command Operator Handoff And Artifact Retention Docs

Status: completed docs-only task after MCR-1065. No runtime/code/tests/schema/
fixtures/package files changed.

- Problem solved: MCR-1064 proves the local fake root command is single-command
  ready, but operator handoff still needs one small policy for what to keep,
  what to delete, and what proof fields to copy from the ignored `.mcr` output.
- Why now: this advances the single-command path without reopening GitHub
  adapter expansion or pretending local fake readiness is real-service
  readiness.
- Allowed files/actions: docs/runbook/roadmap/analysis updates only, plus
  read-only inspection of generated local fake artifacts if needed.
- Forbidden files/actions: runtime, code, package files, schemas, fixtures,
  tests, checked-in `.mcr` evidence, real Matrix, real Codex, real GitHub, DB,
  live memory, service startup, GitHub adapter expansion, commit, push, merge,
  PR.
- Acceptance criteria: document the operator handoff checklist, retention and
  cleanup rules for ignored `.mcr/runs/local-fake-mvp/` artifacts, which summary
  and snapshot fields are decisive, and the exact non-authorization boundary for
  real services.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg`.
- Fake/scaffold/real boundary: docs/read-only policy only; no implementation,
  cleanup automation, real service, or adapter expansion.

Completed outcome: `docs/runbooks/local-fake-mvp.md` names `pnpm mvp:local` as
the single command, requires operators to report the stable `summary.json`
fields and Runtime-owned snapshot proof fields, defines decisive GO/NO-GO
conditions, and states that `.mcr/runs/local-fake-mvp/*` is ignored generated
evidence to keep only through commander review unless a short docs/handoff
summary is needed.

### MCR-1067: Local Fake MVP Single-Command Operator-Friendliness Audit

Status: completed; read-only audit result GO on base commit
`f3d8c39e6fd158305c9d2b0ee945d19057df05f1`.

- Problem solved: after the handoff and retention docs land, the single-command
  path needs one final operator-readiness check across the root script alias,
  runbook command, handoff fields, ignored artifact behavior, and cleanup wording.
- Why now: this keeps momentum on the single-command local fake MVP path without
  reopening GitHub adapter expansion or real-service work.
- Allowed files/actions: read-only inspection of docs, package metadata, git
  status, ignored `.mcr/runs/local-fake-mvp/` behavior, and validation output.
- Forbidden files/actions: source edits, runtime, code, package changes, schemas,
  fixtures, tests, real Matrix, real Codex, real GitHub, DB/Postgres, live
  memory, service startup, GitHub adapter expansion, commit, push, merge, PR.
- Acceptance criteria: report GO/NO-GO on whether the root alias, runbook,
  handoff checklist, artifact retention/cleanup policy, and local fake boundary
  agree; do not change behavior.
- Validation/proof: `pnpm mvp:local` exited 0; `package.json` root alias matched
  the runbook; `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and
  `.mcr/runs/local-fake-mvp/summary.json` existed and were ignored by
  `.gitignore:4:.mcr/`; `summary.json` reported `command=pnpm mvp:local`,
  `snapshot_path=.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`,
  `task_id=task_mcr_800_runtime_orchestrator_cli`, `task_state=completed`,
  `transition_count=14`, `proof_status=verified`, `approval_status=consumed`,
  `pr_count=1`, `memory_status=proposed`, `fake_only=true`, and validation notes
  `runtime snapshot written` plus `local fake adapters only`; the snapshot
  reported `source_of_truth=runtime`, 1 completed task, 14 transitions, verified
  proof, consumed `create_pr` approval, artifact kinds `log`, `log`, `report`,
  and `pr`, and one PR artifact; cleanup wording was bounded to
  `.mcr/runs/local-fake-mvp/`; boundary scan stayed local fake only;
  `pnpm test:contracts` and `pnpm schemas:validate` were 84/84; `git diff
  --check` exited 0; the audit worktree had no tracked diff.
- Fake/scaffold/real boundary: read-only audit only; no implementation,
  cleanup automation, real service, or adapter expansion. "Operator handoff
  ready" means local fake only, not real Matrix/Codex/GitHub/DB/live memory or
  production readiness.

### MCR-1068: Local Fake MVP Operator-Friendliness Audit Closeout Docs Sync

Status: docs-only closeout for MCR-1067. No runtime, code, tests, schemas,
fixtures, package files, services, real Matrix, real Codex, real GitHub, DB,
live memory, commit, push, merge, or PR is authorized by this card.

- Problem solved: MCR-1067 returned GO, but source-of-truth docs still pointed
  future workers at MCR-1067 as active next work.
- Why now: after a GO audit, the roadmap should stop sending workers back to
  the same read-only audit and should name the stop condition for the local fake
  operator handoff path.
- Allowed files: roadmap, analysis, and runbook docs explicitly scoped by the
  task brief.
- Forbidden files/actions: runtime, code, package files, schemas, fixtures,
  tests, generated `.mcr` evidence, real Matrix, real Codex, real GitHub, DB,
  live memory, real services, GitHub adapter expansion, commit, push, merge,
  PR.
- Acceptance criteria: record MCR-1067 as completed/GO at
  `f3d8c39e6fd158305c9d2b0ee945d19057df05f1`; preserve the local-fake-only
  boundary; remove active MCR-1067 next-task wording; recommend one read-only/
  docs-only next task around stop condition and next-phase selection.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, and stale-text `rg`.
- Fake/scaffold/real boundary: docs-only status synchronization; no behavior,
  package, runtime, service, adapter, or generated-artifact change.

### MCR-1069: Local Fake MVP Operator Handoff Stop-Condition And Next-Phase Review

Status: next recommended task after MCR-1068. Read-only/docs-only only.

- Problem solved: the local fake single-command operator path has runbook,
  generated handoff artifact, retention/cleanup wording, and a GO
  operator-friendliness audit. The project now needs an explicit stop condition
  and next-phase choice so workers do not repeat closeout audits or drift back
  to GitHub adapter expansion by default.
- Why now: MCR-1067 proves the local fake operator handoff is ready for the
  local fake path only; the next useful step is to decide whether to stop local
  fake closeout work or select one bounded read-only/design next phase from the
  current target-system gaps.
- Allowed files/actions: read-only inspection and, if drift is found,
  docs-only updates in roadmap, analysis, and runbook docs.
- Forbidden files/actions: runtime, code, package files, schemas, fixtures,
  tests, generated `.mcr` evidence, real Matrix, real Codex, real GitHub, DB,
  live memory, real-service smoke, service startup, GitHub adapter expansion,
  commit, push, merge, PR.
- Acceptance criteria: confirm there is no remaining active MCR-1067/local fake
  operator-readiness loop; state the local fake path stop condition; inventory
  the current target-system gaps; recommend exactly one next read-only/design
  task or explicitly recommend stopping until the owner chooses a new phase.
- Validation/proof: `pnpm test:contracts`, `pnpm schemas:validate`,
  `git diff --check`, stale-text `rg`, and concise roadmap-gap evidence.
- Fake/scaffold/real boundary: read-only/docs-only review. It does not
  authorize implementation, real-service smoke, GitHub adapter expansion,
  production readiness, DB/Postgres, or live memory writes.

## Global Deny List

This backlog does not authorize production Matrix/GitHub, DB/Postgres,
migrations, deploy, merge, live memory writes, production main push, secret
dump, default real-service execution, commander automation, or an independent
review lane.
