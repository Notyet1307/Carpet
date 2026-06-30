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

This is the next recommended roadmap task after MCR-1040.

```text
You are a Carpet worker for MCR-1041: GitHub Adapter Local Interface/Redaction
Design. Use a dedicated worktree. Do not commit, push, merge, PR, or call any
external service.

Goal:
Design the first local-only code slice that could follow MCR-1040. Choose
between an injected client/runner interface shape and a command/API redaction
contract, or explain why one must precede the other. This is design-only; do
not implement code.

Allowed files:
- docs/analysis/github-adapter-bounded-expansion-plan.md
- docs/analysis/github-adapter-hardening-plan.md
- docs/analysis/github-adapter-refusal-test-plan.md
- docs/roadmaps/post-mvp-roadmap.md

Forbidden:
packages, apps, workers, runtime, schemas, fixtures, tests, package files,
Octokit, fetch, gh api, gh pr create, real GitHub write, merge, deploy, branch
deletion, production main write, token/env dump, secret read, live memory write.

Acceptance:
- State whether the next phase can implement. Expected answer: no; only
  planning/design remains allowed by this prompt.
- Name the smallest future local-only code allowlist if implementation is later
  approved.
- Preserve proof, approval, run_id, target, ref, credential, ambient-auth,
  refusal, and redaction gates.
- Include verifier checklist and validation commands.
```
