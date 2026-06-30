# GitHub Adapter Approval Mismatch Plan

Version: 2026-06-30

Task ID: MCR-1000

Status: completed docs/source-gap plan; pending review.

## Purpose

GH-REF-004 through GH-REF-009 require `approval_mismatch` refusals, but the
current local adapter source and fixture harness cannot honestly produce that
category. This note locks the boundary so a later worker does not make those
rows pass by remapping `approval_required` in test-only code.

This is a docs-only source-gap plan. It does not add executable fixtures, tests,
adapter source, approval-gate source, schemas, real GitHub calls, Octokit usage,
`gh pr create`, `gh api` writes, fetch calls, token reads, env dumps, live memory
writes, or worker-side commit, push, merge, or PR actions.

## Current Harness Answer

No. The current local harness cannot honestly represent GH-REF-004 through
GH-REF-009 as `approval_mismatch` without source and harness changes.

Current evidence:

- `packages/approval-gate/src/approval-gate.ts` has no `approval_mismatch`
  error code in `ApprovalGateErrorCode`.
- Approval authorization finds an exact `task_id`, `proof_id`, `action`, and
  `target` match. When no exact match exists, it returns `approval_required`
  with reason `no matching approval`.
- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts` passes only
  `task_id`, `proof_id`, `action=create_pr`, `target`, and `requested_at` into
  `approvalGate.authorize`, then returns the gate code unchanged.
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts` fixture
  harness supports only `adapter.approval=granted|missing|replayed`; it cannot
  build a per-fixture mismatched approval record.
- The same test harness maps `approval_required` to `missing_approval`, which is
  already the GH-REF-003 category.

## Precise Gap

The current approval gate collapses "no approval exists" and "an approval exists
but does not match this request" into the same observable adapter result:
`approval_required`.

Mapping `approval_required` to `approval_mismatch` only for GH-REF-004 through
GH-REF-009 would be misleading because it would make fixture metadata, not
adapter or approval-gate behavior, decide the category. It would also conflict
with GH-REF-003, where the same adapter code correctly means
`missing_approval`.

Some approval mismatch rows are not representable with current source shape:

- GH-REF-004 action mismatch cannot be stored as a mismatched approval through
  the current gate because non-`create_pr` approvals are rejected before storage.
- GH-REF-005 proof mismatch can be rejected as `unverified_proof` during grant
  unless the harness can register both proof ids and then request a different
  proof id.
- GH-REF-007 target repository mismatch is not in the authorization request; the
  runtime-owned adapter keeps `repository` outside the approval target.
- GH-REF-009 run mismatch is not in the approval record, approval schema, or
  authorization request.

## MCR-1010 Future Card

Suggested next task:

`MCR-1010 GitHub Adapter Approval Mismatch Source/Harness Hardening`

Problem solved: make GH-REF-004 through GH-REF-009 executable local refusals
only after the approval-gate source, adapter authorization envelope, and fixture
harness can distinguish `approval_mismatch` from `missing_approval`.

Allowed files:

- `packages/approval-gate/src/approval-gate.ts`
- `packages/approval-gate/test/approval-gate.test.ts`
- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts`
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts`
- `fixtures/github-adapter/refusals/GH-REF-004-*.json`
- `fixtures/github-adapter/refusals/GH-REF-005-*.json`
- `fixtures/github-adapter/refusals/GH-REF-006-*.json`
- `fixtures/github-adapter/refusals/GH-REF-007-*.json`
- `fixtures/github-adapter/refusals/GH-REF-008-*.json`
- `fixtures/github-adapter/refusals/GH-REF-009-*.json`
- `schemas/proof/approval.schema.json`, only if repository or run binding is
  added to the approval contract.
- `fixtures/proof/valid/approval.create_pr.valid.json`, targeted
  `fixtures/proof/invalid/approval.*.invalid.json`, and
  `tests/contracts/proof-ledger-entry.test.mjs`, only if the approval schema
  changes.
- `docs/analysis/github-adapter-refusal-test-plan.md`
- `docs/analysis/github-adapter-approval-mismatch-plan.md`
- `docs/roadmaps/post-mvp-roadmap.md`

Forbidden actions:

- Real GitHub writes or reads through Octokit, `gh pr create`, `gh api`, fetch,
  or ambient `gh` auth.
- Adapter real-write behavior expansion beyond local pre-run refusal checks.
- Merge, deploy, production `main` write, remote branch deletion, broad
  credential use, secret reads, token value logging, env dumps, raw approval
  payload logging, raw API payload logging, live memory writes, or worker-side
  commit, push, merge, or PR creation.

Smallest implementation shape:

- Add a real `approval_mismatch` category at the approval-gate boundary.
- Preserve `approval_required` for the true no-approval case.
- Extend the local fixture harness so each GH-REF-004 through GH-REF-009 fixture
  can build exactly one mismatched approval while all other proof, approval,
  target, credential, body, and evidence fields stay valid.
- Keep adapter refusal before runner execution and assert zero runner calls.
- Keep all evidence fields as refs or redacted summaries only.

## MCR-1010 One-Denial-Cause Fixture Shapes

Each fixture below should keep proof verified, approval non-expired, approval
not replayed, target disposable, refs otherwise safe, credential explicit and
scoped, PR body safe, and evidence safe. The only denial cause should be the
listed mismatch.

| Case id | Fixture shape | Expected category | Evidence refs |
|---|---|---|---|
| GH-REF-004 | Approval action differs from requested `create_pr`; request action remains `create_pr`. | `approval_mismatch` | `approval_ref`, `request_envelope_ref` |
| GH-REF-005 | Approval `proof_id` differs from the selected verified proof id; both proof ids are fixture-safe and verified enough for the mismatch check. | `approval_mismatch` | `approval_ref`, `proof_ref` |
| GH-REF-006 | Approval `task_id` differs from both request and proof task id. | `approval_mismatch` | `approval_ref`, `proof_ref`, `request_envelope_ref` |
| GH-REF-007 | Approval target repository differs from request and proof target repository. | `approval_mismatch` | `approval_ref`, `target_summary_ref` |
| GH-REF-008 | Approval base ref or head ref differs from request refs. | `approval_mismatch` | `approval_ref`, `request_ref_summary_ref` |
| GH-REF-009 | Approval `run_id` differs from request or proof `run_id`. | `approval_mismatch` | `approval_ref`, `proof_ref`, `request_envelope_ref` |

Do not add these as executable fixtures until MCR-1010 source and harness
changes make the adapter produce `approval_mismatch` without test-only category
rewrites.
