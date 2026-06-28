import {
  WORK_CELL_CLEANUP_POLICY,
  type CleanupPolicy,
  type WorktreeManager,
  type WorktreeRecord,
} from "./fake-worktree-manager.ts";

export type PolicyDecision = {
  decision: "allow" | "deny" | "approval_required";
  policy_id: string;
  reason: string;
  errors: string[];
};

export type WorkCell = {
  work_cell_id: string;
  task_id: string;
  run_id: string;
  trace_id: string;
  capability: string;
  worktree: WorktreeRecord;
};

export type CleanupStatus = "kept_for_review";

export type CreateWorkCellRequest = {
  task_id: string;
  run_id: string;
  trace_id: string;
  capability: string;
  task_card_id: string;
  slug: string;
  base_branch: string;
  base_sha: string;
  cleanup_policy?: CleanupPolicy;
  policy_decision: PolicyDecision;
  worktree_manager: WorktreeManager;
};

export type CreateWorkCellResult =
  | {
      ok: true;
      work_cell: WorkCell;
      cleanup_status: CleanupStatus;
    }
  | {
      ok: false;
      code:
        | "policy_denied"
        | "invalid_task_id"
        | "invalid_run_id"
        | "invalid_trace_id"
        | "invalid_capability"
        | "invalid_worktree_required"
        | "invalid_worktree_creator"
        | "invalid_base_branch"
        | "main_checkout_path"
        | "main_branch"
        | "invalid_base_sha"
        | "invalid_worktree_path"
        | "invalid_task_branch"
        | "invalid_codex_cwd"
        | "main_checkout_edits_allowed"
        | "invalid_cleanup_policy";
      reason: string;
      errors: string[];
    };

const WORKTREE_PATH_PATTERN =
  /^\.\.\/\.worktrees\/[^/]+\/[A-Z]+-[0-9]+-[a-z0-9-]+$/;
const TASK_BRANCH_PATTERN = /^mcr\/[A-Z]+-[0-9]+\/[a-z0-9-]+$/;
const BASE_SHA_PATTERN = /^[a-f0-9]{7,40}$/;
const TASK_ID_PATTERN = /^task_[A-Za-z0-9_-]+$/;
const RUN_ID_PATTERN = /^run_[A-Za-z0-9_-]+$/;
const TRACE_ID_PATTERN = /^trace_[A-Za-z0-9_-]+$/;
const CAPABILITY_PATTERN = /^[a-z0-9]+(\.[a-z0-9]+)*$/;

export function createWorkCell(
  request: CreateWorkCellRequest,
): CreateWorkCellResult {
  if (request.policy_decision.decision !== "allow") {
    return fail(
      "policy_denied",
      request.policy_decision.reason,
      request.policy_decision.errors,
    );
  }

  const invalidRequest = validateWorkCellFields(request);

  if (invalidRequest) {
    return invalidRequest;
  }

  const worktree = request.worktree_manager.createWorktree({
    task_card_id: request.task_card_id,
    slug: request.slug,
    base_branch: request.base_branch,
    base_sha: request.base_sha,
    cleanup_policy: request.cleanup_policy ?? WORK_CELL_CLEANUP_POLICY,
  });
  const invalidWorktree = validateWorktree(worktree);

  if (invalidWorktree) {
    return invalidWorktree;
  }

  return {
    ok: true,
    work_cell: {
      work_cell_id: `wc_${idPart(request.task_id, "task_")}_${idPart(
        request.run_id,
        "run_",
      )}`,
      task_id: request.task_id,
      run_id: request.run_id,
      trace_id: request.trace_id,
      capability: request.capability,
      worktree,
    },
    cleanup_status: "kept_for_review",
  };
}

function validateWorkCellFields(
  request: CreateWorkCellRequest,
): CreateWorkCellResult | null {
  if (!TASK_ID_PATTERN.test(request.task_id)) {
    return fail("invalid_task_id", "task_id does not match runtime schema");
  }
  if (!RUN_ID_PATTERN.test(request.run_id)) {
    return fail("invalid_run_id", "run_id does not match runtime schema");
  }
  if (!TRACE_ID_PATTERN.test(request.trace_id)) {
    return fail("invalid_trace_id", "trace_id does not match runtime schema");
  }
  if (!CAPABILITY_PATTERN.test(request.capability)) {
    return fail("invalid_capability", "capability does not match runtime schema");
  }

  return null;
}

function validateWorktree(worktree: WorktreeRecord): CreateWorkCellResult | null {
  if (worktree.required !== true) {
    return fail("invalid_worktree_required", "worktree.required must be true");
  }
  if (worktree.created_by !== "runtime" && worktree.created_by !== "human") {
    return fail("invalid_worktree_creator", "worktree creator is not allowed");
  }
  if (worktree.base_branch.length === 0) {
    return fail("invalid_base_branch", "base branch must not be empty");
  }
  if (!BASE_SHA_PATTERN.test(worktree.base_sha)) {
    return fail("invalid_base_sha", "base SHA does not match runtime schema");
  }
  if (!worktree.path.startsWith("../.worktrees/")) {
    return fail("main_checkout_path", "worktree path must be outside main checkout");
  }
  if (!WORKTREE_PATH_PATTERN.test(worktree.path)) {
    return fail("invalid_worktree_path", "worktree path does not match runtime schema");
  }
  if (worktree.branch === "main" || worktree.branch === "refs/heads/main") {
    return fail("main_branch", "task branch must not be main");
  }
  if (!TASK_BRANCH_PATTERN.test(worktree.branch)) {
    return fail("invalid_task_branch", "task branch does not match runtime schema");
  }
  if (worktree.codex_cwd !== "worktree_path") {
    return fail("invalid_codex_cwd", "codex cwd must point at worktree_path");
  }
  if (worktree.allow_main_checkout_edits !== false) {
    return fail("main_checkout_edits_allowed", "main checkout edits are forbidden");
  }
  if (worktree.cleanup_policy !== WORK_CELL_CLEANUP_POLICY) {
    return fail("invalid_cleanup_policy", "cleanup policy is not allowed");
  }

  return null;
}

function idPart(value: string, prefix: string) {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function fail(
  code: Exclude<CreateWorkCellResult, { ok: true }>["code"],
  reason: string,
  errors: string[] = [reason],
): CreateWorkCellResult {
  return { ok: false, code, reason, errors };
}
