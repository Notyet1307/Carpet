import { readFileSync } from "node:fs";

export type Policy = {
  policy_id: string;
  decision_default: "deny";
  prompt_constraints?: {
    not_runtime_enforcement?: boolean;
  };
  runtime_enforced_controls?: string[];
  worker_context: {
    denied_context_kinds: string[];
  };
  allowed_actions: Array<{
    action: string;
    capability_id: string;
    requires_isolated_worktree?: boolean;
  }>;
  denied_actions: string[];
  matrix_events: {
    room_workspace_map: Record<string, string>;
  };
  commands: {
    allowed_names: string[];
  };
  approval_required_actions: Array<{
    action: string;
  }>;
  artifact_refs: {
    allowed_uri_prefixes: string[];
  };
  memory: {
    direct_write_actions: string[];
  };
};

export type PolicyFixture = {
  case_id: string;
  expected_decision: "allow" | "deny" | "approval_required";
  expected_errors: string[];
  request: PolicyRequest;
};

export type PolicyRequest = {
  task_id: string;
  run_id: string;
  workspace_id?: string;
  capability_id: string;
  action: string;
  requested_at: string;
  worktree?: {
    path: string;
  };
  scope?: {
    allowed_paths: string[];
    forbidden_paths: string[];
  };
  target: {
    type: string;
    path?: string;
    ref: string;
    operation?: string;
    source_ref?: string;
    base_ref?: string;
  };
  context_refs?: Array<{
    kind: string;
  }>;
  matrix_event?: {
    room_id: string;
    sender_id: string;
    claimed_actor_id: string;
  };
  instruction?: {
    attempts_policy_override?: boolean;
  };
  command?: {
    name: string;
  };
  artifact_refs?: Array<{
    uri: string;
    sha256?: string;
  }>;
  proof?: {
    proof_id: string;
    verdict: string;
    verifier_capability: string;
    validation?: Array<{
      status: string;
      exit_code: number;
      log_ref: string;
      log_contains_secret?: boolean;
    }>;
  };
  approval?: {
    task_id: string;
    proof_id: string;
    action: string;
    target_ref: string;
    replay_key: string;
    expires_at: string;
  };
  replay_cache?: {
    used_replay_keys?: string[];
  };
};

export function loadPolicy(filePath: string | URL): Policy {
  const policy = loadJson(filePath);

  if (!isPolicy(policy)) {
    throw new Error(`Invalid policy: ${String(filePath)}`);
  }

  return policy;
}

export function loadPolicyFixture(filePath: string | URL): PolicyFixture {
  const fixture = loadJson(filePath);

  if (!isPolicyFixture(fixture)) {
    throw new Error(`Invalid policy fixture: ${String(filePath)}`);
  }

  return fixture;
}

function loadJson(filePath: string | URL): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function isPolicy(value: unknown): value is Policy {
  return (
    isRecord(value) &&
    typeof value.policy_id === "string" &&
    value.decision_default === "deny" &&
    isRecord(value.worker_context) &&
    isStringArray(value.worker_context.denied_context_kinds) &&
    Array.isArray(value.allowed_actions) &&
    isStringArray(value.denied_actions) &&
    isRecord(value.matrix_events) &&
    isRecord(value.matrix_events.room_workspace_map) &&
    isRecord(value.commands) &&
    isStringArray(value.commands.allowed_names) &&
    Array.isArray(value.approval_required_actions) &&
    isRecord(value.artifact_refs) &&
    isStringArray(value.artifact_refs.allowed_uri_prefixes) &&
    isRecord(value.memory) &&
    isStringArray(value.memory.direct_write_actions)
  );
}

function isPolicyFixture(value: unknown): value is PolicyFixture {
  return (
    isRecord(value) &&
    typeof value.case_id === "string" &&
    isDecision(value.expected_decision) &&
    isStringArray(value.expected_errors) &&
    isRecord(value.request)
  );
}

function isDecision(value: unknown): value is PolicyFixture["expected_decision"] {
  return value === "allow" || value === "deny" || value === "approval_required";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
