import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const hsToken = "hs_test_carpet";
const roomMap = new Map([
  ["!agent-intake:carpet.test", "ws_carpet"],
  ["!agent-runtime:carpet.test", "ws_carpet"],
]);

const fixturePaths = [
  "fixtures/matrix-transactions/success.json",
  "fixtures/matrix-transactions/duplicate-transaction.json",
  "fixtures/matrix-transactions/duplicate-event.json",
  "fixtures/matrix-transactions/invalid-schema.json",
  "fixtures/matrix-transactions/spoofed-actor.json",
  "fixtures/matrix-transactions/unknown-room.json",
  "fixtures/matrix-transactions/failure-reply.json",
  "fixtures/matrix-transactions/invalid-hs-token.json",
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  for (const schemaPath of [
    "schemas/matrix/event-envelope.schema.json",
    "schemas/matrix/task.created.schema.json",
    "schemas/matrix/task.accepted.schema.json",
    "schemas/matrix/task.rejected.schema.json",
    "schemas/matrix/incident.created.schema.json",
    "schemas/runtime/runtime-event.schema.json",
  ]) {
    ajv.addSchema(readJson(schemaPath));
  }
  return ajv;
}

function eventTypeToSchemaId(eventType) {
  const name = eventType.replace("com.notyet.agent.", "");
  return `https://notyet.dev/schemas/matrix/${name}.schema.json`;
}

function initialState(fixture) {
  return {
    processedTransactionIds: new Set(fixture.preexisting?.processed_transaction_ids ?? []),
    processedEventIds: new Set(fixture.preexisting?.processed_event_ids ?? []),
  };
}

function response(status, code, retryable = false) {
  return { status, body: { code, retryable } };
}

function runtimeEvent({ sourceEvent, workspaceId, eventType, actor, validation, enqueue }) {
  return {
    runtime_event_id: `rtevt_${sourceEvent.event_id.replace(/[^A-Za-z0-9_-]/g, "_")}_${eventType
      .split(".")
      .at(-1)}`,
    event_type: eventType,
    source_component: "matrix_appservice_gateway",
    source_of_truth: "runtime",
    workspace_id: workspaceId,
    task_id: sourceEvent.content?.task_id ?? null,
    trace_id: sourceEvent.content?.trace_id ?? `trace_matrix_${sourceEvent.event_id.replace(/[^A-Za-z0-9_-]/g, "_")}`,
    idempotency_key: `matrix:${sourceEvent.event_id}`,
    actor,
    matrix: {
      transaction_id: sourceEvent.transaction_id,
      event_id: sourceEvent.event_id,
      room_id: sourceEvent.room_id,
      sender: sourceEvent.sender,
      event_type: sourceEvent.type,
      claimed_actor: sourceEvent.content?.actor ?? null,
      room_mapping: {
        status: workspaceId ? "mapped" : "unknown_room",
      },
    },
    validation,
    enqueue,
    data: sourceEvent.content?.data ?? {},
  };
}

function projectionContent(kind, sourceEvent, workspaceId, reason) {
  const taskId = sourceEvent.content?.task_id ?? "task_rejected_matrix";
  const traceId = sourceEvent.content?.trace_id ?? "trace_rejected_matrix";
  const eventId = `evt_projection_${kind}_${sourceEvent.event_id.replace(/[^A-Za-z0-9_-]/g, "_")}`;

  if (kind === "accepted") {
    return {
      specversion: "1.0",
      id: eventId,
      source: "runtime://matrix-appservice-gateway",
      type: "com.notyet.agent.task.accepted",
      subject: taskId,
      time: "2026-06-28T00:00:00Z",
      datacontenttype: "application/json",
      workspace_id: workspaceId,
      task_id: taskId,
      trace_id: traceId,
      actor: { type: "runtime", id: "runtime_intake" },
      created_at: "2026-06-28T00:00:00Z",
      idempotency_key: `projection:${sourceEvent.event_id}:accepted`,
      data: {},
    };
  }

  return {
    specversion: "1.0",
    id: eventId,
    source: "runtime://matrix-appservice-gateway",
    type: "com.notyet.agent.task.rejected",
    subject: taskId,
    time: "2026-06-28T00:00:00Z",
    datacontenttype: "application/json",
    workspace_id: workspaceId,
    task_id: taskId,
    trace_id: traceId,
    actor: { type: "runtime", id: "runtime_intake" },
    created_at: "2026-06-28T00:00:00Z",
    idempotency_key: `projection:${sourceEvent.event_id}:rejected`,
    data: { reason },
  };
}

function processTransaction(fixture, ajv) {
  const state = initialState(fixture);
  const txnId = fixture.request.params.txn_id;
  const authorization = fixture.request.headers.authorization;

  if (authorization !== `Bearer ${hsToken}`) {
    return {
      response: response(401, "unauthorized"),
      runtimeEvents: [],
      failureEvents: [],
      outboundProjections: [],
      committed: false,
    };
  }

  if (state.processedTransactionIds.has(txnId)) {
    return {
      response: response(200, "duplicate_transaction"),
      runtimeEvents: [],
      failureEvents: [],
      outboundProjections: [],
      committed: true,
    };
  }

  if (fixture.runtime?.enqueue_available === false) {
    return {
      response: response(503, "runtime_enqueue_unavailable", true),
      runtimeEvents: [],
      failureEvents: [],
      outboundProjections: [],
      committed: false,
    };
  }

  const runtimeEvents = [];
  const failureEvents = [];
  const outboundProjections = [];

  for (const event of fixture.request.body.events) {
    event.transaction_id = txnId;

    if (state.processedEventIds.has(event.event_id)) {
      continue;
    }

    const workspaceId = roomMap.get(event.room_id) ?? null;
    if (!workspaceId) {
      failureEvents.push(
        runtimeEvent({
          sourceEvent: event,
          workspaceId,
          eventType: "runtime.incident.created",
          actor: {
            type: "matrix_user",
            id: event.sender,
            derived_from: "matrix.sender",
            claimed_actor: event.content?.actor ?? null,
          },
          validation: {
            status: "rejected",
            schema_id: null,
            errors: ["unknown Matrix room; no workspace mapping"],
          },
          enqueue: { status: "not_queued", target: "none" },
        }),
      );
      state.processedEventIds.add(event.event_id);
      continue;
    }

    const validate = ajv.getSchema(eventTypeToSchemaId(event.type));
    const isValid = Boolean(validate?.(event.content));
    if (!isValid) {
      const reason = "Matrix event content failed schema validation";
      failureEvents.push(
        runtimeEvent({
          sourceEvent: event,
          workspaceId,
          eventType: "runtime.intake.rejected",
          actor: {
            type: "matrix_user",
            id: event.sender,
            derived_from: "matrix.sender",
            claimed_actor: event.content?.actor ?? null,
          },
          validation: {
            status: "rejected",
            schema_id: eventTypeToSchemaId(event.type),
            errors: (validate?.errors ?? [{ message: "unsupported event type" }]).map(
              (error) => error.message,
            ),
          },
          enqueue: { status: "not_queued", target: "none" },
        }),
      );
      outboundProjections.push(projectionContent("rejected", event, workspaceId, reason));
      state.processedEventIds.add(event.event_id);
      continue;
    }

    runtimeEvents.push(
      runtimeEvent({
        sourceEvent: event,
        workspaceId,
        eventType: "runtime.intent.received",
        actor: {
          type: "matrix_user",
          id: event.sender,
          derived_from: "matrix.sender",
          claimed_actor: event.content.actor,
        },
        validation: {
          status: "accepted",
          schema_id: eventTypeToSchemaId(event.type),
          errors: [],
        },
        enqueue: { status: "queued", target: "runtime_intake" },
      }),
    );
    outboundProjections.push(projectionContent("accepted", event, workspaceId));
    state.processedEventIds.add(event.event_id);
  }

  state.processedTransactionIds.add(txnId);

  return {
    response: response(200, "ok"),
    runtimeEvents,
    failureEvents,
    outboundProjections,
    committed: true,
  };
}

test("transaction contract fixtures exist", () => {
  for (const fixturePath of fixturePaths) {
    assert.ok(readJson(fixturePath));
  }
});

test("runtime event schema is a valid JSON Schema", () => {
  const ajv = createAjv();

  assert.equal(
    ajv.validateSchema(readJson("schemas/runtime/runtime-event.schema.json")),
    true,
  );
});

for (const fixturePath of fixturePaths) {
  test(`${fixturePath} matches the gateway transaction contract`, () => {
    const ajv = createAjv();
    const fixture = readJson(fixturePath);
    const outcome = processTransaction(fixture, ajv);

    assert.deepEqual(outcome.response, fixture.expected.response);
    assert.equal(outcome.committed, fixture.expected.committed);
    assert.equal(outcome.runtimeEvents.length, fixture.expected.runtime_event_count);
    assert.equal(outcome.failureEvents.length, fixture.expected.failure_event_count);
    assert.equal(outcome.outboundProjections.length, fixture.expected.outbound_projection_count);

    const validateRuntimeEvent = ajv.getSchema(
      "https://notyet.dev/schemas/runtime/runtime-event.schema.json",
    );
    for (const event of [...outcome.runtimeEvents, ...outcome.failureEvents]) {
      assert.equal(
        validateRuntimeEvent(event),
        true,
        JSON.stringify(validateRuntimeEvent.errors, null, 2),
      );
      assert.equal(event.source_of_truth, "runtime");
      assert.notEqual(event.actor.type, "runtime");
    }

    for (const projection of outcome.outboundProjections) {
      const validateProjection = ajv.getSchema(eventTypeToSchemaId(projection.type));
      assert.equal(
        validateProjection(projection),
        true,
        JSON.stringify(validateProjection.errors, null, 2),
      );
      assert.equal(projection.actor.type, "runtime");
    }
  });
}

test("spoofed actor claims are bounded to Matrix sender provenance", () => {
  const ajv = createAjv();
  const outcome = processTransaction(
    readJson("fixtures/matrix-transactions/spoofed-actor.json"),
    ajv,
  );
  const [runtimeEvent] = outcome.runtimeEvents;

  assert.equal(runtimeEvent.actor.id, "@mallory:carpet.test");
  assert.equal(runtimeEvent.actor.derived_from, "matrix.sender");
  assert.equal(runtimeEvent.actor.claimed_actor.id, "@yet:carpet.test");
  assert.equal(runtimeEvent.actor.type, "matrix_user");
});

test("invalid input and unknown rooms do not enqueue runtime work", () => {
  const ajv = createAjv();
  for (const fixturePath of [
    "fixtures/matrix-transactions/invalid-schema.json",
    "fixtures/matrix-transactions/unknown-room.json",
  ]) {
    const outcome = processTransaction(readJson(fixturePath), ajv);

    assert.equal(outcome.runtimeEvents.length, 0);
    assert.equal(outcome.failureEvents.length, 1);
    assert.equal(outcome.failureEvents[0].enqueue.status, "not_queued");
  }
});

test("duplicate transactions and events are harmless", () => {
  const ajv = createAjv();
  for (const fixturePath of [
    "fixtures/matrix-transactions/duplicate-transaction.json",
    "fixtures/matrix-transactions/duplicate-event.json",
  ]) {
    const outcome = processTransaction(readJson(fixturePath), ajv);

    assert.equal(outcome.response.status, 200);
    assert.equal(outcome.runtimeEvents.length, 0);
    assert.equal(outcome.failureEvents.length, 0);
    assert.equal(outcome.outboundProjections.length, 0);
  }
});

test("runtime enqueue failure returns a retryable failure without committing idempotency", () => {
  const ajv = createAjv();
  const outcome = processTransaction(
    readJson("fixtures/matrix-transactions/failure-reply.json"),
    ajv,
  );

  assert.equal(outcome.response.status, 503);
  assert.equal(outcome.response.body.retryable, true);
  assert.equal(outcome.committed, false);
  assert.equal(outcome.runtimeEvents.length, 0);
  assert.equal(outcome.outboundProjections.length, 0);
});
