export const MCR_850_VERTICAL_SMOKE_STEPS = [
  "matrix_or_local_fixture_ingress",
  "runtime_snapshot",
  "approved_codex_exec",
  "proof_verification",
  "approval",
  "disposable_github_pr_create",
  "cleanup_projection",
] as const;

export const MCR_850_VERTICAL_SMOKE_ALLOWED_ACTIONS = [
  "matrix_or_local_fixture_ingress",
  "runtime_snapshot",
  "codex_exec_smoke",
  "proof_verification",
  "request_approval",
  "create_pr",
  "cleanup_projection",
] as const;

const runIdPattern = /^mcr-850-\d{8}t\d{6}z-[a-z0-9][a-z0-9-]{2,40}$/;
const requiredCleanup = new Set([
  "stop_matrix_services",
  "close_pr",
  "delete_disposable_branches",
  "revoke_disposable_credentials",
  "remove_generated_matrix_files",
]);
const secretKeyPattern = /(token|secret|password|key|credential)/i;

export type Mcr850VerticalSmokeInput = {
  run_id?: string;
  human_approval_scope?: string;
  matrix_target?: string;
  codex_approval_scope?: string;
  codex_credential_scope?: string;
  codex_env_keys?: string[];
  github_token_status?: "set" | "unset";
  github_repository?: string;
  github_target_kind?: string;
  github_base_branch?: string;
  github_head_branch?: string;
  evidence_dir?: string;
  cleanup_plan?: string[];
  requested_actions?: string[];
};

export type Mcr850VerticalSmokePlan = {
  status: "blocked" | "planned";
  wouldCallRealServices: boolean;
  steps: string[];
  blockedBy: string[];
};

export type Mcr850VerticalSmokeStepRunner = (
  step: (typeof MCR_850_VERTICAL_SMOKE_STEPS)[number],
) => void | Promise<void>;

export async function runMcr850VerticalSmokeScaffold(
  input: Mcr850VerticalSmokeInput,
  stepRunner: Mcr850VerticalSmokeStepRunner,
): Promise<Mcr850VerticalSmokePlan> {
  const plan = planMcr850VerticalSmoke(input);

  if (plan.status === "blocked") {
    return plan;
  }

  for (const step of MCR_850_VERTICAL_SMOKE_STEPS) {
    await stepRunner(step);
  }

  return plan;
}

export function planMcr850VerticalSmoke(
  input: Mcr850VerticalSmokeInput,
): Mcr850VerticalSmokePlan {
  const blockedBy: string[] = [];
  const runId = input.run_id ?? "";

  if (!runIdPattern.test(runId)) {
    blockedBy.push("run_id must match mcr-850-yyyymmddthhmmssz-<slug>");
  }

  if (input.human_approval_scope !== "mcr_850_vertical_smoke") {
    blockedBy.push("missing action-scoped human approval: mcr_850_vertical_smoke");
  }

  if (input.matrix_target !== "disposable") {
    blockedBy.push("matrix target must be disposable");
  }

  if (input.codex_approval_scope !== "codex_exec_smoke") {
    blockedBy.push("missing Codex smoke approval scope: codex_exec_smoke");
  }

  if (input.codex_credential_scope !== "disposable") {
    blockedBy.push("codex credential scope must be disposable");
  }

  if (!input.codex_env_keys?.includes("PATH")) {
    blockedBy.push("codex env must be explicit and include PATH only as a key");
  }

  for (const key of input.codex_env_keys ?? []) {
    if (secretKeyPattern.test(key)) {
      blockedBy.push(`codex env key is secret-bearing: ${key}`);
    }
  }

  if (input.github_token_status !== "set") {
    blockedBy.push("disposable GitHub token must be set");
  }

  if (input.github_repository !== "Notyet1307/github-pr-smoke-sandbox") {
    blockedBy.push("github repository must be the disposable smoke sandbox");
  }

  if (input.github_target_kind !== "disposable_repository") {
    blockedBy.push("github target must be disposable");
  }

  if (input.github_base_branch === "main") {
    blockedBy.push("github base branch must be disposable, not main");
  } else if (!input.github_base_branch?.includes(runId)) {
    blockedBy.push("github base branch must include run_id");
  }

  if (input.github_head_branch === "main") {
    blockedBy.push("github head branch must be disposable, not main");
  } else if (!input.github_head_branch?.includes(runId)) {
    blockedBy.push("github head branch must include run_id");
  }

  if (!input.evidence_dir?.includes(runId)) {
    blockedBy.push("evidence_dir must be run-scoped");
  }

  const cleanupPlan = new Set(input.cleanup_plan ?? []);
  for (const cleanup of requiredCleanup) {
    if (!cleanupPlan.has(cleanup)) {
      blockedBy.push(`cleanup plan missing: ${cleanup}`);
    }
  }

  const allowedActions = new Set<string>(MCR_850_VERTICAL_SMOKE_ALLOWED_ACTIONS);
  for (const action of input.requested_actions ?? []) {
    if (!allowedActions.has(action)) {
      blockedBy.push(`forbidden action requested: ${action}`);
    }
  }

  return {
    status: blockedBy.length === 0 ? "planned" : "blocked",
    wouldCallRealServices: blockedBy.length === 0,
    steps: [...MCR_850_VERTICAL_SMOKE_STEPS],
    blockedBy,
  };
}
