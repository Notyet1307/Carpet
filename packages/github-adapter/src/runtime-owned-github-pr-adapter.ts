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
  | { kind: "repository"; disposable_policy_ref?: string }
  | { kind: "branch_policy"; disposable_policy_ref?: string };

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

export type RuntimeOwnedGitHubPrApiSummary = {
  operation: "github.pull_request.create";
  repository: string;
  base_ref: string;
  head_ref: string;
  pull_request_url: string;
};

export type RuntimeOwnedGitHubPrRunnerResult = {
  exit_code: number;
  api_summary?: RuntimeOwnedGitHubPrApiSummary;
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

export type RuntimeOwnedGitHubTargetProtection = {
  ruleset_enforcement?: string;
  branch_protection_summary?: string;
  checked_at?: string;
};

export type RuntimeOwnedGitHubGitStatusSummary = {
  is_clean?: boolean;
  status_short?: string;
  summary_ref?: string;
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
  api_summary: RuntimeOwnedGitHubPrApiSummary;
  validation_summary: Array<Pick<ProofValidation, "command" | "status" | "exit_code">>;
  cleanup_status: "not_started" | "kept_for_review";
  evidence_refs: RuntimeOwnedGitHubPrEvidenceRefs;
  requested_at: string;
};

export type RuntimeOwnedGitHubPrInput = {
  action?: string;
  approval_id?: string;
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
  target_protection?: RuntimeOwnedGitHubTargetProtection;
  content_source?: "artifact" | "local_branch";
  git_status_summary?: RuntimeOwnedGitHubGitStatusSummary;
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
        | "unsafe_target"
        | "production_main_rejected"
        | "unsafe_ref"
        | "unknown_protection"
        | "dirty_worktree"
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
    previewAuthorize(request: ApprovalRequest): ApprovalGateResult;
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

      if (!isAllowedCredentialScope(input.credential_scope)) {
        return fail("credential_scope_required", "A disposable or scoped credential is required.");
      }

      const token = explicitGitHubToken(input.env);

      if (!token) {
        return fail("scoped_env_required", "Pass exactly GH_TOKEN in explicit env.");
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

      const approvalRequest = {
        task_id: input.task_id,
        proof_id: input.proof.proof_id,
        ...(input.approval_id ? { approval_id: input.approval_id } : {}),
        run_id: input.proof.run_id,
        action: "create_pr",
        target: { ...input.target, repository: input.repository },
        requested_at: input.requested_at ?? now().toISOString(),
      };
      const approvalPreview = options.approvalGate.previewAuthorize(approvalRequest);

      if (!approvalPreview.ok) {
        return {
          ok: false,
          code: approvalPreview.code,
          reason: approvalPreview.reason,
          ...(approvalPreview.errors ? { errors: approvalPreview.errors } : {}),
        };
      }

      const disposableError = disposableTargetError(input);

      if (disposableError) {
        return disposableError;
      }

      const refError = refSafetyError(input);

      if (refError) {
        return refError;
      }

      const protectionError = protectionSafetyError(input);

      if (protectionError) {
        return protectionError;
      }

      const dirtyWorktreeError = dirtyWorktreeRefusal(input);

      if (dirtyWorktreeError) {
        return dirtyWorktreeError;
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

      const authorization = options.approvalGate.authorize(approvalRequest);

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

      const apiSummary =
        redactedApiSummary(result.api_summary, input) ??
        legacyLocalRunnerApiSummary(legacyLocalRunnerStdout(result), input);

      if (!apiSummary) {
        return {
          ok: false,
          code: "pr_url_missing",
          reason: "gh pr create did not return a valid redacted API summary",
          exit_code: result.exit_code,
          stderr_log_ref: evidenceRefs.stderr,
          command: redactedCommand,
        };
      }

      const pr: RuntimeOwnedGitHubPullRequest = {
        url: apiSummary.pull_request_url,
        task_id: input.task_id,
        proof_id: input.proof.proof_id,
        approval_id: approvalId(authorization),
        repository: input.repository,
        target: { ...input.target },
        base_sha: input.base_sha,
        head_sha: input.head_sha,
        title: input.title,
        command: redactedCommand,
        api_summary: apiSummary,
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
  if (
    !input.disposable_target ||
    !input.repository ||
    !input.disposable_target.disposable_policy_ref
  ) {
    return fail("unsafe_target", "Target must be explicitly disposable with policy proof.");
  }

  return null;
}

function refSafetyError(input: RuntimeOwnedGitHubPrInput): RuntimeOwnedGitHubPrResult | null {
  if (isMainRef(input.target.base_ref) || isMainRef(input.target.ref)) {
    return fail("production_main_rejected", "Pull request refs cannot target main or master.");
  }

  if (
    !refIncludesRunId(input.target.base_ref, input.proof?.run_id) ||
    !refIncludesRunId(input.target.ref, input.proof?.run_id)
  ) {
    return fail("unsafe_ref", "Pull request refs must include the current run id.");
  }

  return null;
}

function protectionSafetyError(
  input: RuntimeOwnedGitHubPrInput,
): RuntimeOwnedGitHubPrResult | null {
  if (
    !input.target_protection?.ruleset_enforcement ||
    !input.target_protection.branch_protection_summary ||
    !input.target_protection.checked_at
  ) {
    return fail("unknown_protection", "Target ruleset and branch protection proof is required.");
  }

  return null;
}

function dirtyWorktreeRefusal(
  input: RuntimeOwnedGitHubPrInput,
): RuntimeOwnedGitHubPrResult | null {
  if (input.content_source !== "local_branch") {
    return null;
  }

  if (
    input.git_status_summary?.is_clean !== true ||
    Boolean(input.git_status_summary.status_short?.trim())
  ) {
    return fail("dirty_worktree", "Local branch content source requires a clean worktree.");
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

function refIncludesRunId(ref: string, runId: string | undefined) {
  return typeof runId === "string" && runId.length > 0 && ref.includes(runId);
}

function redactedApiSummary(
  summary: RuntimeOwnedGitHubPrApiSummary | undefined,
  input: Pick<RuntimeOwnedGitHubPrInput, "repository" | "target">,
): RuntimeOwnedGitHubPrApiSummary | null {
  const expectedBase = branchName(input.target.base_ref);
  const expectedHead = branchName(input.target.ref);

  if (
    !summary ||
    summary.operation !== "github.pull_request.create" ||
    summary.repository !== input.repository ||
    summary.base_ref !== expectedBase ||
    summary.head_ref !== expectedHead ||
    !isPullRequestUrlForRepository(summary.pull_request_url, input.repository)
  ) {
    return null;
  }

  return {
    operation: "github.pull_request.create",
    repository: input.repository,
    base_ref: expectedBase,
    head_ref: expectedHead,
    pull_request_url: summary.pull_request_url,
  };
}

function legacyLocalRunnerApiSummary(
  stdout: string | undefined,
  input: Pick<RuntimeOwnedGitHubPrInput, "repository" | "target">,
): RuntimeOwnedGitHubPrApiSummary | null {
  if (!stdout) {
    return null;
  }

  const pullRequestUrl = firstPullRequestUrlForRepository(stdout, input.repository);

  if (!pullRequestUrl) {
    return null;
  }

  return {
    operation: "github.pull_request.create",
    repository: input.repository,
    base_ref: branchName(input.target.base_ref),
    head_ref: branchName(input.target.ref),
    pull_request_url: pullRequestUrl,
  };
}

function legacyLocalRunnerStdout(result: RuntimeOwnedGitHubPrRunnerResult) {
  if (!isRecord(result)) {
    return undefined;
  }

  return typeof result.stdout === "string" ? result.stdout : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPullRequestUrlForRepository(url: string, repository: string) {
  return new RegExp(
    `^https://github\\.com/${escapeRegExp(repository)}/pull/\\d+$`,
  ).test(url);
}

function firstPullRequestUrlForRepository(stdout: string, repository: string) {
  return (
    stdout.match(
      new RegExp(
        `https://github\\.com/${escapeRegExp(repository)}/pull/\\d+(?=\\s|$)`,
      ),
    )?.[0] ?? null
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
