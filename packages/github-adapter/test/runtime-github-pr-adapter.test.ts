import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createInMemoryApprovalGate } from "approval-gate";
import {
  createRuntimeOwnedGitHubPrAdapter,
  type PullRequestTarget,
  type RuntimeOwnedGitHubPrCommand,
  type RuntimeOwnedGitHubPrInput,
} from "github-adapter";
import type { ProofLedgerEntry } from "proof-ledger";

const taskId = "task_mcr_840";
const proofId = "proof_mcr_840";
const approvalId = "approval_mcr_840";
const runId = "run_mcr_840";
const now = "2026-06-29T10:00:00.000Z";
const token = "fake-disposable-token";
const target: PullRequestTarget = {
  type: "pull_request",
  ref: "refs/heads/mcr/MCR-840/runtime-owned-github-pr-adapter",
  base_ref: "refs/heads/mcr-840-base-run-mcr-840",
};

test("runtime-owned adapter builds redacted gh pr create command and records PR proof fields", async () => {
  const calls: RuntimeOwnedGitHubPrCommand[] = [];
  const adapter = createRuntimeOwnedGitHubPrAdapter({
    enabled: true,
    approvalGate: approvedGate(),
    runner: async (command) => {
      calls.push(command);
      return {
        exit_code: 0,
        stdout: "https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/2\n",
        stderr: "",
      };
    },
    now: () => new Date("2026-06-29T10:05:00.000Z"),
  });

  const result = await adapter.createPullRequest(createRequest());

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    executable: "gh",
    args: [
      "pr",
      "create",
      "--repo",
      "Notyet1307/github-pr-smoke-sandbox",
      "--head",
      "mcr/MCR-840/runtime-owned-github-pr-adapter",
      "--base",
      "mcr-840-base-run-mcr-840",
      "--title",
      "MCR-840 Runtime-Owned GitHub PR Adapter",
      "--body-file",
      ".mcr/runs/run_mcr_840/pr-body.md",
    ],
    env: { GH_TOKEN: token },
  });
  if (result.ok) {
    assert.equal(
      result.pr.url,
      "https://github.com/Notyet1307/github-pr-smoke-sandbox/pull/2",
    );
    assert.equal(result.pr.approval_id, approvalId);
    assert.equal(result.pr.repository, "Notyet1307/github-pr-smoke-sandbox");
    assert.deepEqual(result.pr.target, target);
    assert.equal(result.pr.base_sha, "b".repeat(40));
    assert.equal(result.pr.head_sha, "c".repeat(40));
    assert.equal(result.pr.cleanup_status, "not_started");
    assert.deepEqual(result.pr.evidence_refs, {
      command: "artifact://mcr-840/github-pr-create/command.json",
      stdout: "artifact://mcr-840/github-pr-create/stdout.log",
      stderr: "artifact://mcr-840/github-pr-create/stderr.log",
    });
    assert.equal(result.pr.command.env.GH_TOKEN, "[REDACTED]");
    assert.equal(JSON.stringify(result.pr).includes(token), false);
  }
});

test("runtime-owned adapter blocks unsafe inputs before runner execution", async () => {
  for (const [name, request, code, options] of [
    ["disabled", createRequest(), "adapter_disabled"],
    [
      "missing approval",
      createRequest(),
      "approval_required",
      { enabled: true, approvalGate: unapprovedGate() },
    ],
    [
      "unverified proof",
      createRequest({ proof: proof({ validation: [] }) }),
      "proof_verification_failed",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "missing disposable target",
      createRequest({ disposable_target: undefined }),
      "non_disposable_target",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "production main",
      createRequest({
        target: { ...target, base_ref: "refs/heads/main" },
        disposable_target: { kind: "branch_policy" },
      }),
      "production_main_rejected",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "main-to-main",
      createRequest({
        target: {
          type: "pull_request",
          ref: "refs/heads/main",
          base_ref: "refs/heads/main",
        },
      }),
      "target_confusion",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "merge action",
      createRequest({ action: "merge" }),
      "forbidden_action",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "missing runner",
      createRequest(),
      "process_runner_required",
      { enabled: true, approvalGate: approvedGate(), runner: undefined },
    ],
    [
      "missing env",
      createRequest({ env: undefined }),
      "scoped_env_required",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "invalid base sha",
      createRequest({ base_sha: "not-a-sha" }),
      "invalid_pr_evidence",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "invalid head sha",
      createRequest({ head_sha: "not-a-sha" }),
      "invalid_pr_evidence",
      { enabled: true, approvalGate: approvedGate() },
    ],
    [
      "local evidence dir",
      createRequest({ evidence_dir: "/tmp/raw" }),
      "invalid_pr_evidence",
      { enabled: true, approvalGate: approvedGate() },
    ],
  ] as const) {
    let calls = 0;
    const adapter = createRuntimeOwnedGitHubPrAdapter({
      approvalGate: approvedGate(),
      runner: async () => {
        calls += 1;
        return { exit_code: 0, stdout: "", stderr: "" };
      },
      ...(options ?? {}),
    });

    const result = await adapter.createPullRequest(request);

    assert.equal(result.ok, false, name);
    if (!result.ok) {
      assert.equal(result.code, code, name);
    }
    assert.equal(calls, 0, name);
  }
});

test("runtime-owned adapter ignores ambient gh auth and process env", async () => {
  const previous = process.env.GH_TOKEN;
  process.env.GH_TOKEN = token;
  let calls = 0;
  const adapter = createRuntimeOwnedGitHubPrAdapter({
    enabled: true,
    approvalGate: approvedGate(),
    runner: async () => {
      calls += 1;
      return { exit_code: 0, stdout: "", stderr: "" };
    },
  });

  try {
    const result = await adapter.createPullRequest(createRequest({ env: undefined }));

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "scoped_env_required");
    }
    assert.equal(calls, 0);
  } finally {
    if (previous === undefined) {
      delete process.env.GH_TOKEN;
    } else {
      process.env.GH_TOKEN = previous;
    }
  }
});

test("runtime-owned adapter records failed runner exit without raw stderr or token", async () => {
  const adapter = createRuntimeOwnedGitHubPrAdapter({
    enabled: true,
    approvalGate: approvedGate(),
    runner: async () => ({
      exit_code: 1,
      stdout: "",
      stderr: `bad credentials ${token}`,
    }),
  });

  const result = await adapter.createPullRequest(createRequest());

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "gh_pr_create_failed");
    assert.equal(result.exit_code, 1);
    assert.equal(result.stderr_log_ref, "artifact://mcr-840/github-pr-create/stderr.log");
    assert.equal(JSON.stringify(result).includes(token), false);
  }
});

for (const fixture of loadRefusalFixtures().filter((fixture) => fixture.support === "supported")) {
  test(`runtime-owned adapter refuses ${fixture.case_id} as ${fixture.expected.refusal_category}`, async () => {
    const calls: RuntimeOwnedGitHubPrCommand[] = [];
    const currentTime = { value: fixture.adapter.now };
    const approvalGate = gateForFixture(fixture, currentTime);
    const adapter = createRuntimeOwnedGitHubPrAdapter({
      enabled: fixture.adapter.enabled,
      approvalGate,
      runner:
        fixture.adapter.runner === "injected"
          ? async (command) => {
              calls.push(command);
              return { exit_code: 0, stdout: "", stderr: "" };
            }
          : undefined,
      now: () => new Date(currentTime.value),
    });

    const result = await adapter.createPullRequest(requestForFixture(fixture));

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(refusalCategoryFor(result.code), fixture.expected.refusal_category);
      assert.equal(result.code, fixture.expected.adapter_code);
    }
    assert.equal(calls.length, 0);
  });
}

function createRequest(overrides: Record<string, unknown> = {}) {
  return {
    action: "create_pr",
    task_id: taskId,
    proof: proof(),
    target,
    repository: "Notyet1307/github-pr-smoke-sandbox",
    title: "MCR-840 Runtime-Owned GitHub PR Adapter",
    body_file: ".mcr/runs/run_mcr_840/pr-body.md",
    base_sha: "b".repeat(40),
    head_sha: "c".repeat(40),
    cleanup_status: "not_started",
    disposable_target: { kind: "repository" },
    credential_scope: "disposable",
    env: { GH_TOKEN: token },
    evidence_dir: "artifact://mcr-840/github-pr-create",
    requested_at: "2026-06-29T10:05:00.000Z",
    ...overrides,
  };
}

type RefusalFixture = {
  case_id: string;
  support: "supported" | "deferred";
  adapter: {
    enabled: boolean;
    approval: "granted" | "missing" | "replayed";
    runner: "injected" | "missing";
    now: string;
  };
  request?: {
    overrides?: Record<string, unknown>;
    proof_overrides?: Partial<ProofLedgerEntry>;
  };
  expected: {
    refusal_category: string;
    adapter_code: string;
  };
};

function loadRefusalFixtures(): RefusalFixture[] {
  const fixtureDir = fileURLToPath(
    new URL("../../../fixtures/github-adapter/refusals/", import.meta.url),
  );

  return readdirSync(fixtureDir)
    .filter((filename) => filename.endsWith(".json"))
    .sort()
    .map((filename) =>
      JSON.parse(readFileSync(`${fixtureDir}/${filename}`, "utf8")),
    ) as RefusalFixture[];
}

function requestForFixture(fixture: RefusalFixture): RuntimeOwnedGitHubPrInput {
  return createRequest({
    ...(fixture.request?.proof_overrides
      ? { proof: proof(fixture.request.proof_overrides) }
      : {}),
    ...(fixture.request?.overrides ?? {}),
  }) as RuntimeOwnedGitHubPrInput;
}

function gateForFixture(
  fixture: RefusalFixture,
  currentTime: { value: string },
): ReturnType<typeof createInMemoryApprovalGate> {
  if (fixture.adapter.approval === "missing") {
    return unapprovedGate();
  }

  const gate = createInMemoryApprovalGate({
    now: () => new Date(currentTime.value),
    verified_proof_ids: new Set([proofId]),
  });
  currentTime.value = "2026-06-29T10:00:00.000Z";
  assert.equal(gate.grant(approval()).ok, true);
  currentTime.value = fixture.adapter.now;

  if (fixture.adapter.approval === "replayed") {
    assert.equal(
      gate.authorize({
        task_id: taskId,
        proof_id: proofId,
        action: "create_pr",
        target,
        requested_at: fixture.adapter.now,
      }).ok,
      true,
    );
  }

  return gate;
}

function refusalCategoryFor(code: string): string {
  if (code === "proof_verification_failed") {
    return "unverified_proof";
  }
  if (code === "approval_required") {
    return "missing_approval";
  }
  if (code === "approval_expired" || code === "approval_replayed") {
    return "expired_or_replayed_approval";
  }
  if (code === "credential_scope_required" || code === "scoped_env_required") {
    return "unsafe_credential";
  }
  if (code === "production_main_rejected") {
    return "unsafe_ref";
  }

  return code;
}

function approvedGate() {
  const approvalGate = createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00.000Z"),
    verified_proof_ids: new Set([proofId]),
  });

  assert.equal(approvalGate.grant(approval()).ok, true);

  return approvalGate;
}

function unapprovedGate() {
  return createInMemoryApprovalGate({
    now: () => new Date("2026-06-29T10:05:00.000Z"),
    verified_proof_ids: new Set([proofId]),
  });
}

function approval(overrides: Record<string, unknown> = {}) {
  return {
    approval_id: approvalId,
    task_id: taskId,
    proof_id: proofId,
    action: "create_pr",
    actor: { type: "human", id: "@lead:matrix.local" },
    target,
    conditions: ["Create only the disposable PR."],
    created_at: now,
    expires_at: "2026-06-29T11:00:00.000Z",
    ...overrides,
  };
}

function proof(overrides: Partial<ProofLedgerEntry> = {}): ProofLedgerEntry {
  return {
    proof_id: proofId,
    task_id: taskId,
    run_id: runId,
    trace_id: "trace_mcr_840",
    created_at: now,
    capability: "repo.patch.codex",
    worktree: {
      path: "../.worktrees/Carpet/MCR-840-runtime-owned-github-pr-adapter",
      branch: "mcr/MCR-840/runtime-owned-github-pr-adapter",
      base_branch: "main",
      base_sha: "a".repeat(40),
      head_sha: "c".repeat(40),
      cleanup_status: "kept_for_review",
    },
    summary: "Add guarded Runtime-owned GitHub PR create adapter.",
    artifacts: [
      {
        kind: "patch",
        uri: "artifact://mcr-840/diff.patch",
        sha256: "a".repeat(64),
      },
    ],
    validation: [
      {
        command: "pnpm --filter github-adapter test",
        exit_code: 0,
        status: "passed",
        log_ref: "artifact://mcr-840/github-adapter-test.log",
      },
    ],
    risk_notes: ["Adapter is disabled by default and requires disposable target."],
    rollback_notes: ["Remove Runtime-owned GitHub PR adapter."],
    ...overrides,
  };
}
