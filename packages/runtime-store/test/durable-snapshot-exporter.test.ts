import { equal, match, throws } from "node:assert/strict";
import test from "node:test";

import { createSchemaValidator, loadJsonSchema } from "runtime-contracts";
import {
  createInMemoryTaskStore,
  exportRuntimeStoreSnapshot,
  type ArtifactRefRecord,
  type ApprovalRefRecord,
  type ProofRefRecord,
  type TaskSnapshot,
} from "runtime-store";
import type { TaskStateTransition } from "state-machine";

const schema = loadJsonSchema(
  new URL("../../../schemas/runtime/runtime-store.schema.json", import.meta.url),
);
const validateSnapshot = createSchemaValidator(schema);

test("exports a durable runtime-store schema snapshot", () => {
  const store = populatedStore();
  const snapshot = exportRuntimeStoreSnapshot(store, snapshotOptions());
  const validation = validateSnapshot(snapshot);

  equal(validation.valid, true, validation.valid ? "" : validation.errors.join("\n"));
  equal(snapshot.source_of_truth, "runtime");
  equal(snapshot.tasks[0]?.workspace_id, "ws_demo");
  equal(snapshot.task_transitions[0]?.occurred_at, "2026-06-29T00:10:00.000Z");
  equal(snapshot.idempotency_keys[0]?.result_ref, "transition:transition_running_to_artifact_submitted");
});

test("exports refs only and strips raw bodies carried by callers", () => {
  const store = populatedStore({
    transitionExtras: {
      artifact: { body: "diff --git a/secret b/secret" },
      proof: { body: "stderr: leaked validation log" },
    },
    snapshotExtras: {
      raw_matrix_event_body: { content: "GITHUB_TOKEN=ghp_secret" },
    },
  });
  const snapshot = exportRuntimeStoreSnapshot(
    store,
    snapshotOptions({
      artifactExtra: { raw_body: "diff --git a/file b/file" },
      proofExtra: { raw_log: "stderr: failed with DATABASE_URL=postgres://example" },
      approvalExtra: { raw_secret: "GITHUB_TOKEN=ghp_secret" },
    }),
  );
  const serialized = JSON.stringify(snapshot);
  const validation = validateSnapshot(snapshot);

  equal(validation.valid, true, validation.valid ? "" : validation.errors.join("\n"));
  equal(serialized.includes("diff --git"), false);
  equal(serialized.includes("stderr:"), false);
  equal(serialized.includes("DATABASE_URL="), false);
  equal(serialized.includes("GITHUB_TOKEN"), false);
  match(serialized, /artifact_demo/);
  match(serialized, /proof_demo/);
  match(serialized, /approval_demo/);
});

test("rejects unsafe strings that would become exported snapshot fields", () => {
  const store = populatedStore({
    commandId: "cmd_GITHUB_TOKEN_ghp_secret",
  });

  throws(
    () => exportRuntimeStoreSnapshot(store, snapshotOptions()),
    /unsafe runtime store snapshot string/,
  );
});

function populatedStore(
  overrides: {
    commandId?: string;
    snapshotExtras?: Record<string, unknown>;
    transitionExtras?: Record<string, unknown>;
  } = {},
) {
  const store = createInMemoryTaskStore();

  store.putTaskSnapshot({
    ...taskSnapshot(),
    ...overrides.snapshotExtras,
  } as TaskSnapshot);

  const result = store.appendTransition({
    command_id: overrides.commandId ?? "cmd_artifact",
    task_id: "task_demo",
    expected_state: "running",
    occurred_at: "2026-06-29T00:10:00.000Z",
    transition: {
      ...artifactTransition(),
      ...overrides.transitionExtras,
    } as TaskStateTransition,
  });

  equal(result.ok, true);

  return store;
}

function taskSnapshot(): TaskSnapshot {
  return {
    task_id: "task_demo",
    workspace_id: "ws_demo",
    trace_id: "trace_demo",
    state: "running",
    risk: "high",
    current_transition_id: "transition_worker_dispatched_to_running",
    source_matrix_event_ref: "matrix-event://events/event_demo",
    created_at: "2026-06-29T00:00:00.000Z",
    updated_at: "2026-06-29T00:00:00.000Z",
    artifact_refs: [],
    proof_refs: [],
    approval_refs: ["approval_demo"],
  } as TaskSnapshot;
}

function artifactTransition(): TaskStateTransition {
  return {
    transition_id: "transition_running_to_artifact_submitted",
    task_id: "task_demo",
    from: "running",
    to: "artifact_submitted",
    trigger_event: "artifact.submitted",
    actor: {
      type: "worker",
      id: "worker_demo",
    },
    requirements: {
      artifact_ref: "artifact_demo",
      proof_ref: null,
      approval_ref: null,
    },
    audit_event: {
      type: "task.transition.artifact_submitted",
      event_id: "event_artifact_submitted",
      trace_id: "trace_demo",
    },
  };
}

function snapshotOptions(
  extras: {
    artifactExtra?: Record<string, unknown>;
    proofExtra?: Record<string, unknown>;
    approvalExtra?: Record<string, unknown>;
  } = {},
) {
  return {
    store_id: "runtime_store_export_test",
    created_at: "2026-06-29T00:11:00.000Z",
    artifact_refs: [
      {
        record_type: "artifact_ref",
        artifact_id: "artifact_demo",
        task_id: "task_demo",
        run_id: "run_demo",
        kind: "patch",
        uri: "artifact://runs/run_demo/diff.patch",
        sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        size_bytes: 512,
        content_type: "text/x-diff",
        created_at: "2026-06-29T00:07:00.000Z",
        ...extras.artifactExtra,
      } as ArtifactRefRecord,
    ],
    proof_refs: [
      {
        record_type: "proof_ref",
        proof_id: "proof_demo",
        task_id: "task_demo",
        run_id: "run_demo",
        trace_id: "trace_demo",
        status: "verified",
        ledger_uri: "proof://proofs/proof_demo",
        artifact_refs: ["artifact_demo"],
        validation_summary: {
          command_count: 1,
          failed_count: 0,
          log_refs: ["artifact://runs/run_demo/pnpm-test.log"],
        },
        created_at: "2026-06-29T00:08:00.000Z",
        verified_at: "2026-06-29T00:09:00.000Z",
        ...extras.proofExtra,
      } as ProofRefRecord,
    ],
    approval_refs: [
      {
        record_type: "approval_ref",
        approval_id: "approval_demo",
        task_id: "task_demo",
        proof_id: "proof_demo",
        action: "create_pr",
        status: "granted",
        actor: {
          type: "human",
          id: "human_owner",
        },
        target: {
          type: "pull_request",
          ref: "refs/heads/mcr/MCR-105/runtime-store-snapshot-exporter",
          base_ref: "main",
          operation: "create pull request",
        },
        conditions: ["one action only"],
        replay_key_hash: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        created_at: "2026-06-29T00:09:00.000Z",
        expires_at: "2026-06-29T01:09:00.000Z",
        used_at: null,
        ...extras.approvalExtra,
      } as ApprovalRefRecord,
    ],
  };
}
