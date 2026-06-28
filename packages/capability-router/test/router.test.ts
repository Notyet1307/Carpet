import { equal } from "node:assert/strict";
import test from "node:test";

import { loadCapabilityRegistry, routeCapability } from "capability-router";

const registry = loadCapabilityRegistry(
  new URL("../../../runtime/capabilities.yaml", import.meta.url),
);

test("routes CI failure evidence to ci.recovery", () => {
  const result = routeCapability(registry, {
    task_type: "ci_recovery",
    risk: "medium",
    required_permissions: ["repo:read", "github:read_checks", "process:run_tests"],
  });

  equal(result.ok, true);
  if (result.ok) {
    equal(result.capability.id, "ci.recovery");
    equal(result.human_gated, false);
  }
});

test("routes generic repo patch work to repo.patch.codex", () => {
  const result = routeCapability(registry, {
    task_type: "code_change",
    risk: "medium",
    required_permissions: ["repo:read", "repo:write_patch", "process:run_tests"],
  });

  equal(result.ok, true);
  if (result.ok) {
    equal(result.capability.id, "repo.patch.codex");
    equal(result.capability.id === "ci.recovery", false);
  }
});

test("routes security review to security.review without write permission", () => {
  const result = routeCapability(registry, {
    task_type: "security_review",
    risk: "high",
    required_permissions: ["repo:read", "artifact:read", "process:run_tests"],
  });

  equal(result.ok, true);
  if (result.ok) {
    equal(result.capability.id, "security.review");
    equal(result.capability.permissions.allow.includes("repo:write_patch"), false);
    equal(result.capability.permissions.deny.includes("repo:write_patch"), true);
  }
});

test("rejects unsupported or overbroad capabilities", () => {
  const unsupported = routeCapability(registry, {
    task_type: "database_migration",
    risk: "high",
    required_permissions: ["repo:read", "database:write"],
  });

  equal(unsupported.ok, false);
  if (!unsupported.ok) {
    equal(unsupported.code, "unsupported_task_type");
  }

  const overbroad = routeCapability(registry, {
    task_type: "security_review",
    risk: "high",
    required_permissions: ["repo:read"],
    suggested_capability: "repo.patch.codex",
  });

  equal(overbroad.ok, false);
  if (!overbroad.ok) {
    equal(overbroad.code, "overbroad_capability");
  }
});

test("keeps denied permissions denied before Work Cell creation", () => {
  const result = routeCapability(registry, {
    task_type: "security_review",
    risk: "high",
    required_permissions: ["repo:write_patch"],
  });

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "permission_denied");
  }
});

test("marks external-write capability paths as human-gated", () => {
  const result = routeCapability(registry, {
    task_type: "external_pr_request",
    risk: "high",
    required_permissions: ["github:create_pr"],
  });

  equal(result.ok, true);
  if (result.ok) {
    equal(result.capability.id, "github.pr.create");
    equal(result.human_gated, true);
  }
});
