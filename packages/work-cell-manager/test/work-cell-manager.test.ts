import { deepEqual, equal, match } from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createSchemaValidator, loadJsonSchema } from "runtime-contracts";
import {
  createFakeWorktreeManager,
  createWorkCell,
  type WorktreeRecord,
} from "work-cell-manager";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const validateWorkCell = createSchemaValidator(
  loadJsonSchema(path.join(root, "schemas/runtime/work-cell.schema.json")),
);

const baseRequest = {
  task_id: "task_mcr_270",
  run_id: "run_mcr_270_001",
  trace_id: "trace_mcr_270_001",
  capability: "repo.patch.codex",
  task_card_id: "MCR-270",
  slug: "work-cell-manager",
  base_branch: "main",
  base_sha: "3ef1f7816a636c92f14b8705d090830d0273c5d3",
  policy_decision: {
    decision: "allow",
    policy_id: "policy.repo_patch.v1",
    reason: "allowed by policy",
    errors: [],
  },
} as const;

test("creates branch, path, base SHA, and cwd provenance from a task id", () => {
  const result = createWorkCell({
    ...baseRequest,
    worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
  });

  equal(result.ok, true);
  if (!result.ok) {
    throw new Error(result.reason);
  }

  deepEqual(result.work_cell, {
    work_cell_id: "wc_mcr_270_mcr_270_001",
    task_id: "task_mcr_270",
    run_id: "run_mcr_270_001",
    trace_id: "trace_mcr_270_001",
    capability: "repo.patch.codex",
    worktree: {
      required: true,
      created_by: "runtime",
      base_branch: "main",
      base_sha: "3ef1f7816a636c92f14b8705d090830d0273c5d3",
      branch: "mcr/MCR-270/work-cell-manager",
      path: "../.worktrees/Carpet/MCR-270-work-cell-manager",
      codex_cwd: "worktree_path",
      allow_main_checkout_edits: false,
      cleanup_policy: "keep_until_merged_or_failed_reviewed",
    },
  });
  deepEqual(validateWorkCell(result.work_cell), { valid: true, errors: [] });
});

test("rejects main checkout paths and main branch task branches", () => {
  const mainPath = createWorkCell({
    ...baseRequest,
    worktree_manager: fakeWorktree({
      path: "/Users/yet/Test_drive_sales/Carpet",
      branch: "mcr/MCR-270/work-cell-manager",
    }),
  });

  equal(mainPath.ok, false);
  if (!mainPath.ok) {
    equal(mainPath.code, "main_checkout_path");
  }

  const mainBranch = createWorkCell({
    ...baseRequest,
    worktree_manager: fakeWorktree({
      path: "../.worktrees/Carpet/MCR-270-work-cell-manager",
      branch: "main",
    }),
  });

  equal(mainBranch.ok, false);
  if (!mainBranch.ok) {
    equal(mainBranch.code, "main_branch");
  }
});

test("rejects schema-invalid base SHA before returning a work cell", () => {
  const result = createWorkCell({
    ...baseRequest,
    base_sha: "not-a-sha",
    worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
  });

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "invalid_base_sha");
    match(result.reason, /base SHA/);
  }
});

test("rejects schema-invalid work cell identity fields", () => {
  const cases = [
    {
      name: "task_id",
      overrides: { task_id: "MCR-270" },
      code: "invalid_task_id",
    },
    {
      name: "run_id",
      overrides: { run_id: "mcr_270_001" },
      code: "invalid_run_id",
    },
    {
      name: "trace_id",
      overrides: { trace_id: "trace space" },
      code: "invalid_trace_id",
    },
    {
      name: "capability",
      overrides: { capability: "Repo.Patch.Codex" },
      code: "invalid_capability",
    },
  ] as const;

  for (const { name, overrides, code } of cases) {
    const result = createWorkCell({
      ...baseRequest,
      ...overrides,
      worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
    });

    equal(result.ok, false, name);
    if (!result.ok) {
      equal(result.code, code, name);
    }
  }
});

test("rejects schema-invalid worktree fields before returning a work cell", () => {
  const cases = [
    {
      name: "required",
      overrides: { required: false },
      code: "invalid_worktree_required",
    },
    {
      name: "created_by",
      overrides: { created_by: "worker" },
      code: "invalid_worktree_creator",
    },
    {
      name: "base_branch",
      overrides: { base_branch: "" },
      code: "invalid_base_branch",
    },
    {
      name: "cleanup_policy",
      overrides: { cleanup_policy: "delete_immediately" },
      code: "invalid_cleanup_policy",
    },
  ] as const;

  for (const { name, overrides, code } of cases) {
    const result = createWorkCell({
      ...baseRequest,
      worktree_manager: unsafeFakeWorktree(overrides),
    });

    equal(result.ok, false, name);
    if (!result.ok) {
      equal(result.code, code, name);
    }
  }
});

test("stores cleanup policy and cleanup status", () => {
  const result = createWorkCell({
    ...baseRequest,
    worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
  });

  equal(result.ok, true);
  if (!result.ok) {
    throw new Error(result.reason);
  }

  equal(
    result.work_cell.worktree.cleanup_policy,
    "keep_until_merged_or_failed_reviewed",
  );
  equal(result.cleanup_status, "kept_for_review");
});

test("fails if policy decision is deny", () => {
  const result = createWorkCell({
    ...baseRequest,
    policy_decision: {
      decision: "deny",
      policy_id: "policy.repo_patch.v1",
      reason: "isolated worktree required",
      errors: ["isolated worktree required"],
    },
    worktree_manager: createFakeWorktreeManager({ repo_name: "Carpet" }),
  });

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "policy_denied");
    match(result.reason, /isolated worktree required/);
  }
});

function fakeWorktree(
  overrides: Pick<WorktreeRecord, "path" | "branch">,
) {
  return {
    createWorktree(): WorktreeRecord {
      return {
        required: true,
        created_by: "runtime",
        base_branch: "main",
        base_sha: baseRequest.base_sha,
        branch: overrides.branch,
        path: overrides.path,
        codex_cwd: "worktree_path",
        allow_main_checkout_edits: false,
        cleanup_policy: "keep_until_merged_or_failed_reviewed",
      };
    },
  };
}

function unsafeFakeWorktree(overrides: Record<string, unknown>) {
  return {
    createWorktree(): WorktreeRecord {
      return {
        required: true,
        created_by: "runtime",
        base_branch: "main",
        base_sha: baseRequest.base_sha,
        branch: "mcr/MCR-270/work-cell-manager",
        path: "../.worktrees/Carpet/MCR-270-work-cell-manager",
        codex_cwd: "worktree_path",
        allow_main_checkout_edits: false,
        cleanup_policy: "keep_until_merged_or_failed_reviewed",
        ...overrides,
      } as WorktreeRecord;
    },
  };
}
