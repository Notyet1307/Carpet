import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import { loadJsonSchema } from "../../../packages/runtime-contracts/src/index.ts";

export type MatrixProjectionContent = Record<string, unknown> & {
  type: string;
  idempotency_key: string;
};

export type MatrixProjectionRequest = {
  room_id: string;
  content: unknown;
};

export type MatrixProjectionRecord = {
  room_id: string;
  event_type: string;
  idempotency_key: string;
  content: MatrixProjectionContent;
};

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const projectionSchemas = [
  [
    "com.notyet.agent.task.accepted",
    "schemas/matrix/task.accepted.schema.json",
  ],
  [
    "com.notyet.agent.proof.submitted",
    "schemas/matrix/proof.submitted.schema.json",
  ],
  [
    "com.notyet.agent.incident.created",
    "schemas/matrix/incident.created.schema.json",
  ],
] as const;
const unsafeProjectionFields = new Set([
  "diff_body",
  "raw_diff_body",
  "raw_inbound_event_body",
  "raw_proof_logs",
  "raw_stderr",
  "raw_stdout",
  "raw_validation_logs",
  "stderr",
  "stdout",
  "validation_logs",
]);

export class FakeMatrixProjectionAdapter {
  readonly records: MatrixProjectionRecord[] = [];
  private readonly validators = createProjectionValidators();

  project(request: MatrixProjectionRequest): MatrixProjectionRecord {
    if (typeof request.room_id !== "string" || request.room_id.length === 0) {
      throw new Error("Projection room_id must be a non-empty string");
    }

    const content = toProjectionContent(request.content);
    assertNoUnsafeProjectionFields(content);

    const validate = this.validators.get(content.type);
    if (!validate) {
      throw new Error(`Unsupported Matrix projection type: ${content.type}`);
    }

    if (!validate(content)) {
      throw new Error(
        `Matrix projection failed schema validation: ${formatAjvErrors(
          validate.errors,
        )}`,
      );
    }

    const record = {
      room_id: request.room_id,
      event_type: content.type,
      idempotency_key: content.idempotency_key,
      content,
    };
    this.records.push(record);

    return record;
  }
}

function createProjectionValidators() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(
    loadJsonSchema(path.join(root, "schemas/matrix/event-envelope.schema.json")),
  );

  for (const [, schemaPath] of projectionSchemas) {
    ajv.addSchema(loadJsonSchema(path.join(root, schemaPath)));
  }

  return new Map(
    projectionSchemas.map(([eventType]) => {
      const validate = ajv.getSchema(eventTypeToSchemaId(eventType));
      if (!validate) {
        throw new Error(`Missing projection schema for ${eventType}`);
      }

      return [eventType, validate] as const;
    }),
  );
}

function eventTypeToSchemaId(eventType: string) {
  const name = eventType.replace("com.notyet.agent.", "");

  return `https://notyet.dev/schemas/matrix/${name}.schema.json`;
}

function toProjectionContent(value: unknown): MatrixProjectionContent {
  if (!isRecord(value)) {
    throw new Error("Projection content must be an object");
  }

  const content = structuredClone(value);
  if (!isRecord(content)) {
    throw new Error("Projection content must be an object");
  }

  if (typeof content.type !== "string" || content.type.length === 0) {
    throw new Error("Projection content type must be a non-empty string");
  }

  if (
    typeof content.idempotency_key !== "string" ||
    content.idempotency_key.length === 0
  ) {
    throw new Error("Projection idempotency_key must be a non-empty string");
  }

  return content as MatrixProjectionContent;
}

function assertNoUnsafeProjectionFields(
  value: unknown,
  pathParts: string[] = [],
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoUnsafeProjectionFields(item, pathParts);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = [...pathParts, key];
    if (unsafeProjectionFields.has(key)) {
      throw new Error(`Unsafe projection field: ${childPath.join(".")}`);
    }
    assertNoUnsafeProjectionFields(child, childPath);
  }
}

function formatAjvErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors?.length) {
    return "JSON schema validation failed";
  }

  return errors
    .map((error) => {
      const location = error.instancePath || "$";
      const message = error.message || "is invalid";

      return `${location} ${message}`;
    })
    .join("; ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
