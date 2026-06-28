import assert from "node:assert/strict";
import test from "node:test";

import {
  createInMemoryProofLedger,
  createProofFromWorkerArtifacts,
  verifyProof,
  type CreateProofFromWorkerArtifactsInput,
} from "proof-ledger";

const hash = (value: string) => value.repeat(64);

const expected = {
  task_id: "task_mcr_400",
  run_id: "run_mcr_400_001",
  trace_id: "trace_mcr_400_001",
  forbidden_paths: ["schemas/proof/**", ".env*"],
};

const safeLogContents = {
  "https://object.local/logs/run_mcr_400_001.txt":
    "pnpm --filter proof-ledger test\nexit_code=0\n",
};

function baseInput(): CreateProofFromWorkerArtifactsInput {
  return {
    proof_id: "proof_mcr_400_001",
    task_id: expected.task_id,
    run_id: expected.run_id,
    trace_id: expected.trace_id,
    created_at: "2026-06-28T13:30:00Z",
    capability: "proof.verify",
    forbidden_paths: expected.forbidden_paths,
    worktree: {
      path: "../.worktrees/Carpet/MCR-400-proof-ledger-verifier",
      branch: "mcr/MCR-400/proof-ledger-verifier",
      base_branch: "main",
      base_sha: "9f865cfd9de8d56d4423d075ba90d0d0984317f7",
      head_sha: "9f865cfd9de8d56d4423d075ba90d0d0984317f7",
      cleanup_status: "kept_for_review",
    },
    artifacts: [
      {
        kind: "log",
        uri: "https://object.local/artifacts/run_mcr_400_001.jsonl",
        sha256: hash("d"),
      },
      {
        kind: "patch",
        uri: "https://object.local/artifacts/run_mcr_400_001.patch",
        sha256: hash("a"),
      },
      {
        kind: "log",
        uri: "https://object.local/logs/run_mcr_400_001.txt",
        sha256: hash("b"),
      },
      {
        kind: "report",
        uri: "https://object.local/artifacts/run_mcr_400_001-output.json",
        sha256: hash("c"),
      },
    ],
    worker_result: {
      status: "success",
      ready_for_review: true,
      code: "ok",
      reason: "worker completed with validation evidence",
      errors: [],
      artifact_refs: {
        jsonl: "https://object.local/artifacts/run_mcr_400_001.jsonl",
        final_output: "https://object.local/artifacts/run_mcr_400_001-output.json",
      },
      command_results: [
        {
          command: "pnpm --filter proof-ledger test",
          exit_code: 0,
          status: "passed",
        },
      ],
      final_output: {
        status: "success",
        task_id: expected.task_id,
        run_id: expected.run_id,
        root_cause: "MCR-400 needed a concrete proof verifier slice.",
        changes_made: ["Added proof ledger tests and implementation."],
        files_changed: [
          {
            path: "packages/proof-ledger/src/proof-verifier.ts",
            action: "added",
          },
        ],
        commands_run: [
          {
            command: "pnpm --filter proof-ledger test",
            exit_code: 0,
            summary: "Proof verifier tests passed.",
            log_ref: "https://object.local/logs/run_mcr_400_001.txt",
          },
        ],
        validation_results: [
          {
            command: "pnpm --filter proof-ledger test",
            exit_code: 0,
            status: "passed",
            summary: "Proof verifier tests passed.",
            log_ref: "https://object.local/logs/run_mcr_400_001.txt",
          },
        ],
        diff_summary: {
          summary: "Proof ledger package added.",
          files_added: 3,
          files_modified: 0,
          files_deleted: 0,
        },
        risk_notes: ["In-memory proof ledger only; no database persistence."],
        rollback_notes: ["Remove packages/proof-ledger/**."],
        security_notes: ["No raw logs are stored in Matrix proof projections."],
        blockers: [],
        memory_update_proposals: [],
        ready_for_review: true,
      },
    },
  };
}

test("accepts proof with artifact refs, hashes, worktree provenance, validation, risk, and rollback evidence", () => {
  const built = createProofFromWorkerArtifacts(baseInput());

  assert.equal(built.ok, true);
  if (!built.ok) {
    throw new Error(built.reason);
  }

  assert.equal(built.proof.task_id, expected.task_id);
  assert.equal(built.proof.run_id, expected.run_id);
  assert.equal(built.proof.artifacts.length, 4);
  assert.equal(
    built.proof.artifacts.every((artifact) => artifact.sha256.length === 64),
    true,
  );
  assert.equal(built.proof.worktree.branch, "mcr/MCR-400/proof-ledger-verifier");
  assert.deepEqual(built.proof.validation, [
    {
      command: "pnpm --filter proof-ledger test",
      exit_code: 0,
      status: "passed",
      log_ref: "https://object.local/logs/run_mcr_400_001.txt",
    },
  ]);
  assert.deepEqual(built.proof.risk_notes, [
    "In-memory proof ledger only; no database persistence.",
  ]);
  assert.deepEqual(built.proof.rollback_notes, [
    "Remove packages/proof-ledger/**.",
  ]);

  const verification = verifyProof({
    proof: built.proof,
    expected,
    log_contents_by_ref: safeLogContents,
  });

  assert.deepEqual(verification, {
    ok: true,
    ready_for_approval: true,
    errors: [],
  });

  const ledger = createInMemoryProofLedger();
  const append = ledger.append(built.proof, {
    expected,
    log_contents_by_ref: safeLogContents,
  });

  assert.equal(append.ok, true);
  assert.deepEqual(ledger.get("proof_mcr_400_001"), built.proof);
});

test("rejects fake proof when validation is not backed by command evidence", () => {
  const input = baseInput();
  input.worker_result.command_results = [];

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "unbacked_validation");
  }
});

test("rejects missing validation", () => {
  const input = baseInput();
  input.worker_result.final_output!.validation_results = [];

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "missing_validation");
  }
});

test("rejects path traversal artifact refs", () => {
  const input = baseInput();
  const artifactIndex = input.artifacts.findIndex(
    (artifact) => artifact.kind === "patch",
  );
  const firstArtifact = input.artifacts[artifactIndex];

  assert.ok(firstArtifact);
  input.artifacts[artifactIndex] = {
    ...firstArtifact,
    uri: "https://object.local/artifacts/../secret.txt",
  };

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "path_traversal_artifact_ref");
  }
});

test("rejects missing worker JSONL artifact", () => {
  const input = baseInput();
  input.artifacts = input.artifacts.filter(
    (artifact) => artifact.uri !== input.worker_result.artifact_refs.jsonl,
  );

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "missing_worker_artifact_ref");
  }
});

test("rejects missing final output artifact", () => {
  const input = baseInput();
  input.artifacts = input.artifacts.filter(
    (artifact) => artifact.uri !== input.worker_result.artifact_refs.final_output,
  );

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "missing_worker_artifact_ref");
  }
});

test("rejects missing validation log artifact", () => {
  const input = baseInput();
  const logRef = input.worker_result.final_output!.validation_results[0]!.log_ref;
  input.artifacts = input.artifacts.filter((artifact) => artifact.uri !== logRef);

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "missing_worker_artifact_ref");
  }
});

test("rejects path traversal worker artifact refs", () => {
  const input = baseInput();
  input.worker_result.artifact_refs.jsonl =
    "https://object.local/artifacts/../run_mcr_400_001.jsonl";

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "path_traversal_artifact_ref");
  }
});

test("rejects forbidden path changes", () => {
  const input = baseInput();
  input.worker_result.final_output!.files_changed = [
    {
      path: "schemas/proof/proof-ledger-entry.schema.json",
      action: "modified",
    },
  ];

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "forbidden_path_change");
  }
});

test("rejects mismatched task or run ids", () => {
  const input = baseInput();
  input.worker_result.final_output!.run_id = "run_other";

  const built = createProofFromWorkerArtifacts(input);

  assert.equal(built.ok, false);
  if (!built.ok) {
    assert.equal(built.code, "mismatched_worker_identity");
  }
});

test("rejects secret-bearing logs without storing raw log content in proof", () => {
  const built = createProofFromWorkerArtifacts(baseInput());

  assert.equal(built.ok, true);
  if (!built.ok) {
    throw new Error(built.reason);
  }

  const verification = verifyProof({
    proof: built.proof,
    expected,
    log_contents_by_ref: {
      "https://object.local/logs/run_mcr_400_001.txt":
        "OPENAI_API_KEY=sk-proj-this-should-not-be-proof",
    },
  });

  assert.equal(verification.ok, false);
  assert.deepEqual(verification.errors, ["secret_bearing_log"]);
  assert.equal(JSON.stringify(built.proof).includes("sk-proj"), false);
});

test("rejects proof without risk or rollback notes", () => {
  const missingRisk = baseInput();
  missingRisk.worker_result.final_output!.risk_notes = [];
  const riskResult = createProofFromWorkerArtifacts(missingRisk);

  assert.equal(riskResult.ok, false);
  if (!riskResult.ok) {
    assert.equal(riskResult.code, "missing_risk_notes");
  }

  const missingRollback = baseInput();
  missingRollback.worker_result.final_output!.rollback_notes = [];
  const rollbackResult = createProofFromWorkerArtifacts(missingRollback);

  assert.equal(rollbackResult.ok, false);
  if (!rollbackResult.ok) {
    assert.equal(rollbackResult.code, "missing_rollback_notes");
  }
});
