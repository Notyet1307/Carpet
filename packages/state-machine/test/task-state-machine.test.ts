import { deepEqual, equal } from "node:assert/strict";
import test from "node:test";

import {
  applyTaskTransition,
  type TaskState,
  type TaskStateTransition,
} from "state-machine";

const happyPathStates = [
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
] as const;

const happyPathTriggers = [
  "task.accepted",
  "task.scoped",
  "task.graph_compiled",
  "capability.selected",
  "work_cell.created",
  "worker.dispatched",
  "worker.started",
  "artifact.submitted",
  "proof.submitted",
  "verification.started",
  "approval.requested",
  "approval.granted",
  "github.pr.create_requested",
  "task.completed",
] as const;

const actors = {
  accepted: "human",
  scoped: "runtime",
  graph_compiled: "runtime",
  capability_selected: "runtime",
  work_cell_created: "runtime",
  worker_dispatched: "runtime",
  running: "worker",
  artifact_submitted: "worker",
  proof_submitted: "worker",
  verifying: "verifier",
  waiting_approval: "runtime",
  approved: "human",
  pr_created: "runtime",
  completed: "runtime",
  rejected: "runtime",
  blocked: "runtime",
  needs_human_input: "worker",
  policy_denied: "runtime",
  worker_failed: "worker",
  verification_failed: "verifier",
  approval_denied: "human",
  cancelled: "human",
} as const;

function transition(
  from: TaskStateTransition["from"],
  to: TaskStateTransition["to"],
  triggerEvent: string,
): TaskStateTransition {
  const actor = actors[to];

  return {
    transition_id: `transition_${from}_to_${to}`,
    task_id: "task_demo",
    from,
    to,
    trigger_event: triggerEvent,
    actor: {
      type: actor,
      id: `${actor}_demo`,
    },
    requirements: {
      artifact_ref: null,
      proof_ref: null,
      approval_ref: null,
    },
    audit_event: {
      type: `task.transition.${to}`,
      event_id: `event_${from}_to_${to}`,
      trace_id: "trace_demo",
    },
  };
}

function validTransition(
  from: TaskStateTransition["from"],
  to: TaskStateTransition["to"],
  triggerEvent: string,
): TaskStateTransition {
  const next = transition(from, to, triggerEvent);

  if (to === "artifact_submitted" || to === "proof_submitted") {
    next.requirements.artifact_ref = "artifact_demo";
  }

  if (
    to === "verifying" ||
    to === "waiting_approval" ||
    to === "approved" ||
    to === "pr_created" ||
    to === "completed" ||
    to === "verification_failed"
  ) {
    next.requirements.proof_ref = "proof_demo";
  }

  if (
    to === "approved" ||
    to === "pr_created" ||
    to === "completed" ||
    to === "approval_denied"
  ) {
    next.requirements.approval_ref = "approval_demo";
  }

  if (to === "completed") {
    next.requirements.artifact_ref = "artifact_pr";
  }

  return next;
}

function happyPathSequence() {
  return happyPathTriggers.map((triggerEvent, index) =>
    validTransition(
      happyPathStates[index],
      happyPathStates[index + 1],
      triggerEvent,
    ),
  );
}

test("accepts the MVP happy path", () => {
  let task: TaskState = {
    task_id: "task_demo",
    state: "created",
    risk: "high",
    current_transition_id: null,
  };

  for (const next of happyPathSequence()) {
    const result = applyTaskTransition(task, next);

    equal(result.ok, true);
    equal(result.kind, "applied");
    task = result.task;
  }

  equal(task.state, "completed");
  equal(task.current_transition_id, "transition_pr_created_to_completed");
});

test("rejects approval before verified proof", () => {
  const approval = validTransition("waiting_approval", "approved", "approval.granted");
  approval.requirements.proof_ref = null;

  const result = applyTaskTransition(
    {
      task_id: "task_demo",
      state: "waiting_approval",
      risk: "high",
      current_transition_id: "transition_verifying_to_waiting_approval",
    },
    approval,
  );

  equal(result.ok, false);
  equal(result.code, "missing_proof_ref");
});

test("rejects terminal-state transitions", () => {
  const result = applyTaskTransition(
    {
      task_id: "task_demo",
      state: "completed",
      risk: "high",
      current_transition_id: "transition_pr_created_to_completed",
    },
    validTransition("completed", "cancelled", "task.cancelled"),
  );

  equal(result.ok, false);
  equal(result.code, "terminal_state");
});

test("treats duplicate transition idempotency as no-op when input is identical", () => {
  const task: TaskState = {
    task_id: "task_demo",
    state: "running",
    risk: "high",
    current_transition_id: "transition_worker_dispatched_to_running",
  };
  const next = validTransition("running", "artifact_submitted", "artifact.submitted");
  const applied = applyTaskTransition(task, next);

  equal(applied.ok, true);
  equal(applied.kind, "applied");

  const duplicate = applyTaskTransition(applied.task, { ...next }, { current_transition: next });

  equal(duplicate.ok, true);
  equal(duplicate.kind, "noop");
  deepEqual(duplicate.task, applied.task);
});

test("rejects duplicate no-op when the task or transition uses an unknown state", () => {
  const duplicateUnknownState = validTransition("created", "accepted", "task.accepted");
  duplicateUnknownState.transition_id = "transition_unknown_duplicate";
  duplicateUnknownState.from = "summarizing";
  duplicateUnknownState.to = "summarizing";
  duplicateUnknownState.audit_event.type = "task.transition.summarizing";

  const result = applyTaskTransition(
    {
      task_id: "task_demo",
      state: "summarizing",
      risk: "high",
      current_transition_id: duplicateUnknownState.transition_id,
    },
    duplicateUnknownState,
    { current_transition: duplicateUnknownState },
  );

  equal(result.ok, false);
  equal(result.code, "unknown_state");
});

test("rejects invalid actors, missing refs, and unknown states", () => {
  const wrongActor = validTransition("work_cell_created", "worker_dispatched", "worker.dispatched");
  wrongActor.actor.type = "human";
  equal(
    applyTaskTransition(
      {
        task_id: "task_demo",
        state: "work_cell_created",
        risk: "high",
        current_transition_id: "transition_capability_selected_to_work_cell_created",
      },
      wrongActor,
    ).code,
    "invalid_actor",
  );

  const missingArtifact = validTransition("running", "artifact_submitted", "artifact.submitted");
  missingArtifact.requirements.artifact_ref = null;
  equal(
    applyTaskTransition(
      {
        task_id: "task_demo",
        state: "running",
        risk: "high",
        current_transition_id: "transition_worker_dispatched_to_running",
      },
      missingArtifact,
    ).code,
    "missing_artifact_ref",
  );

  const missingApproval = validTransition("approved", "pr_created", "github.pr.create_requested");
  missingApproval.requirements.approval_ref = null;
  equal(
    applyTaskTransition(
      {
        task_id: "task_demo",
        state: "approved",
        risk: "high",
        current_transition_id: "transition_waiting_approval_to_approved",
      },
      missingApproval,
    ).code,
    "missing_approval_ref",
  );

  const unknownState = validTransition("created", "accepted", "task.accepted");
  unknownState.from = "summarizing";
  equal(
    applyTaskTransition(
      {
        task_id: "task_demo",
        state: "summarizing",
        risk: "high",
        current_transition_id: null,
      },
      unknownState,
    ).code,
    "unknown_state",
  );
});
