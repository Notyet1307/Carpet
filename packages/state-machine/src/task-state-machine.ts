import { isDeepStrictEqual } from "node:util";

export const TASK_STATES = [
  "created",
  "accepted",
  "scoped",
  "graph_compiled",
  "capability_selected",
  "work_cell_created",
  "worker_dispatched",
  "running",
  "artifact_submitted",
  "proof_submitted",
  "verifying",
  "waiting_approval",
  "approved",
  "pr_created",
  "completed",
  "rejected",
  "blocked",
  "needs_human_input",
  "policy_denied",
  "worker_failed",
  "verification_failed",
  "approval_denied",
  "cancelled",
] as const;

export type TaskStateName = (typeof TASK_STATES)[number];
export type TaskRisk = "low" | "medium" | "high";
export type ActorType = "human" | "runtime" | "worker" | "verifier";
export type TransitionRequirement = "artifact_ref" | "proof_ref" | "approval_ref";

export type TaskState = {
  task_id: string;
  state: TaskStateName;
  risk: TaskRisk;
  current_transition_id: string | null;
};

export type TaskStateTransition = {
  transition_id: string;
  task_id: string;
  from: TaskStateName;
  to: TaskStateName;
  trigger_event: string;
  actor: {
    type: ActorType;
    id: string;
  };
  requirements: Record<TransitionRequirement, string | null>;
  audit_event: {
    type: string;
    event_id: string;
    trace_id: string;
  };
};

export type TransitionErrorCode =
  | "unknown_state"
  | "task_mismatch"
  | "state_mismatch"
  | "terminal_state"
  | "unknown_transition"
  | "invalid_trigger_event"
  | "invalid_actor"
  | "audit_event_mismatch"
  | "missing_artifact_ref"
  | "missing_proof_ref"
  | "missing_approval_ref"
  | "duplicate_transition_conflict";

export type ApplyTaskTransitionResult =
  | { ok: true; kind: "applied" | "noop"; task: TaskState }
  | { ok: false; code: TransitionErrorCode; message: string };

export type ApplyTaskTransitionOptions = {
  current_transition?: TaskStateTransition;
};

type TransitionContract = {
  trigger_event: string;
  actor: ActorType;
  audit_event: string;
};

const transitionContracts: Record<string, TransitionContract> = {
  "created->accepted": {
    trigger_event: "task.accepted",
    actor: "human",
    audit_event: "task.transition.accepted",
  },
  "accepted->scoped": {
    trigger_event: "task.scoped",
    actor: "runtime",
    audit_event: "task.transition.scoped",
  },
  "scoped->graph_compiled": {
    trigger_event: "task.graph_compiled",
    actor: "runtime",
    audit_event: "task.transition.graph_compiled",
  },
  "graph_compiled->capability_selected": {
    trigger_event: "capability.selected",
    actor: "runtime",
    audit_event: "task.transition.capability_selected",
  },
  "capability_selected->work_cell_created": {
    trigger_event: "work_cell.created",
    actor: "runtime",
    audit_event: "task.transition.work_cell_created",
  },
  "work_cell_created->worker_dispatched": {
    trigger_event: "worker.dispatched",
    actor: "runtime",
    audit_event: "task.transition.worker_dispatched",
  },
  "worker_dispatched->running": {
    trigger_event: "worker.started",
    actor: "worker",
    audit_event: "task.transition.running",
  },
  "running->artifact_submitted": {
    trigger_event: "artifact.submitted",
    actor: "worker",
    audit_event: "task.transition.artifact_submitted",
  },
  "artifact_submitted->proof_submitted": {
    trigger_event: "proof.submitted",
    actor: "worker",
    audit_event: "task.transition.proof_submitted",
  },
  "proof_submitted->verifying": {
    trigger_event: "verification.started",
    actor: "verifier",
    audit_event: "task.transition.verifying",
  },
  "verifying->waiting_approval": {
    trigger_event: "approval.requested",
    actor: "runtime",
    audit_event: "task.transition.waiting_approval",
  },
  "waiting_approval->approved": {
    trigger_event: "approval.granted",
    actor: "human",
    audit_event: "task.transition.approved",
  },
  "approved->pr_created": {
    trigger_event: "github.pr.create_requested",
    actor: "runtime",
    audit_event: "task.transition.pr_created",
  },
  "pr_created->completed": {
    trigger_event: "task.completed",
    actor: "runtime",
    audit_event: "task.transition.completed",
  },
  "created->rejected": {
    trigger_event: "task.rejected",
    actor: "runtime",
    audit_event: "task.transition.rejected",
  },
  "accepted->blocked": {
    trigger_event: "task.blocked",
    actor: "runtime",
    audit_event: "task.transition.blocked",
  },
  "scoped->policy_denied": {
    trigger_event: "policy.denied",
    actor: "runtime",
    audit_event: "task.transition.policy_denied",
  },
  "graph_compiled->blocked": {
    trigger_event: "task.blocked",
    actor: "runtime",
    audit_event: "task.transition.blocked",
  },
  "capability_selected->policy_denied": {
    trigger_event: "policy.denied",
    actor: "runtime",
    audit_event: "task.transition.policy_denied",
  },
  "worker_dispatched->worker_failed": {
    trigger_event: "worker.failed",
    actor: "worker",
    audit_event: "task.transition.worker_failed",
  },
  "running->worker_failed": {
    trigger_event: "worker.failed",
    actor: "worker",
    audit_event: "task.transition.worker_failed",
  },
  "running->needs_human_input": {
    trigger_event: "human_input.requested",
    actor: "worker",
    audit_event: "task.transition.needs_human_input",
  },
  "proof_submitted->verification_failed": {
    trigger_event: "verification.failed",
    actor: "verifier",
    audit_event: "task.transition.verification_failed",
  },
  "verifying->verification_failed": {
    trigger_event: "verification.failed",
    actor: "verifier",
    audit_event: "task.transition.verification_failed",
  },
  "waiting_approval->approval_denied": {
    trigger_event: "approval.denied",
    actor: "human",
    audit_event: "task.transition.approval_denied",
  },
  "created->cancelled": {
    trigger_event: "task.cancelled",
    actor: "human",
    audit_event: "task.transition.cancelled",
  },
  "accepted->cancelled": {
    trigger_event: "task.cancelled",
    actor: "human",
    audit_event: "task.transition.cancelled",
  },
  "scoped->cancelled": {
    trigger_event: "task.cancelled",
    actor: "human",
    audit_event: "task.transition.cancelled",
  },
  "running->cancelled": {
    trigger_event: "task.cancelled",
    actor: "human",
    audit_event: "task.transition.cancelled",
  },
  "waiting_approval->cancelled": {
    trigger_event: "task.cancelled",
    actor: "human",
    audit_event: "task.transition.cancelled",
  },
};

const terminalStates = new Set<TaskStateName>([
  "completed",
  "rejected",
  "blocked",
  "needs_human_input",
  "policy_denied",
  "worker_failed",
  "verification_failed",
  "approval_denied",
  "cancelled",
]);

const states = new Set<string>(TASK_STATES);
const artifactRefStates = new Set<TaskStateName>([
  "artifact_submitted",
  "proof_submitted",
  "completed",
]);
const proofRefStates = new Set<TaskStateName>([
  "verifying",
  "waiting_approval",
  "approved",
  "pr_created",
  "completed",
  "verification_failed",
]);
const approvalRefStates = new Set<TaskStateName>([
  "approved",
  "pr_created",
  "completed",
  "approval_denied",
]);

export function applyTaskTransition(
  task: TaskState,
  transition: TaskStateTransition,
  options: ApplyTaskTransitionOptions = {},
): ApplyTaskTransitionResult {
  if (
    !isTaskStateName(task.state) ||
    !isTaskStateName(transition.from) ||
    !isTaskStateName(transition.to)
  ) {
    return fail("unknown_state");
  }

  if (
    task.state === transition.to &&
    task.current_transition_id === transition.transition_id
  ) {
    if (isDeepStrictEqual(options.current_transition, transition)) {
      return { ok: true, kind: "noop", task };
    }

    return fail("duplicate_transition_conflict");
  }

  if (task.task_id !== transition.task_id) {
    return fail("task_mismatch");
  }

  if (task.state !== transition.from) {
    return fail("state_mismatch");
  }

  if (terminalStates.has(task.state)) {
    return fail("terminal_state");
  }

  const contract = transitionContracts[transitionKey(transition)];

  if (!contract) {
    return fail("unknown_transition");
  }

  if (transition.trigger_event !== contract.trigger_event) {
    return fail("invalid_trigger_event");
  }

  if (transition.actor.type !== contract.actor) {
    return fail("invalid_actor");
  }

  if (transition.audit_event.type !== contract.audit_event) {
    return fail("audit_event_mismatch");
  }

  const missingRef = missingRequiredRef(transition);

  if (missingRef) {
    return fail(`missing_${missingRef}` as TransitionErrorCode);
  }

  return {
    ok: true,
    kind: "applied",
    task: {
      ...task,
      state: transition.to,
      current_transition_id: transition.transition_id,
    },
  };
}

function isTaskStateName(value: unknown): value is TaskStateName {
  return typeof value === "string" && states.has(value);
}

function transitionKey(transition: TaskStateTransition) {
  return `${transition.from}->${transition.to}`;
}

function missingRequiredRef(transition: TaskStateTransition) {
  if (artifactRefStates.has(transition.to) && !transition.requirements.artifact_ref) {
    return "artifact_ref";
  }

  if (proofRefStates.has(transition.to) && !transition.requirements.proof_ref) {
    return "proof_ref";
  }

  if (approvalRefStates.has(transition.to) && !transition.requirements.approval_ref) {
    return "approval_ref";
  }

  return null;
}

function fail(code: TransitionErrorCode): ApplyTaskTransitionResult {
  return { ok: false, code, message: code };
}
