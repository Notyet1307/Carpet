import { deepEqual, equal, match } from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { runFakeCodexWorker } from "../src/index.ts";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

test("replays success JSONL and valid final output", () => {
  const finalOutput = readJson("fixtures/codex/valid/repo-patch-result.valid.json");

  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/success.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/success",
    final_output: finalOutput,
    final_output_artifact_ref: "artifact://codex/final-output/success",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "success");
  equal(result.ready_for_review, true);
  deepEqual(result.artifact_refs, {
    jsonl: "artifact://codex-jsonl/success",
    final_output: "artifact://codex/final-output/success",
  });
  deepEqual(result.command_results, [
    {
      command: "pnpm test:contracts",
      exit_code: 0,
      status: "completed",
      summary: "Contract tests passed.",
      log_ref: "artifact://codex-jsonl/success#item_cmd_contracts",
    },
  ]);
});

test("maps failure JSONL to failed worker result", () => {
  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/failure.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/failure",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "failed");
  equal(result.ready_for_review, false);
  deepEqual(result.command_results.map(({ command, exit_code }) => ({ command, exit_code })), [
    { command: "pnpm test:contracts", exit_code: 1 },
  ]);
  match(result.reason, /Validation command exited with code 1/);
});

test("maps blocked JSONL to blocked result that needs human input", () => {
  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/blocked.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/blocked",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "blocked");
  equal(result.ready_for_review, false);
  equal(result.needs_human_input, true);
  match(result.reason, /Required worktree path is missing/);
});

test("rejects success output missing validation evidence", () => {
  const finalOutput = {
    ...readJson("fixtures/codex/valid/repo-patch-result.valid.json"),
    validation_results: [],
  };

  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/success.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/success",
    final_output: finalOutput,
    final_output_artifact_ref: "artifact://codex/final-output/missing-validation",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "malformed");
  equal(result.ready_for_review, false);
  match(result.reason, /final output failed schema validation/);
});

test("rejects forbidden path changes outside prompt text", () => {
  const finalOutput = {
    ...readJson("fixtures/codex/valid/repo-patch-result.valid.json"),
    files_changed: [{ path: ".env.local", action: "modified" }],
  };

  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/success.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/success",
    final_output: finalOutput,
    final_output_artifact_ref: "artifact://codex/final-output/forbidden-path",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "failed");
  equal(result.ready_for_review, false);
  equal(result.code, "forbidden_path_change");
  match(result.reason, /\.env\.local matches \.env\*/);
});

test("rejects nested forbidden path globs", () => {
  const finalOutput = {
    ...readJson("fixtures/codex/valid/repo-patch-result.valid.json"),
    files_changed: [{ path: "secrets/prod/token.txt", action: "modified" }],
  };

  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/success.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/success",
    final_output: finalOutput,
    final_output_artifact_ref: "artifact://codex/final-output/forbidden-secret",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "failed");
  equal(result.code, "forbidden_path_change");
  match(result.reason, /secrets\/prod\/token\.txt matches secrets\/\*\*/);
});

test("distinguishes malformed final output fixture", () => {
  const result = runFakeCodexWorker({
    jsonl: readText("fixtures/codex-jsonl/success.jsonl"),
    jsonl_artifact_ref: "artifact://codex-jsonl/success",
    final_output: readJson(
      "fixtures/codex/invalid/repo-patch-result.missing-status.invalid.json",
    ),
    final_output_artifact_ref: "artifact://codex/final-output/missing-status",
    forbidden_paths: [".env*", "secrets/**"],
  });

  equal(result.status, "malformed");
  equal(result.ready_for_review, false);
});

function readText(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath: string) {
  return JSON.parse(readText(relativePath)) as unknown;
}
