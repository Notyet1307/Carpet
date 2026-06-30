import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { createSchemaValidator, loadJsonSchema } from "runtime-contracts";

export type ApprovalRecord = {
  approval_id: string;
  task_id: string;
  proof_id: string;
  run_id?: string;
  action: string;
  actor: {
    type: "human";
    id: string;
  };
  target: Record<string, unknown>;
  conditions: string[];
  created_at: string;
  expires_at: string;
};

export type ApprovalRequest = {
  task_id: string;
  proof_id: string;
  approval_id?: string;
  run_id?: string;
  action: string;
  target: Record<string, unknown>;
  requested_at?: string;
};

export type ApprovalDenial = {
  task_id: string;
  proof_id: string;
  action: string;
  target: Record<string, unknown>;
  actor: {
    type: string;
    id: string;
  };
  denied_at: string;
  reason: string;
};

export type ApprovalGateResult =
  | { ok: true; approval_id: string }
  | { ok: true; approval_id: string; action: string; target: unknown }
  | { ok: true }
  | { ok: false; code: ApprovalGateErrorCode; reason: string; errors?: string[] };

export type ApprovalGateErrorCode =
  | "invalid_approval"
  | "invalid_denial"
  | "invalid_request"
  | "forbidden_action"
  | "approval_required"
  | "approval_mismatch"
  | "approval_denied"
  | "approval_expired"
  | "approval_replayed"
  | "unverified_proof";

export type ApprovalGateOptions = {
  now?: () => Date;
  verified_proof_ids?: ReadonlySet<string>;
};

type ApprovalScope = {
  task_id: string;
  proof_id: string;
  run_id?: string;
  action: string;
  target: Record<string, unknown>;
};

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const validateApprovalSchema = createSchemaValidator(
  loadJsonSchema(path.join(root, "schemas/proof/approval.schema.json")),
);
const executableActions = new Set(["create_pr"]);

export function createInMemoryApprovalGate(options: ApprovalGateOptions = {}) {
  const now = options.now ?? (() => new Date());
  const verifiedProofIds = options.verified_proof_ids ?? new Set<string>();
  const approvals = new Map<string, ApprovalRecord>();
  const usedApprovalIds = new Set<string>();
  const denials: ApprovalDenial[] = [];

  return {
    grant(approval: unknown): ApprovalGateResult {
      const validation = validateApprovalSchema(approval);

      if (!validation.valid) {
        return fail("invalid_approval", "approval schema validation failed", validation.errors);
      }

      const record = approval as ApprovalRecord;

      if (!verifiedProofIds.has(record.proof_id)) {
        return fail("unverified_proof", "proof has not been verified");
      }
      if (isExpired(record.expires_at, now())) {
        return fail("approval_expired", "approval expired");
      }

      approvals.set(record.approval_id, record);

      return { ok: true, approval_id: record.approval_id };
    },
    deny(denial: unknown): ApprovalGateResult {
      const parsed = parseDenial(denial);

      if (!parsed.ok) {
        return parsed;
      }
      if (!canExecute(parsed.denial.action)) {
        return fail("forbidden_action", `action is not executable: ${parsed.denial.action}`);
      }
      if (!verifiedProofIds.has(parsed.denial.proof_id)) {
        return fail("unverified_proof", "proof has not been verified");
      }

      denials.push(parsed.denial);

      return { ok: true };
    },
    authorize(request: unknown): ApprovalGateResult {
      const parsed = parseRequest(request);

      if (!parsed.ok) {
        return parsed;
      }
      if (!canExecute(parsed.request.action)) {
        return fail("forbidden_action", `action is not executable: ${parsed.request.action}`);
      }
      if (!verifiedProofIds.has(parsed.request.proof_id)) {
        return fail("unverified_proof", "proof has not been verified");
      }
      if (denials.some((denial) => matchesApprovalScope(denial, parsed.request))) {
        return fail("approval_denied", "approval was denied for this action");
      }

      const match = parsed.request.approval_id
        ? approvals.get(parsed.request.approval_id)
        : [...approvals.values()].find((approval) =>
            matchesApprovalScope(approval, parsed.request),
          );
      if (!match) {
        return fail("approval_required", "no matching approval");
      }
      if (usedApprovalIds.has(match.approval_id)) {
        return fail("approval_replayed", "approval was already used");
      }
      if (isExpired(match.expires_at, now())) {
        return fail("approval_expired", "approval expired");
      }
      if (!matchesApprovalScope(match, parsed.request)) {
        return fail("approval_mismatch", "selected approval does not match request");
      }

      usedApprovalIds.add(match.approval_id);

      return {
        ok: true,
        approval_id: match.approval_id,
        action: parsed.request.action,
        target: parsed.request.target,
      };
    },
  };
}

function parseRequest(value: unknown):
  | { ok: true; request: ApprovalRequest }
  | { ok: false; code: "invalid_request"; reason: string } {
  if (!isRecord(value)) {
    return fail("invalid_request", "approval request must be an object");
  }

  const request = {
    task_id: stringValue(value.task_id),
    proof_id: stringValue(value.proof_id),
    approval_id: optionalStringValue(value.approval_id),
    run_id: optionalStringValue(value.run_id),
    action: stringValue(value.action),
    target: isRecord(value.target) ? value.target : null,
    requested_at: optionalStringValue(value.requested_at),
  };

  if (!request.task_id || !request.proof_id || !request.action || !request.target) {
    return fail("invalid_request", "approval request is missing required fields");
  }

  return {
    ok: true,
    request: {
      task_id: request.task_id,
      proof_id: request.proof_id,
      ...(request.approval_id ? { approval_id: request.approval_id } : {}),
      ...(request.run_id ? { run_id: request.run_id } : {}),
      action: request.action,
      target: request.target,
      ...(request.requested_at ? { requested_at: request.requested_at } : {}),
    },
  };
}

function parseDenial(value: unknown):
  | { ok: true; denial: ApprovalDenial }
  | { ok: false; code: "invalid_denial"; reason: string } {
  if (!isRecord(value)) {
    return fail("invalid_denial", "approval denial must be an object");
  }

  const actor = isRecord(value.actor) ? value.actor : null;
  const denial = {
    task_id: stringValue(value.task_id),
    proof_id: stringValue(value.proof_id),
    action: stringValue(value.action),
    target: isRecord(value.target) ? value.target : null,
    actor: actor
      ? {
          type: stringValue(actor.type),
          id: stringValue(actor.id),
        }
      : null,
    denied_at: stringValue(value.denied_at),
    reason: stringValue(value.reason),
  };

  if (
    !denial.task_id ||
    !denial.proof_id ||
    !denial.action ||
    !denial.target ||
    !denial.actor?.id ||
    denial.actor.type !== "human" ||
    !denial.denied_at ||
    !denial.reason
  ) {
    return fail("invalid_denial", "approval denial is missing required fields");
  }

  return { ok: true, denial: denial as ApprovalDenial };
}

function matchesApprovalScope(
  approval: ApprovalScope,
  request: ApprovalRequest,
): boolean {
  return (
    approval.task_id === request.task_id &&
    approval.proof_id === request.proof_id &&
    approval.run_id === request.run_id &&
    approval.action === request.action &&
    isDeepStrictEqual(approval.target, request.target)
  );
}

function canExecute(action: string): boolean {
  return executableActions.has(action);
}

function isExpired(expiresAt: string, now: Date): boolean {
  const expires = new Date(expiresAt);

  return Number.isNaN(expires.getTime()) || expires <= now;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function optionalStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function fail<T extends ApprovalGateErrorCode>(
  code: T,
  reason: string,
  errors?: string[],
): { ok: false; code: T; reason: string; errors?: string[] } {
  return { ok: false, code, reason, ...(errors ? { errors } : {}) };
}
