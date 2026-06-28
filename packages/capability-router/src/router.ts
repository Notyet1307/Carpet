import type { Capability, CapabilityRegistry, RiskLevel } from "./registry-loader.ts";

export type ScopedTaskRouteRequest = {
  task_type: string;
  risk: RiskLevel;
  required_permissions?: string[];
  suggested_capability?: string;
};

export type RouteFailureCode =
  | "unsupported_task_type"
  | "unknown_capability"
  | "overbroad_capability"
  | "risk_too_low"
  | "permission_denied"
  | "permission_unsupported"
  | "ambiguous_capability";

export type CapabilityRouteResult =
  | {
      ok: true;
      capability: Capability;
      human_gated: boolean;
    }
  | {
      ok: false;
      code: RouteFailureCode;
      reason: string;
    };

const riskRank: Record<RiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const externalWritePermissions = new Set([
  "github:create_pr",
  "github:merge",
  "github:push_main",
  "deploy:write",
  "memory:write_direct",
]);

export function routeCapability(
  registry: CapabilityRegistry,
  task: ScopedTaskRouteRequest,
): CapabilityRouteResult {
  const taskMatches = registry.capabilities.filter((capability) =>
    capability.task_types.includes(task.task_type),
  );

  if (taskMatches.length === 0) {
    return fail("unsupported_task_type", `No capability supports ${task.task_type}`);
  }

  let candidates = taskMatches;

  if (task.suggested_capability) {
    const suggested = registry.capabilities.find(
      (capability) => capability.id === task.suggested_capability,
    );

    if (!suggested) {
      return fail("unknown_capability", `Unknown capability ${task.suggested_capability}`);
    }

    if (!taskMatches.includes(suggested)) {
      return fail(
        "overbroad_capability",
        `${suggested.id} does not support ${task.task_type}`,
      );
    }

    candidates = [suggested];
  }

  const requiredPermissions = task.required_permissions ?? [];
  const riskSafe = candidates.filter(
    (capability) => riskRank[capability.risk_level] <= riskRank[task.risk],
  );

  if (riskSafe.length === 0) {
    return fail("risk_too_low", `No capability fits ${task.risk} risk`);
  }

  const denied = riskSafe.find((capability) =>
    requiredPermissions.some((permission) =>
      capability.permissions.deny.includes(permission),
    ),
  );

  if (denied) {
    return fail("permission_denied", `${denied.id} denies a required permission`);
  }

  const safe = riskSafe.filter((capability) =>
    requiredPermissions.every((permission) =>
      capability.permissions.allow.includes(permission),
    ),
  );

  if (safe.length === 0) {
    return fail("permission_unsupported", "No capability allows all required permissions");
  }

  if (safe.length > 1) {
    return fail("ambiguous_capability", "Multiple safe capabilities match");
  }

  const capability = safe[0];

  if (!capability) {
    return fail("permission_unsupported", "No capability allows all required permissions");
  }

  return {
    ok: true,
    capability,
    human_gated:
      capability.human_gate.required ||
      capability.permissions.allow.some((permission) =>
        externalWritePermissions.has(permission),
      ),
  };
}

function fail(code: RouteFailureCode, reason: string): CapabilityRouteResult {
  return { ok: false, code, reason };
}
