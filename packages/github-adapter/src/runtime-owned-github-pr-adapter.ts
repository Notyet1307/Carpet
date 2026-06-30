import type {
  ApprovalGateErrorCode,
  ApprovalGateResult,
  ApprovalRequest,
} from "approval-gate";
import {
  verifyProof,
  type ProofLedgerEntry,
  type ProofValidation,
} from "proof-ledger";

import type { PullRequestTarget } from "./fake-github-adapter.ts";

export type DisposableGitHubPrTarget =
  | { kind: "repository" }
  | { kind: "branch_policy" };

export type RuntimeOwnedGitHubPrCommand = {
  executable: "gh";
  args: string[];
  env: { GH_TOKEN: string };
};

export type RedactedRuntimeOwnedGitHubPrCommand = Omit<
  RuntimeOwnedGitHubPrCommand,
  "env"
> & {
  env: { GH_TOKEN: "[REDACTED]" };
};

export type RuntimeOwnedGitHubPrRunnerResult = {
  exit_code: number;
  stdout: string;
  stderr: string;
};

export type RuntimeOwnedGitHubPrRunner = (
  command: RuntimeOwnedGitHubPrCommand,
) => Promise<RuntimeOwnedGitHubPrRunnerResult> | RuntimeOwnedGitHubPrRunnerResult;

export type RuntimeOwnedGitHubPrEvidenceRefs = {
  command: string;
  stdout: string;
  stderr: string;
};

export type RuntimeOwnedGitHubPrBodySafety = {
  redaction_status: "passed" | "failed";
  scanner_ref: string;
  summary?: string;
};

export type RuntimeOwnedGitHubEvidenceSafety = {
  redaction_status: "passed" | "failed";
  raw_material_excluded: boolean;
  scanner_ref: string;
  summary?: string;
};

export type RuntimeOwnedGitHubPullRequest = {
  url: string;
  task_id: string;
  proof_id: string;
  approval_id: string;
  repository: string;
  target: PullRequestTarget;
  base_sha: string;
  head_sha: string;
  title: string;
  command: RedactedRuntimeOwnedGitHubPrCommand;
  validation_summary: Array<Pick<ProofValidation, "command" | "status" | "exit_code">>;
  cleanup_status: "not_started" | "kept_for_review";
  evidence_refs: RuntimeOwnedGitHubPrEvidenceRefs;
  requested_at: string;
};

export type RuntimeOwnedGitHubPrInput = {
  action?: string;
  task_id: string;
  proof?: ProofLedgerEntry | null;
  target: PullRequestTarget;
  repository: string;
  title: string;
  body_file: string;
  pr_body_safety?: RuntimeOwnedGitHubPrBodySafety;
  base_sha: string;
  head_sha: string;
  cleanup_status: RuntimeOwnedGitHubPullRequest["cleanup_status"];
  disposable_target?: DisposableGitHubPrTarget;
  credential_scope?: "disposable" | "scoped";
  env?: Record<string, string>;
  evidence_dir: string;
  evidence_safety?: RuntimeOwnedGitHubEvidenceSafety;
  requested_at?: string;
};

export type RuntimeOwnedGitHubPrResult =
  | { ok: true; pr: RuntimeOwnedGitHubPullRequest }
  | {
      ok: false;
      code:
        | ApprovalGateErrorCode
        | "adapter_disabled"
        | "forbidden_action"
        | "invalid_pr_target"
        | "target_confusion"
        | "missing_proof"
        | "proof_verification_failed"
        | "non_disposable_target"
        | "production_main_rejected"
        | "credential_scope_required"
        | "scoped_env_required"
        | "unsafe_body"
        | "unsafe_evidence"
        | "invalid_pr_evidence"
        | "process_runner_required"
        | "gh_pr_create_failed"
        | "pr_url_missing";
      reason: string;
      errors?: string[];
      exit_code?: number;
      stderr_log_ref?: string;
      command?: RedactedRuntimeOwnedGitHubPrCommand;
    };

export type RuntimeOwnedGitHubPrAdapterOptions = {
  enabled?: boolean;
  approvalGate: {
    authorize(request: ApprovalRequest): ApprovalGateResult;
  };
  runner?: RuntimeOwnedGitHubPrRunner;
  now?: () => Date;
};

export function createRuntimeOwnedGitHubPrAdapter(
  options: RuntimeOwnedGitHubPrAdapterOptions,
) {
  const now = options.now ?? (() => new Date());
  const prs: RuntimeOwnedGitHubPullRequest[] = [];

  return {
    async createPullRequest(
      input: RuntimeOwnedGitHubPrInput,
    ): Promise<RuntimeOwnedGitHubPrResult> {
      if (options.enabled !== true) {
        return fail("adapter_disabled", "Runtime-owned GitHub PR creation is disabled.");
      }

      if ((input.action ?? "create_pr") !== "create_pr") {
        return fail("forbidden_action", "Only create_pr is executable.");
      }

      const targetError = targetValidationError(input.target);

      if (targetError) {
        return targetError;
      }

      if (!input.proof) {
        return fail("missing_proof", "Runtime proof is required before GitHub PR creation.");
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

      const disposableError = disposableTargetError(input);

      if (disposableError) {
        return disposableError;
      }

      const evidenceError = evidenceValidationError(input);

      if (evidenceError) {
        return evidenceError;
      }

      const unsafeContentError = unsafeContentRefusal(input);

      if (unsafeContentError) {
        return unsafeContentError;
      }

      if (!options.runner) {
        return fail("process_runner_required", "A process runner must be injected.");
      }

      if (!isAllowedCredentialScope(input.credential_scope)) {
        return fail("credential_scope_required", "A disposable or scoped credential is required.");
      }

      const token = explicitGitHubToken(input.env);

      if (!token) {
        return fail("scoped_env_required", "Pass exactly GH_TOKEN in explicit env.");
      }

      const authorization = options.approvalGate.authorize({
        task_id: input.task_id,
        proof_id: input.proof.proof_id,
        action: "create_pr",
        target: input.target,
        requested_at: input.requested_at ?? now().toISOString(),
      });

      if (!authorization.ok) {
        return {
          ok: false,
          code: authorization.code,
          reason: authorization.reason,
          ...(authorization.errors ? { errors: authorization.errors } : {}),
        };
      }

      const command = buildRuntimeOwnedGitHubPrCommand(input, token);
      const redactedCommand = redactCommand(command);
      const evidenceRefs = evidenceRefsFor(input.evidence_dir);
      const result = await options.runner(command);

      if (result.exit_code !== 0) {
        return {
          ok: false,
          code: "gh_pr_create_failed",
          reason: "gh pr create failed",
          exit_code: result.exit_code,
          stderr_log_ref: evidenceRefs.stderr,
          command: redactedCommand,
        };
      }

      const url = firstGitHubPullRequestUrl(result.stdout);

      if (!url) {
        return {
          ok: false,
          code: "pr_url_missing",
          reason: "gh pr create did not return a pull request URL",
          exit_code: result.exit_code,
          stderr_log_ref: evidenceRefs.stderr,
          command: redactedCommand,
        };
      }

      const pr: RuntimeOwnedGitHubPullRequest = {
        url,
        task_id: input.task_id,
        proof_id: input.proof.proof_id,
        approval_id: approvalId(authorization),
        repository: input.repository,
        target: { ...input.target },
        base_sha: input.base_sha,
        head_sha: input.head_sha,
        title: input.title,
        command: redactedCommand,
        validation_summary: input.proof.validation.map((validation) => ({
          command: validation.command,
          status: validation.status,
          exit_code: validation.exit_code,
        })),
        cleanup_status: input.cleanup_status,
        evidence_refs: evidenceRefs,
        requested_at: input.requested_at ?? now().toISOString(),
      };

      prs.push(pr);

      return { ok: true, pr };
    },
    listPullRequests(): RuntimeOwnedGitHubPullRequest[] {
      return prs.map((pr) => ({ ...pr, target: { ...pr.target } }));
    },
  };
}

export function buildRuntimeOwnedGitHubPrCommand(
  input: Pick<
    RuntimeOwnedGitHubPrInput,
    "repository" | "target" | "title" | "body_file"
  >,
  token: string,
): RuntimeOwnedGitHubPrCommand {
  return {
    executable: "gh",
    args: [
      "pr",
      "create",
      "--repo",
      input.repository,
      "--head",
      branchName(input.target.ref),
      "--base",
      branchName(input.target.base_ref),
      "--title",
      input.title,
      "--body-file",
      input.body_file,
    ],
    env: { GH_TOKEN: token },
  };
}

function targetValidationError(
  target: PullRequestTarget,
): RuntimeOwnedGitHubPrResult | null {
  if (
    target.type !== "pull_request" ||
    target.ref.length === 0 ||
    target.base_ref.length === 0
  ) {
    return fail("invalid_pr_target", "pull request target must include source and base refs");
  }
  if (target.ref === target.base_ref) {
    return fail("target_confusion", "pull request source ref must differ from base ref");
  }

  return null;
}

function disposableTargetError(
  input: RuntimeOwnedGitHubPrInput,
): RuntimeOwnedGitHubPrResult | null {
  if (!input.disposable_target || !input.repository) {
    return fail("non_disposable_target", "Target must be explicitly disposable.");
  }

  if (
    input.disposable_target.kind === "branch_policy" &&
    isMainRef(input.target.base_ref)
  ) {
    return fail("production_main_rejected", "Disposable branch policy cannot target main.");
  }

  return null;
}

function evidenceValidationError(
  input: RuntimeOwnedGitHubPrInput,
): RuntimeOwnedGitHubPrResult | null {
  if (!isGitSha(input.base_sha) || !isGitSha(input.head_sha)) {
    return fail("invalid_pr_evidence", "base_sha and head_sha must be Git SHAs.");
  }
  if (!isArtifactRefPrefix(input.evidence_dir)) {
    return fail("invalid_pr_evidence", "GitHub PR evidence refs must use artifact://.");
  }

  return null;
}

function unsafeContentRefusal(
  input: RuntimeOwnedGitHubPrInput,
): RuntimeOwnedGitHubPrResult | null {
  if (input.pr_body_safety?.redaction_status === "failed") {
    return fail("unsafe_body", "PR body redaction failed.");
  }

  if (
    input.evidence_safety?.redaction_status === "failed" ||
    input.evidence_safety?.raw_material_excluded === false
  ) {
    return fail("unsafe_evidence", "Evidence redaction failed or raw material was retained.");
  }

  return null;
}

function isAllowedCredentialScope(scope: string | undefined) {
  return scope === "disposable" || scope === "scoped";
}

function explicitGitHubToken(env: Record<string, string> | undefined): string | null {
  if (!env || Object.keys(env).length !== 1 || typeof env.GH_TOKEN !== "string") {
    return null;
  }

  return env.GH_TOKEN.length > 0 ? env.GH_TOKEN : null;
}

function redactCommand(
  command: RuntimeOwnedGitHubPrCommand,
): RedactedRuntimeOwnedGitHubPrCommand {
  return { ...command, env: { GH_TOKEN: "[REDACTED]" } };
}

function evidenceRefsFor(evidenceDir: string): RuntimeOwnedGitHubPrEvidenceRefs {
  const prefix = evidenceDir.replace(/\/+$/, "");

  return {
    command: `${prefix}/command.json`,
    stdout: `${prefix}/stdout.log`,
    stderr: `${prefix}/stderr.log`,
  };
}

function isGitSha(value: string) {
  return /^[a-f0-9]{7,40}$/.test(value);
}

function isArtifactRefPrefix(value: string) {
  return value.startsWith("artifact://") && value.length > "artifact://".length;
}

function branchName(ref: string) {
  return ref.replace(/^refs\/heads\//, "");
}

function isMainRef(ref: string) {
  return (
    ref === "main" ||
    ref === "master" ||
    ref === "refs/heads/main" ||
    ref === "refs/heads/master"
  );
}

function firstGitHubPullRequestUrl(stdout: string) {
  return stdout.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/)?.[0] ?? null;
}

function approvalId(result: Extract<ApprovalGateResult, { ok: true }>) {
  return "approval_id" in result ? result.approval_id : "approval_unknown";
}

function fail<T extends Exclude<RuntimeOwnedGitHubPrResult, { ok: true }>["code"]>(
  code: T,
  reason: string,
): { ok: false; code: T; reason: string } {
  return { ok: false, code, reason };
}
