import {
  applyTaskTransition,
  type TaskRisk,
  type TaskStateName,
  type TaskStateTransition,
  type TransitionErrorCode,
} from "state-machine";

export type TaskSnapshot = {
  task_id: string;
  state: TaskStateName;
  risk: TaskRisk;
  current_transition_id: string | null;
  artifact_refs: string[];
  proof_refs: string[];
  approval_refs: string[];
};

export type AppendTransitionCommand = {
  command_id: string;
  task_id: string;
  expected_state: TaskStateName;
  transition: TaskStateTransition;
};

export type TransitionRecord = {
  sequence: number;
  command_id: string;
  task_id: string;
  transition: TaskStateTransition;
  task_snapshot: TaskSnapshot;
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
  appendTransition(command: AppendTransitionCommand): AppendTransitionResult;
  listTransitionRecords(task_id: string): TransitionRecord[];
  reset(): void;
};

export function createInMemoryTaskStore(): InMemoryTaskStore {
  const tasks = new Map<string, TaskSnapshot>();
  const recordsByTask = new Map<string, TransitionRecord[]>();
  const commandResults = new Map<string, AppendTransitionResult>();

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

    appendTransition(command) {
      const priorResult = commandResults.get(command.command_id);

      if (priorResult) {
        return cloneResult(priorResult);
      }

      const task = tasks.get(command.task_id);

      if (!task) {
        const result = fail("task_not_found", "task_not_found", null);
        commandResults.set(command.command_id, result);
        return cloneResult(result);
      }

      if (task.state !== command.expected_state) {
        const result = fail("stale_expected_state", "stale_expected_state", task);
        commandResults.set(command.command_id, result);
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
      const record =
        applied.kind === "applied"
          ? {
              sequence: records.length + 1,
              command_id: command.command_id,
              task_id: command.task_id,
              transition,
              task_snapshot: cloneSnapshot(nextTask),
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
      return cloneResult(result);
    },

    listTransitionRecords(task_id) {
      return (recordsByTask.get(task_id) ?? []).map(cloneRecord);
    },

    reset() {
      tasks.clear();
      recordsByTask.clear();
      commandResults.clear();
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
  return {
    task_id: snapshot.task_id,
    state: snapshot.state,
    risk: snapshot.risk,
    current_transition_id: snapshot.current_transition_id,
    artifact_refs: [...snapshot.artifact_refs],
    proof_refs: [...snapshot.proof_refs],
    approval_refs: [...snapshot.approval_refs],
  };
}

function cloneRecord(record: TransitionRecord): TransitionRecord {
  return {
    sequence: record.sequence,
    command_id: record.command_id,
    task_id: record.task_id,
    transition: sanitizeTransition(record.transition),
    task_snapshot: cloneSnapshot(record.task_snapshot),
  };
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
