# Local Fake MVP Root Command Runbook

Task: MCR-1058 Local Fake MVP Root Command Acceptance/Runbook Closeout
Operator handoff supplement: MCR-1066

## Command

Run from the repository root:

```bash
pnpm mvp:local
```

Expected generated output:

```text
.mcr/runs/local-fake-mvp/runtime-store.snapshot.json
.mcr/runs/local-fake-mvp/summary.json
```

The command writes `summary.json` and prints the same one-line JSON summary.
The accepted happy path includes:

```json
{
  "command": "pnpm mvp:local",
  "fake_only": true,
  "task_state": "completed",
  "proof_status": "verified",
  "approval_status": "consumed",
  "pr_count": 1,
  "memory_status": "proposed"
}
```

## Minimum Acceptance

```bash
mkdir -p .mcr/runs/local-fake-mvp
pnpm mvp:local
test -f .mcr/runs/local-fake-mvp/runtime-store.snapshot.json
test -f .mcr/runs/local-fake-mvp/summary.json
node -e 'const fs=require("fs"); const snapshotPath=".mcr/runs/local-fake-mvp/runtime-store.snapshot.json"; const summaryPath=".mcr/runs/local-fake-mvp/summary.json"; const s=JSON.parse(fs.readFileSync(snapshotPath,"utf8")); const summary=JSON.parse(fs.readFileSync(summaryPath,"utf8")); const out={command:summary.command, snapshot_path:summary.snapshot_path, task_state:s.tasks?.[0]?.state, proof_status:s.proof_refs?.[0]?.status, approval_status:s.approval_refs?.[0]?.status, pr_count:(s.artifact_refs||[]).filter((a)=>a.kind==="pr").length, memory_status:summary.memory_status, fake_only:summary.fake_only}; console.log(JSON.stringify(out,null,2)); if(out.command!=="pnpm mvp:local"||out.snapshot_path!==snapshotPath||out.task_state!=="completed"||out.proof_status!=="verified"||out.approval_status!=="consumed"||out.pr_count!==1||out.memory_status!=="proposed"||out.fake_only!==true) process.exit(1);'
pnpm test:contracts
pnpm schemas:validate
git diff --check
```

The snapshot is the Runtime Store proof artifact. `summary.json` is the stable
handoff summary for the local fake run; the snapshot keeps Runtime task/proof/
approval/artifact refs and does not persist a live memory write.

## Operator Handoff Checklist

Run the single command from the repository root:

```bash
pnpm mvp:local
```

Confirm both ignored generated artifacts exist:

- `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`
- `.mcr/runs/local-fake-mvp/summary.json`

Copy/report these `summary.json` fields in handoff:

- `command`
- `snapshot_path`
- `task_id`
- `task_state`
- `transition_count`
- `proof_status`
- `approval_status`
- `pr_count`
- `memory_status`
- `fake_only`
- `validation_notes`

Copy/report this snapshot proof:

- `source_of_truth=runtime`
- task count and task state
- transition count
- proof ref status
- approval ref status and action
- artifact ref count and kinds
- PR artifact count

Decisive GO requires all of these:

- `command=pnpm mvp:local`
- `snapshot_path=.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`
- `task_id` is present and matches the snapshot task.
- `task_state=completed`
- `transition_count=14` and matches the snapshot transition count.
- `proof_status=verified`
- `approval_status=consumed`
- `pr_count=1`
- `memory_status=proposed`
- `fake_only=true`
- snapshot `source_of_truth=runtime`
- snapshot has 1 completed task.
- snapshot proof ref has `status=verified`.
- snapshot approval ref has `status=consumed` and `action=create_pr`.
- snapshot artifact refs include exactly one `kind=pr` artifact.

## Evidence Artifact Design Status

MCR-1061 decided that `pnpm mvp:local` should write an ignored generated JSON
summary at:

```text
.mcr/runs/local-fake-mvp/summary.json
```

MCR-1062 implemented this artifact in commit
`1d6225595191db3a59ffa05546c6aad59a2e7b7c`. It sits beside
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and contains only stable
summary fields: command, generated time, snapshot path, task id/state,
transition count, proof status, approval status, PR count, memory status,
`fake_only=true`, and short validation notes.

Minimum Acceptance validates `summary.json` and the snapshot with `node -e`,
without relying on `tee` or `summary.log`.

## No-Go Conditions

Treat the run as NO-GO if any of these happens:

- `pnpm mvp:local` exits non-zero.
- `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` is missing.
- `.mcr/runs/local-fake-mvp/summary.json` is missing.
- The snapshot cannot be parsed as JSON.
- The summary cannot be parsed as JSON.
- The summary is not `task_state=completed`, `proof_status=verified`,
  `approval_status=consumed`, `transition_count=14`, `pr_count=1`,
  `memory_status=proposed`, and `fake_only=true` in `summary.json`.
- `summary.snapshot_path` does not point to
  `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json`.
- `summary.task_id` is missing or does not match the snapshot task.
- The snapshot is not `source_of_truth=runtime`.
- The snapshot task count/state, transition count, proof ref status, approval ref
  status/action, artifact ref count/kinds, or PR artifact count does not match
  the decisive GO fields above.
- `pnpm test:contracts`, `pnpm schemas:validate`, or `git diff --check` fails.

## Artifact Retention / Cleanup Policy

`.mcr/runs/local-fake-mvp/*` is ignored generated evidence. Do not commit
`runtime-store.snapshot.json`, `summary.json`, or any other generated file from
that directory.

Keep `.mcr/runs/local-fake-mvp/` until commander review if the reviewer needs to
inspect the generated JSON artifacts. After review/closeout, it may be deleted:

```bash
rm -rf .mcr/runs/local-fake-mvp/
```

Do not clean source files, docs, schemas, fixtures, package files, or runtime
code as part of this generated-output cleanup.

Do not copy raw logs, raw diff, token/env material, secret values, or live memory
body content into handoff. If long-term retention is needed, keep only a short
summary in docs or handoff; do not preserve generated `.mcr/runs/local-fake-mvp/`
artifacts in git.

## Boundary

This runbook accepts only the local fake MVP root command.

It proves:

- The root command exists and runs from the repository root.
- The local fake Runtime path reaches completed task state.
- Verified proof, consumed approval, simulated PR artifact, and memory proposal
  summary are produced in the local fake flow.
- The Runtime Store snapshot can be parsed and inspected from `.mcr/runs/`.
- The generated `summary.json` can be parsed as the stable handoff summary.

It does not prove or authorize:

- Production MVP readiness.
- Real Matrix, Codex, GitHub, DB/Postgres, or live memory integration.
- Real-service smoke coverage.
- GitHub adapter authorization or further GitHub adapter backlog work.
- Merge, deploy, production `main` writes, token/env dumps, or secret reads.

## Next Step

MCR-1059 completed as a read-only GO audit of this runbook and the existing
command. MCR-1061 completed the docs/design decision, and MCR-1062 implemented
the ignored generated `.mcr/runs/local-fake-mvp/summary.json` artifact beside
the existing snapshot in commit `1d6225595191db3a59ffa05546c6aad59a2e7b7c`.
MCR-1064 then completed as a read-only GO audit on base commit
`1eb7d748ef72a9b29c16953ff7310fd00c9ad5e2`: `pnpm mvp:local` exited 0, both
ignored artifacts existed, `summary.json` reported completed/verified/consumed
local fake state with `transition_count=14`, `pr_count=1`, `memory_status=proposed`,
and `fake_only=true`, the snapshot reported `source_of_truth=runtime`, and
contract/schema validation stayed 84/84 with `git diff --check` passing.

MCR-1066 completed the docs-only operator handoff and artifact retention/cleanup
policy pass for the single-command local fake MVP. This runbook now names the
exact handoff fields, snapshot proof fields, decisive GO/NO-GO checks, and
ignored artifact retention/cleanup rules for `.mcr/runs/local-fake-mvp/`.

The next recommended task is MCR-1067, a read-only single-command
operator-friendliness audit: verify the root script alias, runbook command,
handoff fields, ignored artifact behavior, and cleanup wording still agree
without changing runtime/code/tests/schema/fixtures/package files.
Do not use this runbook, the MCR-1064 GO audit, or MCR-1066 as authorization for
real Matrix, Codex, GitHub, DB/Postgres, live memory, real-service smoke,
production readiness, or GitHub adapter expansion.
