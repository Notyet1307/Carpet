import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

import {
  createSchemaValidator,
  loadJsonSchema,
  type SchemaValidator,
} from "../../../packages/runtime-contracts/src/index.ts";

import {
  mapMatrixEventToRuntimeEvent,
  type MatrixEvent,
  type RuntimeEvent,
} from "./runtime-event-mapper.ts";

export const MATRIX_FIXTURE_HS_TOKEN = "hs_test_carpet";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const fixtureRoomMap = new Map([
  ["!agent-intake:carpet.test", "ws_carpet"],
  ["!agent-runtime:carpet.test", "ws_carpet"],
]);

export class IdempotencyStore {
  readonly processedTransactionIds: Set<string>;
  readonly processedEventIds: Set<string>;

  constructor(preexisting: PreexistingIds = {}) {
    this.processedTransactionIds = new Set(
      preexisting.processed_transaction_ids ?? [],
    );
    this.processedEventIds = new Set(preexisting.processed_event_ids ?? []);
  }

  hasTransaction(transactionId: string) {
    return this.processedTransactionIds.has(transactionId);
  }

  hasEvent(eventId: string) {
    return this.processedEventIds.has(eventId);
  }

  commitTransaction(transactionId: string) {
    this.processedTransactionIds.add(transactionId);
  }

  commitEvent(eventId: string) {
    this.processedEventIds.add(eventId);
  }
}

export class FakeRuntimeEventQueue {
  readonly events: RuntimeEvent[] = [];
  readonly available: boolean;

  constructor(available = true) {
    this.available = available;
  }

  enqueue(event: RuntimeEvent) {
    this.events.push(event);
  }
}

export function createFixtureTransactionHandler(options: {
  hsToken?: string;
  idempotencyStore?: IdempotencyStore;
  runtimeEventQueue?: FakeRuntimeEventQueue;
  roomMap?: Map<string, string>;
  runtimeEventValidator?: SchemaValidator;
} = {}) {
  return new TransactionHandler({
    hsToken: options.hsToken ?? MATRIX_FIXTURE_HS_TOKEN,
    idempotencyStore: options.idempotencyStore ?? new IdempotencyStore(),
    runtimeEventQueue:
      options.runtimeEventQueue ?? new FakeRuntimeEventQueue(),
    roomMap: options.roomMap ?? fixtureRoomMap,
    matrixContentValidators: createMatrixContentValidators(),
    runtimeEventValidator:
      options.runtimeEventValidator ??
      createSchemaValidator(
        loadJsonSchema(
          path.join(root, "schemas/runtime/runtime-event.schema.json"),
        ),
      ),
  });
}

export class TransactionHandler {
  private readonly options: TransactionHandlerOptions;

  constructor(options: TransactionHandlerOptions) {
    this.options = options;
  }

  handle(request: MatrixTransactionRequest): TransactionOutcome {
    const transactionId = request.params.txn_id;

    if (request.headers.authorization !== `Bearer ${this.options.hsToken}`) {
      return {
        response: response(401, "unauthorized"),
        committed: false,
        runtimeEvents: [],
        failureEvents: [],
      };
    }

    if (this.options.idempotencyStore.hasTransaction(transactionId)) {
      return {
        response: response(200, "duplicate_transaction"),
        committed: true,
        runtimeEvents: [],
        failureEvents: [],
      };
    }

    if (!this.options.runtimeEventQueue.available) {
      return {
        response: response(503, "runtime_enqueue_unavailable", true),
        committed: false,
        runtimeEvents: [],
        failureEvents: [],
      };
    }

    const runtimeEvents: RuntimeEvent[] = [];
    const failureEvents: RuntimeEvent[] = [];

    for (const rawEvent of request.body.events) {
      const event = toMatrixEvent(rawEvent);

      if (this.options.idempotencyStore.hasEvent(event.event_id)) {
        continue;
      }

      const workspaceId = this.options.roomMap.get(event.room_id) ?? null;
      if (workspaceId === null) {
        const failureEvent = this.runtimeEvent({
          transactionId,
          event,
          workspaceId,
          eventType: "runtime.incident.created",
          validation: {
            status: "rejected",
            schema_id: null,
            errors: ["unknown Matrix room; no workspace mapping"],
          },
          enqueue: { status: "not_queued", target: "none" },
        });
        failureEvents.push(failureEvent);
        this.options.idempotencyStore.commitEvent(event.event_id);
        continue;
      }

      const schemaId = eventTypeToSchemaId(event.type);
      const validateContent = this.options.matrixContentValidators.get(
        event.type,
      );
      const validation = validateContent?.(event.content);

      if (!validation?.valid) {
        const failureEvent = this.runtimeEvent({
          transactionId,
          event,
          workspaceId,
          eventType: "runtime.intake.rejected",
          validation: {
            status: "rejected",
            schema_id: schemaId,
            errors: validation?.errors ?? ["unsupported Matrix event type"],
          },
          enqueue: { status: "not_queued", target: "none" },
        });
        failureEvents.push(failureEvent);
        this.options.idempotencyStore.commitEvent(event.event_id);
        continue;
      }

      const runtimeEvent = this.runtimeEvent({
        transactionId,
        event,
        workspaceId,
        eventType: "runtime.intent.received",
        validation: {
          status: "accepted",
          schema_id: schemaId,
          errors: [],
        },
        enqueue: { status: "queued", target: "runtime_intake" },
      });

      this.options.runtimeEventQueue.enqueue(runtimeEvent);
      runtimeEvents.push(runtimeEvent);
      this.options.idempotencyStore.commitEvent(event.event_id);
    }

    this.options.idempotencyStore.commitTransaction(transactionId);

    return {
      response: response(200, "ok"),
      committed: true,
      runtimeEvents,
      failureEvents,
    };
  }

  private runtimeEvent(input: Parameters<typeof mapMatrixEventToRuntimeEvent>[0]) {
    const event = mapMatrixEventToRuntimeEvent(input);
    const result = this.options.runtimeEventValidator(event);

    if (!result.valid) {
      throw new Error(
        `Runtime event failed schema validation: ${result.errors.join("; ")}`,
      );
    }

    return event;
  }
}

function createMatrixContentValidators() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(
    loadJsonSchema(path.join(root, "schemas/matrix/event-envelope.schema.json")),
  );
  ajv.addSchema(
    loadJsonSchema(path.join(root, "schemas/matrix/task.created.schema.json")),
  );

  return new Map([
    [
      "com.notyet.agent.task.created",
      (content: unknown) => {
        const validate = ajv.getSchema(
          "https://notyet.dev/schemas/matrix/task.created.schema.json",
        );

        if (validate?.(content)) {
          return { valid: true as const, errors: [] };
        }

        return {
          valid: false as const,
          errors: (validate?.errors ?? []).map(
            (error) => error.message ?? "is invalid",
          ),
        };
      },
    ],
  ]);
}

function eventTypeToSchemaId(eventType: string) {
  const name = eventType.replace("com.notyet.agent.", "");

  return `https://notyet.dev/schemas/matrix/${name}.schema.json`;
}

function toMatrixEvent(value: unknown): MatrixEvent {
  if (!isRecord(value)) {
    throw new Error("Matrix event must be an object");
  }

  return {
    event_id: requiredString(value.event_id, "event_id"),
    type: requiredString(value.type, "type"),
    room_id: requiredString(value.room_id, "room_id"),
    sender: requiredString(value.sender, "sender"),
    content: isRecord(value.content) ? value.content : {},
  };
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Matrix event ${field} must be a non-empty string`);
  }

  return value;
}

function response(status: number, code: string, retryable = false) {
  return { status, body: { code, retryable } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type PreexistingIds = {
  processed_transaction_ids?: string[];
  processed_event_ids?: string[];
};

type TransactionHandlerOptions = {
  hsToken: string;
  idempotencyStore: IdempotencyStore;
  runtimeEventQueue: FakeRuntimeEventQueue;
  roomMap: Map<string, string>;
  matrixContentValidators: Map<
    string,
    (content: unknown) => { valid: true; errors: [] } | { valid: false; errors: string[] }
  >;
  runtimeEventValidator: SchemaValidator;
};

export type MatrixTransactionRequest = {
  params: { txn_id: string };
  headers: { authorization?: string };
  body: { events: unknown[] };
};

export type TransactionOutcome = {
  response: ReturnType<typeof response>;
  committed: boolean;
  runtimeEvents: RuntimeEvent[];
  failureEvents: RuntimeEvent[];
};
