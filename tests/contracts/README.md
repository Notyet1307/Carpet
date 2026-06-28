# Contract Tests Baseline

Contract tests are the executable source of truth for schemas, workflows, policy fixtures, and golden runtime boundaries. They must not call real Matrix, Codex, GitHub, databases, cloud storage, or secret services.

Run:

```bash
pnpm test:contracts
pnpm schemas:validate
```

## Current Mapping

| Test file | Component boundary | What it protects |
|---|---|---|
| `schema-fixtures.test.mjs` | Matrix/runtime/codex/proof schema fixtures | All declared fixtures validate or fail as named |
| `matrix-appservice-transaction.test.mjs` | Matrix AppService gateway contract | transaction auth, schema validation, idempotency, unknown room, retryable enqueue failure |
| `task-state-machine.test.mjs` | Runtime task state machine | legal happy path, illegal transitions, artifact/proof/approval ordering |
| `task-graph.test.mjs` | Runtime task graph contract | graph shape, cycles, unknown nodes, proof-before-approval |
| `repo-patch-workflow.test.mjs` | repo patch workflow | Matrix input/projection boundary, high-risk PR approval, proof before PR |
| `ci-recovery-workflow.test.mjs` | CI recovery workflow | ci recovery routing shape, proof and approval gates |
| `capability-schema.test.mjs` | Capability registry and routing contract | MVP capability ids, worktree requirements, human gate, policy references |
| `codex-jsonl-parser.test.mjs` | Codex JSONL capture contract | success, failure, and blocked worker evidence |
| `codex-output-schema.test.mjs` | Codex final output schema | review-readiness requires validation evidence; failed/blocked cannot masquerade as success |
| `proof-ledger-entry.test.mjs` | Proof and approval schema | action-scoped approvals and gated irreversible actions |
| `policy-decisions.test.mjs` | Runtime policy baseline | deny-by-default, fake proof, replay, secret logs, path traversal, prompt injection |

## Rules For New Contract Tests

1. Add fixtures first, then the smallest contract assertion that consumes them.
2. Use `*.valid.*`, `*.invalid.*`, `*.allowed.*`, or `*.denied.*` naming so expected outcome is visible from the path.
3. Cover at least one happy path and two meaningful failure paths.
4. Keep real-service behavior behind fake adapters until local E2E is stable.
5. Do not encode runtime implementation details here; contract tests define boundaries.

New runtime packages should add package-local unit tests, but any public schema, event, workflow, policy, or fixture shape must remain covered here.
