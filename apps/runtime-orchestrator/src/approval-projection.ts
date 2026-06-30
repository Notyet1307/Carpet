import { isDeepStrictEqual } from "node:util";

import type { ApprovalRecord } from "../../../packages/approval-gate/src/index.ts";

export type RuntimeApprovalProjection = {
  projection_id: string;
  approval_id: string;
  task_id: string;
  proof_id: string;
  run_id: string;
  trace_id: string;
  source_of_truth: "runtime";
  boundary: "matrix_projection";
  action: "create_pr";
  target: PullRequestProjectionTarget;
  requested_at: string;
  expires_at: string;
  risk_notes: string[];
  rollback_notes: string[];
  validation_summary: ValidationSummary[];
};

export type RuntimeApprovalProjectionInput = {
  approval_id: string;
  task_id: string;
  proof_id: string;
  run_id: string;
  trace_id: string;
  action: string;
  target: unknown;
  requested_at: string;
  expires_at: string;
  risk_notes: string[];
  rollback_notes: string[];
  validation_summary: ValidationSummary[];
};

export type RuntimeApprovalProjectionResult =
  | { ok: true; projection: RuntimeApprovalProjection }
  | { ok: false; code: "invalid_projection" | "forbidden_action"; reason: string };

export type RuntimeApprovalIntakeErrorCode =
  | "invalid_projection"
  | "invalid_approval"
  | "vague_approval"
  | "forbidden_action"
  | "approval_expired"
  | "approval_mismatch"
  | "approval_replayed";

export type RuntimeApprovalIntakeResult =
  | { ok: true; approval: ApprovalRecord }
  | { ok: false; code: RuntimeApprovalIntakeErrorCode; reason: string };

export type RuntimeApprovalIntakeOptions = {
  now?: () => Date;
};

type PullRequestProjectionTarget = {
  type: "pull_request";
  ref: string;
  base_ref: string;
  repository?: string;
};

type RuntimeApprovalResponse = {
  approval_id: string;
  task_id: string;
  proof_id: string;
  run_id: string;
  action: string;
  actor: {
    type: string;
    id: string;
  };
  target: Record<string, unknown>;
  approved_at: string;
};

type ValidationSummary = {
  command: string;
  status: string;
  exit_code: number;
};

const executableActions = new Set(["create_pr"]);
const vagueActionPattern = /^(task|all|everything)\.|^approve$/;
const allowedValidationStatuses = new Set(["passed", "failed", "blocked", "skipped"]);
const unsafeProjectionString =
  /([\r\n]|diff --git|DATABASE_URL=|postgres:\/\/|PASS tests\/|FAIL tests\/|stdout:|stderr:|ghp_|github_pat_|GITHUB_TOKEN|MATRIX_ACCESS_TOKEN|BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY|sk-[A-Za-z0-9]|raw_inbound_event_body|raw_matrix_event_body|matrix_event_body|\.env\b|(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+)/i;

export function createRuntimeApprovalProjection(
  input: RuntimeApprovalProjectionInput,
): RuntimeApprovalProjectionResult {
  if (!executableActions.has(input.action)) {
    return failProjection("forbidden_action", `action is not projectable: ${input.action}`);
  }

  const target = parsePullRequestTarget(input.target);
  const riskNotes = parseSafeTextList(input.risk_notes);
  const rollbackNotes = parseSafeTextList(input.rollback_notes);
  const validationSummary = parseValidationSummary(input.validation_summary);

  if (
    !input.approval_id ||
    !input.task_id ||
    !input.proof_id ||
    !input.run_id ||
    !input.trace_id ||
    !target ||
    !riskNotes ||
    !rollbackNotes ||
    !validationSummary ||
    !isDateTime(input.requested_at) ||
    !isDateTime(input.expires_at)
  ) {
    return failProjection("invalid_projection", "approval projection is missing required fields");
  }

  return {
    ok: true,
    projection: {
      projection_id: `approval_projection_${safeId(input.approval_id)}`,
      approval_id: input.approval_id,
      task_id: input.task_id,
      proof_id: input.proof_id,
      run_id: input.run_id,
      trace_id: input.trace_id,
      source_of_truth: "runtime",
      boundary: "matrix_projection",
      action: "create_pr",
      target,
      requested_at: input.requested_at,
      expires_at: input.expires_at,
      risk_notes: riskNotes,
      rollback_notes: rollbackNotes,
      validation_summary: validationSummary,
    },
  };
}

export function createRuntimeApprovalIntake(options: RuntimeApprovalIntakeOptions = {}) {
  const now = options.now ?? (() => new Date());
  const usedApprovalIds = new Set<string>();
  const usedProjectionIds = new Set<string>();

  return {
    accept(
      projection: RuntimeApprovalProjection,
      approval: unknown,
    ): RuntimeApprovalIntakeResult {
      if (!isRuntimeProjection(projection)) {
        return failIntake("invalid_projection", "approval projection is invalid");
      }
      if (isExpired(projection.expires_at, now())) {
        return failIntake("approval_expired", "approval projection expired");
      }

      const parsed = parseApprovalResponse(approval);

      if (!parsed.ok) {
        return parsed;
      }
      if (
        usedProjectionIds.has(projection.projection_id) ||
        usedApprovalIds.has(parsed.approval.approval_id)
      ) {
        return failIntake("approval_replayed", "approval was already used");
      }
      if (vagueActionPattern.test(parsed.approval.action)) {
        return failIntake("vague_approval", "approval must name one executable action");
      }
      if (!executableActions.has(parsed.approval.action)) {
        return failIntake(
          "forbidden_action",
          `action is not executable: ${parsed.approval.action}`,
        );
      }
      if (!matchesProjection(projection, parsed.approval)) {
        return failIntake("approval_mismatch", "approval does not match projected scope");
      }

      usedProjectionIds.add(projection.projection_id);
      usedApprovalIds.add(parsed.approval.approval_id);

      return {
        ok: true,
        approval: {
          approval_id: parsed.approval.approval_id,
          task_id: projection.task_id,
          proof_id: projection.proof_id,
          ...(projection.target.repository ? { run_id: projection.run_id } : {}),
          action: projection.action,
          actor: {
            type: "human",
            id: parsed.approval.actor.id,
          },
          target: projection.target,
          conditions: [
            `Create only ${projection.action} for ${projection.proof_id}/${projection.run_id}.`,
          ],
          created_at: parsed.approval.approved_at,
          expires_at: projection.expires_at,
        },
      };
    },
  };
}

function parseApprovalResponse(value: unknown):
  | { ok: true; approval: RuntimeApprovalResponse }
  | { ok: false; code: "invalid_approval"; reason: string } {
  if (!isRecord(value)) {
    return failIntake("invalid_approval", "approval must be an object");
  }

  const actor = isRecord(value.actor) ? value.actor : null;
  const approval = {
    approval_id: stringValue(value.approval_id),
    task_id: stringValue(value.task_id),
    proof_id: stringValue(value.proof_id),
    run_id: stringValue(value.run_id),
    action: stringValue(value.action),
    actor: actor
      ? {
          type: stringValue(actor.type),
          id: stringValue(actor.id),
        }
      : null,
    target: isRecord(value.target) ? value.target : null,
    approved_at: stringValue(value.approved_at),
  };

  if (
    !approval.approval_id ||
    !approval.task_id ||
    !approval.proof_id ||
    !approval.run_id ||
    !approval.action ||
    !approval.actor?.id ||
    approval.actor.type !== "human" ||
    !approval.target ||
    !approval.approved_at ||
    !isDateTime(approval.approved_at)
  ) {
    return failIntake("invalid_approval", "approval is missing required fields");
  }

  return { ok: true, approval: approval as RuntimeApprovalResponse };
}

function matchesProjection(
  projection: RuntimeApprovalProjection,
  approval: RuntimeApprovalResponse,
) {
  return (
    projection.approval_id === approval.approval_id &&
    projection.task_id === approval.task_id &&
    projection.proof_id === approval.proof_id &&
    projection.run_id === approval.run_id &&
    projection.action === approval.action &&
    isDeepStrictEqual(projection.target, approval.target)
  );
}

function isRuntimeProjection(value: RuntimeApprovalProjection) {
  return (
    isRecord(value) &&
    value.source_of_truth === "runtime" &&
    value.boundary === "matrix_projection" &&
    executableActions.has(value.action) &&
    typeof value.projection_id === "string" &&
    typeof value.expires_at === "string" &&
    parsePullRequestTarget(value.target) !== null
  );
}

function parsePullRequestTarget(value: unknown): PullRequestProjectionTarget | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = stringValue(value.type);
  const ref = stringValue(value.ref);
  const baseRef = stringValue(value.base_ref);
  const repository = stringValue(value.repository);

  if (type !== "pull_request" || !ref || !baseRef) {
    return null;
  }

  return repository
    ? { type, ref, base_ref: baseRef, repository }
    : { type, ref, base_ref: baseRef };
}

function isExpired(expiresAt: string, now: Date): boolean {
  const expires = new Date(expiresAt);

  return Number.isNaN(expires.getTime()) || expires <= now;
}

function isDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function parseSafeTextList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const safe = value.filter(isSafeProjectionText);

  return safe.length === value.length ? safe : null;
}

function parseValidationSummary(value: unknown): ValidationSummary[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const parsed = value.map((item) => {
    if (!isRecord(item)) {
      return null;
    }

    const command = stringValue(item.command);
    const status = stringValue(item.status);
    const exitCode = item.exit_code;

    if (
      !isSafeProjectionText(command) ||
      !isSafeProjectionText(status) ||
      !allowedValidationStatuses.has(status) ||
      !Number.isInteger(exitCode) ||
      exitCode < 0 ||
      exitCode > 255
    ) {
      return null;
    }

    return { command, status, exit_code: exitCode };
  });

  return parsed.every((item) => item !== null) ? (parsed as ValidationSummary[]) : null;
}

function isSafeProjectionText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 2048 &&
    !unsafeProjectionString.test(value)
  );
}

function safeId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failProjection(
  code: "invalid_projection" | "forbidden_action",
  reason: string,
): RuntimeApprovalProjectionResult {
  return { ok: false, code, reason };
}

function failIntake(
  code: RuntimeApprovalIntakeErrorCode,
  reason: string,
): RuntimeApprovalIntakeResult {
  return { ok: false, code, reason };
}
