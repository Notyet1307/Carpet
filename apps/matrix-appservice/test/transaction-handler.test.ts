import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createSchemaValidator,
  loadJsonFile,
  loadJsonSchema,
} from "../../../packages/runtime-contracts/src/index.ts";

import {
  createFixtureTransactionHandler,
  FakeRuntimeEventQueue,
  IdempotencyStore,
} from "../src/transaction-handler.ts";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const runtimeEventValidator = createSchemaValidator(
  loadJsonSchema(path.join(root, "schemas/runtime/runtime-event.schema.json")),
);

function readFixture(name: string) {
  return loadJsonFile(
    path.join(root, "fixtures/matrix-transactions", `${name}.json`),
  ) as MatrixTransactionFixture;
}

function buildHandler(preexisting?: MatrixTransactionFixture["preexisting"]) {
  const queue = new FakeRuntimeEventQueue();
  const handler = createFixtureTransactionHandler({
    idempotencyStore: new IdempotencyStore(preexisting),
    runtimeEventQueue: queue,
  });

  return { handler, queue };
}

test("success fixture enqueues one schema-valid runtime event", () => {
  const fixture = readFixture("success");
  const { handler, queue } = buildHandler(fixture.preexisting);

  const outcome = handler.handle(fixture.request);

  assert.deepEqual(outcome.response, fixture.expected.response);
  assert.equal(queue.events.length, 1);
  assert.deepEqual(runtimeEventValidator(queue.events[0]), {
    valid: true,
    errors: [],
  });
  assert.equal(queue.events[0]?.event_type, "runtime.intent.received");
  assert.equal(queue.events[0]?.actor.id, "@yet:carpet.test");
  assert.equal(queue.events[0]?.source_of_truth, "runtime");
});

test("invalid hs_token rejects before Matrix content parsing", () => {
  const fixture = readFixture("invalid-hs-token");
  const { handler, queue } = buildHandler(fixture.preexisting);
  let bodyRead = false;

  const request = {
    params: fixture.request.params,
    headers: fixture.request.headers,
    get body() {
      bodyRead = true;
      throw new Error("Matrix content was parsed before hs_token auth");
    },
  } as unknown as MatrixTransactionFixture["request"];

  const outcome = handler.handle(request);

  assert.deepEqual(outcome.response, fixture.expected.response);
  assert.equal(outcome.committed, false);
  assert.equal(bodyRead, false);
  assert.equal(queue.events.length, 0);
});

test("duplicate transaction and duplicate event enqueue no second runtime event", () => {
  for (const name of ["duplicate-transaction", "duplicate-event"]) {
    const fixture = readFixture(name);
    const { handler, queue } = buildHandler(fixture.preexisting);

    const outcome = handler.handle(fixture.request);

    assert.deepEqual(outcome.response, fixture.expected.response);
    assert.equal(queue.events.length, 0);
    assert.equal(outcome.runtimeEvents.length, 0);
  }
});

test("invalid schema and unknown room enqueue no runtime task work", () => {
  for (const name of ["invalid-schema", "unknown-room"]) {
    const fixture = readFixture(name);
    const { handler, queue } = buildHandler(fixture.preexisting);

    const outcome = handler.handle(fixture.request);

    assert.deepEqual(outcome.response, fixture.expected.response);
    assert.equal(queue.events.length, 0);
    assert.equal(outcome.runtimeEvents.length, 0);
    assert.equal(outcome.failureEvents.length, 1);
    assert.equal(outcome.failureEvents[0]?.enqueue.status, "not_queued");
    assert.deepEqual(runtimeEventValidator(outcome.failureEvents[0]), {
      valid: true,
      errors: [],
    });
  }
});

test("Matrix sender provenance wins over spoofed actor content", () => {
  const fixture = readFixture("spoofed-actor");
  const { handler, queue } = buildHandler(fixture.preexisting);

  handler.handle(fixture.request);

  assert.equal(queue.events.length, 1);
  assert.equal(queue.events[0]?.actor.id, "@mallory:carpet.test");
  assert.equal(queue.events[0]?.actor.derived_from, "matrix.sender");
  assert.equal(queue.events[0]?.actor.claimed_actor?.id, "@yet:carpet.test");
  assert.equal(queue.events[0]?.actor.type, "matrix_user");
});

type MatrixTransactionFixture = {
  preexisting?: {
    processed_transaction_ids?: string[];
    processed_event_ids?: string[];
  };
  request: {
    params: { txn_id: string };
    headers: { authorization?: string };
    body: {
      events: unknown[];
    };
  };
  expected: {
    response: {
      status: number;
      body: { code: string; retryable: boolean };
    };
    committed: boolean;
    runtime_event_count: number;
    failure_event_count: number;
    outbound_projection_count: number;
  };
};
