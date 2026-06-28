import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSchemaValidator,
  loadJsonSchema,
} from "../../../packages/runtime-contracts/src/index.ts";

import { replayFakeCodexProcess } from "./fake-codex-process.ts";
import type { CodexCommandResult } from "./codex-jsonl-parser.ts";

export type WorkerRunnerStatus =
  | "success"
  | "failed"
  | "blocked"
  | "needs_human_input"
  | "malformed";

export type RunFakeCodexWorkerInput = {
  jsonl: string;
  jsonl_artifact_ref: string;
  final_output?: unknown;
  final_output_artifact_ref?: string;
  forbidden_paths: string[];
};

export type WorkerRunnerResult = {
  status: WorkerRunnerStatus;
  ready_for_review: boolean;
  needs_human_input: boolean;
  reason: string;
  code: string;
  errors: string[];
  artifact_refs: {
    jsonl: string;
    final_output?: string;
  };
  command_results: CodexCommandResult[];
  final_output?: RepoPatchResult;
};

type RepoPatchResult = {
  status: Exclude<WorkerRunnerStatus, "malformed">;
  ready_for_review: boolean;
  files_changed: Array<{ path: string; action: string }>;
  validation_results: Array<{
    command: string;
    exit_code: number;
    status: "passed" | "failed" | "skipped";
    summary: string;
    log_ref?: string;
  }>;
};

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const validateRepoPatchResult = createSchemaValidator(
  loadJsonSchema(path.join(root, "schemas/codex/repo-patch-result.schema.json")),
);

export function runFakeCodexWorker(
  input: RunFakeCodexWorkerInput,
): WorkerRunnerResult {
  let replay;

  try {
    replay = replayFakeCodexProcess(input);
  } catch (error) {
    return rejected("malformed", "invalid_jsonl", "Codex JSONL could not be parsed", [
      error instanceof Error ? error.message : String(error),
    ], {
      jsonl: input.jsonl_artifact_ref,
      final_output: input.final_output_artifact_ref,
    });
  }

  const base = {
    artifact_refs: replay.artifact_refs,
    command_results: replay.jsonl_summary.command_results,
  };

  if (input.final_output !== undefined) {
    const validation = validateRepoPatchResult(input.final_output);

    if (!validation.valid) {
      return {
        ...base,
        status: "malformed",
        ready_for_review: false,
        needs_human_input: false,
        reason: "final output failed schema validation",
        code: "invalid_final_output",
        errors: validation.errors,
      };
    }

    const finalOutput = input.final_output as RepoPatchResult;
    const forbiddenPath = firstForbiddenPath(
      finalOutput.files_changed,
      input.forbidden_paths,
    );

    if (forbiddenPath) {
      return {
        ...base,
        status: "failed",
        ready_for_review: false,
        needs_human_input: false,
        reason: `${forbiddenPath.path} matches ${forbiddenPath.pattern}`,
        code: "forbidden_path_change",
        errors: [`Forbidden path changed: ${forbiddenPath.path}`],
        final_output: finalOutput,
      };
    }

    const missingValidation = firstUnbackedValidation(
      finalOutput,
      replay.jsonl_summary.command_results,
    );

    if (missingValidation) {
      return {
        ...base,
        status: "malformed",
        ready_for_review: false,
        needs_human_input: false,
        reason: `validation result has no matching JSONL command evidence: ${missingValidation.command}`,
        code: "missing_jsonl_validation_evidence",
        errors: [`Missing JSONL evidence for ${missingValidation.command}`],
        final_output: finalOutput,
      };
    }

    const streamFailure = streamFailureStatus(
      replay.jsonl_summary.terminal_status,
      finalOutput.status,
    );

    if (streamFailure) {
      return {
        ...base,
        status: streamFailure,
        ready_for_review: false,
        needs_human_input: streamFailure !== "failed",
        reason: terminalReason(input, replay.jsonl_summary.terminal_reason),
        code: "codex_stream_terminal_mismatch",
        errors: [terminalReason(input, replay.jsonl_summary.terminal_reason)],
        final_output: finalOutput,
      };
    }

    return {
      ...base,
      status: finalOutput.status,
      ready_for_review: finalOutput.ready_for_review,
      needs_human_input:
        finalOutput.status === "blocked" ||
        finalOutput.status === "needs_human_input",
      reason: statusReason(finalOutput.status),
      code: "ok",
      errors: [],
      final_output: finalOutput,
    };
  }

  if (replay.jsonl_summary.terminal_status === "failed") {
    const reason = terminalReason(input, replay.jsonl_summary.terminal_reason);

    return {
      ...base,
      status: "failed",
      ready_for_review: false,
      needs_human_input: false,
      reason,
      code: "codex_failed",
      errors: [reason],
    };
  }

  if (replay.jsonl_summary.terminal_status === "blocked") {
    const reason = terminalReason(input, replay.jsonl_summary.terminal_reason);

    return {
      ...base,
      status: "blocked",
      ready_for_review: false,
      needs_human_input: true,
      reason,
      code: "codex_blocked",
      errors: [reason],
    };
  }

  return {
    ...base,
    status: "malformed",
    ready_for_review: false,
    needs_human_input: false,
    reason: "final output is required for completed Codex runs",
    code: "missing_final_output",
    errors: ["final output is required for completed Codex runs"],
  };
}

function firstForbiddenPath(
  filesChanged: RepoPatchResult["files_changed"],
  forbiddenPaths: string[],
) {
  for (const file of filesChanged) {
    for (const pattern of forbiddenPaths) {
      if (globMatch(pattern, file.path)) {
        return { path: file.path, pattern };
      }
    }
  }

  return null;
}

function firstUnbackedValidation(
  output: RepoPatchResult,
  commands: CodexCommandResult[],
) {
  return output.validation_results.find(
    (validation) =>
      !commands.some(
        (command) =>
          command.command === validation.command &&
          command.exit_code === validation.exit_code,
      ),
  );
}

function streamFailureStatus(
  terminalStatus: string | null,
  finalStatus: RepoPatchResult["status"],
) {
  if (finalStatus !== "success") {
    return null;
  }
  if (terminalStatus === "failed") {
    return "failed";
  }
  if (terminalStatus === "blocked") {
    return "blocked";
  }

  return null;
}

function terminalReason(
  input: RunFakeCodexWorkerInput,
  terminalReason: string | null,
) {
  if (terminalReason) {
    return terminalReason;
  }

  const replay = replayFakeCodexProcess(input);
  return replay.jsonl_summary.errors[0]?.message ?? "Codex run did not succeed";
}

function statusReason(status: RepoPatchResult["status"]) {
  if (status === "success") {
    return "worker completed with validation evidence";
  }
  return "worker returned a non-success final output";
}

function rejected(
  status: WorkerRunnerStatus,
  code: string,
  reason: string,
  errors: string[],
  artifactRefs: WorkerRunnerResult["artifact_refs"],
): WorkerRunnerResult {
  return {
    status,
    ready_for_review: false,
    needs_human_input: status === "blocked" || status === "needs_human_input",
    reason,
    code,
    errors,
    artifact_refs: artifactRefs,
    command_results: [],
  };
}

function globMatch(pattern: string, value: string) {
  const globstar = "\0";
  const source = escapeRegExp(pattern)
    .replace(/\*\*/g, globstar)
    .replace(/\*/g, "[^/]*")
    .replaceAll(globstar, ".*");

  return new RegExp(`^${source}$`).test(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}
