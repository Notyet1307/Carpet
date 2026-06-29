# GitHub Disposable PR Smoke

## Status

Current status: NO-GO for real GitHub PR smoke.

MCR-730 is design-only. Do not run `gh pr create`, Octokit, push, merge, deploy,
secret access, or live memory write from this task.

Current blockers:

- The local preflight credential is not disposable/scoped. `gh auth status`
  shows a broad main-account credential with `repo` and `workflow` scope.
- The current PR path is fake/contract-only. `packages/github-adapter` exports
  `createFakeGitHubPrAdapter`, records in-memory `SimulatedPullRequest` objects,
  and has no real GitHub API, push, or merge implementation.

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

This is the future approved command shape only. Do not run it until every gate
above passes.

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

Future cleanup command shape:

```bash
GH_TOKEN="$MCR_GITHUB_DISPOSABLE_TOKEN" \
  gh pr close "$MCR_GITHUB_PR_URL" --delete-branch
```

Do not run cleanup from this design task. The command shape is here so the
future smoke can prove close/delete behavior after an approved run.

## Fake Adapter Boundary

The current fake adapter remains the default test path. It proves proof and
approval contracts only.

Do not treat `packages/github-adapter` as real GitHub integration until a
separate implementation task adds a guarded write path with tests, policy gates,
and explicit human approval.
