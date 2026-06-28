import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSchemaValidator, loadJsonSchema } from "runtime-contracts";

export type ProofArtifact = {
  kind: "patch" | "log" | "report" | "schema" | "fixture";
  uri: string;
  sha256: string;
};

export type ProofValidation = {
  command: string;
  exit_code: number;
  status: "passed" | "failed" | "skipped";
  log_ref?: string;
};

export type ProofLedgerEntry = {
  proof_id: string;
  task_id: string;
  run_id: string;
  trace_id: string;
  created_at: string;
  capability: string;
  worktree: {
    path: string;
    branch: string;
    base_branch: string;
    base_sha: string;
    head_sha: string;
    cleanup_status:
      | "kept_for_review"
      | "removed_after_merge"
      | "removed_after_cancel"
      | "removed_after_failure";
  };
  summary: string;
  artifacts: ProofArtifact[];
  validation: ProofValidation[];
  risk_notes: string[];
  rollback_notes: string[];
};

export type VerifyProofInput = {
  proof: ProofLedgerEntry;
  expected?: {
    task_id?: string;
    run_id?: string;
    trace_id?: string;
    forbidden_paths?: string[];
  };
  changed_files?: Array<{ path: string }>;
  log_contents_by_ref?: Record<string, string>;
};

export type VerifyProofResult =
  | { ok: true; ready_for_approval: true; errors: [] }
  | { ok: false; ready_for_approval: false; errors: string[] };

export type ProofArtifactBindingInput = {
  artifacts: Pick<ProofArtifact, "uri">[];
  required_refs: string[];
};

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const validateProofSchema = createSchemaValidator(
  loadJsonSchema(path.join(root, "schemas/proof/proof-ledger-entry.schema.json")),
);

export function proofArtifactBindingErrors(
  input: ProofArtifactBindingInput,
): string[] {
  const artifactUris = new Set(input.artifacts.map((artifact) => artifact.uri));
  const errors: string[] = [];

  for (const ref of input.required_refs) {
    if (hasPathTraversal(ref)) {
      errors.push("path_traversal_artifact_ref");
    }
    if (!artifactUris.has(ref)) {
      errors.push("missing_worker_artifact_ref");
    }
  }

  return [...new Set(errors)];
}

export function verifyProof(input: VerifyProofInput): VerifyProofResult {
  const errors: string[] = [];
  const { proof } = input;
  const schemaResult = validateProofSchema(proof);

  if (!schemaResult.valid) {
    errors.push("schema_invalid");
  }

  if (input.expected?.task_id && proof.task_id !== input.expected.task_id) {
    errors.push("mismatched_task_id");
  }
  if (input.expected?.run_id && proof.run_id !== input.expected.run_id) {
    errors.push("mismatched_run_id");
  }
  if (input.expected?.trace_id && proof.trace_id !== input.expected.trace_id) {
    errors.push("mismatched_trace_id");
  }

  if (proof.artifacts.length === 0) {
    errors.push("missing_artifacts");
  }
  for (const artifact of proof.artifacts) {
    if (hasPathTraversal(artifact.uri)) {
      errors.push("path_traversal_artifact_ref");
    }
    if (!/^[a-f0-9]{64}$/.test(artifact.sha256)) {
      errors.push("missing_artifact_hash");
    }
  }

  if (proof.validation.length === 0) {
    errors.push("missing_validation");
  }
  if (
    !proof.validation.some(
      (validation) => validation.status === "passed" && validation.exit_code === 0,
    )
  ) {
    errors.push("missing_passing_validation");
  }

  for (const validation of proof.validation) {
    if (!validation.log_ref) {
      errors.push("missing_validation_log_ref");
      continue;
    }
    if (hasPathTraversal(validation.log_ref)) {
      errors.push("path_traversal_artifact_ref");
    }
    const logContent = input.log_contents_by_ref?.[validation.log_ref];
    if (logContent && containsSecret(logContent)) {
      errors.push("secret_bearing_log");
    }
  }

  if (proof.risk_notes.length === 0) {
    errors.push("missing_risk_notes");
  }
  if (proof.rollback_notes.length === 0) {
    errors.push("missing_rollback_notes");
  }

  for (const changedFile of input.changed_files ?? []) {
    if (matchesAnyPath(changedFile.path, input.expected?.forbidden_paths ?? [])) {
      errors.push("forbidden_path_change");
    }
  }

  const uniqueErrors = [...new Set(errors)];

  if (uniqueErrors.length > 0) {
    return { ok: false, ready_for_approval: false, errors: uniqueErrors };
  }

  return { ok: true, ready_for_approval: true, errors: [] };
}

export function matchesAnyPath(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPathPattern(value, pattern));
}

function matchesPathPattern(value: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    return value === pattern.slice(0, -3) || value.startsWith(pattern.slice(0, -2));
  }
  if (pattern.endsWith("*")) {
    return value.startsWith(pattern.slice(0, -1));
  }
  return value === pattern;
}

function hasPathTraversal(value: string): boolean {
  const decoded = safeDecodeUri(value);

  return (
    /^file:/i.test(decoded) ||
    /(^|[/\\])\.\.($|[/\\])/.test(decoded)
  );
}

function safeDecodeUri(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function containsSecret(value: string): boolean {
  return (
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/.test(value) ||
    /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/i.test(value)
  );
}
