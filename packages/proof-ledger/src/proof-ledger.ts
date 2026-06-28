import {
  matchesAnyPath,
  proofArtifactBindingErrors,
  verifyProof,
  type ProofArtifact,
  type ProofLedgerEntry,
  type VerifyProofInput,
} from "./proof-verifier.ts";

type WorkerStatus =
  | "success"
  | "failed"
  | "blocked"
  | "needs_human_input"
  | "malformed";

type WorkerCommandResult = {
  command: string;
  exit_code: number;
  status?: "passed" | "failed" | "skipped";
};

type WorkerFinalOutput = {
  status: Exclude<WorkerStatus, "malformed">;
  task_id: string;
  run_id: string;
  files_changed: Array<{ path: string; action: string }>;
  validation_results: Array<{
    command: string;
    exit_code: number;
    status: "passed" | "failed" | "skipped";
    summary: string;
    log_ref?: string;
  }>;
  diff_summary: {
    summary: string;
  };
  risk_notes: string[];
  rollback_notes: string[];
  ready_for_review: boolean;
};

export type CreateProofFromWorkerArtifactsInput = {
  proof_id: string;
  task_id: string;
  run_id: string;
  trace_id: string;
  created_at: string;
  capability: string;
  forbidden_paths: string[];
  worktree: ProofLedgerEntry["worktree"];
  artifacts: ProofArtifact[];
  worker_result: {
    status: WorkerStatus;
    ready_for_review: boolean;
    code: string;
    reason: string;
    errors: string[];
    artifact_refs: {
      jsonl: string;
      final_output?: string;
    };
    command_results: WorkerCommandResult[];
    final_output?: WorkerFinalOutput;
  };
};

export type CreateProofResult =
  | { ok: true; proof: ProofLedgerEntry }
  | { ok: false; code: string; reason: string; errors: string[] };

export function createProofFromWorkerArtifacts(
  input: CreateProofFromWorkerArtifactsInput,
): CreateProofResult {
  const finalOutput = input.worker_result.final_output;

  if (
    input.worker_result.status !== "success" ||
    input.worker_result.ready_for_review !== true ||
    input.worker_result.code !== "ok"
  ) {
    return fail(
      "worker_not_successful",
      input.worker_result.reason,
      input.worker_result.errors,
    );
  }
  if (!finalOutput) {
    return fail("missing_final_output", "worker final output is required");
  }
  if (finalOutput.task_id !== input.task_id || finalOutput.run_id !== input.run_id) {
    return fail(
      "mismatched_worker_identity",
      "worker final output task_id/run_id must match the proof request",
    );
  }
  if (finalOutput.validation_results.length === 0) {
    return fail("missing_validation", "proof requires validation evidence");
  }
  if (!input.worker_result.artifact_refs.final_output) {
    return fail(
      "missing_worker_artifact_ref",
      "worker final output artifact ref is required",
    );
  }
  if (finalOutput.risk_notes.length === 0) {
    return fail("missing_risk_notes", "proof requires risk notes");
  }
  if (finalOutput.rollback_notes.length === 0) {
    return fail("missing_rollback_notes", "proof requires rollback notes");
  }

  const forbiddenPath = finalOutput.files_changed.find((file) =>
    matchesAnyPath(file.path, input.forbidden_paths),
  );

  if (forbiddenPath) {
    return fail(
      "forbidden_path_change",
      `forbidden path changed: ${forbiddenPath.path}`,
    );
  }

  const unbackedValidation = finalOutput.validation_results.find(
    (validation) =>
      !input.worker_result.command_results.some(
        (command) =>
          command.command === validation.command &&
          command.exit_code === validation.exit_code,
      ),
  );

  if (unbackedValidation) {
    return fail(
      "unbacked_validation",
      `validation is not backed by command evidence: ${unbackedValidation.command}`,
    );
  }

  const bindingErrors = proofArtifactBindingErrors({
    artifacts: input.artifacts,
    required_refs: [
      input.worker_result.artifact_refs.jsonl,
      input.worker_result.artifact_refs.final_output,
      ...finalOutput.validation_results.flatMap((validation) =>
        validation.log_ref ? [validation.log_ref] : [],
      ),
    ],
  });

  if (bindingErrors.length > 0) {
    const code = bindingErrors[0] ?? "proof_artifact_binding_failed";

    return fail(code, "proof artifact refs are not bound", bindingErrors);
  }

  const proof: ProofLedgerEntry = {
    proof_id: input.proof_id,
    task_id: input.task_id,
    run_id: input.run_id,
    trace_id: input.trace_id,
    created_at: input.created_at,
    capability: input.capability,
    worktree: input.worktree,
    summary: finalOutput.diff_summary.summary,
    artifacts: input.artifacts,
    validation: finalOutput.validation_results.map((validation) => {
      const result = {
        command: validation.command,
        exit_code: validation.exit_code,
        status: validation.status,
      };

      return validation.log_ref
        ? { ...result, log_ref: validation.log_ref }
        : result;
    }),
    risk_notes: finalOutput.risk_notes,
    rollback_notes: finalOutput.rollback_notes,
  };
  const verification = verifyProof({
    proof,
    expected: {
      task_id: input.task_id,
      run_id: input.run_id,
      trace_id: input.trace_id,
      forbidden_paths: input.forbidden_paths,
    },
    changed_files: finalOutput.files_changed,
  });

  if (!verification.ok) {
    const code = verification.errors[0] ?? "proof_verification_failed";

    return fail(code, "proof verification failed", verification.errors);
  }

  return { ok: true, proof };
}

export function createInMemoryProofLedger() {
  const entries = new Map<string, ProofLedgerEntry>();

  return {
    append(
      proof: ProofLedgerEntry,
      options: Omit<VerifyProofInput, "proof"> = {},
    ): CreateProofResult {
      const verification = verifyProof({ ...options, proof });

      if (!verification.ok) {
        const code = verification.errors[0] ?? "proof_verification_failed";

        return fail(code, "proof verification failed", verification.errors);
      }

      entries.set(proof.proof_id, proof);

      return { ok: true, proof };
    },
    get(proofId: string) {
      return entries.get(proofId);
    },
    list() {
      return [...entries.values()];
    },
  };
}

function fail(
  code: string,
  reason: string,
  errors: string[] = [code],
): CreateProofResult {
  return { ok: false, code, reason, errors };
}
