import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  ajv.addSchema(readJson("schemas/runtime/task.schema.json"));
  ajv.addSchema(readJson("schemas/runtime/task-state-transition.schema.json"));
  return ajv;
}

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
];

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
];

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
};

function baseTransition(from, to, triggerEvent) {
  return {
    transition_id: `transition_${from}_to_${to}`,
    task_id: "task_demo",
    from,
    to,
    trigger_event: triggerEvent,
    actor: {
      type: actors[to],
      id: `${actors[to]}_demo`,
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

function happyPathSequence() {
  return happyPathTriggers.map((triggerEvent, index) => {
    const transition = baseTransition(
      happyPathStates[index],
      happyPathStates[index + 1],
      triggerEvent,
    );

    if (
      transition.to === "artifact_submitted" ||
      transition.to === "proof_submitted"
    ) {
      transition.requirements.artifact_ref = "artifact_demo";
    }

    if (transition.to === "verifying" || transition.to === "waiting_approval") {
      transition.requirements.proof_ref = "proof_demo";
    }

    if (transition.to === "approved" || transition.to === "pr_created") {
      transition.requirements.proof_ref = "proof_demo";
      transition.requirements.approval_ref = "approval_demo";
    }

    if (transition.to === "completed") {
      transition.requirements.artifact_ref = "artifact_pr";
      transition.requirements.proof_ref = "proof_demo";
      transition.requirements.approval_ref = "approval_demo";
    }

    return transition;
  });
}

test("schemas define the task lifecycle contract", () => {
  const ajv = createAjv();

  assert.equal(
    ajv.validateSchema(readJson("schemas/runtime/task.schema.json")),
    true,
  );
  assert.equal(
    ajv.validateSchema(readJson("schemas/runtime/task-state-transition.schema.json")),
    true,
  );
});

test("validates the MVP happy-path task sequence", () => {
  const ajv = createAjv();
  const validateTask = ajv.getSchema("https://notyet.dev/schemas/runtime/task.schema.json");
  const validateTransition = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-state-transition.schema.json",
  );

  const task = {
    task_id: "task_demo",
    state: "created",
    risk: "high",
    current_transition_id: null,
  };

  assert.equal(validateTask(task), true, JSON.stringify(validateTask.errors, null, 2));

  for (const transition of happyPathSequence()) {
    assert.equal(transition.from, task.state);
    assert.equal(
      validateTransition(transition),
      true,
      JSON.stringify(validateTransition.errors, null, 2),
    );
    task.state = transition.to;
    task.current_transition_id = transition.transition_id;
  }

  assert.equal(task.state, "completed");
  assert.equal(validateTask(task), true, JSON.stringify(validateTask.errors, null, 2));
});

test("rejects illegal task transitions", () => {
  const ajv = createAjv();
  const validateTransition = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-state-transition.schema.json",
  );

  const skippedScoping = baseTransition("accepted", "worker_dispatched", "worker.dispatched");
  assert.equal(validateTransition(skippedScoping), false);

  const wrongActor = baseTransition("work_cell_created", "worker_dispatched", "worker.dispatched");
  wrongActor.actor.type = "human";
  assert.equal(validateTransition(wrongActor), false);
});

test("rejects transition with mismatched audit event type", () => {
  const ajv = createAjv();
  const validateTransition = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-state-transition.schema.json",
  );

  const scoped = baseTransition("accepted", "scoped", "task.scoped");
  scoped.audit_event.type = "task.transition.approved";

  assert.equal(validateTransition(scoped), false);
});

test("rejects artifact submission without artifact ref", () => {
  const ajv = createAjv();
  const validateTransition = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-state-transition.schema.json",
  );

  const artifactSubmitted = baseTransition(
    "running",
    "artifact_submitted",
    "artifact.submitted",
  );

  assert.equal(validateTransition(artifactSubmitted), false);
});

test("rejects high-risk irreversible action without explicit approval", () => {
  const ajv = createAjv();
  const validateTransition = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-state-transition.schema.json",
  );

  const prCreation = baseTransition("approved", "pr_created", "github.pr.create_requested");
  prCreation.requirements.proof_ref = "proof_demo";

  assert.equal(validateTransition(prCreation), false);

  prCreation.requirements.approval_ref = "approval_demo";
  assert.equal(
    validateTransition(prCreation),
    true,
    JSON.stringify(validateTransition.errors, null, 2),
  );
});

test("rejects unknown states and unknown transition pairs", () => {
  const ajv = createAjv();
  const validateTask = ajv.getSchema("https://notyet.dev/schemas/runtime/task.schema.json");
  const validateTransition = ajv.getSchema(
    "https://notyet.dev/schemas/runtime/task-state-transition.schema.json",
  );

  assert.equal(
    validateTask({
      task_id: "task_demo",
      state: "summarizing",
      risk: "low",
      current_transition_id: null,
    }),
    false,
  );

  assert.equal(
    validateTransition(baseTransition("created", "completed", "task.completed")),
    false,
  );
});
