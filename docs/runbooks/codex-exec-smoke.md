# Codex Exec Smoke Runbook

## Status

Default: disabled.

MCR-310 real Codex exec smoke passed once on 2026-06-29. Tracked proof:
`fixtures/codex-smoke/MCR-310.real-codex-exec-smoke.txt` in commit
`8e17fafe3ae893bdd04cca7f4ac4d2a63cdb91f2`.

Run this only after the human owner approves one manual smoke run for a
disposable repo or fixture-only task. Do not use production secrets, production
data, GitHub PR creation, deploy automation, Matrix real-service integration, or
live memory writes.

## Command Contract

The runner builds this command shape:

```bash
codex exec \
  --json \
  --sandbox workspace-write \
  --output-schema ./schemas/codex/codex-exec-smoke-result.schema.json \
  -
```

The process cwd must be the task worktree path. The main checkout must be
rejected as cwd.

## Required Inputs

- `worktree_path`: isolated task worktree, not the main checkout.
- `main_checkout_path`: main repository checkout used only for rejection.
- `prompt_file`: task prompt passed on stdin.
- `evidence_dir`: per-run evidence directory.
- `smoke`: must be explicitly `true`.
- `manual_approval`: must show a human approved `codex_exec_smoke` for the same
  `run_id`.
- `credential_scope`: must be `disposable` or `scoped`.
- `env`: minimal explicit environment only. Do not forward `process.env`.

## Smoke Prompt Requirements

The task prompt passed in `prompt_file` must include this output contract:

```text
Machine output has priority over human-facing reply style.
The final output must be a JSON object matching `./schemas/codex/codex-exec-smoke-result.schema.json`.
AGENTS.md Chinese reply style and `杨哥` first-paragraph prefix apply only to human-facing chat, not to the `--output-schema` final machine output.
Do not include human-facing prose, Markdown, `杨哥`, or any text outside the final JSON object.
After creating and validating the target file, immediately emit the final JSON object and exit.
```

## Evidence Paths

For `evidence_dir=.mcr/runs/<run_id>`, record these refs before execution:

- `.mcr/runs/<run_id>/codex-exec.jsonl`
- `.mcr/runs/<run_id>/repo-patch-result.json`
- `.mcr/runs/<run_id>/validation.log`
- `.mcr/runs/<run_id>/diff.patch`
- `.mcr/runs/<run_id>/proof.json`

## Manual Smoke Steps

1. Confirm the task is disposable and low risk.
2. Confirm the worktree path is not the main checkout.
3. Create the task prompt file under the run evidence directory, including the
   Smoke Prompt Requirements output contract above.
4. Record explicit human approval for this `run_id` and credential scope.
5. Call `runCodexExecSmoke` with `smoke: true` and an injected process runner.
6. Pass only a minimal explicit environment, such as `PATH`.
7. Capture stdout JSONL, final output, validation log, diff, and proof refs.
8. Validate final output against
   `./schemas/codex/codex-exec-smoke-result.schema.json`.
9. Stop before PR creation, push, merge, deploy, Matrix real-service writes, or
   memory writes.

## Refusal Conditions

The runner must refuse when:

- `smoke` is not explicitly `true`;
- cwd resolves to the main checkout or any descendant path;
- any provided environment key or value appears secret-bearing;
- human approval is missing, not approved, not for `codex_exec_smoke`, or for a
  different `run_id`;
- `credential_scope` is not `disposable` or `scoped`;
- `env` is missing or empty;
- no process runner is injected for a manual smoke execution.

## Rollback

Remove the smoke runner file and this runbook. The fake worker runner remains
the default MVP path.
