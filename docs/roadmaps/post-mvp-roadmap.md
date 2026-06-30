# Post-MVP Roadmap Backlog

Version: 2026-06-30

Task ID: MCR-900

## Purpose

MCR-800 through MCR-850 is closed out. MCR-850 is compatibility proof only, not
production readiness. This backlog defines the next smallest bounded tasks so
future sessions do not infer production Matrix, GitHub, DB, deploy, live memory,
or default automation work from the smoke pass.

## First Recommended Task

After accepting MCR-980, start with **MCR-990 GitHub Adapter Remaining Refusal
Fixture Expansion Plan**. MCR-901 is complete, MCR-910 and MCR-920 have design
artifacts, MCR-930 has a policy artifact for evidence retention and cleanup,
MCR-940 has a hardening plan artifact, MCR-950 has a refusal matrix artifact,
MCR-960 has a docs-only test-plan artifact, MCR-970 adds the first local
refusal fixtures and tests, and MCR-980 hardens the deferred local refusal
source boundary.

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
branch deletion, broad-token path, or live memory path is authorized.

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

Status: completed; pending review and merge.

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

Status: proposed next after MCR-980 is reviewed.

- Problem solved: MCR-950 still has refusal rows that are planned but not yet
  represented as executable local fixtures.
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

## Global Deny List

This backlog does not authorize production Matrix/GitHub, DB/Postgres,
migrations, deploy, merge, live memory writes, production main push, secret
dump, default real-service execution, commander automation, or an independent
review lane.
