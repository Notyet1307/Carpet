# Local Fake MVP Root Command Runbook

Task: MCR-1058 Local Fake MVP Root Command Acceptance/Runbook Closeout

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

## Evidence Artifact Design Status

MCR-1061 recommends that a future implementation make `pnpm mvp:local` write an
ignored generated JSON summary at:

```text
.mcr/runs/local-fake-mvp/summary.json
```

That future artifact should sit beside
`.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` and contain only stable
summary fields: command, generated time, snapshot path, task id/state,
transition count, proof status, approval status, PR count, memory status,
`fake_only=true`, and short validation notes.

MCR-1062 implements this artifact. Minimum Acceptance now validates
`summary.json` and the snapshot with `node -e`, without relying on `tee` or
`summary.log`.

## No-Go Conditions

Treat the run as NO-GO if any of these happens:

- `pnpm mvp:local` exits non-zero.
- `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` is missing.
- `.mcr/runs/local-fake-mvp/summary.json` is missing.
- The snapshot cannot be parsed as JSON.
- The summary cannot be parsed as JSON.
- The summary is not `task_state=completed`, `proof_status=verified`,
  `approval_status=consumed`, `pr_count=1`, `memory_status=proposed`, and
  `fake_only=true` in `summary.json`.
- `pnpm test:contracts`, `pnpm schemas:validate`, or `git diff --check` fails.

## Cleanup

`.mcr/runs/local-fake-mvp/` is ignored generated output. It may be deleted after
review:

```bash
rm -rf .mcr/runs/local-fake-mvp/
```

Do not clean source files, docs, schemas, fixtures, package files, or runtime
code as part of this generated-output cleanup.

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
command. MCR-1061 completed the docs/design decision, and MCR-1062 implements
the ignored generated `.mcr/runs/local-fake-mvp/summary.json` artifact beside
the existing snapshot.
