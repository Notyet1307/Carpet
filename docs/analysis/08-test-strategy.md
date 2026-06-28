# Phase 10 Testing Strategy 与 Test Matrix

> Status: baseline complete
> Scope: testing strategy only; no runtime implementation, no real Matrix, no real Codex, no real GitHub, no database.

## 1. 目标

Phase 10 的目标是在 MVP backlog 前锁定测试分层、fixtures 归属、fake adapters、contract baseline 和首批实现测试。测试策略必须先覆盖 happy path 和 failure path，再允许进入 runtime 实现。

最小原则：

```text
schema / fixtures / contract tests
→ pure unit tests
→ fake adapter integration tests
→ local fake E2E
→ manual real-service smoke tests
→ real Matrix / GitHub integration tests
```

MVP 阶段不得用真实外部服务证明核心逻辑正确。真实服务只能在 fake path 通过后作为 smoke / compatibility check。

## 2. 测试分层

| Layer | 负责什么 | 不负责什么 | 首批位置 |
|---|---|---|---|
| Unit tests | 纯函数和小模块行为：schema validator wrapper、state transition、router scoring、policy decision、proof verifier predicates | 不启动 Matrix、Codex、GitHub、DB | `packages/*/test/*.test.ts` |
| Contract tests | 已签入 schema、workflow、policy、fixture 的可执行契约 | 不测试 production adapter I/O | `tests/contracts/*.test.mjs` |
| Golden fixture tests | 锁定跨组件输入/输出样本，防止事件、proof、policy、worker output 形状漂移 | 不把 fixture 当数据库或真实日志 | `fixtures/**` + `tests/contracts/schema-fixtures.test.mjs` |
| Integration tests | 用 fake adapters 串联两个或多个 MVP component | 不访问真实 homeserver、GitHub、Codex、secret store | `tests/integration/*.test.ts` |
| E2E tests | 用 fake Matrix + fake worker + fake GitHub 跑完整 MVP 闭环 | 不做真实 merge，不自动写 memory | `tests/e2e/*.test.ts` |
| Security regression tests | 锁定已知拒绝路径：fake proof、policy bypass、secret log、approval replay、path traversal | 不依赖 prompt 自律 | `tests/contracts/policy-decisions.test.mjs`，后续 `packages/policy-engine/test` |

## 3. 现有 Contract Baseline 映射

| MVP component / boundary | Existing contract tests | Existing fixtures / manifests | 已覆盖 |
|---|---|---|---|
| Matrix event schemas | `tests/contracts/schema-fixtures.test.mjs` | `schemas/matrix/*.schema.json`, `fixtures/matrix-events/{valid,invalid}` | MVP Matrix custom events valid/invalid |
| Matrix AppService gateway contract | `tests/contracts/matrix-appservice-transaction.test.mjs` | `fixtures/matrix-transactions/*.json` | hs token、schema invalid、unknown room、duplicate txn/event、runtime enqueue failure |
| Runtime state machine | `tests/contracts/task-state-machine.test.mjs` | `schemas/runtime/task-state-transition.schema.json`, Matrix event fixtures | happy path、illegal transition、audit event mismatch、artifact/proof/approval ordering |
| Task graph / workflows | `tests/contracts/task-graph.test.mjs`, `tests/contracts/repo-patch-workflow.test.mjs`, `tests/contracts/ci-recovery-workflow.test.mjs` | `schemas/runtime/task-graph.schema.json`, `runtime/workflows/*.yaml` | graph shape、cycle/unknown node rejection、proof before approval and PR |
| Capability registry / routing contract | `tests/contracts/capability-schema.test.mjs` | `schemas/runtime/capability.schema.json`, `runtime/capabilities.yaml`, `fixtures/capabilities/**` | required capabilities、worktree requirement、security review read-only、ci recovery not overselected |
| Codex worker output | `tests/contracts/codex-jsonl-parser.test.mjs`, `tests/contracts/codex-output-schema.test.mjs` | `fixtures/codex-jsonl/*.jsonl`, `schemas/codex/repo-patch-result.schema.json`, `fixtures/codex/**` | success/failure/blocked JSONL, final output review-readiness, validation evidence |
| Proof ledger and approval schema | `tests/contracts/proof-ledger-entry.test.mjs` | `schemas/proof/*.schema.json`, `fixtures/proof/**` | action-scoped approvals, proof required before gated irreversible actions |
| Policy baseline | `tests/contracts/policy-decisions.test.mjs` | `runtime/policies/*.yaml`, `fixtures/policy/*.yaml` | deny-by-default, fake proof, approval replay, automatic memory write, path traversal, secret logs |
| GitHub PR workflow gate | `tests/contracts/repo-patch-workflow.test.mjs`, `tests/contracts/ci-recovery-workflow.test.mjs` | `runtime/workflows/*.yaml`, proof fixtures | PR node requires proof and approval; Matrix is projection, not state store |
| Memory proposal contract | `tests/contracts/schema-fixtures.test.mjs`, `tests/contracts/policy-decisions.test.mjs` | `schemas/matrix/memory.update.proposed.schema.json`, `fixtures/matrix-events/*memory*`, `fixtures/policy/automatic-memory-write.denied.yaml` | propose-only memory flow; live write denied |

Gap: current baseline is contract-heavy. MVP implementation still needs unit tests and fake adapter integration tests before production services.

## 4. First Implementation Tests

| Component | First tests to write before implementation | Fake / harness needed | Must fail on |
|---|---|---|---|
| Matrix gateway | `apps/matrix-appservice/test/transaction-handler.test.ts`: valid `task.created` enqueues one runtime event; invalid event emits rejection; duplicate transaction and duplicate event are idempotent; bad `hs_token` rejects before schema parse | `FakeMatrixHomeserver`, in-memory `RuntimeEventQueue`, in-memory `IdempotencyStore`, fixture loader for `fixtures/matrix-transactions/*.json` | invalid Matrix event, duplicate event, spoofed actor, unknown room |
| Runtime state machine | `packages/state-machine/test/task-state-machine.test.ts`: accepts the MVP happy path; rejects `waiting_approval` without verified proof; terminal states do not transition; duplicate event is no-op | deterministic clock, in-memory task store, event fixture loader | duplicate event, approval before proof, worker failure transition skipped |
| Capability router | `packages/capability-router/test/router.test.ts`: routes CI failure to `ci.recovery`; routes generic repo change to `repo.patch.codex`; rejects unsupported task; marks external write as human-gated | static registry loader from `runtime/capabilities.yaml`, fake policy evaluator | broad capability overmatch, policy bypass, missing verifier capability |
| Worker runner | `apps/worker-runner/test/worker-runner.test.ts`: creates worktree spec before Codex command; invokes Codex with cwd = worktree path; parses success/failure/blocked JSONL; records command exit codes into worker output | `FakeCodexProcess`, fake worktree manager, fake artifact store, fixtures from `fixtures/codex-jsonl` and `fixtures/codex` | worker failure, main checkout path, missing validation evidence, raw stdout leakage |
| Proof verifier | `packages/proof-ledger/test/proof-verifier.test.ts`: accepts proof with artifact refs and validation exit codes; rejects fake proof, missing validation, forbidden path, and secret-bearing logs | fake artifact store keyed by `artifact_ref`, fixture loader for proof and policy fixtures | fake proof, secret-bearing logs, missing proof, path traversal artifact |
| Approval gate | `packages/approval-gate/test/approval-gate.test.ts`: blocks PR before approval; accepts only action-scoped approval for matching `task_id` + `proof_id`; rejects replayed approval; never allows merge | fake Matrix approval event stream, in-memory approval store, deterministic expiry clock | approval replay, vague approval, wrong actor, merge attempt |
| Policy engine | `packages/policy-engine/test/policy-engine.test.ts`: evaluates deny-by-default policy fixtures; allows local repo patch inside worktree; denies external write without approval; denies prompt-injection override | YAML fixture loader for `runtime/policies/*.yaml` and `fixtures/policy/*.yaml` | policy bypass, dangerous command, production secret, room/workspace confusion |
| GitHub adapter | `packages/github-adapter/test/github-adapter.test.ts` and `tests/integration/approval-pr-flow.test.ts`: no PR call before approval; after approval creates simulated PR request with task/proof/validation/risk/rollback fields; merge API is unavailable | `FakeGitHubAdapter` recording calls, fake approval gate, fake proof store | PR before approval, proofless PR body, merge attempt |
| Memory proposal flow | `workers/memory-curator-worker/test/memory-proposal-flow.test.ts`: emits `memory.update.proposed` only from approved proof; requires scope, statement, evidence_ref, confidence; never writes live memory | fake proof ledger, fake Matrix projection, no-op memory store that fails on write | automatic memory write, missing evidence, wrong actor |

## 5. Required Fake Adapters

These fakes are test harnesses, not product features.

| Fake | Purpose | Boundary |
|---|---|---|
| `FakeMatrixHomeserver` | Submit appservice transaction fixtures and capture projected Matrix events | No federation, no real rooms, no auth beyond fixture token |
| `FakeRuntimeEventQueue` | Assert gateway-to-runtime event handoff | In-memory only; no DB semantics |
| `FakeCodexProcess` | Replay JSONL and final output fixtures | Never shells out to Codex |
| `FakeWorktreeManager` | Return deterministic worktree path, branch, base SHA, cleanup status | Does not create real worktrees in unit/integration tests |
| `FakeArtifactStore` | Store refs to diff/log/proof snippets by digest | Does not store raw secret logs |
| `FakeGitHubAdapter` | Record simulated PR create requests | No push, no merge, no network |
| `FakeApprovalClock` | Test approval expiry and replay | Deterministic time only |

## 6. Failure Cases That Must Stay Covered

| Failure case | Current signal | First MVP implementation assertion |
|---|---|---|
| Invalid Matrix event | `fixtures/matrix-transactions/invalid-schema.json`, `fixtures/matrix-events/invalid/task.created.empty-goal.invalid.json` | Gateway rejects and does not enqueue runtime work |
| Duplicate event | `fixtures/matrix-transactions/duplicate-event.json`, `duplicate-transaction.json` | Exactly one runtime event or task is created |
| Fake proof | `fixtures/policy/fake-proof.denied.yaml` | Proof verifier / policy engine denies approval and PR creation |
| Policy bypass | `fixtures/policy/prompt-injection-policy-override.denied.yaml` | Prompt text cannot override runtime policy |
| Worker failure | `fixtures/codex-jsonl/failure.jsonl`, `fixtures/codex-jsonl/blocked.jsonl` | Task moves to worker failed / blocked path and cannot request approval |
| Approval replay | `fixtures/policy/approval-replay.denied.yaml` | Reused approval id or expired approval is denied |
| Secret-bearing logs | `fixtures/policy/secret-log.denied.yaml` | Logs with secrets cannot become proof or PR body content |

## 7. MVP Test Exit Criteria

Before Phase 12 can produce implementation backlog, each MVP component needs:

```text
1. One existing or planned contract test path.
2. At least one valid fixture and two meaningful invalid / denied fixtures.
3. A fake adapter plan when the component touches Matrix, Codex, GitHub, storage, or time.
4. A first unit or integration test named before implementation.
5. A failure assertion for at least one security or recovery path.
```

Before any runtime implementation issue starts, its task card must list:

```text
test file to add first
fixtures used
fake adapter used
validation command
proof expected
```
