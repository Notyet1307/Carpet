export type MatrixEvent = {
  event_id: string;
  type: string;
  room_id: string;
  sender: string;
  content?: Record<string, unknown>;
};

export type RuntimeEvent = {
  runtime_event_id: string;
  event_type:
    | "runtime.intent.received"
    | "runtime.intake.rejected"
    | "runtime.incident.created";
  source_component: "matrix_appservice_gateway";
  source_of_truth: "runtime";
  workspace_id: string | null;
  task_id: string | null;
  trace_id: string;
  idempotency_key: string;
  actor: {
    type: "matrix_user";
    id: string;
    derived_from: "matrix.sender";
    claimed_actor: ClaimedActor | null;
  };
  matrix: {
    transaction_id: string;
    event_id: string;
    room_id: string;
    sender: string;
    event_type: string;
    claimed_actor: ClaimedActor | null;
    room_mapping: {
      status: "mapped" | "unknown_room";
    };
  };
  validation: {
    status: "accepted" | "rejected";
    schema_id: string | null;
    errors: string[];
  };
  enqueue: {
    status: "queued" | "not_queued";
    target: "runtime_intake" | "none";
  };
  data: Record<string, unknown>;
};

type ClaimedActor = {
  type: "human" | "runtime" | "worker" | "verifier" | "system";
  id: string;
  display_name?: string;
};

export function mapMatrixEventToRuntimeEvent(input: {
  transactionId: string;
  event: MatrixEvent;
  workspaceId: string | null;
  eventType: RuntimeEvent["event_type"];
  validation: RuntimeEvent["validation"];
  enqueue: RuntimeEvent["enqueue"];
}): RuntimeEvent {
  const { event } = input;
  const content = isRecord(event.content) ? event.content : {};
  const claimedActor = toClaimedActor(content.actor);

  return {
    runtime_event_id: `rtevt_${sanitizeId(event.event_id)}_${input.eventType
      .split(".")
      .at(-1)}`,
    event_type: input.eventType,
    source_component: "matrix_appservice_gateway",
    source_of_truth: "runtime",
    workspace_id: input.workspaceId,
    task_id: toPrefixedString(content.task_id, "task_"),
    trace_id:
      toPrefixedString(content.trace_id, "trace_") ??
      `trace_matrix_${sanitizeId(event.event_id)}`,
    idempotency_key: `matrix:${event.event_id}`,
    actor: {
      type: "matrix_user",
      id: event.sender,
      derived_from: "matrix.sender",
      claimed_actor: claimedActor,
    },
    matrix: {
      transaction_id: input.transactionId,
      event_id: event.event_id,
      room_id: event.room_id,
      sender: event.sender,
      event_type: event.type,
      claimed_actor: claimedActor,
      room_mapping: {
        status: input.workspaceId === null ? "unknown_room" : "mapped",
      },
    },
    validation: input.validation,
    enqueue: input.enqueue,
    data:
      input.validation.status === "accepted" && isRecord(content.data)
        ? content.data
        : {},
  };
}

function sanitizeId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "_");
}

function toPrefixedString(value: unknown, prefix: string) {
  return typeof value === "string" && value.startsWith(prefix) ? value : null;
}

function toClaimedActor(value: unknown): ClaimedActor | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isActorType(value.type) || typeof value.id !== "string") {
    return null;
  }

  if (typeof value.display_name === "string") {
    return {
      type: value.type,
      id: value.id,
      display_name: value.display_name,
    };
  }

  return { type: value.type, id: value.id };
}

function isActorType(value: unknown): value is ClaimedActor["type"] {
  return (
    value === "human" ||
    value === "runtime" ||
    value === "worker" ||
    value === "verifier" ||
    value === "system"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
