import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadJsonFile } from "../../../packages/runtime-contracts/src/index.ts";

import {
  FakeMatrixProjectionAdapter,
  type MatrixProjectionContent,
} from "../src/projection-adapter.ts";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const roomId = "!agent-runtime:carpet.test";

test("accepts safe task.accepted, proof.submitted, and incident.created projection summaries", () => {
  const adapter = new FakeMatrixProjectionAdapter();

  for (const [fixturePath, eventType] of [
    [
      "fixtures/matrix-events/valid/task.accepted.valid.json",
      "com.notyet.agent.task.accepted",
    ],
    [
      "fixtures/matrix-events/valid/proof.submitted.valid.json",
      "com.notyet.agent.proof.submitted",
    ],
    [
      "fixtures/matrix-events/valid/incident.created.valid.json",
      "com.notyet.agent.incident.created",
    ],
  ] as const) {
    const content = readFixture(fixturePath);
    const record = adapter.project({ room_id: roomId, content });

    assert.equal(record.room_id, roomId);
    assert.equal(record.event_type, eventType);
    assert.equal(record.idempotency_key, content.idempotency_key);
    assert.deepEqual(record.content, content);
  }

  assert.deepEqual(
    adapter.records.map((record) => record.event_type),
    [
      "com.notyet.agent.task.accepted",
      "com.notyet.agent.proof.submitted",
      "com.notyet.agent.incident.created",
    ],
  );
});

test("rejects raw validation logs, raw inbound event bodies, and raw diff bodies", () => {
  const adapter = new FakeMatrixProjectionAdapter();

  for (const [fixturePath, fieldPath] of [
    [
      "fixtures/matrix-events/invalid/verification.completed.raw-validation-logs.invalid.json",
      "data.raw_validation_logs",
    ],
    [
      "fixtures/matrix-events/invalid/incident.created.raw-inbound-event-body.invalid.json",
      "data.raw_inbound_event_body",
    ],
    [
      "fixtures/matrix-events/invalid/artifact.submitted.raw-diff-body.invalid.json",
      "data.diff_body",
    ],
  ] as const) {
    assert.throws(
      () =>
        adapter.project({ room_id: roomId, content: readFixture(fixturePath) }),
      new RegExp(`Unsafe projection field: ${fieldPath}`),
    );
  }

  assert.equal(adapter.records.length, 0);
});

test("records idempotency keys for repeated projection requests", () => {
  const adapter = new FakeMatrixProjectionAdapter();
  const firstContent = readFixture(
    "fixtures/matrix-events/valid/proof.submitted.valid.json",
  );
  const secondContent = structuredClone(firstContent);
  secondContent.id = "evt_20260627_009_repeat";

  adapter.project({ room_id: roomId, content: firstContent });
  adapter.project({ room_id: roomId, content: secondContent });

  assert.deepEqual(
    adapter.records.map((record) => record.idempotency_key),
    ["proof:proof_20260627_001", "proof:proof_20260627_001"],
  );
});

function readFixture(relativePath: string): MatrixProjectionContent {
  return loadJsonFile(path.join(root, relativePath)) as MatrixProjectionContent;
}
