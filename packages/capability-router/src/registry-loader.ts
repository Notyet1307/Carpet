import { loadJsonFile } from "runtime-contracts";

export type RiskLevel = "low" | "medium" | "high";

export type Capability = {
  id: string;
  task_types: string[];
  worker_type: string;
  risk_level: RiskLevel;
  permissions: {
    allow: string[];
    deny: string[];
  };
  human_gate: {
    required: boolean;
    gate_type: string;
    scope: string;
  };
  execution?: {
    requires_isolated_worktree?: boolean;
    worktree_created_by?: string;
    codex_cwd?: string;
    allow_main_checkout_edits?: boolean;
    cleanup_policy?: string;
  };
};

export type CapabilityRegistry = {
  capabilities: Capability[];
};

export function loadCapabilityRegistry(filePath: string | URL): CapabilityRegistry {
  const registry = loadJsonFile(filePath);

  if (!isCapabilityRegistry(registry)) {
    throw new Error(`Invalid capability registry: ${String(filePath)}`);
  }

  return registry;
}

function isCapabilityRegistry(value: unknown): value is CapabilityRegistry {
  return (
    isRecord(value) &&
    Array.isArray(value.capabilities) &&
    value.capabilities.every(isCapability)
  );
}

function isCapability(value: unknown): value is Capability {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isStringArray(value.task_types) &&
    typeof value.worker_type === "string" &&
    isRiskLevel(value.risk_level) &&
    isRecord(value.permissions) &&
    isStringArray(value.permissions.allow) &&
    isStringArray(value.permissions.deny) &&
    isRecord(value.human_gate) &&
    typeof value.human_gate.required === "boolean" &&
    typeof value.human_gate.gate_type === "string" &&
    typeof value.human_gate.scope === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "low" || value === "medium" || value === "high";
}
