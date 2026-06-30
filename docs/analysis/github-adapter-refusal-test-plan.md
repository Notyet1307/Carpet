# GitHub Adapter Refusal Contract Test Plan

Version: 2026-06-30

Task ID: MCR-960

## Purpose

This docs-only plan maps every MCR-950 `GH-REF-###` matrix row to one future
contract-test scenario. It does not create or authorize adapter code, schemas,
fixtures, package changes, real GitHub writes, Octokit usage, `gh pr create`,
`gh api` writes, push, merge, deploy, remote ref deletion, token reads, env
dumps, or live memory writes.

Future tests should prove refusal before external execution. They should assert
machine-readable refusal category, source matrix case id, decisive evidence refs,
and redacted summaries only.

## Fixture Isolation Rule

Default rule: one fixture targets one denial cause. Do not mix missing proof,
approval mismatch, unsafe credential, unsafe refs, unsafe body, unsafe evidence,
dirty worktree, and forbidden action in a single fixture.

The only exception is an explicit precedence scenario. A precedence fixture must
name every triggered denial cause and assert the single expected category.

## Refusal Precedence

Use this order when multiple denial causes are intentionally present:

1. `forbidden_action`
2. `unsafe_credential`
3. `missing_proof`
4. `unverified_proof`
5. `missing_approval`
6. `expired_or_replayed_approval`
7. `approval_mismatch`
8. `unsafe_target`
9. `unsafe_ref`
10. `unknown_protection`
11. `dirty_worktree`
12. `unsafe_body`
13. `unsafe_evidence`

Reasoning: never inspect credentials, proof, local state, PR body, or evidence
for a request whose action is categorically forbidden. Next, reject credential
source or scope before deeper checks so the adapter cannot depend on ambient or
over-broad authority while evaluating a request. Proof and approval gates come
before target/content checks because they are the Runtime-owned permission
boundary. Target and ref checks precede local/body/evidence scans because they
bound where an external write could land.

## Future Test And Fixture Naming Proposal

Suggested later test file:

- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`

Suggested later fixture directory:

- `fixtures/github-adapter/refusals/`

Suggested fixture naming:

- `fixtures/github-adapter/refusals/GH-REF-001-missing-proof.json`
- `fixtures/github-adapter/refusals/GH-REF-026-forbidden-live-memory-write.json`
- `fixtures/github-adapter/refusals/PRECEDENCE-forbidden-action-over-unsafe-credential.json`

This task does not authorize creating those files. A later task must explicitly
allow `packages/github-adapter/**` and `fixtures/github-adapter/**` before any
test or fixture file is added.

## Local Fixture Execution Status

MCR-970 added local JSON fixtures under `fixtures/github-adapter/refusals/` and
fixture-driven assertions in
`packages/github-adapter/test/runtime-github-pr-adapter.test.ts`. These tests do
not call an external runner for refusal cases; the injected runner only records
whether execution would have been reached.

MCR-980 source-hardens the deferred proof/content cases so all local refusal
fixtures now execute before runner calls.

MCR-1010 closes the GH-REF-004 through GH-REF-009 approval mismatch
source/harness gap documented by MCR-1000. The local harness now builds one
selected mismatched approval record per fixture, and the adapter returns the
approval gate's real `approval_mismatch` code instead of remapping
`approval_required`.

MCR-1020 closes the remaining local target/ref/protection/dirty-worktree rows.
The adapter now has pre-run gates for disposable policy proof, exact run-id ref
correlation, target protection proof, and dirty local branch content.

MCR-1030 closes the readiness audit for the current local refusal matrix. It
confirms GH-REF-001 through GH-REF-026 all have supported local fixtures and
`no_runner_calls=true` expectations. The current adapter checks forbidden
actions and explicit disposable or scoped credentials before proof/approval
state can drive execution, uses `previewAuthorize` as a non-consuming approval
check before local target/ref/protection/dirty/body/evidence gates, and consumes
approval only after those local gates pass and immediately before the injected
runner. The runtime-orchestrator coverage keeps the opt-in GitHub adapter
target, repository, and run id correlated with the approved proof/approval
envelope.

Supported by the current adapter API and local fixture runner:

- `GH-REF-001` uses missing proof input and maps `missing_proof`.
- `GH-REF-002` maps current `proof_verification_failed` to `unverified_proof`.
- `GH-REF-003` maps current `approval_required` to `missing_approval`.
- `GH-REF-004` uses a selected approval whose action differs and maps
  `approval_mismatch`.
- `GH-REF-005` uses a selected approval whose proof id differs and maps
  `approval_mismatch`.
- `GH-REF-006` uses a selected approval whose task id differs and maps
  `approval_mismatch`.
- `GH-REF-007` uses a selected approval whose target repository differs and
  maps `approval_mismatch`.
- `GH-REF-008` uses a selected approval whose PR refs differ and maps
  `approval_mismatch`.
- `GH-REF-009` uses a selected approval whose run id differs and maps
  `approval_mismatch`.
- `GH-REF-010` maps current `approval_replayed` to
  `expired_or_replayed_approval`.
- `GH-REF-011` maps current `credential_scope_required` to
  `unsafe_credential`.
- `GH-REF-012` maps current `scoped_env_required` to `unsafe_credential`.
- `GH-REF-013` maps current `unsafe_target` directly.
- `GH-REF-014` maps current `production_main_rejected` to `unsafe_ref`.
- `GH-REF-015` maps current `unsafe_ref` directly.
- `GH-REF-016` maps current `unknown_protection` directly.
- `GH-REF-017` maps current `dirty_worktree` directly.
- `GH-REF-018` uses PR body safety input and maps `unsafe_body`.
- `GH-REF-019` uses evidence safety input and maps `unsafe_evidence`.
- `GH-REF-020` uses current `forbidden_action` directly.
- `GH-REF-021` uses current `forbidden_action` for deploy requests.
- `GH-REF-022` uses current `forbidden_action` for direct production push
  requests.
- `GH-REF-023` uses current `forbidden_action` for remote ref deletion
  requests.
- `GH-REF-024` uses current `forbidden_action` for permission broadening
  requests.
- `GH-REF-025` uses current `forbidden_action` for secret read requests.
- `GH-REF-026` uses current `forbidden_action` for live memory write requests.

No local refusal fixture in this directory is currently marked deferred.

## Scenario Map

| Scenario id | Source case | Minimal fixture/input fields | Expected refusal category | Expected evidence refs | Precedence/isolation note | Why this test exists |
|---|---|---|---|---|---|---|
| GH-REF-TC-001 | GH-REF-001 | `request.action=create_pr`, `request.task_id`, `request.run_id`, no `proof_id` and no proof object. | `missing_proof` | `proof_lookup_ref` showing no proof found. | Isolate missing proof; keep approval, target, refs, credential, body, and evidence otherwise valid. | Proves GitHub writes cannot start from a request without Runtime proof. |
| GH-REF-TC-002 | GH-REF-002 | `proof_id`, `proof.status` not `verified`, no `verification_id` or `verifier_ref`. | `unverified_proof` | `proof_verification_ref` with failed, pending, or missing verifier acceptance. | Isolate unverified proof; provide matching approval only if the adapter checks proof before approval binding. | Proves worker claims are not enough for external execution. |
| GH-REF-TC-003 | GH-REF-003 | Verified proof fields, request fields, no `approval_id` and no approval object. | `missing_approval` | `approval_lookup_ref` showing no approval found. | Isolate missing approval; proof and target inputs remain valid. | Proves proof does not imply permission to write to GitHub. |
| GH-REF-TC-004 | GH-REF-004 | `approval.action` different from `create_pr`, requested `action=create_pr`. | `approval_mismatch` | `approval_ref`, `request_envelope_ref`. | Isolate action mismatch; do not also expire or replay approval. | Proves approvals are action-scoped. |
| GH-REF-TC-005 | GH-REF-005 | `approval.proof_id` differs from selected verified `proof.proof_id`. | `approval_mismatch` | `approval_ref`, `proof_ref`. | Isolate proof binding mismatch. | Proves approval cannot be reused with sibling or stale proof. |
| GH-REF-TC-006 | GH-REF-006 | `approval.task_id` differs from `request.task_id` and `proof.task_id`. | `approval_mismatch` | `approval_ref`, `proof_ref`, `request_envelope_ref`. | Isolate task binding mismatch. | Proves cross-task approval reuse is refused. |
| GH-REF-TC-007 | GH-REF-007 | `approval.target_repository` differs from request and proof target repository. | `approval_mismatch` | `approval_ref`, `target_summary_ref`. | Isolate target binding mismatch. | Proves approval cannot redirect writes to another repo. |
| GH-REF-TC-008 | GH-REF-008 | `approval.base_ref` or `approval.head_ref` differs from request refs. | `approval_mismatch` | `approval_ref`, `request_ref_summary_ref`. | Isolate ref binding mismatch. | Proves approved refs cannot be swapped after approval. |
| GH-REF-TC-009 | GH-REF-009 | `approval.run_id` differs from request or proof `run_id`. | `approval_mismatch` | `approval_ref`, `proof_ref`, `request_envelope_ref`. | Isolate run binding mismatch. | Proves one run approval cannot authorize another run. |
| GH-REF-TC-010 | GH-REF-010 | `approval.expires_at` in the past or `approval.used_at` already set; matching action/proof/task/refs otherwise valid. | `expired_or_replayed_approval` | `approval_ledger_ref`, `external_action_idempotency_ref`. | Isolate expiry or replay; do not also mismatch fields. | Proves stale or single-use approvals cannot be reused. |
| GH-REF-TC-011 | GH-REF-011 | `credential.class` broad or unknown, missing disposable target binding, broad `permissions_summary`. | `unsafe_credential` | `credential_scope_summary_ref`. | Isolate credential scope; action remains `create_pr`. | Proves broad or unknown credentials are rejected before GitHub execution. |
| GH-REF-TC-012 | GH-REF-012 | `credential.input_ref` indicates ambient auth, `runner.credential_source` not `explicit`, or `ambient_auth_disabled=false`. | `unsafe_credential` | `runner_input_summary_ref`, `ambient_auth_check_ref`. | Isolate ambient credential source; do not include token values or env dumps. | Proves adapter cannot depend on shell, keychain, or process environment authority. |
| GH-REF-TC-013 | GH-REF-013 | `target.disposable=false` or missing `target.disposable_policy_ref`, otherwise valid target name. | `unsafe_target` | `target_classification_ref`. | Isolate target classification; refs are non-production and include run id. | Proves first real adapter slice stays limited to disposable targets. |
| GH-REF-TC-014 | GH-REF-014 | `request.base_ref=main` or `master`, `target.production_refs` includes that ref. | `unsafe_ref` | `ref_classification_ref`. | Isolate production base ref; target repo can still be disposable to avoid mixing GH-REF-013. | Proves production main/master is not a smoke PR base. |
| GH-REF-TC-015 | GH-REF-015 | `request.base_ref` or `request.head_ref` lacks exact `request.run_id`. | `unsafe_ref` | `request_ref_summary_ref`. | Isolate run-id ref rule; base is not `main` or `master`. | Proves refs remain traceable to cleanup, replay, and proof correlation. |
| GH-REF-TC-016 | GH-REF-016 | Missing `ruleset.enforcement`, missing `branch_protection.summary`, or missing `checked_at`. | `unknown_protection` | `ruleset_protection_summary_ref`. | Isolate unknown protection; target and refs otherwise safe. | Proves unknown branch protection blocks external execution. |
| GH-REF-TC-017 | GH-REF-017 | `content_source=local_branch`, `git_status_short` non-empty, plus `worktree_path`, `branch`, `base_sha`, `head_sha`. | `dirty_worktree` | `git_status_summary_ref`. | Isolate dirty local content; use clean approval/proof/target fields. | Proves unreviewed local state cannot be hidden behind PR creation. |
| GH-REF-TC-018 | GH-REF-018 | `pr_body_artifact_ref`, `body_redaction_status=failed`, `body_source_ref`, body summary says secret-like, raw patch, raw diff, raw log, raw API payload, stdout, or stderr was found. | `unsafe_body` | `pr_body_redaction_scanner_ref`. | Isolate PR body redaction; evidence refs remain safe. | Proves external durable PR body content is redacted before execution. |
| GH-REF-TC-019 | GH-REF-019 | `evidence_refs`, `evidence_redaction_status=failed`, `raw_material_excluded=false`. | `unsafe_evidence` | `evidence_redaction_scanner_ref`. | Isolate evidence retention; PR body remains safe. | Proves proof material uses refs and redacted summaries only. |
| GH-REF-TC-020 | GH-REF-020 | `request.action=merge`, otherwise valid proof, approval, credential, target, refs, body, and evidence. | `forbidden_action` | `request_envelope_ref`. | If mixed with unsafe credential, expected category remains `forbidden_action`. | Proves merge is categorically outside the adapter slice. |
| GH-REF-TC-021 | GH-REF-021 | `request.action=deploy`, otherwise valid fields. | `forbidden_action` | `request_envelope_ref`. | Isolate forbidden deploy action. | Proves release actions cannot enter the PR-create adapter path. |
| GH-REF-TC-022 | GH-REF-022 | `request.action=push`, `request.ref=main` or `master`, `target.production_refs` includes that ref. | `forbidden_action` | `request_envelope_ref`, `ref_classification_ref`. | Precedence over `unsafe_ref`: expected category is `forbidden_action`. | Proves direct production pushes bypassing PR review are refused first. |
| GH-REF-TC-023 | GH-REF-023 | `request.action=delete_ref`, target ref and cleanup plan fields present. | `forbidden_action` | `request_envelope_ref`. | Isolate forbidden remote ref deletion. | Proves cleanup automation needs its own approval and implementation slice. |
| GH-REF-TC-024 | GH-REF-024 | `request.action=broaden_permissions`, `requested_permissions` exceeds `credential.permissions_summary`. | `forbidden_action` | `request_envelope_ref`, `credential_scope_summary_ref`. | Precedence over `unsafe_credential`: expected category is `forbidden_action`. | Proves permission expansion cannot hide inside PR creation. |
| GH-REF-TC-025 | GH-REF-025 | `request.action=read_secret`, `requested_secret_ref` present, no secret value included. | `forbidden_action` | `request_envelope_ref`, `secret_access_denied_audit_ref`. | Do not include credential files, token values, keychain output, or env dumps. | Proves the adapter never inspects secret stores. |
| GH-REF-TC-026 | GH-REF-026 | `request.action=write_live_memory`, `memory_write=true` or missing proposal-only guard. | `forbidden_action` | `request_envelope_ref`, `memory_policy_decision_ref`. | Isolate live memory write request. | Proves GitHub automation cannot mutate live memory. |

## Explicit Precedence Scenarios

Add these only after the one-row scenarios exist:

- `PRECEDENCE-forbidden-action-over-unsafe-credential`: request action is
  `merge` and credential scope is broad; expected category `forbidden_action`.
- `PRECEDENCE-forbidden-action-over-missing-proof`: request action is `deploy`
  and proof is missing; expected category `forbidden_action`.
- `PRECEDENCE-unsafe-credential-over-missing-proof`: action is `create_pr`,
  credential source is ambient, and proof is missing; expected category
  `unsafe_credential`.
- `PRECEDENCE-missing-proof-over-missing-approval`: action is `create_pr`,
  proof and approval are both missing; expected category `missing_proof`.
- `PRECEDENCE-unsafe-target-over-unsafe-ref`: action is `create_pr`, target is
  not disposable, and base ref is production `main`; expected category
  `unsafe_target`.
- `PRECEDENCE-unsafe-body-over-unsafe-evidence`: action is `create_pr`, PR body
  and evidence both fail redaction; expected category `unsafe_body`.

These precedence fixtures are intentionally few. They exist to lock the security
ordering, not to replace the one-denial-cause-per-fixture matrix.

## Later Implementation Guardrail

No MCR-950 local refusal rows remain uncovered after MCR-1020, and MCR-1030
records the docs-only readiness result as GO. MCR-1040 added the bounded
expansion planning card. MCR-1041 then chose both boundaries but sequenced them:
redacted command/API contract first, injected runner/client interface second.

MCR-1042 completed and was accepted as the first local-only code slice in commit
`fcdd4caff37ecbca64b34635e209afb5fa4b9fd7`. Its tests keep existing refusal
fixtures at `no_runner_calls=true`, prove command/API summaries are redacted
before retention, and prove raw token/env, raw stdout/stderr, raw API payload,
raw patch, raw diff, raw PR body, raw approval payload, and live memory material
are not retained. MCR-1042 still does not permit real GitHub writes, Octokit,
`gh pr create`, `gh api` writes, fetch calls, a network-capable client, merge,
deploy, production `main` writes, broad credential use, secret reads, token
value logging, env dumps, raw approval payload logging, or live memory writes.

MCR-1044 completed and was accepted as the second local-only runner interface
tightening slice in commit `367c625fe05e76e865ed2dab45f0f4d19ceb0167`. The
exported runner result contract now keeps only `exit_code` plus `api_summary`;
the exported runner contract no longer standardizes stdout/stderr; legacy
stdout PR URL compatibility is internal local compatibility only. The refusal
matrix remains refusal-first, and retained proof/evidence remains redacted
`api_summary` fields plus evidence refs instead of raw stdout/stderr, raw API
payload, token/env material, raw PR body, raw approval payload, or live memory
material.

MCR-1045 is the docs-only closeout for that merged status. MCR-1046 completed a
clean GO read-only audit: validation was green, MCR-1044 was no longer active
next, docs did not authorize real GitHub, and source-drift grep found no real
GitHub, network, or process execution path. MCR-1047 completed and merged in
commit `56f76f7a6354f074589fc126076ba767711689f5`, changing only
`tests/e2e/runtime-orchestrator-cli.test.ts` so runtime-orchestrator GitHub PR
integration uses public `api_summary`. Legacy stdout PR URL compatibility is
github-adapter internal compatibility only.

The next recommended task is MCR-1049 GitHub Adapter Legacy Stdout
Compatibility Decision, a docs/design/readiness task. This plan still does not
permit real GitHub, network-capable clients, Octokit, `gh pr create`, `gh api`,
fetch calls, merge, deploy, production `main` writes, broad credential use,
secret reads, token/env dumps, raw payload logging, or live memory writes.
