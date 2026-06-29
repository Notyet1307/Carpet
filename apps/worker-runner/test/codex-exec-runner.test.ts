import { deepEqual, equal, match } from "node:assert/strict";
import test from "node:test";

import {
  buildCodexExecCommand,
  runCodexExecSmoke,
} from "../src/index.ts";

const mainCheckoutPath = "/Users/yet/Test_drive_sales/Carpet";
const worktreePath =
  "/Users/yet/Test_drive_sales/.worktrees/Carpet/MCR-310-codex-exec-smoke-runner";

const smokeInput = {
  task_id: "MCR-310",
  run_id: "run_mcr_310_smoke",
  worktree_path: worktreePath,
  main_checkout_path: mainCheckoutPath,
  prompt_file: ".mcr/runs/run_mcr_310_smoke/task.md",
  evidence_dir: ".mcr/runs/run_mcr_310_smoke",
};

test("builds codex exec command with worktree cwd and required CLI flags", () => {
  const command = buildCodexExecCommand(smokeInput);

  equal(command.executable, "codex");
  equal(command.cwd, worktreePath);
  deepEqual(command.args, [
    "exec",
    "--json",
    "--sandbox",
    "workspace-write",
    "--output-schema",
    "./schemas/codex/repo-patch-result.schema.json",
    "-",
  ]);
  equal(command.stdin_file, ".mcr/runs/run_mcr_310_smoke/task.md");
});

test("refuses to run without explicit smoke flag", async () => {
  let called = false;
  const result = await runCodexExecSmoke(
    {
      ...smokeInput,
      smoke: false,
    },
    async () => {
      called = true;
      return { exit_code: 0, stdout: "", stderr: "" };
    },
  );

  equal(result.status, "blocked");
  equal(result.executed, false);
  equal(result.code, "explicit_smoke_flag_required");
  equal(called, false);
});

test("rejects main checkout cwd", async () => {
  let called = false;
  const result = await runCodexExecSmoke(
    {
      ...smokeInput,
      smoke: true,
      worktree_path: mainCheckoutPath,
    },
    async () => {
      called = true;
      return { exit_code: 0, stdout: "", stderr: "" };
    },
  );

  equal(result.status, "blocked");
  equal(result.executed, false);
  equal(result.code, "main_checkout_cwd_rejected");
  match(result.reason, /main checkout/);
  equal(called, false);
});

test("rejects main checkout descendant cwd", async () => {
  let called = 0;
  const result = await runCodexExecSmoke(
    {
      ...smokeInput,
      smoke: true,
      worktree_path: `${mainCheckoutPath}/apps/worker-runner`,
    },
    async () => {
      called += 1;
      return { exit_code: 0, stdout: "", stderr: "" };
    },
  );

  equal(result.status, "blocked");
  equal(result.executed, false);
  equal(result.code, "main_checkout_cwd_rejected");
  equal(called, 0);
});

test("rejects secret-bearing env", async () => {
  let called = false;
  const result = await runCodexExecSmoke(
    {
      ...smokeInput,
      smoke: true,
      env: {
        PATH: "/usr/bin:/bin",
        OPENAI_API_KEY: "sk-proj-not-for-smoke",
      },
    },
    async () => {
      called = true;
      return { exit_code: 0, stdout: "", stderr: "" };
    },
  );

  equal(result.status, "blocked");
  equal(result.executed, false);
  equal(result.code, "secret_env_rejected");
  deepEqual(result.errors, ["OPENAI_API_KEY"]);
  equal(called, false);
});

test("records intended evidence refs without executing real Codex", async () => {
  const result = await runCodexExecSmoke({
    ...smokeInput,
    smoke: false,
  });

  equal(result.executed, false);
  deepEqual(result.evidence_refs, {
    jsonl: ".mcr/runs/run_mcr_310_smoke/codex-exec.jsonl",
    final_output: ".mcr/runs/run_mcr_310_smoke/repo-patch-result.json",
    validation_log: ".mcr/runs/run_mcr_310_smoke/validation.log",
    diff: ".mcr/runs/run_mcr_310_smoke/diff.patch",
    proof: ".mcr/runs/run_mcr_310_smoke/proof.json",
  });
  equal(result.command.cwd, worktreePath);
});

test("uses an injected process runner for approved manual smoke", async () => {
  const result = await runCodexExecSmoke(
    {
      ...smokeInput,
      smoke: true,
      env: { PATH: "/usr/bin:/bin" },
    },
    async (command) => {
      equal(command.cwd, worktreePath);
      deepEqual(command.env, { PATH: "/usr/bin:/bin" });
      return { exit_code: 0, stdout: "{\"type\":\"turn.completed\"}\n", stderr: "" };
    },
  );

  equal(result.status, "completed");
  equal(result.executed, true);
  equal(result.exit_code, 0);
});
