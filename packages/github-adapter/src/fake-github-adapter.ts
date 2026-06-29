import {
  verifyProof,
  type ProofLedgerEntry,
  type ProofValidation,
} from "proof-ledger";
import type {
  ApprovalGateErrorCode,
  ApprovalGateResult,
  ApprovalRequest,
} from "approval-gate";

export type PullRequestTarget = {
  type: "pull_request";
  ref: string;
  base_ref: string;
};

export type SimulatedPullRequest = {
  simulated_pr_id: string;
  task_id: string;
  proof_id: string;
  title: string;
  body: string;
  target: PullRequestTarget;
  validation_summary: Array<Pick<ProofValidation, "command" | "status" | "exit_code">>;
  risk_notes: string[];
  rollback_notes: string[];
  requested_at: string;
  approval_id: string;
};

export type CreatePullRequestInput = {
  task_id: string;
  proof: ProofLedgerEntry;
  target: PullRequestTarget;
  title: string;
  body?: string;
  requested_at?: string;
};

export type CreatePullRequestResult =
  | { ok: true; pr: SimulatedPullRequest }
  | {
      ok: false;
      code:
        | ApprovalGateErrorCode
        | "invalid_pr_target"
        | "proof_verification_failed"
        | "proofless_pr_body"
        | "target_confusion";
      reason: string;
      errors?: string[];
    };

export type FakeGitHubPrAdapterOptions = {
  approvalGate: {
    authorize(request: ApprovalRequest): ApprovalGateResult;
  };
  now?: () => Date;
};

export function createFakeGitHubPrAdapter(options: FakeGitHubPrAdapterOptions) {
  const now = options.now ?? (() => new Date());
  const prs = new Map<string, SimulatedPullRequest>();

  return {
    createPullRequest(input: CreatePullRequestInput): CreatePullRequestResult {
      const targetError = targetValidationError(input.target);

      if (targetError) {
        return targetError;
      }

      const proofResult = verifyProof({
        proof: input.proof,
        expected: { task_id: input.task_id },
      });

      if (!proofResult.ok) {
        return {
          ok: false,
          code: "proof_verification_failed",
          reason: "proof is not verified",
          errors: proofResult.errors,
        };
      }

      const body = input.body ?? buildPullRequestBody(input.proof);
      const bodyError = bodyValidationError(body, input.proof);

      if (bodyError) {
        return bodyError;
      }

      const key = prKey(input);
      const existing = prs.get(key);

      if (existing) {
        return { ok: true, pr: existing };
      }

      const requestedAt = input.requested_at ?? now().toISOString();
      const authorization = options.approvalGate.authorize({
        task_id: input.task_id,
        proof_id: input.proof.proof_id,
        action: "create_pr",
        target: input.target,
        requested_at: requestedAt,
      });

      if (!authorization.ok) {
        return {
          ok: false,
          code: authorization.code,
          reason: authorization.reason,
          ...(authorization.errors ? { errors: authorization.errors } : {}),
        };
      }

      const pr: SimulatedPullRequest = {
        simulated_pr_id: simulatedPrId(input),
        task_id: input.task_id,
        proof_id: input.proof.proof_id,
        title: input.title,
        body,
        target: { ...input.target },
        validation_summary: input.proof.validation.map((validation) => ({
          command: validation.command,
          status: validation.status,
          exit_code: validation.exit_code,
        })),
        risk_notes: [...input.proof.risk_notes],
        rollback_notes: [...input.proof.rollback_notes],
        requested_at: requestedAt,
        approval_id: authorization.approval_id,
      };

      prs.set(key, pr);

      return { ok: true, pr };
    },
    listPullRequests(): SimulatedPullRequest[] {
      return [...prs.values()];
    },
  };
}

function targetValidationError(target: PullRequestTarget): CreatePullRequestResult | null {
  if (
    target.type !== "pull_request" ||
    target.ref.length === 0 ||
    target.base_ref.length === 0
  ) {
    return {
      ok: false,
      code: "invalid_pr_target",
      reason: "pull request target must include source and base refs",
    };
  }
  if (target.ref === target.base_ref) {
    return {
      ok: false,
      code: "target_confusion",
      reason: "pull request source ref must differ from base ref",
    };
  }

  return null;
}

function bodyValidationError(
  body: string,
  proof: ProofLedgerEntry,
): CreatePullRequestResult | null {
  if (!body.includes(proof.proof_id)) {
    return {
      ok: false,
      code: "proofless_pr_body",
      reason: "PR body must include the proof id",
    };
  }

  const requiredSnippets = [
    proof.task_id,
    ...proof.validation.map((validation) => validation.command),
    ...proof.risk_notes,
    ...proof.rollback_notes,
  ];
  const missingSnippet = requiredSnippets.find((snippet) => !body.includes(snippet));

  if (missingSnippet) {
    return {
      ok: false,
      code: "proofless_pr_body",
      reason: "PR body must include task, validation, risk, and rollback proof details",
    };
  }

  return null;
}

function buildPullRequestBody(proof: ProofLedgerEntry): string {
  return [
    `Task: ${proof.task_id}`,
    `Proof: ${proof.proof_id}`,
    "",
    "Validation:",
    ...proof.validation.map(
      (validation) =>
        `- ${validation.command}: ${validation.status} (${validation.exit_code})`,
    ),
    "",
    "Risk notes:",
    ...proof.risk_notes.map((note) => `- ${note}`),
    "",
    "Rollback notes:",
    ...proof.rollback_notes.map((note) => `- ${note}`),
  ].join("\n");
}

function prKey(input: CreatePullRequestInput): string {
  return [input.task_id, input.proof.proof_id, input.target.ref, input.target.base_ref].join("|");
}

function simulatedPrId(input: CreatePullRequestInput): string {
  return `simulated_pr_${safeId(input.task_id)}_${safeId(input.proof.proof_id)}_${safeId(
    input.target.ref,
  )}`;
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
}
