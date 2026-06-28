export const WORK_CELL_CLEANUP_POLICY = "keep_until_merged_or_failed_reviewed";

export type CleanupPolicy = typeof WORK_CELL_CLEANUP_POLICY;

export type WorktreeRecord = {
  required: true;
  created_by: "runtime" | "human";
  base_branch: string;
  base_sha: string;
  branch: string;
  path: string;
  codex_cwd: "worktree_path";
  allow_main_checkout_edits: false;
  cleanup_policy: CleanupPolicy;
};

export type WorktreeRequest = {
  task_card_id: string;
  slug: string;
  base_branch: string;
  base_sha: string;
  cleanup_policy?: CleanupPolicy;
};

export type WorktreeManager = {
  createWorktree(request: WorktreeRequest): WorktreeRecord;
};

export function createFakeWorktreeManager(options: {
  repo_name: string;
}): WorktreeManager {
  return {
    createWorktree(request) {
      return {
        required: true,
        created_by: "runtime",
        base_branch: request.base_branch,
        base_sha: request.base_sha,
        branch: `mcr/${request.task_card_id}/${request.slug}`,
        path: `../.worktrees/${options.repo_name}/${request.task_card_id}-${request.slug}`,
        codex_cwd: "worktree_path",
        allow_main_checkout_edits: false,
        cleanup_policy: request.cleanup_policy ?? WORK_CELL_CLEANUP_POLICY,
      };
    },
  };
}
