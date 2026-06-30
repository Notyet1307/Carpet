# GitHub Adapter Hardening Plan

Version: 2026-06-30

Task ID: MCR-940

## Purpose

MCR-730 and MCR-850 proved one manual, disposable, approval-scoped GitHub PR
create and cleanup path. They did not prove production GitHub readiness.

The default Runtime path remains fake/in-memory. `packages/github-adapter`
also contains the MCR-840 disabled command-shaped `gh pr create` scaffold with
an injected runner; that scaffold is not a production GitHub adapter, is not
enabled by default, and does not authorize any future smoke by itself.

MCR-940 is a planning gate only. It does not implement Octokit, does not run
`gh pr create`, does not create or close a PR, does not push, does not delete
remote refs, and does not add merge, deploy, live memory, or production main
write paths.

## Minimum Safety Boundary

A future real GitHub adapter may create a PR only when all of these are true:

- The adapter uses an injected runner or injected client. It must not shell out
  through an ambient process runner chosen inside the worker.
- The GitHub credential is an explicit input for the one call. There is no
  fallback to ambient `gh` authentication, `process.env`, keychain state, or a
  developer account.
- The target is disposable: either a throwaway repository or an explicitly
  disposable branch policy for one run.
- The target repository, base branch, and head branch are explicit inputs.
- The base and head branch names include the `run_id`.
- Production `main` is never a smoke target. A disposable base branch may be
  created from `main`, but the PR base for smoke is not production `main`.
- The only executable action in the first real adapter slice is `create_pr`.
- Merge, deploy, production main push, branch deletion, broad repo mutation,
  secret read, raw evidence upload, and live memory write paths are forbidden.

The future adapter must record redacted command or API shape and evidence refs;
it must not store token values, raw env dumps, raw GitHub API payloads, raw
patches, raw diffs, or token-bearing stdout/stderr in tracked artifacts.

## Required Proof

Every future approved GitHub PR create run must produce proof with:

- verified proof id
- action-scoped approval id
- target repository
- base ref and head ref, both including the `run_id`
- before and after SHA for the smoke target's protected `main`
- PR URL or equivalent PR identifier
- PR state after create
- `merge=false`
- cleanup proof: PR closed or explicit keep-for-review reason
- branch deletion proof for disposable refs, or explicit keep-for-review reason
- credential class and revocation or expiry summary, without values
- command/API shape with credential redacted
- evidence refs for stdout/stderr/command/API summaries, not raw token-bearing
  output

Branch deletion proof is an operational cleanup requirement for the smoke run.
It does not authorize the first adapter implementation slice to add a remote
ref deletion method; cleanup can remain manual until a separate cleanup plan is
approved.

For MCR-730 and MCR-850, the accepted proof shape is manual disposable proof.
For future Runtime adapter runs, the proof must be Runtime-owned and must still
show the same target, credential, approval, cleanup, and redaction properties.

## Refusal Cases

MCR-950 turns these prose cases into the named contract matrix at
`docs/analysis/github-adapter-refusal-contract-matrix.md`. Future adapter code
or tests should cite that matrix instead of reinterpreting this section.

The future adapter must refuse before external execution when any of these is
true:

- proof is missing
- proof is unverified
- approval is missing
- approval action, proof id, task id, target, base ref, head ref, or run id does
  not match the request
- approval is expired or replayed
- credential scope is broad, unknown, or ambient
- the request depends on ambient `gh` auth, `process.env`, keychain, or a
  developer shell session
- target is not disposable
- base ref is production `main` or `master`
- head ref or base ref does not include the `run_id`
- repository ruleset or branch protection status is unknown
- relevant local worktree is dirty when the run depends on local branch content
- PR body contains secrets, token-like values, raw patches, raw diffs, raw logs,
  raw GitHub API payloads, or raw worker stdout/stderr
- evidence contains raw patch/log/token material instead of refs and redacted
  summaries
- requested action is merge, deploy, push production main, delete refs, broaden
  permissions, read secrets, or write live memory

## Later Code Allowlist

MCR-940 does not authorize code changes.

If a later implementation slice is approved, the first code allowlist should be
limited to:

- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
- `packages/github-adapter/src/index.ts` only if exported types need the same
  narrowed boundary

That first slice must not touch runtime orchestrator packages, app packages,
schemas, fixtures, package manifests, Matrix code, deploy code, GitHub workflow
files, or any smoke runner. It must add or tighten refusal behavior only; no
merge, delete, deploy, production main write, broad token, ambient auth, or live
memory path is allowed.

## Next Planning Step

MCR-950 added the docs-only refusal contract matrix. The smallest next task is
to plan docs/contract-test coverage from that matrix without touching adapter
implementation code.
