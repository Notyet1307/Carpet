# Local Fake MVP Evidence Artifact Design

Task: MCR-1061 Local Fake MVP Root Command Evidence Artifact Design

## Decision

GO: `pnpm mvp:local` should write one stable generated JSON evidence artifact:

```text
.mcr/runs/local-fake-mvp/summary.json
```

Do not check this file in. It is ignored generated run output under `.mcr/`.

`summary.json` is preferable to `summary.log` because the runbook needs stable
machine-readable evidence, not stdout capture. Keep stdout as operator feedback,
but do not make `tee` part of the long-term acceptance path.

Do not introduce a separate handoff evidence record for the local fake root
command now. `summary.json` plus the existing Runtime Store snapshot is the
smallest useful handoff surface.

## Implementation Status

MCR-1062 completed this design and merged in commit
`1d6225595191db3a59ffa05546c6aad59a2e7b7c`. `pnpm mvp:local` now writes both
ignored generated artifacts:

```text
.mcr/runs/local-fake-mvp/runtime-store.snapshot.json
.mcr/runs/local-fake-mvp/summary.json
```

`summary.json` is the stable handoff summary and matches the structured JSON
summary printed to stdout. It is not `summary.log`, and validation no longer
requires `tee`.

## Artifact Path

The root command writes:

```text
.mcr/runs/local-fake-mvp/summary.json
```

It also writes the existing snapshot beside it:

```text
.mcr/runs/local-fake-mvp/runtime-store.snapshot.json
```

The shared directory keeps one local fake MVP run's evidence together and stays
covered by the existing `.mcr/` ignore rule.

## Minimum Shape

Recommended minimum JSON fields:

```json
{
  "command": "pnpm mvp:local",
  "generated_at": "2026-06-30T00:00:00.000Z",
  "snapshot_path": ".mcr/runs/local-fake-mvp/runtime-store.snapshot.json",
  "task_id": "mcr-local-fake-mvp",
  "task_state": "completed",
  "transition_count": 1,
  "proof_status": "verified",
  "approval_status": "consumed",
  "pr_count": 1,
  "memory_status": "proposed",
  "fake_only": true,
  "validation_notes": [
    "local fake MVP only",
    "no real Matrix/Codex/GitHub/DB/live-memory calls"
  ]
}
```

Field rules:

- `command` is the stable root command string.
- `generated_at` is an ISO timestamp generated at write time.
- `snapshot_path` is repo-relative and points to the sibling snapshot.
- `task_id`, `task_state`, and `transition_count` summarize Runtime task state.
- `proof_status`, `approval_status`, `pr_count`, and `memory_status` summarize
  refs and outcomes only.
- `fake_only` must be `true` for this command.
- `validation_notes` should be short, bounded strings for reviewer context.

If this artifact later needs a schema, that is a separate contract task.
MCR-1061 did not add schemas, fixtures, tests, package changes, or command
behavior; MCR-1062 implemented only the narrow generated artifact behavior.

## Redaction Boundary

`summary.json` must never store:

- raw Matrix event bodies
- worker stdout or stderr
- raw diffs or raw logs
- token values, env dumps, credentials, or secrets
- live memory bodies
- GitHub API response bodies
- production service identifiers beyond stable fake/local labels

The artifact may store counts, statuses, ids, and repo-relative artifact refs.
It should be derived from Runtime-owned state and the local fake command result,
not from Matrix, GitHub, live memory, or raw worker output as a source of truth.

## Runbook Validation

After MCR-1062, the runbook no longer requires
`tee .mcr/runs/local-fake-mvp/summary.log` for acceptance.

Validation should read both generated JSON files:

```bash
pnpm mvp:local
test -f .mcr/runs/local-fake-mvp/runtime-store.snapshot.json
test -f .mcr/runs/local-fake-mvp/summary.json
node -e 'const fs=require("fs"); const summary=JSON.parse(fs.readFileSync(".mcr/runs/local-fake-mvp/summary.json","utf8")); const snapshot=JSON.parse(fs.readFileSync(summary.snapshot_path,"utf8")); const out={task_state:summary.task_state, proof_status:summary.proof_status, approval_status:summary.approval_status, pr_count:summary.pr_count, memory_status:summary.memory_status, fake_only:summary.fake_only, snapshot_tasks:Array.isArray(snapshot.tasks)}; console.log(JSON.stringify(out,null,2)); if(out.task_state!=="completed"||out.proof_status!=="verified"||out.approval_status!=="consumed"||out.pr_count!==1||out.memory_status!=="proposed"||out.fake_only!==true||out.snapshot_tasks!==true) process.exit(1);'
pnpm test:contracts
pnpm schemas:validate
git diff --check
```

## Non-Authorization

This design did not itself authorize implementation, and MCR-1062 did not
authorize anything beyond the local fake generated artifact. It still does not
authorize:

- additional `summary.json` behavior beyond the MCR-1062 local fake artifact
- changing `pnpm mvp:local` beyond the completed local fake summary output
- changing package files, runtime, apps, workers, schemas, fixtures, or tests
- real Matrix, real Codex, real GitHub, DB/Postgres, or live memory
- GitHub adapter expansion, PR creation, merge, deploy, production `main`
  writes, token/env dumps, or secret reads

## Next Step

MCR-1064 completed as a read-only GO audit on base commit
`1eb7d748ef72a9b29c16953ff7310fd00c9ad5e2`. It reran `pnpm mvp:local`,
confirmed the ignored snapshot and `summary.json`, verified the local fake
summary fields and Runtime-owned snapshot counts, found zero active MCR-1062
next-step stale refs, kept `pnpm test:contracts` and `pnpm schemas:validate` at
84/84, passed `git diff --check`, and left no tracked changes in the audit
worktree.

The next recommended task is MCR-1066, a docs/read-only operator handoff and
artifact retention/cleanup policy pass for `.mcr/runs/local-fake-mvp/`. It
should not change command behavior, schemas, fixtures, tests, package files,
runtime code, real-service integrations, or GitHub adapter scope.
