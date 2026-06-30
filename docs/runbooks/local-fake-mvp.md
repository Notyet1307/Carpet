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
```

The command prints a one-line JSON summary. The accepted happy path includes:

```json
{
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
pnpm mvp:local | tee .mcr/runs/local-fake-mvp/summary.log
test -f .mcr/runs/local-fake-mvp/runtime-store.snapshot.json
node -e 'const fs=require("fs"); const s=JSON.parse(fs.readFileSync(".mcr/runs/local-fake-mvp/runtime-store.snapshot.json","utf8")); const lines=fs.readFileSync(".mcr/runs/local-fake-mvp/summary.log","utf8").trim().split(/\n/); const summary=JSON.parse(lines.at(-1)); const out={task_state:s.tasks?.[0]?.state, proof_status:s.proof_refs?.[0]?.status, approval_status:s.approval_refs?.[0]?.status, pr_count:(s.artifact_refs||[]).filter((a)=>a.kind==="pr").length, memory_status:summary.memory_status}; console.log(JSON.stringify(out,null,2)); if(out.task_state!=="completed"||out.proof_status!=="verified"||out.approval_status!=="consumed"||out.pr_count!==1||out.memory_status!=="proposed") process.exit(1);'
pnpm test:contracts
pnpm schemas:validate
git diff --check
```

The snapshot is the Runtime Store proof artifact. The memory proposal status is
parsed from the `pnpm mvp:local` summary stdout captured in
`.mcr/runs/local-fake-mvp/summary.log`; the snapshot keeps Runtime task/proof/
approval/artifact refs and does not persist a live memory write.

## No-Go Conditions

Treat the run as NO-GO if any of these happens:

- `pnpm mvp:local` exits non-zero.
- `.mcr/runs/local-fake-mvp/runtime-store.snapshot.json` is missing.
- The snapshot cannot be parsed as JSON.
- The summary is not `task_state=completed`, `proof_status=verified`,
  `approval_status=consumed`, `pr_count=1`, and `memory_status=proposed` in the
  command stdout.
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

It does not prove or authorize:

- Production MVP readiness.
- Real Matrix, Codex, GitHub, DB/Postgres, or live memory integration.
- Real-service smoke coverage.
- GitHub adapter authorization or further GitHub adapter backlog work.
- Merge, deploy, production `main` writes, token/env dumps, or secret reads.

## Next Step

MCR-1059 completed as a read-only GO audit of this runbook and the existing
command. The next recommended task is MCR-1061 Local Fake MVP Root Command
Evidence Artifact Design: a docs-only/read-only or design-only decision on
whether `pnpm mvp:local` should directly write `summary.log`, `summary.json`, or
a handoff evidence artifact. It should not implement new code.
