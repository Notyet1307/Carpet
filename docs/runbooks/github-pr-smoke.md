# GitHub Disposable PR Smoke

## Status

Current status: MCR-730 disposable GitHub PR create smoke passed once on
2026-06-29 and was cleaned up.

Completed smoke proof:

- Target: `Notyet1307/github-pr-smoke-sandbox`.
- PR: https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/1.
- Base branch:
  `mcr-730-base-mcr-730-20260629t140000z-github-pr-smoke-01`.
- Head branch:
  `mcr-730-head-mcr-730-20260629t140000z-github-pr-smoke-01`.
- Base SHA / sandbox `main` SHA before cleanup:
  `4438b7a905d12fead4f539e6faf349b8a2464f60`.
- Head SHA: `d04d80e36881633c53f2f0c018be4b4653c503f2`.
- Cleanup: PR #1 is `closed`, `merged=false`; sandbox `main` SHA after cleanup
  is still `4438b7a905d12fead4f539e6faf349b8a2464f60`; both disposable branch
  refs are missing.
- Protection: repo ruleset `protect-main` remains `enforcement=active`,
  `target=branch`.
- Token boundary: commands used `GH_TOKEN="$MCR_GITHUB_DISPOSABLE_TOKEN"` and a
  temporary `GH_CONFIG_DIR`; token values and environment dumps were not
  recorded.

This proves one manual sandbox create/cleanup path only. Before MCR-840, the
Runtime PR path was fake/contract-only. `packages/github-adapter` exports
`createFakeGitHubPrAdapter`, records in-memory `SimulatedPullRequest` objects,
and has no real GitHub API, push, or merge implementation.

MCR-840 adds a Runtime-owned `gh pr create` command adapter shape with an
injected runner. It is disabled by default, does not run a real smoke by
itself, and is only eligible for disposable targets after verified proof and
matching `create_pr` approval.

## Required Target

Use a throwaway repository by default.

If a throwaway repository is not used, the target repository must have an
explicit disposable branch policy for the smoke run:

- source branch includes the `run_id`
- base branch is a disposable base branch, not production `main`
- branch protection and owner policy prevent merge to production `main`
- cleanup can close the PR and delete the smoke branch without affecting real
  work

Production `main` is not a smoke target.

## Credential Boundary

Use a GitHub credential created for this smoke target only.

Required properties:

- scoped to the throwaway repo or disposable branch policy
- no broad organization access
- no default use of the human main-account token
- expires or is revoked after the run
- token value is never printed, stored in proof, committed, or pasted into logs

Allowed proof: credential class, target repo, selected permissions, expiry or
revocation status, and redacted `gh auth status` summary.

Forbidden proof: token values, secret environment dumps, credential files, or
raw keychain output.

## Approval Gate

Each future run requires one action-scoped human approval for exactly one
`run_id`.

The approval must include:

- `approval_id`
- `run_id`
- `action=create_pr`
- target repository
- source branch
- base branch
- task id
- proof id
- expiry

The approval does not authorize merge, push to production `main`, deploy,
secret access, or live memory write.

## Command Shape

This is the approved command shape for future runs. Do not run it until every
gate above passes for a new `run_id`.

```bash
GH_TOKEN="$MCR_GITHUB_DISPOSABLE_TOKEN" \
  gh pr create \
    --repo "$MCR_GITHUB_DISPOSABLE_REPO" \
    --head "$MCR_GITHUB_SOURCE_BRANCH" \
    --base "$MCR_GITHUB_BASE_BRANCH" \
    --title "$MCR_GITHUB_PR_TITLE" \
    --body-file "$MCR_GITHUB_PR_BODY_FILE"
```

The command must run with the disposable credential, disposable target, and
approved `run_id`. Do not use ambient main-account `gh` auth by default.

Runtime-owned adapters must build the same command shape through an injected
runner. The runner input may receive the raw `GH_TOKEN`; stored result/evidence
must redact it and record only command shape, refs, SHAs, PR URL, cleanup
status, and evidence refs.

## Proof Requirements

Capture these fields for any future approved run:

- run id
- task id
- proof id
- approval id
- command shape, without token values
- credential-scope summary, without token values
- target repository
- source branch
- base branch
- base SHA
- head SHA
- PR URL
- PR state after creation
- cleanup status: PR closed or left open with reason
- cleanup status: smoke branch deleted or left with reason
- rollback notes
- risk notes

The proof must be enough for a reviewer to confirm the PR was created only in
the disposable target, only after approval, and with no secret exposure.

## Forbidden Actions

- merge PR
- push production `main`
- deploy
- dump secrets or token values
- write live memory
- broaden token scope during the run
- reuse approval for another `run_id`

## Cleanup

Cleanup proof must record whether the smoke PR was closed and whether the smoke
branch was deleted.

Cleanup command shape:

```bash
GH_TOKEN="$MCR_GITHUB_DISPOSABLE_TOKEN" \
  gh pr close "$MCR_GITHUB_PR_URL" --delete-branch
```

MCR-730 closeout used the equivalent close/delete behavior and verified that PR
#1 is closed, unmerged, and both disposable branch refs are missing. Future
smokes must repeat cleanup proof for their own `run_id`.

## Runtime Adapter Boundary

The current fake adapter remains the default test path. It proves proof and
approval contracts only.

The Runtime-owned adapter is an opt-in guarded write path for disposable
targets. It must not fall back to ambient `gh` auth or `process.env`, and it
must not add merge, deploy, production `main`, secret access, or live memory
write behavior. No real PR should be created unless the owner separately
approves a manual disposable smoke for a fresh `run_id`.
