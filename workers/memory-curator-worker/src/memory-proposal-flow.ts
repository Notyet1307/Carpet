import {
  verifyProof,
  type ProofLedgerEntry,
} from "proof-ledger";

export type MemoryLessonCandidate = {
  reusable: boolean;
  scope: string;
  statement: string;
  evidence_ref: string;
  review_target: string;
  confidence: "low" | "medium" | "high";
  apply_live?: boolean;
};

export type MemoryProposalEvent = {
  specversion: "1.0";
  id: string;
  source: string;
  type: "com.notyet.agent.memory.update.proposed";
  subject: string;
  time: string;
  datacontenttype: "application/json";
  workspace_id: string;
  task_id: string;
  run_id: string;
  trace_id: string;
  actor: {
    type: "runtime";
    id: string;
  };
  created_at: string;
  idempotency_key: string;
  data: {
    proposal_id: string;
    proof_id: string;
    scope: string;
    summary: string;
    proposed_change: {
      operation: "propose";
      target: string;
      statement: string;
      rationale: string;
    };
  };
};

export type CreateMemoryProposalInput = {
  proof: ProofLedgerEntry;
  proof_verification?: unknown;
  verified_proof_ids: ReadonlySet<string>;
  lesson: MemoryLessonCandidate | null;
  proposal_id: string;
  event_id: string;
  created_at: string;
  workspace_id: string;
  source?: string;
  actor_id?: string;
};

export type MemoryProposalResult =
  | { ok: true; status: "proposed"; event: MemoryProposalEvent }
  | { ok: true; status: "no_update"; rationale: string }
  | {
      ok: false;
      code:
        | "unverified_proof"
        | "invalid_lesson"
        | "unbound_evidence_ref"
        | "automatic_memory_write_denied";
      reason: string;
    };

export function createMemoryProposal(
  input: CreateMemoryProposalInput,
): MemoryProposalResult {
  const proofVerification = verifyProof({ proof: input.proof });

  if (
    !proofVerification.ok ||
    !proofVerification.ready_for_approval ||
    !input.verified_proof_ids.has(input.proof.proof_id)
  ) {
    return fail("unverified_proof", "proof has not been verified");
  }

  const { lesson } = input;

  if (!lesson || lesson.reusable === false) {
    return {
      ok: true,
      status: "no_update",
      rationale: "proof contains no reusable lesson candidate",
    };
  }
  if (lesson.apply_live === true) {
    return fail(
      "automatic_memory_write_denied",
      "memory curator can propose only and cannot write live memory",
    );
  }

  const missing = [
    ["scope", lesson.scope],
    ["statement", lesson.statement],
    ["evidence_ref", lesson.evidence_ref],
    ["confidence", lesson.confidence],
    ["review_target", lesson.review_target],
  ].find(([, value]) => typeof value !== "string" || value.length === 0)?.[0];

  if (missing) {
    return fail("invalid_lesson", `lesson is missing ${missing}`);
  }
  if (!isConfidence(lesson.confidence)) {
    return fail("invalid_lesson", "lesson confidence must be low, medium, or high");
  }
  if (!proofEvidenceRefs(input.proof).has(lesson.evidence_ref)) {
    return fail(
      "unbound_evidence_ref",
      "lesson evidence_ref must point to proof artifact or validation evidence",
    );
  }

  return {
    ok: true,
    status: "proposed",
    event: {
      specversion: "1.0",
      id: input.event_id,
      source: input.source ?? "runtime://memory-curator-worker",
      type: "com.notyet.agent.memory.update.proposed",
      subject: input.proof.task_id,
      time: input.created_at,
      datacontenttype: "application/json",
      workspace_id: input.workspace_id,
      task_id: input.proof.task_id,
      run_id: input.proof.run_id,
      trace_id: input.proof.trace_id,
      actor: {
        type: "runtime",
        id: input.actor_id ?? "memory-curator-worker",
      },
      created_at: input.created_at,
      idempotency_key: `memory-proposal:${input.proof.proof_id}:${input.proposal_id}`,
      data: {
        proposal_id: input.proposal_id,
        proof_id: input.proof.proof_id,
        scope: lesson.scope,
        summary: lesson.statement,
        proposed_change: {
          operation: "propose",
          target: lesson.review_target,
          statement: lesson.statement,
          rationale: `Evidence: ${lesson.evidence_ref}`,
        },
      },
    },
  };
}

function isConfidence(value: string): value is MemoryLessonCandidate["confidence"] {
  return value === "low" || value === "medium" || value === "high";
}

function proofEvidenceRefs(proof: ProofLedgerEntry) {
  return new Set([
    ...proof.artifacts.map((artifact) => artifact.uri),
    ...proof.validation.flatMap((validation) =>
      validation.log_ref ? [validation.log_ref] : [],
    ),
  ]);
}

function fail(
  code: Extract<MemoryProposalResult, { ok: false }>["code"],
  reason: string,
): Extract<MemoryProposalResult, { ok: false }> {
  return { ok: false, code, reason };
}
