import { deepEqual, equal, match } from "node:assert/strict";
import test from "node:test";

import {
  createInMemoryTaskStore,
  type TaskSnapshot,
} from "runtime-store";
import type { TaskStateTransition } from "state-machine";

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

function snapshot(overrides: Partial<TaskSnapshot> = {}): TaskSnapshot {
  return {
    task_id: "task_demo",
    state: "running",
    risk: "medium",
    current_transition_id: "transition_worker_dispatched_to_running",
    artifact_refs: [],
    proof_refs: [],
    approval_refs: [],
    ...overrides,
  };
}

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

test("persists one task snapshot and append-only transition records", () => {
  const store = createInMemoryTaskStore();

  store.putTaskSnapshot(snapshot());

  deepEqual(store.getTaskSnapshot("task_demo"), snapshot());

  const artifact = validTransition("running", "artifact_submitted", "artifact.submitted");
  artifact.requirements.artifact_ref = "artifact_1";

  const first = store.appendTransition({
    command_id: "cmd_artifact",
    task_id: "task_demo",
    expected_state: "running",
    transition: artifact,
  });

  equal(first.ok, true);
  deepEqual(store.getTaskSnapshot("task_demo")?.artifact_refs, ["artifact_1"]);

  const proof = validTransition("artifact_submitted", "proof_submitted", "proof.submitted");
  proof.requirements.artifact_ref = "artifact_2";

  const second = store.appendTransition({
    command_id: "cmd_proof",
    task_id: "task_demo",
    expected_state: "artifact_submitted",
    transition: proof,
  });

  equal(second.ok, true);

  const records = store.listTransitionRecords("task_demo");

  equal(records.length, 2);
  deepEqual(
    records.map((record) => [record.sequence, record.command_id, record.transition.transition_id]),
    [
      [1, "cmd_artifact", "transition_running_to_artifact_submitted"],
      [2, "cmd_proof", "transition_artifact_submitted_to_proof_submitted"],
    ],
  );
});

test("rejects stale expected-state writes", () => {
  const store = createInMemoryTaskStore();

  store.putTaskSnapshot(snapshot());

  const result = store.appendTransition({
    command_id: "cmd_stale",
    task_id: "task_demo",
    expected_state: "worker_dispatched",
    transition: validTransition("running", "artifact_submitted", "artifact.submitted"),
  });

  equal(result.ok, false);
  equal(result.code, "stale_expected_state");
  equal(store.listTransitionRecords("task_demo").length, 0);
  equal(store.getTaskSnapshot("task_demo")?.state, "running");
});

test("duplicate command idempotency returns the prior result", () => {
  const store = createInMemoryTaskStore();

  store.putTaskSnapshot(snapshot());

  const first = store.appendTransition({
    command_id: "cmd_once",
    task_id: "task_demo",
    expected_state: "running",
    transition: validTransition("running", "artifact_submitted", "artifact.submitted"),
  });

  const duplicate = store.appendTransition({
    command_id: "cmd_once",
    task_id: "task_demo",
    expected_state: "created",
    transition: validTransition("created", "accepted", "task.accepted"),
  });

  deepEqual(duplicate, first);
  equal(store.listTransitionRecords("task_demo").length, 1);
  equal(store.getTaskSnapshot("task_demo")?.state, "artifact_submitted");
});

test("stores artifact, proof, and approval ids as refs, not bodies", () => {
  const store = createInMemoryTaskStore();

  store.putTaskSnapshot(snapshot({ task_id: "task_artifact" }));
  store.putTaskSnapshot(
    snapshot({
      task_id: "task_proof",
      state: "proof_submitted",
      current_transition_id: "transition_artifact_submitted_to_proof_submitted",
    }),
  );
  store.putTaskSnapshot(
    snapshot({
      task_id: "task_approval",
      state: "waiting_approval",
      current_transition_id: "transition_verifying_to_waiting_approval",
    }),
  );

  const artifact = withBody(
    validTransition("running", "artifact_submitted", "artifact.submitted"),
    "artifact",
    "raw diff body",
  );
  artifact.task_id = "task_artifact";
  artifact.requirements.artifact_ref = "artifact_ref_1";

  const proof = withBody(
    validTransition("proof_submitted", "verifying", "verification.started"),
    "proof",
    "raw proof body",
  );
  proof.task_id = "task_proof";
  proof.requirements.proof_ref = "proof_ref_1";

  const approval = withBody(
    validTransition("waiting_approval", "approved", "approval.granted"),
    "approval",
    "raw approval body",
  );
  approval.task_id = "task_approval";
  approval.requirements.proof_ref = "proof_ref_2";
  approval.requirements.approval_ref = "approval_ref_1";

  equal(
    store.appendTransition({
      command_id: "cmd_artifact_ref",
      task_id: "task_artifact",
      expected_state: "running",
      transition: artifact,
    }).ok,
    true,
  );
  equal(
    store.appendTransition({
      command_id: "cmd_proof_ref",
      task_id: "task_proof",
      expected_state: "proof_submitted",
      transition: proof,
    }).ok,
    true,
  );
  equal(
    store.appendTransition({
      command_id: "cmd_approval_ref",
      task_id: "task_approval",
      expected_state: "waiting_approval",
      transition: approval,
    }).ok,
    true,
  );

  deepEqual(store.getTaskSnapshot("task_artifact")?.artifact_refs, ["artifact_ref_1"]);
  deepEqual(store.getTaskSnapshot("task_proof")?.proof_refs, ["proof_ref_1"]);
  deepEqual(store.getTaskSnapshot("task_approval")?.approval_refs, ["approval_ref_1"]);

  const stored = JSON.stringify([
    store.getTaskSnapshot("task_artifact"),
    store.getTaskSnapshot("task_proof"),
    store.getTaskSnapshot("task_approval"),
    store.listTransitionRecords("task_artifact"),
    store.listTransitionRecords("task_proof"),
    store.listTransitionRecords("task_approval"),
  ]);

  match(stored, /artifact_ref_1/);
  match(stored, /proof_ref_1/);
  match(stored, /approval_ref_1/);
  equal(stored.includes("raw diff body"), false);
  equal(stored.includes("raw proof body"), false);
  equal(stored.includes("raw approval body"), false);
});

function withBody(
  next: TaskStateTransition,
  key: "artifact" | "proof" | "approval",
  body: string,
): TaskStateTransition {
  return {
    ...next,
    [key]: { body },
  } as TaskStateTransition;
}
