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

MCR-1044 later completed the second local-only MCR-1041 sequencing step in
commit `367c625fe05e76e865ed2dab45f0f4d19ceb0167`. That completion tightened
the injected runner interface but still did not add a real GitHub adapter or a
network-capable client.

MCR-1046 later completed the clean read-only readiness audit with result GO.
MCR-1047 then merged commit `56f76f7a6354f074589fc126076ba767711689f5`, changing
only runtime-orchestrator E2E coverage so the GitHub PR integration path uses
the public `api_summary` runner result. Legacy stdout PR URL fallback is now
github-adapter internal compatibility only.

MCR-1049 decided to further restrict that internal compatibility rather than
remove it immediately: fallback may remain only for legacy local runner results
that omit `api_summary`; present-but-invalid or mismatched `api_summary` should
reject instead of recovering from stdout.

MCR-1050 completed that local-only restriction and merged at commit
`d584579566782aa7cbd51c00e59e53966b64b95d`. It did not add a real GitHub
adapter, a network-capable client, or an external process execution path.

## Scope Boundary

MCR-1040 itself was planning/design only and did not authorize source or test
changes. MCR-1050 has now completed the local github-adapter restriction
test/source guard. MCR-1052 completed the read-only post-restriction audit as
GO at repository SHA `621b3b660384a7fb11c2f0827c569a8ca1f3248b`. It did not
change schemas, fixtures, package files, smoke runners, Matrix code, Runtime
orchestration, GitHub workflows, deployment logic, or secret handling. MCR-1053
is the docs-only closeout for that audit. MCR-1054 completed the
read-only/design-only legacy stdout fallback removal decision by keeping bounded
internal compatibility. The next bounded planning task is MCR-1055.

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

Historical local-only code allowlist used by the MCR-1042 and MCR-1044 local
slices:

- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
- `packages/github-adapter/src/index.ts` only if exported redaction types must
  be exposed

Any later implementation slice must not add Octokit, `fetch`, `gh api`,
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

## MCR-1045 Through MCR-1047 Closeout Status

MCR-1045 recorded MCR-1044 as completed without authorizing real GitHub
expansion. MCR-1046 then completed a clean GO read-only audit. Its proof basis
is the clean rerun only: validation was green, stale-text grep confirmed
MCR-1044 was no longer active next, docs did not authorize real GitHub, and
source-drift grep found no real GitHub, network, or process execution path.

MCR-1047 completed and merged at
`56f76f7a6354f074589fc126076ba767711689f5`. It changed only
`tests/e2e/runtime-orchestrator-cli.test.ts`; source changes were not needed.
Runtime-orchestrator GitHub PR integration now uses public `api_summary`.
Legacy stdout PR URL fallback coverage remains only inside github-adapter
package tests and internal compatibility.

## MCR-1049 Decision Result And MCR-1050 Completion

MCR-1049 solved one question: should the legacy stdout PR URL fallback be kept
as bounded internal compatibility, further restricted, or proposed for later
removal?

Decision: further restrict it. The current inventory showed:

- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts` accepts valid
  public `api_summary` first and then calls private legacy stdout helpers.
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts` intentionally
  covers bounded internal legacy stdout compatibility and cross-repository
  rejection.
- `tests/e2e/runtime-orchestrator-cli.test.ts` uses public `api_summary` for
  runtime-orchestrator GitHub PR integration.

Reason: removal was not justified while package tests still defined internal
compatibility, but the fallback should not hide a structured summary mismatch.
MCR-1050 implemented the restriction: fallback is used only when `api_summary`
is absent; if `api_summary` is present but invalid or mismatched, the adapter
rejects with `pr_url_missing` instead of recovering from stdout. The change was
local to:

- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`

Forbidden files and actions:

- `apps/**`
- `workers/**`
- `runtime/**`
- `schemas/**`
- `fixtures/**`
- `tests/e2e/**`
- `package.json`
- `pnpm-lock.yaml`
- `.codex.local.env`
- real GitHub, Octokit, `fetch`, `gh api`, `gh pr create`, network-capable
  client, GitHub, Matrix, Codex, cloud, deploy, merge, push, PR, token, secret,
  external process runner execution, DB/Postgres, Matrix/Codex real smoke, raw
  payload logging, or live memory actions

## Acceptance And Validation

MCR-1050 is complete. MCR-1052 confirmed that MCR-1050:

- proves legacy stdout fallback succeeds only when `api_summary` is absent and
  stdout contains a repo-scoped PR URL
- proves present-but-invalid or mismatched `api_summary` returns `pr_url_missing`
  even if stdout contains a valid repo-scoped PR URL
- keeps runtime-orchestrator on public `api_summary`
- keeps real GitHub calls out of scope
- keeps Octokit, `fetch`, `gh api`, and `gh pr create` out of scope
- preserves explicit scoped/disposable credential input
- preserves approval/proof/run_id/target/ref binding
- preserves no ambient auth
- preserves no runner call on refusals
- preserves redacted evidence refs

MCR-1052 proof at repository SHA `621b3b660384a7fb11c2f0827c569a8ca1f3248b`:
`pnpm --filter github-adapter test` 46/46 pass,
`pnpm --filter runtime-orchestrator test` 13/13 pass, `pnpm test:contracts`
84/84 pass, `pnpm schemas:validate` 84/84 pass, `pnpm test` 233/233 pass, and
`git diff --check` pass. It also found no real GitHub, network-capable client,
or external process execution path; docs/test mentions are forbidden or negative
context.

MCR-1054 completed the removal decision: keep the bounded internal fallback.
Immediate source removal is not proposed because the private fallback is already
limited to absent-`api_summary` legacy local runner results, package tests still
deliberately cover that compatibility path, and runtime-orchestrator uses public
`api_summary`. Any future removal must be a separate human-approved source/test
task with new local evidence and an explicit allowlist. The next recommended
task is MCR-1055 Post-GitHub Adapter Backlog Source-of-Truth Review. This
remains read-only/planning-only; no current doc authorizes source removal, real
GitHub writes, Octokit, `fetch`, `gh api`, `gh pr create`, a network-capable
client, or external process runner execution.

Validation commands for the docs closeout and decision task:

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
