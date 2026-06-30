# Evidence Retention And Cleanup Policy

## Status

MCR-930 policy artifact. This is documentation only: it does not move evidence,
run services, create cleanup automation, or delete existing `.mcr` evidence.

This policy applies to real and semi-real smoke evidence under:

```text
.mcr/runs/<run_id>/
```

`.mcr/` is local and gitignored. Treat it as the raw-evidence holding area, not
as checked-in proof.

## Rules

- Keep raw run evidence locally under `.mcr/runs/<run_id>/` until human review,
  cleanup review, and roadmap closeout are complete.
- Do not check in raw logs, raw diffs, raw Matrix bodies, raw environment dumps,
  token values, credential files, generated registrations, keychain output, or
  secret-bearing command output.
- Checked-in closeout docs may record only refs, paths, SHAs, exit codes,
  command shapes, redacted summaries, and cleanup status.
- Deleting disposable resources is required; deleting decisive evidence is not.
- Cleanup must be manual or explicitly approved for one run. Do not add scripts
  or default automation that deletes evidence.

## Evidence Classes

### Keep Local In `.mcr/runs/<run_id>/`

Keep these as local review evidence when produced:

- Codex JSONL stream, for example `codex-exec.jsonl`.
- Codex final JSON, for example `repo-patch-result.json`.
- `diff.patch` and `validation.log`.
- `proof.json` and runner command metadata.
- Matrix listener, Synapse, container, and transaction logs.
- GitHub CLI/API command output, PR creation proof, PR close proof, branch
  deletion proof, and ruleset/protection proof.
- Cleanup proof: command shapes, exit codes, no-listener checks, PR closed
  state, branch-missing checks, generated-file removal checks, and credential
  revocation summaries.
- PR body files generated for a disposable smoke, if they are needed to review
  what was sent.
- Raw diffs, raw patches, `diff.patch`, and GitHub patch/diff payloads. These
  are local-only review evidence and must not enter tracked git.

Local retention does not make these files safe to publish. Reviewers may inspect
them locally, but closeout docs must cite their path or summarized result rather
than copying raw bodies.

### Summarize Only In Tracked Git

Tracked docs may include:

- `run_id`, task id, approval id, proof id.
- worktree path, branch, base SHA, head SHA.
- evidence directory path.
- command shape without secret values.
- explicit environment key names, not values.
- exit codes and validation command results.
- PR URL, PR number, PR state, branch names, branch deletion status, and
  relevant SHAs.
- Matrix resource names, listener port checks, and transaction status summary.
- cleanup status and rollback rationale.

Closeout docs must not copy large raw bodies. Use short summaries and artifact
refs.

### Delete Or Revoke During Cleanup

Remove or revoke resources created only for the run:

- generated credentials, access tokens, registration files, `listener.env`, and
  temporary `GH_CONFIG_DIR` contents;
- disposable rooms, appservice identities, generated appservice registrations,
  local homeserver data, local containers, and local listeners;
- disposable GitHub PRs when the run requires closure, disposable base/head
  branches, temporary PR body files that are no longer needed locally, and
  non-decisive local patch/diff working copies after preserving non-secret refs
  or summaries;
- accidental raw environment dumps or token-bearing logs, after recording a
  redacted incident summary and preserving enough non-secret proof to explain
  the deletion.

Do not delete `.mcr/runs/<run_id>/` wholesale during task handoff. Keep decisive
proof until the human owner explicitly marks the run reviewed and disposable.

### May Be Checked In

Only these proof-shaped artifacts may be checked in:

- runbooks, analysis docs, and roadmap closeout text;
- synthetic fixtures and contract examples with fake values;
- small closeout files that contain only refs, SHAs, exit codes, command shapes,
  and redacted summaries;
- reviewed and redacted small PR body summaries or body text only when they
  contain no raw patch, raw diff, raw API payload, secret, or large log.

If in doubt, keep the artifact local and check in a path plus summary.

## Artifact-Specific Rules

### Codex Exec

- Raw JSONL stays local in `.mcr/runs/<run_id>/codex-exec.jsonl`.
- Final JSON stays local unless it contains only schema-safe, non-secret summary
  fields.
- `diff.patch` is local-only and must not enter tracked git. A checked-in doc
  may cite the file path, affected file list, SHAs, summary, exit code, and
  validation status, but must not copy patch body.
- `validation.log` stays local when it is long or raw. A checked-in doc may cite
  command names, exit codes, and pass/fail counts.
- Record environment key names such as `PATH` or `CODEX_HOME`; never record
  environment values or inherited environment dumps.

### Matrix And Synapse

- Listener, Synapse, Docker, container, and transaction logs stay local.
- Raw Matrix event bodies and access tokens must not enter tracked git.
- Generated appservice registrations, `listener.env`, generated tokens, and
  local homeserver data are cleanup targets.
- Checked-in docs may record room/user/resource names, run id, transaction
  status, listener port, no-listener proof, and cleanup status.

### GitHub PR Smoke

- Raw GitHub API payloads, token-bearing CLI output, credential files, and
  temporary auth config stay out of tracked git.
- PR URL, PR number, repo, base/head branch names, SHAs, PR state, merge state,
  ruleset summary, and branch deletion proof may be summarized.
- Raw patches, raw diffs, and GitHub patch/diff payloads are local-only and must
  not enter tracked git.
- Reviewed and redacted small PR body summaries or body text may be checked in
  only when they contain no raw patch, raw diff, raw API payload, secret, or
  large log.
- Cleanup proof must show whether the PR was closed, whether it was unmerged,
  whether disposable branches were deleted, and whether production `main` was
  unchanged.

## Cleanup Proof Required

Every approved real or semi-real smoke handoff must state:

- what disposable resources were created;
- what was stopped, removed, closed, deleted, or revoked;
- what decisive evidence remains locally under `.mcr/runs/<run_id>/`;
- what was intentionally deleted because it was a credential, generated secret,
  disposable runtime resource, or accidental secret-bearing capture;
- exit codes or concise proof for cleanup commands;
- whether any cleanup item is incomplete and why.

Cleanup proof is itself evidence. Keep the redacted cleanup proof locally and
summarize it in tracked docs or handoff.
