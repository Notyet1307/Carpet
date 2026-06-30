# GitHub Adapter Refusal Contract Matrix

Version: 2026-06-30

Task ID: MCR-950

## Purpose

This matrix turns the MCR-940 GitHub adapter refusal prose into named contract
cases. It is a planning artifact only. It does not authorize Octokit,
`gh pr create`, GitHub API writes, push, merge, deploy, branch deletion, package
code, schemas, fixtures, contract tests, real smoke runs, secret reads, or live
memory writes.

A future adapter must decide these cases before external execution. Refusal
evidence must store refs and redacted summaries only, not raw patches, raw
diffs, raw logs, raw API payloads, raw stdout/stderr, credential files, secret
values, or environment dumps.

## Refusal Categories

These category strings are the stable vocabulary for future adapter contracts:

- `missing_proof`
- `unverified_proof`
- `missing_approval`
- `approval_mismatch`
- `expired_or_replayed_approval`
- `unsafe_credential`
- `unsafe_target`
- `unsafe_ref`
- `unknown_protection`
- `dirty_worktree`
- `unsafe_body`
- `unsafe_evidence`
- `forbidden_action`

## Matrix

| Case id | Trigger / input condition | Required proof fields | Expected refusal code / category | Decisive evidence ref | Why blocks before external execution |
|---|---|---|---|---|---|
| GH-REF-001 | Proof object or `proof_id` is missing for the requested GitHub action. | `proof_id`, `proof.status`, `proof.task_id`, `proof.run_id`, `proof.evidence_refs`. | `missing_proof` | Runtime proof lookup result for the requested `proof_id`. | GitHub writes require verified proof first; without proof there is no accountable basis for approval or action. |
| GH-REF-002 | Proof exists but is not verified, is failed, or lacks verifier acceptance. | `proof_id`, `proof.status=verified`, `verification_id`, `verified_at`, `verifier_ref`. | `unverified_proof` | Proof ledger verification record. | External write must not trust worker claims until verifier acceptance exists. |
| GH-REF-003 | Approval object or `approval_id` is missing. | `approval_id`, `approval.action`, `approval.task_id`, `approval.run_id`, `approval.proof_id`, `approval.expires_at`. | `missing_approval` | Runtime approval lookup result for the requested `approval_id`. | Proof is not permission; action-scoped approval is the gate for a GitHub write. |
| GH-REF-004 | Approval action does not exactly match `create_pr`. | `approval.action`, requested action. | `approval_mismatch` | Approval record and request envelope. | A vague or different action approval must not authorize PR creation. |
| GH-REF-005 | Approval `proof_id` does not match the verified proof selected for the request. | `approval.proof_id`, `proof.proof_id`, `proof.status=verified`. | `approval_mismatch` | Approval record plus proof ledger record. | Approval must bind to the same verified proof, not a sibling or stale proof. |
| GH-REF-006 | Approval `task_id` does not match the request task. | `approval.task_id`, `request.task_id`, `proof.task_id`. | `approval_mismatch` | Request envelope, approval record, proof record. | Cross-task approval reuse would bypass per-task review. |
| GH-REF-007 | Approval target repository does not match the request target. | `approval.target_repository`, `request.target_repository`, `proof.target_repository`. | `approval_mismatch` | Approval record and target summary evidence ref. | GitHub permission is target-specific; mismatched targets can write to the wrong repo. |
| GH-REF-008 | Approval base or head ref does not match the request refs. | `approval.base_ref`, `approval.head_ref`, `request.base_ref`, `request.head_ref`. | `approval_mismatch` | Approval record and request ref summary. | Ref mismatch can redirect an approved action to unreviewed code or branches. |
| GH-REF-009 | Approval `run_id` does not match request or proof `run_id`. | `approval.run_id`, `request.run_id`, `proof.run_id`. | `approval_mismatch` | Approval record, proof record, request envelope. | Run-scoped approvals cannot be reused across runs. |
| GH-REF-010 | Approval is expired or replayed for a second external action. | `approval.expires_at`, `approval.used_at` or idempotency entry, requested action id. | `expired_or_replayed_approval` | Approval ledger and external-action idempotency record. | Expiry and single-use semantics prevent stale or duplicate GitHub writes. |
| GH-REF-011 | Credential scope is broad, unknown, or not tied to the disposable target. | `credential.class`, `credential.target_repository`, `credential.permissions_summary`, `credential.expiry_or_revocation_ref`. | `unsafe_credential` | Redacted credential-scope summary ref. | Unknown or broad credentials can mutate assets beyond the approved smoke target. |
| GH-REF-012 | Request depends on ambient `gh` auth, `process.env`, keychain, or developer shell session instead of an explicit injected credential. | `credential.input_ref`, `runner.credential_source=explicit`, `ambient_auth_disabled=true`. | `unsafe_credential` | Runner input summary and ambient-auth check result. | Ambient credentials are not reviewable, revocable per run, or bound to the approval. |
| GH-REF-013 | Target repository or branch policy is not disposable. | `target.repository`, `target.disposable=true`, `target.disposable_policy_ref`, `cleanup_plan_ref`. | `unsafe_target` | Target classification evidence ref. | First real adapter slices may write only to disposable targets to bound blast radius. |
| GH-REF-014 | Base ref is production `main` or `master`. | `request.base_ref`, `target.production_refs`, `target.disposable_policy_ref`. | `unsafe_ref` | Ref classification evidence ref. | Production main/master cannot be a smoke PR base because cleanup or merge mistakes would affect real work. |
| GH-REF-015 | Base ref or head ref does not include the exact `run_id`. | `request.run_id`, `request.base_ref`, `request.head_ref`. | `unsafe_ref` | Request ref summary. | Run-id refs make cleanup, replay detection, and proof correlation reviewable. |
| GH-REF-016 | Repository ruleset or branch protection status is unknown. | `ruleset.name_or_id`, `ruleset.enforcement`, `branch_protection.summary`, `checked_at`. | `unknown_protection` | Ruleset/protection summary evidence ref. | Unknown protection means reviewers cannot prove production refs are guarded from merge or write mistakes. |
| GH-REF-017 | Local worktree is dirty when the requested PR content depends on local branch content. | `worktree_path`, `branch`, `base_sha`, `head_sha`, `git_status_short`, `content_source=local_branch`. | `dirty_worktree` | Redacted `git status --short` summary ref. | Dirty local state can put unreviewed or untracked content behind the PR request. |
| GH-REF-018 | PR body contains a secret, token-like value, raw patch, raw diff, raw log, raw GitHub API payload, raw stdout, or raw stderr. | `pr_body_artifact_ref`, `body_redaction_status=passed`, `body_size_summary`, `body_source_ref`. | `unsafe_body` | PR body redaction scanner summary ref. | PR bodies are external and durable; unsafe body content would leak secrets or raw evidence. |
| GH-REF-019 | Evidence contains raw patch, raw log, token material, raw API payload, raw stdout/stderr, or other raw material instead of refs and redacted summaries. | `evidence_refs`, `evidence_redaction_status=passed`, `raw_material_excluded=true`. | `unsafe_evidence` | Evidence retention/redaction scanner summary ref. | Evidence is review material; raw material can leak secrets or create unaudited data retention. |
| GH-REF-020 | Requested action is merge. | `request.action`, `allowed_action=create_pr`. | `forbidden_action` | Request envelope. | Merge is outside the adapter slice and requires separate production-grade policy. |
| GH-REF-021 | Requested action is deploy. | `request.action`, `allowed_action=create_pr`. | `forbidden_action` | Request envelope. | Deploy is an operational release action, not a GitHub PR create proof step. |
| GH-REF-022 | Requested action is push to production `main` or `master`. | `request.action`, `request.ref`, `target.production_refs`. | `forbidden_action` | Request envelope and ref classification evidence ref. | Direct production pushes bypass PR, CI, branch protection, and human review. |
| GH-REF-023 | Requested action deletes remote refs. | `request.action`, `request.ref`, `cleanup_plan_ref`. | `forbidden_action` | Request envelope. | Ref deletion is cleanup work and must be separately approved; first adapter slice must not own it. |
| GH-REF-024 | Requested action broadens credential permissions. | `request.action`, `credential.permissions_summary`, `requested_permissions`. | `forbidden_action` | Request envelope and credential-scope summary ref. | Permission expansion changes the security boundary and cannot be hidden inside PR creation. |
| GH-REF-025 | Requested action reads secrets, token material, credential files, environment dumps, or keychain material. | `request.action`, `requested_secret_ref`, `credential.input_ref`. | `forbidden_action` | Request envelope and denied secret-access audit ref. | The adapter must receive only the credential needed for the call and must not inspect secret stores. |
| GH-REF-026 | Requested action writes live memory. | `request.action`, `memory_write=false`, `memory_proposal_ref` if any. | `forbidden_action` | Request envelope and memory policy decision ref. | Memory remains proposal-only; GitHub automation must not mutate live memory. |

## Contract Notes For Future Tests

- MCR-960 maps every matrix row to future contract-test scenarios in
  `docs/analysis/github-adapter-refusal-test-plan.md`. Use that plan for test
  and fixture naming before creating any test or fixture files.
- One future contract test case should target one matrix row. Do not combine
  multiple denial causes in the same fixture unless the test explicitly asserts
  precedence.
- Refusal should return the stable category plus the case id or equivalent
  machine-readable reason.
- Refusal output may include decisive evidence refs and redacted summaries. It
  must not include raw credential material, raw evidence payloads, raw PR body
  content, or environment dumps.
- Passing this matrix would authorize only a later docs/contract-test planning
  task unless a separate owner approval explicitly allows adapter code.
