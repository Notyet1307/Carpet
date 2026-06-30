# GitHub Adapter Bounded Expansion Plan

Version: 2026-06-30

Task ID: MCR-1040

## Purpose

MCR-1030 confirms the current GitHub adapter refusal matrix is complete for the
fake/guarded local boundary: GH-REF-001 through GH-REF-026 all have supported
local fixtures and refuse before the injected runner can execute.

MCR-1040 is planning-only. It defines the next safe boundary for any future
GitHub adapter expansion, but it does not permit implementation, real GitHub
calls, production automation, PR creation, merge, deploy, branch deletion,
token reads, secret reads, env dumps, or live memory writes.

## Scope Boundary

The next phase may only plan or design a bounded adapter slice. It may not
change source, tests, schemas, fixtures, packages, smoke runners, Matrix code,
Runtime orchestration, GitHub workflows, deployment logic, or secret handling.

Any future code task must start from the current local refusal guarantees:

- explicit request action
- verified proof binding
- action-scoped approval binding
- target repository binding
- base/head ref binding
- run_id binding
- explicit scoped or disposable credential input
- no ambient auth fallback
- no runner call on refusals
- redacted evidence refs only

## Non-Goals

MCR-1040 does not authorize:

- real GitHub write calls
- Octokit
- `fetch`
- `gh api`
- `gh pr create`
- merge
- deploy
- remote branch deletion
- production `main` write
- token value reads
- secret reads
- env dumps
- raw approval payload logging
- raw GitHub API payload logging
- raw worker stdout/stderr evidence
- live memory write

## Future Minimal Slice

If a later human-approved task implements code, the first slice should still
avoid any external GitHub call. It should be one of these local-only shapes:

1. Define an injected client or runner interface shape that can only receive a
   pre-redacted, approval-bound `create_pr` command object.
2. Define a command/API redaction contract that converts target, refs, PR body,
   evidence, and credential metadata into safe summaries before execution.
3. Add local tests proving refusal paths still return before any injected client
   or runner method is called.

The first code slice should not add a network-capable implementation. It should
not read credentials from process environment, shell state, keychain, config
files, or developer account state.

## MCR-1041 Design Decision

MCR-1041 remains planning/design only. It does not authorize implementation,
new tests, new fixtures, real GitHub calls, Octokit, `fetch`, `gh api`,
`gh pr create`, merge, deploy, branch deletion, production `main` writes,
token/env dumps, secret reads, live memory writes, or a network-capable client.

Design order: both boundaries are required, but they must be sequenced with the
command/API redaction contract first and the injected runner/client interface
second.

Reasoning:

1. The redaction contract defines what may leave the adapter boundary and what
   may be retained as proof: target summary, repository, base/head refs,
   run_id, approval/proof ids, disposable/scoped credential class, command/API
   shape, and artifact refs only.
2. The injected runner/client interface is only safe after that contract exists,
   because otherwise the interface can accidentally standardize raw token/env,
   raw stdout/stderr, raw API payload, raw patch, raw diff, or raw PR body
   inputs.
3. A redaction-first local slice can be tested without network authority and
   without changing Runtime orchestration. It can assert that all refusal paths
   return before any runner/client call and that successful command summaries
   never retain token values or raw external payloads.

Future minimum local-only code allowlist, only if a later task explicitly
approves implementation:

- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
- `packages/github-adapter/src/index.ts` only if exported redaction types must
  be exposed

The later implementation slice must not add Octokit, `fetch`, `gh api`,
`gh pr create` execution, a network-capable client, package changes, schemas,
fixtures, Runtime/app/worker changes, smoke runners, GitHub workflows, Matrix
code, deploy code, secret reads, token/env dumps, raw payload logging, live
memory writes, merge, branch deletion, or production `main` writes.

Required gates that must survive the later local slice:

- verified proof
- action-scoped approval
- run_id binding
- target repository binding
- base/head ref binding
- explicit scoped/disposable credential input
- no ambient auth
- no runner/client call on refusals
- redacted evidence refs only

Verifier checklist for a later local code slice:

- The diff is limited to the future allowlist above.
- The adapter still refuses before runner/client execution for every existing
  GH-REF refusal fixture.
- Any command/API summary excludes token values, env dumps, raw stdout/stderr,
  raw API payloads, raw patches, raw diffs, and raw PR body material.
- Approval consumption still occurs only after local proof, credential, target,
  ref, protection, dirty-worktree, body, and evidence gates pass.
- Credential input remains explicit and scoped/disposable; no ambient `gh`,
  `process.env`, keychain, config, or developer account fallback is introduced.
- No network-capable implementation is added; any runner/client remains
  injected and locally fakeable.

## Allowlist For The Next Worker

The next smallest worker should solve one question: what exact local interface
or redaction contract must exist before an external adapter can be considered?

Allowed files for that planning worker:

- `docs/analysis/github-adapter-bounded-expansion-plan.md`
- `docs/analysis/github-adapter-hardening-plan.md`
- `docs/analysis/github-adapter-refusal-test-plan.md`
- `docs/roadmaps/post-mvp-roadmap.md`

Forbidden files and actions:

- `packages/**`
- `apps/**`
- `workers/**`
- `runtime/**`
- `schemas/**`
- `fixtures/**`
- `tests/**`
- `package.json`
- `pnpm-lock.yaml`
- `.codex.local.env`
- GitHub, Matrix, Codex, cloud, deploy, merge, push, PR, token, secret, or live
  memory actions

## Acceptance And Validation

The next planning worker is acceptable only if it:

- keeps the result design-only
- names the exact future local-only code allowlist, if any
- keeps real GitHub calls out of scope
- keeps Octokit, `fetch`, `gh api`, and `gh pr create` out of scope
- preserves explicit scoped/disposable credential input
- preserves approval/proof/run_id/target/ref binding
- preserves no ambient auth
- preserves no runner call on refusals
- preserves redacted evidence refs
- includes a verifier checklist for code-slice readiness

Validation commands:

```bash
pnpm test:contracts
pnpm schemas:validate
git diff --check
```

Also run the MCR-1040 authorization-drift `rg` check from the task prompt
against the roadmap, hardening plan, refusal test plan, target-system design,
and this plan. It should produce no positive authorization matches. If it finds
a forbidden term in a denial sentence, the worker must quote the line and
explain why it is denial context.

## Handoff Prompt Seed

This was the recommended roadmap task after MCR-1040. MCR-1041 has now chosen
redaction-first sequencing. MCR-1042 completed that first local-only redacted
command/API contract slice in commit
`fcdd4caff37ecbca64b34635e209afb5fa4b9fd7`. The next smallest task is now
MCR-1044: a local-only injected runner/client interface tightening slice that
consumes the redacted contract instead of standardizing raw command output.

```text
You are a Carpet worker for MCR-1044: GitHub Adapter Injected Runner Interface
Tightening. Use a dedicated worktree. Do not commit, push, merge, PR, or call
any external service.

Goal:
Implement the second local-only MCR-1041 sequencing step after the MCR-1042
redaction contract: tighten the injected runner/client interface so it consumes
or returns only the redacted command/API summary contract and evidence refs.
This slice may only harden local runner boundary shape. It must not add real
GitHub writes, a network-capable client, Octokit, fetch, gh api,
gh pr create execution, Runtime orchestration, smoke runners, GitHub workflows,
Matrix/Codex real smokes, merge, deploy, branch deletion, production main
writes, token/env dumps, secret reads, raw payload logging, or live memory
writes.

Allowed files:
- packages/github-adapter/src/runtime-owned-github-pr-adapter.ts
- packages/github-adapter/test/runtime-github-pr-adapter.test.ts
- packages/github-adapter/src/index.ts only if exported local interface types need
  the same narrowed boundary

Forbidden:
apps, workers, runtime, schemas, fixtures, package files, lockfiles,
.codex.local.env, GitHub workflows, smoke runners, Matrix/Codex real smokes,
Octokit, fetch, gh api, gh pr create, real GitHub writes, network-capable
client, merge, deploy, branch deletion, production main write, token/env dump,
secret read, raw payload logging, live memory write, commit, push, PR.

Acceptance:
- The local injected runner/client surface consumes or returns only redacted
  command/API summaries and evidence refs.
- Preserve verified proof, action-scoped approval, run_id, target repository,
  base/head refs, explicit scoped/disposable credential input, no ambient auth,
  no runner/client call on refusals, and redacted evidence refs.
- Prove every existing refusal path still returns before any runner/client call.
- Prove returned results and retained proof exclude token values, env dumps, raw
  stdout/stderr, raw API payloads, raw patches, raw diffs, raw PR body material,
  and raw approval payloads.

Validation:
- pnpm --filter github-adapter test
- pnpm test:contracts
- pnpm schemas:validate
- git diff --check
```
