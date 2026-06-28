import type { Policy, PolicyRequest } from "./policy-loader.ts";

export type PolicyDecision = {
  decision: "allow" | "deny" | "approval_required";
  policy_id: string;
  reason: string;
  errors: string[];
};

export function decidePolicy(policy: Policy, request: PolicyRequest): PolicyDecision {
  const errors = policyDecisionErrors(policy, request);

  return {
    decision: errors.length === 0 ? "allow" : "deny",
    policy_id: policy.policy_id,
    reason: errors[0] ?? "allowed by policy",
    errors,
  };
}

function policyDecisionErrors(policy: Policy, request: PolicyRequest): string[] {
  const errors: string[] = [];
  const allowRule = policy.allowed_actions.find(
    (rule) =>
      rule.action === request.action &&
      rule.capability_id === request.capability_id,
  );
  const approvalRule = policy.approval_required_actions.find(
    (rule) => rule.action === request.action,
  );

  if (!allowRule) {
    errors.push("default deny: no allow rule matched");
  }

  if (policy.denied_actions.includes(request.action)) {
    errors.push(`action denied: ${request.action}`);
  }

  if (
    allowRule?.requires_isolated_worktree &&
    !request.worktree?.path.includes("/.worktrees/")
  ) {
    errors.push("isolated worktree required");
  }

  for (const contextRef of request.context_refs ?? []) {
    if (policy.worker_context.denied_context_kinds.includes(contextRef.kind)) {
      errors.push(`worker context denied: ${contextRef.kind}`);
    }
  }

  if (request.matrix_event) {
    if (request.matrix_event.claimed_actor_id !== request.matrix_event.sender_id) {
      errors.push("matrix actor spoofing denied");
    }
    if (
      policy.matrix_events.room_workspace_map[request.matrix_event.room_id] !==
      request.workspace_id
    ) {
      errors.push("workspace room mismatch denied");
    }
  }

  if (request.instruction?.attempts_policy_override) {
    errors.push("prompt injection cannot change policy");
  }

  if (
    request.command &&
    !policy.commands.allowed_names.includes(request.command.name)
  ) {
    errors.push("command outside validation allowlist denied");
  }

  if (request.target.path) {
    if (hasPathTraversal(request.target.path)) {
      errors.push("target path traversal denied");
    }
    if (request.scope && !pathAllowed(request.target.path, request.scope)) {
      errors.push("target path outside allowed scope");
    }
    if (request.scope && pathForbidden(request.target.path, request.scope)) {
      errors.push("target path matches forbidden scope");
    }
  }

  if (
    request.target.operation === "create_pr" &&
    request.target.source_ref &&
    request.target.base_ref &&
    request.target.source_ref === request.target.base_ref
  ) {
    errors.push("branch/pr target confusion denied");
  }

  for (const artifactRef of request.artifact_refs ?? []) {
    if (hasPathTraversal(artifactRef.uri)) {
      errors.push("artifact ref path traversal denied");
    }
    if (
      !policy.artifact_refs.allowed_uri_prefixes.some((prefix) =>
        artifactRef.uri.startsWith(prefix),
      )
    ) {
      errors.push("artifact ref uri prefix denied");
    }
    if (!/^[a-f0-9]{64}$/.test(artifactRef.sha256 ?? "")) {
      errors.push("artifact ref missing sha256");
    }
  }

  if (policy.memory.direct_write_actions.includes(request.action)) {
    errors.push("direct memory write denied");
  }

  if (approvalRule) {
    const approval = request.approval;
    const proof = request.proof;

    if (!approval) {
      errors.push("missing action-scoped approval");
    } else {
      if (approval.action !== request.action) {
        errors.push("approval action mismatch");
      }
      if (approval.task_id !== request.task_id) {
        errors.push("approval task mismatch");
      }
      if (approval.target_ref !== request.target.ref) {
        errors.push("approval target mismatch");
      }
      if (approval.proof_id !== proof?.proof_id) {
        errors.push("approval proof mismatch");
      }
      if (approval.replay_key !== approvalReplayKey(request)) {
        errors.push("approval replay key mismatch");
      }
      if (request.replay_cache?.used_replay_keys?.includes(approval.replay_key)) {
        errors.push("approval replayed");
      }
      if (new Date(approval.expires_at) <= new Date(request.requested_at)) {
        errors.push("approval expired");
      }
    }
  }

  if (request.proof) {
    const proof = request.proof;

    if (proof.verdict !== "verified" || proof.verifier_capability !== "proof.verify") {
      errors.push("proof is not verifier-confirmed");
    }

    for (const validation of proof.validation ?? []) {
      if (validation.status !== "passed" || validation.exit_code !== 0) {
        errors.push("proof validation did not pass");
      }
      if (
        !policy.artifact_refs.allowed_uri_prefixes.some((prefix) =>
          validation.log_ref.startsWith(prefix),
        )
      ) {
        errors.push("proof log ref uri prefix denied");
      }
      if (validation.log_contains_secret) {
        errors.push("secret-bearing log denied");
      }
    }
  }

  return errors;
}

function matchesPathPattern(value: string, pattern: string): boolean {
  if (pattern.endsWith("/**")) {
    return value === pattern.slice(0, -3) || value.startsWith(pattern.slice(0, -2));
  }
  if (pattern.endsWith("*")) {
    return value.startsWith(pattern.slice(0, -1));
  }
  return value === pattern;
}

function pathAllowed(
  targetPath: string,
  scope: { allowed_paths: string[] },
): boolean {
  return scope.allowed_paths.some((pattern) => matchesPathPattern(targetPath, pattern));
}

function pathForbidden(
  targetPath: string,
  scope: { forbidden_paths: string[] },
): boolean {
  return scope.forbidden_paths.some((pattern) =>
    matchesPathPattern(targetPath, pattern),
  );
}

function hasPathTraversal(value: string): boolean {
  return /(^|[/\\])\.\.($|[/\\])/.test(value) || value.startsWith("file://");
}

function approvalReplayKey(request: PolicyRequest): string {
  return [
    request.task_id,
    request.run_id,
    request.action,
    request.target.ref,
    request.proof?.proof_id,
  ].join(":");
}
