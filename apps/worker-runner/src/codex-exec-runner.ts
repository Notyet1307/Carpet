import path from "node:path";

const outputSchema = "./schemas/codex/repo-patch-result.schema.json";
const secretEnvKeyPattern =
  /(TOKEN|SECRET|PASSWORD|CREDENTIAL|COOKIE|SESSION|API_KEY|ACCESS_KEY|PRIVATE_KEY|AUTH)/i;
const secretEnvValuePattern = /(sk-[a-z0-9_-]+|BEGIN [A-Z ]*PRIVATE KEY)/i;

export type CodexExecCommandInput = {
  worktree_path: string;
  prompt_file: string;
  evidence_dir: string;
  codex_binary?: string;
};

export type CodexExecCommand = {
  executable: string;
  args: string[];
  cwd: string;
  stdin_file: string;
  env?: Record<string, string>;
};

export type CodexExecEvidenceRefs = {
  jsonl: string;
  final_output: string;
  validation_log: string;
  diff: string;
  proof: string;
};

export type CodexExecSmokeInput = CodexExecCommandInput & {
  task_id: string;
  run_id: string;
  main_checkout_path: string;
  smoke?: boolean;
  env?: Record<string, string>;
};

export type CodexExecProcessResult = {
  exit_code: number;
  stdout: string;
  stderr: string;
};

export type CodexExecProcessRunner = (
  command: CodexExecCommand,
) => Promise<CodexExecProcessResult> | CodexExecProcessResult;

export type CodexExecSmokeResult = {
  status: "blocked" | "completed" | "failed";
  executed: boolean;
  code: string;
  reason: string;
  errors: string[];
  command: CodexExecCommand;
  evidence_refs: CodexExecEvidenceRefs;
  exit_code?: number;
};

export function buildCodexExecCommand(
  input: CodexExecCommandInput,
): CodexExecCommand {
  return {
    executable: input.codex_binary ?? "codex",
    cwd: input.worktree_path,
    stdin_file: input.prompt_file,
    args: [
      "exec",
      "--json",
      "--sandbox",
      "workspace-write",
      "--output-schema",
      outputSchema,
      "-",
    ],
  };
}

export async function runCodexExecSmoke(
  input: CodexExecSmokeInput,
  processRunner?: CodexExecProcessRunner,
): Promise<CodexExecSmokeResult> {
  const command = buildCodexExecCommand(input);
  const evidenceRefs = buildEvidenceRefs(input.evidence_dir);

  if (isMainCheckout(input.worktree_path, input.main_checkout_path)) {
    return blocked(
      "main_checkout_cwd_rejected",
      "Refusing to run codex exec from the main checkout cwd or a descendant.",
      [],
      command,
      evidenceRefs,
    );
  }

  const secretEnvKeys = findSecretEnvKeys(input.env);
  if (secretEnvKeys.length > 0) {
    return blocked(
      "secret_env_rejected",
      "Refusing to pass secret-bearing environment to codex exec.",
      secretEnvKeys,
      command,
      evidenceRefs,
    );
  }

  if (input.smoke !== true) {
    return blocked(
      "explicit_smoke_flag_required",
      "Real codex exec smoke is disabled unless smoke is explicitly true.",
      [],
      command,
      evidenceRefs,
    );
  }

  if (!processRunner) {
    return blocked(
      "process_runner_required",
      "A process runner must be injected for manual smoke execution.",
      [],
      command,
      evidenceRefs,
    );
  }

  const executableCommand = input.env
    ? { ...command, env: { ...input.env } }
    : command;
  const result = await processRunner(executableCommand);

  return {
    status: result.exit_code === 0 ? "completed" : "failed",
    executed: true,
    code: result.exit_code === 0 ? "ok" : "codex_exec_failed",
    reason:
      result.exit_code === 0
        ? "codex exec smoke process completed"
        : "codex exec smoke process failed",
    errors: result.exit_code === 0 ? [] : [result.stderr || "codex exec failed"],
    command: executableCommand,
    evidence_refs: evidenceRefs,
    exit_code: result.exit_code,
  };
}

function blocked(
  code: string,
  reason: string,
  errors: string[],
  command: CodexExecCommand,
  evidenceRefs: CodexExecEvidenceRefs,
): CodexExecSmokeResult {
  return {
    status: "blocked",
    executed: false,
    code,
    reason,
    errors,
    command,
    evidence_refs: evidenceRefs,
  };
}

function buildEvidenceRefs(evidenceDir: string): CodexExecEvidenceRefs {
  return {
    jsonl: joinRef(evidenceDir, "codex-exec.jsonl"),
    final_output: joinRef(evidenceDir, "repo-patch-result.json"),
    validation_log: joinRef(evidenceDir, "validation.log"),
    diff: joinRef(evidenceDir, "diff.patch"),
    proof: joinRef(evidenceDir, "proof.json"),
  };
}

function joinRef(dir: string, file: string) {
  const prefix = dir.replace(/\/+$/, "");
  return prefix.length > 0 ? `${prefix}/${file}` : file;
}

function isMainCheckout(worktreePath: string, mainCheckoutPath: string) {
  const relative = path.relative(
    path.resolve(mainCheckoutPath),
    path.resolve(worktreePath),
  );
  const firstSegment = relative.split(path.sep)[0];

  return relative === "" || (firstSegment !== ".." && !path.isAbsolute(relative));
}

function findSecretEnvKeys(env: Record<string, string> | undefined) {
  if (!env) {
    return [];
  }

  return Object.entries(env)
    .filter(
      ([key, value]) =>
        secretEnvKeyPattern.test(key) || secretEnvValuePattern.test(value),
    )
    .map(([key]) => key);
}
