import {
  parseCodexJsonl,
  type CodexJsonlSummary,
} from "./codex-jsonl-parser.ts";

export type FakeCodexProcessInput = {
  jsonl: string;
  jsonl_artifact_ref: string;
  final_output?: unknown;
  final_output_artifact_ref?: string;
};

export type FakeCodexReplay = {
  jsonl_summary: CodexJsonlSummary;
  final_output?: unknown;
  artifact_refs: {
    jsonl: string;
    final_output?: string;
  };
};

export function replayFakeCodexProcess(
  input: FakeCodexProcessInput,
): FakeCodexReplay {
  return {
    jsonl_summary: parseCodexJsonl(input.jsonl, input.jsonl_artifact_ref),
    final_output: input.final_output,
    artifact_refs: artifactRefs(input),
  };
}

function artifactRefs(input: FakeCodexProcessInput) {
  if (input.final_output_artifact_ref) {
    return {
      jsonl: input.jsonl_artifact_ref,
      final_output: input.final_output_artifact_ref,
    };
  }

  return { jsonl: input.jsonl_artifact_ref };
}
