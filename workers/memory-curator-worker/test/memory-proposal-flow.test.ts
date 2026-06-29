import { deepEqual, equal, match, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";
import addFormats from "ajv-formats";
import { type ProofLedgerEntry, verifyProof } from "proof-ledger";

import {
  createMemoryProposal,
  type MemoryLessonCandidate,
} from "../src/index.ts";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const proofId = "proof_mcr_600";
const evidenceRef = "s3://agent-runs/run_mcr_600/test.log";

function verifiedProof(): ProofLedgerEntry {
  return {
    proof_id: proofId,
    task_id: "task_mcr_600",
    run_id: "run_mcr_600",
    trace_id: "trace_mcr_600",
    created_at: "2026-06-29T01:00:00Z",
    capability: "memory.propose",
    worktree: {
      path: "../.worktrees/Carpet/MCR-600-memory-proposal-flow",
      branch: "mcr/MCR-600/memory-proposal-flow",
      base_branch: "main",
      base_sha: "f0c8dd8bc71145026097c92ef97380056bfd77fc",
      head_sha: "f0c8dd8bc71145026097c92ef97380056bfd77fc",
      cleanup_status: "kept_for_review",
    },
    summary: "Worker surfaced a reusable lesson for future work.",
    artifacts: [
      {
        kind: "report",
        uri: "s3://agent-runs/run_mcr_600/final-output.json",
        sha256: "a".repeat(64),
      },
    ],
    validation: [
      {
        command: "pnpm --filter memory-curator-worker test",
        exit_code: 0,
        status: "passed",
        log_ref: evidenceRef,
      },
    ],
    risk_notes: ["No live memory writes."],
    rollback_notes: ["Remove workers/memory-curator-worker."],
  };
}

function badProof(): ProofLedgerEntry {
  return {
    ...verifiedProof(),
    validation: [
      {
        command: "pnpm --filter memory-curator-worker test",
        exit_code: 1,
        status: "failed",
        log_ref: evidenceRef,
      },
    ],
  };
}

function lesson(overrides: Partial<MemoryLessonCandidate> = {}): MemoryLessonCandidate {
  return {
    reusable: true,
    scope: "repo:Carpet workers/memory-curator-worker",
    statement: "Memory proposals must stay proposal-only and proof-backed.",
    evidence_ref: evidenceRef,
    review_target: "LifeCapital/Carpet memory review inbox",
    confidence: "high",
    ...overrides,
  };
}

function proposalInput(overrides: Record<string, unknown> = {}) {
  const proof = verifiedProof();

  return {
    proof,
    proof_verification: verifyProof({ proof }),
    verified_proof_ids: new Set([proof.proof_id]),
    lesson: lesson(),
    proposal_id: "memory_proposal_mcr_600",
    event_id: "evt_mcr_600_memory_proposal",
    created_at: "2026-06-29T01:05:00Z",
    workspace_id: "ws_carpet",
    ...overrides,
  };
}

function createAjv() {
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  for (const schemaPath of [
    "schemas/matrix/event-envelope.schema.json",
    "schemas/matrix/memory.update.proposed.schema.json",
  ]) {
    ajv.addSchema(
      JSON.parse(readFileSync(path.join(root, schemaPath), "utf8")) as unknown,
    );
  }

  return ajv;
}

function validateMemoryProposalEvent(event: unknown) {
  const validate = createAjv().getSchema(
    "https://notyet.dev/schemas/matrix/memory.update.proposed.schema.json",
  );

  ok(validate, "memory proposal schema must be registered");
  return {
    valid: validate(event),
    errors: validate.errors,
  };
}

test("emits memory.update.proposed only from verified proof", () => {
  const result = createMemoryProposal(proposalInput());

  equal(result.ok, true);
  if (result.ok) {
    equal(result.status, "proposed");
    equal(result.event.type, "com.notyet.agent.memory.update.proposed");
    equal(result.event.actor.type, "runtime");
    equal(result.event.data.proof_id, proofId);
    equal(result.event.data.proposed_change.operation, "propose");
    deepEqual(validateMemoryProposalEvent(result.event), {
      valid: true,
      errors: null,
    });
  }

  const proof = badProof();
  const unverified = createMemoryProposal({
    ...proposalInput({
      proof,
      verified_proof_ids: new Set([proof.proof_id]),
    }),
    proof_verification: verifyProof({ proof: verifiedProof() }),
  });

  equal(unverified.ok, false);
  if (!unverified.ok) {
    equal(unverified.code, "unverified_proof");
  }
});

test("requires scope, statement, evidence ref, confidence, and review target; schema has no confidence field", () => {
  for (const requiredField of [
    "scope",
    "statement",
    "evidence_ref",
    "confidence",
    "review_target",
  ] as const) {
    const result = createMemoryProposal(
      proposalInput({
        lesson: lesson({ [requiredField]: "" }),
      }),
    );

    equal(result.ok, false, requiredField);
    if (!result.ok) {
      equal(result.code, "invalid_lesson");
      match(result.reason, new RegExp(requiredField));
    }
  }

  const invalidConfidence = createMemoryProposal(
    proposalInput({
      lesson: lesson({ confidence: "certain" as never }),
    }),
  );

  equal(invalidConfidence.ok, false);
  if (!invalidConfidence.ok) {
    equal(invalidConfidence.code, "invalid_lesson");
    match(invalidConfidence.reason, /confidence/);
  }

  const result = createMemoryProposal(proposalInput());

  equal(result.ok, true);
  if (result.ok) {
    equal("confidence" in result.event.data, false);
    equal(result.event.data.proposed_change.target, lesson().review_target);
    match(result.event.data.proposed_change.rationale ?? "", /test\.log/);
  }
});

test("rejects automatic memory write attempts", () => {
  const result = createMemoryProposal(
    proposalInput({
      lesson: lesson({ apply_live: true }),
    }),
  );

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "automatic_memory_write_denied");
  }
});

test("returns no-update rationale when proof contains no reusable lesson", () => {
  const result = createMemoryProposal(
    proposalInput({
      lesson: lesson({ reusable: false }),
    }),
  );

  deepEqual(result, {
    ok: true,
    status: "no_update",
    rationale: "proof contains no reusable lesson candidate",
  });
});

test("rejects unverified proof ids", () => {
  const result = createMemoryProposal(
    proposalInput({
      verified_proof_ids: new Set(["proof_other"]),
    }),
  );

  equal(result.ok, false);
  if (!result.ok) {
    equal(result.code, "unverified_proof");
  }
});

test("schema rejects mutated operation other than propose", () => {
  const result = createMemoryProposal(proposalInput());

  equal(result.ok, true);
  if (result.ok) {
    const mutated = {
      ...result.event,
      data: {
        ...result.event.data,
        proposed_change: {
          ...result.event.data.proposed_change,
          operation: "write_live",
        },
      },
    };

    equal(validateMemoryProposalEvent(mutated).valid, false);
  }
});
