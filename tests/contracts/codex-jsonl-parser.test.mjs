import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readJsonl(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function commandItems(events) {
  return events
    .map((event) => event.item)
    .filter((item) => item?.type === "command_execution");
}

function finalTurn(events) {
  return events.findLast((event) => event.type === "turn.completed");
}

test("success JSONL captures thread start, command execution, and completed turn", () => {
  const events = readJsonl("fixtures/codex-jsonl/success.jsonl");
  const commands = commandItems(events);

  assert.equal(events[0].type, "thread.started");
  assert.equal(finalTurn(events).status, "completed");
  assert.deepEqual(commands, [
    {
      id: "item_cmd_contracts",
      type: "command_execution",
      command: "pnpm test:contracts",
      exit_code: 0,
      status: "completed",
      summary: "Contract tests passed.",
    },
  ]);
});

test("failure JSONL preserves failed command evidence and error event", () => {
  const events = readJsonl("fixtures/codex-jsonl/failure.jsonl");

  assert.equal(commandItems(events)[0].exit_code, 1);
  assert.deepEqual(
    events.filter((event) => event.type === "error").map((event) => event.code),
    ["command_failed"],
  );
  assert.equal(finalTurn(events).status, "failed");
});

test("blocked JSONL records a blocked turn without command success", () => {
  const events = readJsonl("fixtures/codex-jsonl/blocked.jsonl");
  const turn = finalTurn(events);

  assert.equal(events[0].type, "thread.started");
  assert.equal(commandItems(events).length, 0);
  assert.equal(turn.status, "blocked");
  assert.equal(turn.reason, "Required worktree path is missing.");
});
