export type CodexCommandResult = {
  command: string;
  exit_code: number;
  status: string;
  summary: string;
  log_ref: string;
};

export type CodexJsonlError = {
  code: string;
  message: string;
};

export type CodexJsonlSummary = {
  thread_id: string | null;
  run_id: string | null;
  terminal_status: string | null;
  terminal_reason: string | null;
  command_results: CodexCommandResult[];
  errors: CodexJsonlError[];
};

export function parseCodexJsonl(
  jsonl: string,
  jsonlArtifactRef: string,
): CodexJsonlSummary {
  const summary: CodexJsonlSummary = {
    thread_id: null,
    run_id: null,
    terminal_status: null,
    terminal_reason: null,
    command_results: [],
    errors: [],
  };

  for (const [index, line] of jsonl.split(/\r?\n/).entries()) {
    if (line.trim().length === 0) {
      continue;
    }

    const event = JSON.parse(line) as Record<string, unknown>;

    if (event.type === "thread.started") {
      summary.thread_id = stringOrNull(event.thread_id);
      summary.run_id = stringOrNull(event.run_id);
    }

    if (event.type === "item.completed" && isCommandItem(event.item)) {
      summary.command_results.push({
        command: event.item.command,
        exit_code: event.item.exit_code,
        status: event.item.status,
        summary: event.item.summary,
        log_ref: `${jsonlArtifactRef}#${event.item.id}`,
      });
    }

    if (event.type === "error") {
      summary.errors.push({
        code: String(event.code ?? "codex_error"),
        message: String(event.message ?? `Codex JSONL error on line ${index + 1}`),
      });
    }

    if (event.type === "turn.completed") {
      summary.terminal_status = stringOrNull(event.status);
      summary.terminal_reason = stringOrNull(event.reason);
    }
  }

  return summary;
}

function isCommandItem(value: unknown): value is {
  id: string;
  type: "command_execution";
  command: string;
  exit_code: number;
  status: string;
  summary: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    item.type === "command_execution" &&
    typeof item.id === "string" &&
    typeof item.command === "string" &&
    typeof item.exit_code === "number" &&
    typeof item.status === "string" &&
    typeof item.summary === "string"
  );
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
