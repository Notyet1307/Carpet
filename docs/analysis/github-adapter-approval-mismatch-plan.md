# GitHub Adapter Approval Mismatch Plan

Version: 2026-06-30

Task ID: MCR-1000 / MCR-1010

Status: MCR-1010 source/harness hardening completed; pending review.

## Purpose

GH-REF-004 through GH-REF-009 require `approval_mismatch` refusals. MCR-1010
closed the earlier source/harness gap by making the approval gate emit
`approval_mismatch` for a selected but mismatched approval and by adding local
fixture execution for each row.

This remains local source, schema, fixture, and test hardening only. It does not
add real GitHub calls, Octokit usage, `gh pr create`, `gh api` writes, fetch
calls, token reads, env dumps, live memory writes, or worker-side commit, push,
merge, or PR actions.

## Current Harness Answer

Yes after MCR-1010. The local harness now represents GH-REF-004 through
GH-REF-009 as `approval_mismatch` without remapping `approval_required`.

Current evidence:

- `packages/approval-gate/src/approval-gate.ts` includes `approval_mismatch`
  in `ApprovalGateErrorCode`.
- Approval authorization preserves `approval_required` when no selected
  approval exists, and returns `approval_mismatch` when `approval_id` selects an
  approval whose task, proof, action, target, or run scope differs.
- `packages/github-adapter/src/runtime-owned-github-pr-adapter.ts` passes
  `approval_id`, proof `run_id`, and an internal target including `repository`
  into `approvalGate.authorize`, then returns the gate code unchanged.
- `packages/github-adapter/test/runtime-github-pr-adapter.test.ts` fixture
  harness supports `adapter.approval=mismatched` and builds one selected
  mismatched approval record per fixture.
- GH-REF-004 through GH-REF-009 fixture files are supported local refusal cases
  with `expected.adapter_code=approval_mismatch` and zero runner calls.

## Precise Gap

The former gap was that the approval gate collapsed "no approval exists" and "a
selected approval exists but does not match this request" into
`approval_required`. MCR-1010 splits those cases:

- Missing `approval_id` or unknown selected `approval_id` remains
  `approval_required`.
- Known selected approval with mismatched task, proof, action, target, or run
  scope returns `approval_mismatch`.

GH-REF-004 action mismatch uses a schema-valid `push_branch` approval record to
prove action scoping. `authorize()` still refuses non-`create_pr` requests as
`forbidden_action`.

## MCR-1010 Card

`MCR-1010 GitHub Adapter Approval Mismatch Source/Harness Hardening`

Problem solved: make GH-REF-004 through GH-REF-009 executable local refusals
after the approval-gate source, adapter authorization envelope, and fixture
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

These are executable local fixtures after MCR-1010. Keep them one-denial-cause
cases and do not reintroduce test-only category rewrites.
