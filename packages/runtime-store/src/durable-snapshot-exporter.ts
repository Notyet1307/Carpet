import type {
  IdempotencyKeyRecord,
  InMemoryTaskStore,
  TaskSnapshot,
  TransitionRecord,
} from "./in-memory-task-store.ts";

export type RuntimeStoreSnapshot = {
  store_id: string;
  schema_version: 1;
  source_of_truth: "runtime";
  created_at: string;
  tasks: TaskRecord[];
  task_transitions: TaskTransitionRecord[];
  idempotency_keys: IdempotencyKeyRecord[];
  proof_refs: ProofRefRecord[];
  approval_refs: ApprovalRefRecord[];
  artifact_refs: ArtifactRefRecord[];
};

export type TaskRecord = {
  record_type: "task";
  task_id: string;
  workspace_id: string;
  trace_id: string;
  state: string;
  risk: string;
  current_transition_id: string | null;
  source_matrix_event_ref?: string | null;
  created_at: string;
  updated_at: string;
  refs: {
    artifact_refs: string[];
    proof_refs: string[];
    approval_refs: string[];
  };
};

export type TaskTransitionRecord = {
  record_type: "task_transition";
  transition_id: string;
  task_id: string;
  sequence: number;
  from: string;
  to: string;
  trigger_event: string;
  actor: {
    type: string;
    id: string;
  };
  requirements: {
    artifact_ref: string | null;
    proof_ref: string | null;
    approval_ref: string | null;
  };
  audit_event: {
    type: string;
    event_id: string;
    trace_id: string;
  };
  occurred_at: string;
};

export type ProofRefRecord = {
  record_type: "proof_ref";
  proof_id: string;
  task_id: string;
  run_id: string;
  trace_id: string;
  status: "pending" | "verified" | "rejected";
  ledger_uri: string;
  artifact_refs: string[];
  validation_summary: {
    command_count: number;
    failed_count: number;
    log_refs: string[];
  };
  created_at: string;
  verified_at?: string | null;
};

export type ApprovalRefRecord = {
  record_type: "approval_ref";
  approval_id: string;
  task_id: string;
  proof_id: string;
  action: "push_branch" | "create_pr" | "external_write" | "secret_access" | "memory_write";
  status: "requested" | "granted" | "denied" | "expired" | "consumed";
  actor: {
    type: "human";
    id: string;
  };
  target: {
    type: "git_branch" | "pull_request" | "external_system" | "secret" | "memory_proposal";
    ref: string;
    base_ref?: string;
    operation?: string;
  };
  conditions: string[];
  replay_key_hash: string;
  created_at: string;
  expires_at: string;
  used_at?: string | null;
};

export type ArtifactRefRecord = {
  record_type: "artifact_ref";
  artifact_id: string;
  task_id: string;
  run_id: string;
  kind: "patch" | "log" | "report" | "schema" | "fixture" | "pr" | "object";
  uri: string;
  sha256: string;
  size_bytes: number;
  content_type?: string;
  created_at: string;
};

export type ExportRuntimeStoreSnapshotOptions = {
  store_id: string;
  created_at: string;
  proof_refs: ProofRefRecord[];
  approval_refs: ApprovalRefRecord[];
  artifact_refs: ArtifactRefRecord[];
};

const unsafeSnapshotString =
  /([\r\n]|diff --git|DATABASE_URL=|postgres:\/\/|PASS tests\/|FAIL tests\/|stdout:|stderr:|ghp_|github_pat_|GITHUB_TOKEN|MATRIX_ACCESS_TOKEN|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|sk-[A-Za-z0-9])/;

export function exportRuntimeStoreSnapshot(
  store: InMemoryTaskStore,
  options: ExportRuntimeStoreSnapshotOptions,
): RuntimeStoreSnapshot {
  const tasks = store.listTaskSnapshots();
  const snapshot: RuntimeStoreSnapshot = {
    store_id: options.store_id,
    schema_version: 1,
    source_of_truth: "runtime",
    created_at: options.created_at,
    tasks: tasks.map(toTaskRecord),
    task_transitions: tasks.flatMap((task) =>
      store.listTransitionRecords(task.task_id).map(toTransitionRecord),
    ),
    idempotency_keys: store.listIdempotencyRecords(),
    proof_refs: options.proof_refs.map(toProofRefRecord),
    approval_refs: options.approval_refs.map(toApprovalRefRecord),
    artifact_refs: options.artifact_refs.map(toArtifactRefRecord),
  };

  rejectUnsafeStrings(snapshot);
  return snapshot;
}

function toTaskRecord(task: TaskSnapshot): TaskRecord {
  return {
    record_type: "task",
    task_id: task.task_id,
    workspace_id: required(task.workspace_id, `${task.task_id}.workspace_id`),
    trace_id: required(task.trace_id, `${task.task_id}.trace_id`),
    state: task.state,
    risk: task.risk,
    current_transition_id: task.current_transition_id,
    source_matrix_event_ref: task.source_matrix_event_ref ?? null,
    created_at: required(task.created_at, `${task.task_id}.created_at`),
    updated_at: required(task.updated_at, `${task.task_id}.updated_at`),
    refs: {
      artifact_refs: [...task.artifact_refs],
      proof_refs: [...task.proof_refs],
      approval_refs: [...task.approval_refs],
    },
  };
}

function toTransitionRecord(record: TransitionRecord): TaskTransitionRecord {
  return {
    record_type: "task_transition",
    transition_id: record.transition.transition_id,
    task_id: record.task_id,
    sequence: record.sequence,
    from: record.transition.from,
    to: record.transition.to,
    trigger_event: record.transition.trigger_event,
    actor: {
      type: record.transition.actor.type,
      id: record.transition.actor.id,
    },
    requirements: {
      artifact_ref: record.transition.requirements.artifact_ref,
      proof_ref: record.transition.requirements.proof_ref,
      approval_ref: record.transition.requirements.approval_ref,
    },
    audit_event: {
      type: record.transition.audit_event.type,
      event_id: record.transition.audit_event.event_id,
      trace_id: record.transition.audit_event.trace_id,
    },
    occurred_at: required(record.occurred_at, `${record.transition.transition_id}.occurred_at`),
  };
}

function toProofRefRecord(record: ProofRefRecord): ProofRefRecord {
  return {
    record_type: "proof_ref",
    proof_id: record.proof_id,
    task_id: record.task_id,
    run_id: record.run_id,
    trace_id: record.trace_id,
    status: record.status,
    ledger_uri: record.ledger_uri,
    artifact_refs: [...record.artifact_refs],
    validation_summary: {
      command_count: record.validation_summary.command_count,
      failed_count: record.validation_summary.failed_count,
      log_refs: [...record.validation_summary.log_refs],
    },
    created_at: record.created_at,
    verified_at: record.verified_at ?? null,
  };
}

function toApprovalRefRecord(record: ApprovalRefRecord): ApprovalRefRecord {
  const target: ApprovalRefRecord["target"] = {
    type: record.target.type,
    ref: record.target.ref,
  };

  if (record.target.base_ref !== undefined) {
    target.base_ref = record.target.base_ref;
  }
  if (record.target.operation !== undefined) {
    target.operation = record.target.operation;
  }

  return {
    record_type: "approval_ref",
    approval_id: record.approval_id,
    task_id: record.task_id,
    proof_id: record.proof_id,
    action: record.action,
    status: record.status,
    actor: {
      type: "human",
      id: record.actor.id,
    },
    target,
    conditions: [...record.conditions],
    replay_key_hash: record.replay_key_hash,
    created_at: record.created_at,
    expires_at: record.expires_at,
    used_at: record.used_at ?? null,
  };
}

function toArtifactRefRecord(record: ArtifactRefRecord): ArtifactRefRecord {
  const exported: ArtifactRefRecord = {
    record_type: "artifact_ref",
    artifact_id: record.artifact_id,
    task_id: record.task_id,
    run_id: record.run_id,
    kind: record.kind,
    uri: record.uri,
    sha256: record.sha256,
    size_bytes: record.size_bytes,
    created_at: record.created_at,
  };

  if (record.content_type !== undefined) {
    exported.content_type = record.content_type;
  }

  return exported;
}

function required(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`missing durable snapshot field: ${label}`);
  }

  return value;
}

function rejectUnsafeStrings(value: unknown): void {
  if (typeof value === "string") {
    if (unsafeSnapshotString.test(value)) {
      throw new Error("unsafe runtime store snapshot string");
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      rejectUnsafeStrings(item);
    }
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      rejectUnsafeStrings(item);
    }
  }
}
