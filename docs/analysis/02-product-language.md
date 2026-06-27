# Product Language Baseline

Version: 2026-06-27

Task ID: Analysis-P1-1

Roadmap: Phase 1 / Codex Task Card 1.1

## Purpose

This document is the terminology source for Matrix Codex Capability Runtime. It
locks the product language before runtime implementation starts, so future task
cards, schemas, prompts, reviews, and proof records use the same words.

The system language is:

```text
Intent -> Task -> Task Graph -> Capability -> Work Cell -> Worker
       -> Artifact -> Proof -> Verifier -> Approval -> Memory Proposal
```

The system must not be described as a company, department tree, lead-agent
chain, or permanent worker hierarchy.

## Canonical Terms

| Term | Definition | Concrete engineering example | Anti-example |
|---|---|---|---|
| Intent | A human or system goal before the Runtime turns it into executable work. Intent can arrive from Matrix, cron, GitHub, or another intake source. | A Matrix intake message says: "Define the Phase 1 product language document and run `pnpm test:contracts`." | Treating the whole chat thread as the durable task record or letting a worker decide scope from vibes. |
| Task | A Runtime-tracked unit of work with a goal, context, constraints, allowed files, forbidden files, acceptance criteria, validation commands, and proof requirements. | `Analysis-P1-1` creates `docs/analysis/02-product-language.md`, may update `docs/roadmaps/analysis-roadmap.md`, and must not touch runtime code. | "Improve the runtime" as an open-ended prompt with no file boundary, validation command, or stop condition. |
| Task Graph | A directed graph of task nodes compiled by the Runtime from a Task. Each node has dependencies, a selected Capability, and required proof. | A repo patch task compiles into `intake.validate -> spec.scope -> repo.patch.codex -> proof.verify -> approval.request -> memory.propose`. | A lead agent reads chat, decides who should work next, and mutates the plan without a graph or audit trail. |
| Capability | A callable ability with declared inputs, outputs, permissions, proof requirements, risk level, verifier, and version. Capability is the routing unit. | `repo.patch.codex` may read the repo, write an isolated worktree, run tests, and create a patch artifact; it cannot push, merge, deploy, or read secrets. | `Backend Department`, `Security Department`, or "the senior engineer agent" as a broad role with unclear permissions. |
| Work Cell | A temporary execution envelope for one task node. It binds task context, selected Capability, worker type, worktree path, sandbox profile, permission envelope, budget, timeout, and validation commands. | A Work Cell runs in `../.worktrees/Carpet/P1-product-language` with allowed files limited to two docs and `pnpm test:contracts` as validation. | A permanent agent seat that owns repo state, keeps private long-term memory, and keeps working across unrelated tasks. |
| Worker | The concrete executor running inside a Work Cell. A Worker performs work but does not own task state, permissions, completion, or approval. | Codex CLI edits a docs file; a verifier worker reviews the diff; a schema validator checks fixtures. | A self-directed employee-like agent that can broaden scope, approve itself, and decide completion without proof. |
| Artifact | A durable output or reference produced by a task. Artifacts must be inspectable outside the worker's chat transcript. | `docs/analysis/02-product-language.md`, a git diff, a test log, a PR URL, a schema fixture, or a proof JSON file. | "I updated the doc" with no path, diff, hash, command output, or reviewable file. |
| Proof | The evidence chain that shows what was produced, how it was validated, and which constraints were respected. Proof is required before completion, approval, or memory proposals. | Changed files plus base/head SHA, `pnpm test:contracts` exit code 0, test summary, risk notes, rollback notes, and forbidden-path check. | A summary saying "tests pass" or "looks good" without command output, changed-file list, or validation evidence. |
| Verifier | An independent checking Capability that evaluates artifacts and proof against the task card, architecture, policy, and tests. | A verifier checks this document for all required terms, concrete examples, anti-examples, no department hierarchy, and no runtime implementation. | A manager persona that assigns more work, edits the patch, or accepts claims without inspecting proof. |
| Approval | An explicit, action-scoped decision by a human or policy gate for a high-risk or irreversible action. Approval is not task completion. | Human approval for `pr.create` on a specific task and proof id after proof verification passes. | A vague "LGTM" in Matrix that authorizes push, PR creation, merge, deployment, and memory writes all at once. |
| Memory Proposal | A proposed durable learning update backed by proof. It requires review before changing long-term rules, prompts, skills, or policy. | After repeated evidence, propose: "Phase numbers and MCR IDs are separate; check the roadmap before choosing next work." | A worker automatically edits `AGENTS.md`, live memory, or capability policy because one run felt successful. |
| Capability Version | A reviewable version of a Capability definition, prompt, required skills, permissions, proof contract, and policy bindings. It must be rollbackable. | `repo.patch.codex@0.1.0` defines allowed actions, required proof fields, and verifier requirements for repo patch tasks. | A mutable "latest agent" that silently changes behavior, permissions, prompts, or proof expectations across runs. |

## Why Capability / Work Cell / Proof

The product uses Capability instead of Department because routing should be based
on inputs, outputs, permissions, risk, and proof requirements. A department name
does not say what the system may do. A Capability manifest can.

The product uses Work Cell instead of Lead Agent or employee seat because
execution should be temporary, scoped, replayable, and disposable. A Work Cell
has one task node, one permission envelope, one context pack, one budget, and one
proof trail. It does not become a hidden owner of future work.

The product uses Proof instead of status summary because approval and memory
updates need evidence. A worker message is a claim. Proof ties that claim to
artifacts, commands, exit codes, diffs, hashes, and policy decisions.

This model prevents three failure modes:

- Broad roles accumulating permissions because they sound responsible.
- Lead agents making undocumented routing decisions in chat.
- Successful-sounding summaries replacing validation evidence.

## Matrix Rooms And Tasks

Matrix rooms are collaboration and audit surfaces. They are not departments,
queues, databases, or sources of runtime truth.

Rooms group human-visible events by interaction purpose:

- `#agent-intake` receives Intent and task creation events.
- `#agent-runtime` shows Runtime status projections.
- `#agent-proof` shows proof summaries and artifact references.
- `#agent-approvals` carries action-scoped approval requests and decisions.
- `#agent-memory` carries memory proposals.
- `#agent-incidents` carries blocked, failed, denied, or unsafe states.

A Task can appear in several rooms through `task_id`, `run_id`, and `trace_id`.
Those room events are projections of Runtime state, not the state itself.

Correct use:

```text
Task task_001 is created from #agent-intake.
Runtime records task_001 in the task store.
Work Cell run_001 produces artifact and proof refs.
#agent-proof receives a proof summary with artifact URI and hash.
#agent-approvals receives an approval request for action pr.create.
```

Incorrect use:

```text
#backend owns backend tasks.
#security owns security tasks.
The room history is replayed as the task database.
Whoever talks last in the room decides completion.
```

Rooms should help people inspect and approve work. They should not encode an
organization chart.

## Non-Goals

- No runtime implementation in this analysis artifact.
- No Matrix integration code.
- No Codex execution code.
- No GitHub automation.
- No department, manager, lead-agent, or permanent employee hierarchy.
- No automatic memory writes.
- No approval by vague conversation.
- No use of Matrix room history as the runtime source of truth.

## Usage Rules

- Say "select a Capability", not "assign a department".
- Say "create a Work Cell", not "hire or seat an agent".
- Say "submit Proof", not "write a summary".
- Say "verify the Proof", not "trust the worker".
- Say "request Approval for action X", not "approve the whole task".
- Say "propose memory", not "update memory".
- Say "version the Capability", not "let the agent evolve itself".

## Verifier Checklist

A future verifier should reject changes that:

- Use department or employee metaphors as system structure.
- Make Matrix a task database or queue.
- Let a Worker own permissions, task state, approval, or completion.
- Treat a chat response as Proof.
- Allow vague Approval to unlock multiple actions.
- Allow Memory Proposal to become automatic memory write.
- Hide Capability changes behind an unversioned prompt update.
