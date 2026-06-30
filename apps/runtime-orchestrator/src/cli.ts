import { runRuntimeOrchestrator } from "./index.ts";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const snapshotPath = snapshotArg(process.argv.slice(2));

if (!snapshotPath) {
  console.error("usage: runtime-orchestrator --snapshot <path>");
  process.exitCode = 2;
} else {
  const result = await runRuntimeOrchestrator({ snapshotPath });
  const task = result.read_snapshot.tasks[0];
  const summary = {
    command: "pnpm mvp:local",
    generated_at: new Date().toISOString(),
    snapshot_path: result.snapshot_path,
    task_id: task?.task_id,
    task_state: task?.state,
    transition_count: result.read_snapshot.task_transitions.length,
    proof_status: result.read_snapshot.proof_refs[0]?.status,
    approval_status: result.read_snapshot.approval_refs[0]?.status,
    pr_count: result.prs.length,
    memory_status: result.memory_proposal.ok ? result.memory_proposal.status : "failed",
    fake_only: true,
    validation_notes: ["runtime snapshot written", "local fake adapters only"],
  };

  await writeFile(path.join(path.dirname(snapshotPath), "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary));
}

function snapshotArg(args: string[]): string | null {
  const index = args.indexOf("--snapshot");

  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}
