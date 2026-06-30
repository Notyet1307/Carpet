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

MCR-950 added the docs-only refusal contract matrix. MCR-960 maps that matrix to
contract-test scenarios in `docs/analysis/github-adapter-refusal-test-plan.md`.
MCR-970 through MCR-1020 add local executable refusal fixtures and pre-run
source gates for the current MCR-950 matrix rows.

No local refusal rows remain uncovered after MCR-1020. MCR-1030 confirms the
current local matrix is readiness GO: all GH-REF-001 through GH-REF-026 fixtures
are supported, every refusal case asserts no runner calls, credential gates keep
explicit disposable or scoped authority ahead of execution, approval preview is
non-consuming, local refusals do not consume approval, and runtime-orchestrator
coverage keeps target, repository, and run id correlated.

MCR-1040 completed the bounded adapter expansion plan. MCR-1041 completed the
local interface/redaction design decision: both boundaries are required, but the
command/API redaction contract must come first, followed by any injected
runner/client interface tightening. That order keeps raw token/env, raw
stdout/stderr, raw API payload, raw patch, raw diff, and raw PR body material
out of the interface before a runner/client shape is frozen.

MCR-1042 completed and was accepted as that first local-only redacted
command/API contract slice in commit
`fcdd4caff37ecbca64b34635e209afb5fa4b9fd7`. It touched only
`packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`,
`packages/github-adapter/test/runtime-github-pr-adapter.test.ts`, and
`packages/github-adapter/src/index.ts` only if exported redaction types need the
same narrowed boundary. It did not add Runtime GitHub writes, Octokit,
`gh pr create`, `gh api`, fetch calls, a network-capable client, package
changes, schemas, fixtures, smoke runners, merge, deploy, production `main`
writes, token/env dumps, secret reads, raw payload logging, or live memory
writes.

MCR-1044 completed and was accepted as the second local-only runner interface
tightening slice in commit `367c625fe05e76e865ed2dab45f0f4d19ceb0167`.
Exported `RuntimeOwnedGitHubPrRunnerResult` now retains only `exit_code` plus
`api_summary`; exported `RuntimeOwnedGitHubPrRunner` no longer standardizes
stdout/stderr as public contract fields; legacy stdout PR URL compatibility is
internal local compatibility only. Retained proof/evidence remains redacted
`api_summary` fields and evidence refs, not raw runner output, raw API payloads,
token/env material, raw PR body material, or raw approval payloads.

MCR-1045 is the docs-only closeout for that merged status. MCR-1046 completed a
clean GO read-only audit: validation was green, MCR-1044 was no longer active
next, docs did not authorize real GitHub, and source-drift grep found no real
GitHub, network, or process execution path. MCR-1047 completed and merged in
commit `56f76f7a6354f074589fc126076ba767711689f5`, changing only
`tests/e2e/runtime-orchestrator-cli.test.ts` so runtime-orchestrator GitHub PR
integration uses public `api_summary`. Legacy stdout PR URL compatibility is
github-adapter internal compatibility only.

MCR-1049 completed the docs/design decision. Decision: further restrict the
legacy stdout fallback. Removal was premature because the github-adapter package
still had explicit internal compatibility coverage; unrestricted retention was
too broad because stdout should not recover a present invalid or mismatched
`api_summary`.

MCR-1050 completed that local restriction and merged at commit
`d584579566782aa7cbd51c00e59e53966b64b95d`. The adapter now allows fallback only
when `api_summary` is absent, rejects present-but-invalid or mismatched
`api_summary` with `pr_url_missing` instead of recovering from stdout, and keeps
runtime-orchestrator on public `api_summary`. MCR-1052 completed as a GO
read-only audit at repository SHA `621b3b660384a7fb11c2f0827c569a8ca1f3248b`:
`pnpm --filter github-adapter test` 46/46,
`pnpm --filter runtime-orchestrator test` 13/13, `pnpm test:contracts` 84/84,
`pnpm schemas:validate` 84/84,
`pnpm test` 233/233, and `git diff --check` passed; no real GitHub,
network-capable client, or external process execution path was found. MCR-1053
is the docs-only closeout for that audit. MCR-1054 completed the
read-only/design-only legacy stdout fallback removal decision by keeping bounded
internal compatibility and not proposing source removal now. MCR-1055 Post-GitHub
Adapter Backlog Source-of-Truth Review is now later/backlog after MCR-1056.
MCR-1058 completed the local fake MVP docs/runbook closeout, MCR-1059 completed
as a read-only GO audit, and MCR-1061 completed the local fake evidence artifact
design. The active next step is MCR-1062 minimal `summary.json` implementation
only if explicitly assigned. This plan still does not authorize source removal,
real GitHub writes, Octokit, `fetch`, `gh api`, `gh pr create`, a
network-capable client, external process runner execution, merge, deploy,
branch deletion, production `main` writes,
token/env dumps, secret reads, raw payload logging, or live memory writes.
