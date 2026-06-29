import { createHash } from "node:crypto";
import {
  applyTaskTransition,
  type TaskRisk,
  type TaskStateName,
  type TaskStateTransition,
  type TransitionErrorCode,
} from "state-machine";

export type TaskSnapshot = {
  task_id: string;
  workspace_id?: string;
  trace_id?: string;
  state: TaskStateName;
  risk: TaskRisk;
  current_transition_id: string | null;
  source_matrix_event_ref?: string | null;
  created_at?: string;
  updated_at?: string;
  artifact_refs: string[];
  proof_refs: string[];
  approval_refs: string[];
};

export type AppendTransitionCommand = {
  command_id: string;
  task_id: string;
  expected_state: TaskStateName;
  transition: TaskStateTransition;
  occurred_at?: string;
};

export type TransitionRecord = {
  sequence: number;
  command_id: string;
  task_id: string;
  transition: TaskStateTransition;
  task_snapshot: TaskSnapshot;
  occurred_at?: string;
};

export type IdempotencyKeyRecord = {
  record_type: "idempotency_key";
  idempotency_key: string;
  scope: "runtime_command";
  operation: string;
  request_hash: string;
  result_ref: string;
  status: "applied" | "duplicate" | "rejected" | "retryable_failure";
  first_seen_at: string;
  last_seen_at: string;
};

export type StoreTransitionErrorCode =
  | "task_not_found"
  | "stale_expected_state"
  | TransitionErrorCode;

export type AppendTransitionResult =
  | {
      ok: true;
      kind: "applied" | "noop";
      task: TaskSnapshot;
      transition_record: TransitionRecord | null;
    }
  | {
      ok: false;
      code: StoreTransitionErrorCode;
      message: string;
      task: TaskSnapshot | null;
    };

export type InMemoryTaskStore = {
  putTaskSnapshot(snapshot: TaskSnapshot): TaskSnapshot;
  getTaskSnapshot(task_id: string): TaskSnapshot | null;
  listTaskSnapshots(): TaskSnapshot[];
  appendTransition(command: AppendTransitionCommand): AppendTransitionResult;
  listTransitionRecords(task_id: string): TransitionRecord[];
  listIdempotencyRecords(): IdempotencyKeyRecord[];
  reset(): void;
};

export function createInMemoryTaskStore(): InMemoryTaskStore {
  const tasks = new Map<string, TaskSnapshot>();
  const recordsByTask = new Map<string, TransitionRecord[]>();
  const commandResults = new Map<string, AppendTransitionResult>();
  const idempotencyRecords = new Map<string, IdempotencyKeyRecord>();

  // ponytail: process-local Map store with O(n) current-transition lookup; use durable indexed storage when real concurrency/replay matters.
  return {
    putTaskSnapshot(snapshot) {
      const stored = cloneSnapshot(snapshot);

      tasks.set(stored.task_id, stored);
      recordsByTask.set(stored.task_id, recordsByTask.get(stored.task_id) ?? []);

      return cloneSnapshot(stored);
    },

    getTaskSnapshot(task_id) {
      const task = tasks.get(task_id);

      return task ? cloneSnapshot(task) : null;
    },

    listTaskSnapshots() {
      return [...tasks.values()].map(cloneSnapshot);
    },

    appendTransition(command) {
      const priorResult = commandResults.get(command.command_id);

      if (priorResult) {
        return cloneResult(priorResult);
      }

      const task = tasks.get(command.task_id);

      if (!task) {
        const result = fail("task_not_found", "task_not_found", null);
        commandResults.set(command.command_id, result);
        idempotencyRecords.set(command.command_id, idempotencyRecord(command, "rejected"));
        return cloneResult(result);
      }

      if (task.state !== command.expected_state) {
        const result = fail("stale_expected_state", "stale_expected_state", task);
        commandResults.set(command.command_id, result);
        idempotencyRecords.set(command.command_id, idempotencyRecord(command, "rejected"));
        return cloneResult(result);
      }

      const records = recordsByTask.get(command.task_id) ?? [];
      const transition = sanitizeTransition(command.transition);
      const currentTransition = records.find(
        (record) => record.transition.transition_id === task.current_transition_id,
      )?.transition;
      const applied = applyTaskTransition(task, transition, {
        current_transition: currentTransition,
      });

      if (!applied.ok) {
        const result = fail(applied.code, applied.message, task);
        commandResults.set(command.command_id, result);
        idempotencyRecords.set(command.command_id, idempotencyRecord(command, "rejected"));
        return cloneResult(result);
      }

      const nextTask = withRefs(
        {
          ...task,
          state: applied.task.state,
          current_transition_id: applied.task.current_transition_id,
        },
        transition,
      );
      if (command.occurred_at) {
        nextTask.updated_at = command.occurred_at;
      }
      const record =
        applied.kind === "applied"
          ? {
              sequence: records.length + 1,
              command_id: command.command_id,
              task_id: command.task_id,
              transition,
              task_snapshot: cloneSnapshot(nextTask),
              occurred_at: command.occurred_at,
            }
          : null;

      tasks.set(command.task_id, nextTask);

      if (record) {
        records.push(record);
        recordsByTask.set(command.task_id, records);
      }

      const result: AppendTransitionResult = {
        ok: true,
        kind: applied.kind,
        task: cloneSnapshot(nextTask),
        transition_record: record ? cloneRecord(record) : null,
      };

      commandResults.set(command.command_id, result);
      idempotencyRecords.set(
        command.command_id,
        idempotencyRecord(
          command,
          applied.kind === "applied" ? "applied" : "duplicate",
          record?.transition.transition_id ?? task.current_transition_id,
        ),
      );
      return cloneResult(result);
    },

    listTransitionRecords(task_id) {
      return (recordsByTask.get(task_id) ?? []).map(cloneRecord);
    },

    listIdempotencyRecords() {
      return [...idempotencyRecords.values()].map(cloneIdempotencyRecord);
    },

    reset() {
      tasks.clear();
      recordsByTask.clear();
      commandResults.clear();
      idempotencyRecords.clear();
    },
  };
}

function withRefs(
  task: TaskSnapshot,
  transition: TaskStateTransition,
): TaskSnapshot {
  return {
    ...task,
    artifact_refs: appendRef(task.artifact_refs, transition.requirements.artifact_ref),
    proof_refs: appendRef(task.proof_refs, transition.requirements.proof_ref),
    approval_refs: appendRef(task.approval_refs, transition.requirements.approval_ref),
  };
}

function appendRef(refs: string[], ref: string | null): string[] {
  if (!ref || refs.includes(ref)) {
    return [...refs];
  }

  return [...refs, ref];
}

function fail(
  code: StoreTransitionErrorCode,
  message: string,
  task: TaskSnapshot | null,
): AppendTransitionResult {
  return {
    ok: false,
    code,
    message,
    task: task ? cloneSnapshot(task) : null,
  };
}

function sanitizeTransition(transition: TaskStateTransition): TaskStateTransition {
  return {
    transition_id: transition.transition_id,
    task_id: transition.task_id,
    from: transition.from,
    to: transition.to,
    trigger_event: transition.trigger_event,
    actor: {
      type: transition.actor.type,
      id: transition.actor.id,
    },
    requirements: {
      artifact_ref: transition.requirements.artifact_ref,
      proof_ref: transition.requirements.proof_ref,
      approval_ref: transition.requirements.approval_ref,
    },
    audit_event: {
      type: transition.audit_event.type,
      event_id: transition.audit_event.event_id,
      trace_id: transition.audit_event.trace_id,
    },
  };
}

function cloneSnapshot(snapshot: TaskSnapshot): TaskSnapshot {
  const cloned: TaskSnapshot = {
    task_id: snapshot.task_id,
    state: snapshot.state,
    risk: snapshot.risk,
    current_transition_id: snapshot.current_transition_id,
    artifact_refs: [...snapshot.artifact_refs],
    proof_refs: [...snapshot.proof_refs],
    approval_refs: [...snapshot.approval_refs],
  };

  if (snapshot.workspace_id !== undefined) {
    cloned.workspace_id = snapshot.workspace_id;
  }
  if (snapshot.trace_id !== undefined) {
    cloned.trace_id = snapshot.trace_id;
  }
  if (snapshot.source_matrix_event_ref !== undefined) {
    cloned.source_matrix_event_ref = snapshot.source_matrix_event_ref;
  }
  if (snapshot.created_at !== undefined) {
    cloned.created_at = snapshot.created_at;
  }
  if (snapshot.updated_at !== undefined) {
    cloned.updated_at = snapshot.updated_at;
  }

  return cloned;
}

function cloneRecord(record: TransitionRecord): TransitionRecord {
  const cloned: TransitionRecord = {
    sequence: record.sequence,
    command_id: record.command_id,
    task_id: record.task_id,
    transition: sanitizeTransition(record.transition),
    task_snapshot: cloneSnapshot(record.task_snapshot),
  };

  if (record.occurred_at !== undefined) {
    cloned.occurred_at = record.occurred_at;
  }

  return cloned;
}

function cloneResult(result: AppendTransitionResult): AppendTransitionResult {
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      message: result.message,
      task: result.task ? cloneSnapshot(result.task) : null,
    };
  }

  return {
    ok: true,
    kind: result.kind,
    task: cloneSnapshot(result.task),
    transition_record: result.transition_record
      ? cloneRecord(result.transition_record)
      : null,
  };
}

function idempotencyRecord(
  command: AppendTransitionCommand,
  status: IdempotencyKeyRecord["status"],
  transitionId?: string | null,
): IdempotencyKeyRecord {
  const seenAt = command.occurred_at ?? "1970-01-01T00:00:00.000Z";

  return {
    record_type: "idempotency_key",
    idempotency_key: `runtime:${command.command_id}`,
    scope: "runtime_command",
    operation: command.transition.trigger_event,
    request_hash: hashJson({
      task_id: command.task_id,
      expected_state: command.expected_state,
      transition: sanitizeTransition(command.transition),
    }),
    result_ref: transitionId
      ? `transition:${transitionId}`
      : `runtime_event:${safeRefPart(command.command_id)}`,
    status,
    first_seen_at: seenAt,
    last_seen_at: seenAt,
  };
}

function cloneIdempotencyRecord(record: IdempotencyKeyRecord): IdempotencyKeyRecord {
  return {
    record_type: "idempotency_key",
    idempotency_key: record.idempotency_key,
    scope: record.scope,
    operation: record.operation,
    request_hash: record.request_hash,
    result_ref: record.result_ref,
    status: record.status,
    first_seen_at: record.first_seen_at,
    last_seen_at: record.last_seen_at,
  };
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function safeRefPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_") || "unknown";
}
