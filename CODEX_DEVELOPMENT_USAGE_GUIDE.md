# Matrix Codex Capability Runtime：Codex 驱动开发使用说明

> 版本：2026-06-27  
> 建议放置路径：`docs/guides/codex-development-usage-guide.md`  
> 配套文档：  
> - `docs/architecture/matrix-codex-capability-runtime.md`  
> - `docs/roadmaps/analysis-roadmap.md`  
> - `docs/roadmap/matrix-codex-capability-runtime-roadmap.md`  
> 目标：把架构文档和 roadmap 转换成一套可执行的 Codex 沟通、开发、测试、review、handoff 操作手册。

---

## 0. 这份文档的作用

这份文档不是新的架构设计，也不是新的任务列表。

它的作用是定义：

```text
你如何与 Codex 沟通，
Codex 每次应该做多大的任务，
每个任务如何进入开发，
如何测试，
如何 review，
如何停止，
如何交接，
如何把结果回写到 roadmap。
```

三份上游文档的分工如下：

| 文档 | 作用 | 使用方式 |
|---|---|---|
| 架构文档 | 系统北极星，定义边界、组件、术语、约束 | 每个 Codex session 都要遵守，不能随意推翻 |
| 分析阶段 roadmap | 在实现前拆出规格、schema、fixtures、测试契约 | 用于前置分析任务，避免一开始乱写 runtime |
| 开发 roadmap | 分阶段实现 MVP | 用于创建 issue、分配 Codex 任务、验收阶段产物 |
| 本文档 | Codex 操作手册 | 用于你每天驱动 Codex 开发和测试 |

一句话：

```text
架构文档回答“我们要建什么”；
roadmap 回答“分几步建”；
本文回答“每一步怎么跟 Codex 协作完成”。
```

---

## 1. 总体原则

### 1.1 不要让 Codex 一次性开发整个系统

禁止对 Codex 下这种任务：

```text
请实现 Matrix Codex Capability Runtime。
请把整个 MVP 做完。
请按照架构文档完整开发。
```

这会导致：

```text
范围失控
文件乱改
测试缺失
架构偏移
proof 不可验证
review 成本过高
```

正确方式是：

```text
一轮 Codex = 一个窄任务 = 一个可 review 的 patch = 一个明确 proof
```

### 1.2 不要让同一个 Codex session 自己设计、实现、review、批准

角色必须分离：

```text
Analyst Codex      → 分析、拆规格、写 ADR / schema / fixture
Implementer Codex  → 按 task card 写最小代码
Verifier Codex     → 只读 review，不改代码
Test Designer      → 补测试矩阵、contract tests、fixtures
Human Owner        → 最终裁决、merge、scope 变更批准
```

最小协作闭环：

```text
Human 写任务卡
→ Analyst Codex 明确方案
→ Implementer Codex 写 patch
→ Test Designer 或 Implementer 补测试
→ Verifier Codex 只读 review
→ Human merge
→ 更新 roadmap / memory proposal
```

### 1.3 Codex 的每次任务必须有 DoR 和 DoD

Definition of Ready：

```text
Goal
Context
Constraints
Allowed files
Forbidden files
Acceptance criteria
Validation commands
Proof required
Stop conditions
Expected handoff format
```

Definition of Done：

```text
修改范围符合任务卡
测试或验证命令已运行
结果可复现
失败已解释
产物可 review
handoff back 完整
没有越权动作
没有自动 merge / deploy / secret 读取
```

---

## 2. 推荐开发环境约定

### 2.1 主语言

推荐：

```text
TypeScript-first，不是 TypeScript-only。
```

TypeScript 优先用于：

```text
Matrix Application Service Gateway
Runtime API
Task State Machine
Capability Router
Schema Validation
Codex Worker Orchestration
GitHub Adapter
Proof Ledger
Policy Glue
OpenTelemetry instrumentation
CLI / dev tools
```

其他语言保留范围：

```text
Python：一次性迁移脚本、已有 validator、轻量数据处理
Shell：本地 readiness check、CI glue
Go/Rust：MVP 暂不引入，除非真实性能瓶颈出现
```

### 2.2 推荐 monorepo 结构

MVP 目标结构：

```text
/
├── AGENTS.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── matrix-appservice/
│   ├── runtime-api/
│   └── worker-runner/
├── packages/
│   ├── event-contracts/
│   ├── capability-router/
│   ├── state-machine/
│   ├── proof-ledger/
│   ├── policy-engine/
│   └── db/
├── workers/
│   ├── codex-exec-worker/
│   ├── verifier-worker/
│   └── memory-curator-worker/
├── runtime/
│   ├── capabilities.yaml
│   ├── policies/
│   ├── prompts/
│   └── workflows/
├── schemas/
│   ├── matrix/
│   ├── codex/
│   └── proof/
├── fixtures/
│   ├── matrix-events/
│   ├── codex-jsonl/
│   └── proof/
├── tests/
│   ├── contracts/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture/
│   ├── roadmaps/
│   ├── roadmap/
│   ├── guides/
│   ├── analysis/
│   └── adr/
└── .mcr/
    ├── sdd/          # gitignored
    ├── runs/         # gitignored
    ├── worktrees/    # gitignored
    └── tmp/          # gitignored
```

建议 `.gitignore`：

```gitignore
.mcr/sdd/
.mcr/runs/
.mcr/worktrees/
.mcr/tmp/
.env
.env.*
!.env.example
```

### 2.3 目标命令

即使 MVP 初期还没有全部命令，也要把这些作为最终标准：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:contracts
pnpm test:integration
pnpm test:e2e
pnpm schemas:validate
pnpm verify
```

在早期 phase，`pnpm verify` 可以只是串联已有命令：

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm schemas:validate
```

---

## 3. Codex 工作模式

### 3.1 每个任务一个新上下文

建议：

```text
一个 issue → 一个 fresh Codex session
一个高风险 review → 另一个 fresh Codex session
一个阶段收尾 → 单独 final review session
```

不要长时间复用同一个 Codex session 做多个阶段。长上下文会引入：

```text
历史假设污染
scope 漂移
自我确认偏差
错误方案被持续继承
```

### 3.2 每个任务一个 worktree 或 feature branch

推荐分支命名：

```text
analysis/p0-repo-inventory
contracts/mcr-010-event-envelope-schema
runtime/mcr-120-task-state-machine
worker/mcr-300-codex-exec-parser
proof/mcr-410-proof-ledger-entry
```

提交格式：

```text
analysis(p0): inventory current repo assets
contracts(matrix): add task created event schema
runtime(state): add task lifecycle transition validation
worker(codex): parse codex jsonl events
proof(ledger): persist proof entry metadata
```

### 3.3 每个任务必须有 progress ledger

每个任务在本地记录：

```text
.mcr/sdd/<TASK-ID>/progress.md
```

模板：

```markdown
# <TASK-ID> Progress Ledger

## Goal

## Current Status

## Decisions Made

## Files Touched

## Validation Run

## Blockers

## Next Step
```

该目录默认不入库；真正需要持久化的内容进入：

```text
PR body
Matrix proof event
docs/analysis/*.md
docs/adr/*.md
```

---

## 4. 与 Codex 沟通的标准任务包

每次给 Codex 的任务都用下面结构。

```markdown
You are working on one narrow task in the Matrix Codex Capability Runtime repository.

Read first:
- AGENTS.md
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmaps/analysis-roadmap.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md
- docs/guides/codex-development-usage-guide.md

Task ID: <MCR-XXX>
Role: <Analyst | Implementer | Verifier | Test Designer>

Goal:
<one-sentence goal>

Context:
<why this task exists, related files, related phase>

Allowed files:
- <path>
- <path>

Forbidden files:
- <path>
- <path>

Constraints:
- Keep the change small and reviewable.
- Do not change unrelated files.
- Do not introduce secrets.
- Do not perform deploy, merge, or direct push.
- Do not modify architecture direction without reporting a blocker.

Acceptance criteria:
- <criterion 1>
- <criterion 2>

Validation commands:
- <command 1>
- <command 2>

Stop conditions:
- If you need broader scope, stop and explain.
- If a required file or command is missing, stop and explain.
- If tests fail outside this task scope, stop and explain.
- If external docs conflict with the repo docs, stop and explain.

Required output:
## Summary
## Files Changed
## Tests Added or Updated
## Validation Results
## Risk Notes
## Rollback Notes
## Follow-up Tasks
```

---

## 5. 角色化 Prompt 模板

### 5.1 Analyst Codex Prompt

用于分析阶段、规格阶段、schema 设计前。

```markdown
Role: Analyst Codex

Task ID: <MCR-XXX>

Read first:
- AGENTS.md
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmaps/analysis-roadmap.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md

Goal:
Analyze the current repository and produce the requested analysis artifact. Do not implement runtime logic.

Allowed files:
- docs/analysis/**
- docs/adr/**
- schemas/**
- fixtures/**
- runtime/**/*.yaml

Forbidden files:
- apps/**/src/**
- packages/**/src/**
- workers/**/src/**
- production configuration
- secrets

Required workflow:
1. Inspect only relevant files.
2. Summarize current state.
3. Identify gaps and risks.
4. Produce the requested artifact.
5. Add explicit open questions.
6. Do not write implementation code.

Required output:
## Analysis Summary
## Files Created or Updated
## Key Decisions
## Gaps
## Risks
## Open Questions
## Recommended Next Task
```

### 5.2 Implementer Codex Prompt

用于真正写代码。

```markdown
Role: Implementer Codex

Task ID: <MCR-XXX>

Goal:
Implement exactly this task and nothing else.

Read first:
- AGENTS.md
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md
- docs/guides/codex-development-usage-guide.md
- Any files listed in Context

Allowed files:
- <exact paths>

Forbidden files:
- <exact paths>

Acceptance criteria:
- <criteria>

Validation commands:
- pnpm lint
- pnpm typecheck
- pnpm test -- <relevant package or test>
- pnpm verify

Required workflow:
1. Inspect the minimum relevant files.
2. Add or update tests first when practical.
3. Implement the smallest passing change.
4. Run the validation commands.
5. Fix failures within scope.
6. Stop if fixing requires broader changes.
7. Produce Handoff Back.

Handoff Back format:
## Summary
## Files Changed
## Tests Added or Updated
## Validation Results
## Risk Notes
## Rollback Notes
## Follow-up Tasks
```

### 5.3 Verifier Codex Prompt

用于只读 review。

```markdown
Role: Verifier Codex

Task ID: <MCR-XXX>

You are reviewing a completed patch. Do not modify files.

Read first:
- AGENTS.md
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md
- docs/guides/codex-development-usage-guide.md
- The changed files in this branch

Review criteria:
1. Does the patch satisfy the task card?
2. Does it stay within allowed files and scope?
3. Does it violate architecture principles?
4. Are schemas and fixtures consistent?
5. Are tests meaningful and not over-mocked?
6. Are error states, idempotency, and security boundaries considered?
7. Are validation results credible?
8. Is the Handoff Back complete?

Required output:
## Verdict
One of: APPROVE / REQUEST_CHANGES / BLOCK

## Findings
- Severity: critical | high | medium | low
- File / line if applicable
- Explanation
- Required fix

## Missing Tests

## Architecture Drift

## Security or Policy Concerns

## Final Recommendation
```

### 5.4 Test Designer Codex Prompt

用于测试矩阵和 contract tests。

```markdown
Role: Test Designer Codex

Task ID: <MCR-XXX>

Goal:
Convert the relevant specification into tests, fixtures, and validation cases. Do not implement production logic unless explicitly requested.

Read first:
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md
- schemas/** relevant to this task
- fixtures/** relevant to this task

Allowed files:
- tests/**
- fixtures/**
- schemas/** if fixing test/schema mismatch

Required output:
## Test Matrix
## Fixtures Created or Updated
## Contract Tests Added
## Negative Cases
## Edge Cases
## Validation Commands
## Remaining Gaps
```

### 5.5 Failure Analysis Prompt

当 Codex 实现失败、测试失败或 scope 扩大时使用。

```markdown
Role: Failure Analyst Codex

Task ID: <MCR-XXX>

Do not implement a fix yet.

Goal:
Analyze the failure and recommend the smallest next action.

Input:
- Original task card
- Failed command
- Error output
- Changed files
- Current Handoff Back if available

Required output:
## Failure Summary
## Root Cause Hypothesis
## In-Scope Fix
## Out-of-Scope Fix
## Recommended Next Task
## Should We Revert?
## Should We Split the Task?
```

### 5.6 Phase Closeout Prompt

每个 phase 结束前使用。

```markdown
Role: Phase Closeout Reviewer

Phase: <Phase name>

Read first:
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmaps/analysis-roadmap.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md
- All files changed in this phase

Goal:
Decide whether this phase is complete enough to move to the next phase.

Required output:
## Phase Completion Verdict
READY / NOT_READY

## Completed Deliverables
## Missing Deliverables
## Broken Assumptions
## Test Coverage Status
## Security / Policy Concerns
## Recommended Next Phase Entry Criteria
```

---

## 6. 如何结合两类 Roadmap 使用

### 6.1 分析阶段 Roadmap 的使用方式

分析阶段目标：

```text
先把系统拆清楚，再写实现代码。
```

适合交给 Analyst / Test Designer Codex。

典型产物：

```text
docs/analysis/*.md
docs/adr/*.md
schemas/**/*.json
fixtures/**/*.json
runtime/**/*.yaml
tests/contracts/**/*.spec.ts
```

分析阶段的完成标准：

```text
核心事件 schema 已定义
核心 proof schema 已定义
状态机已定义
capability registry 初版已定义
Codex worker contract 已定义
Matrix gateway contract 已定义
测试矩阵已定义
MVP backlog 已拆成 issue
```

不要让 Codex 在分析阶段做：

```text
完整 Matrix gateway
完整 Runtime API
完整 Codex worker
真实 GitHub PR adapter
真实 secret / deploy / production integration
```

### 6.2 开发 Roadmap 的使用方式

开发 roadmap 目标：

```text
按阶段把 MVP 代码落地。
```

适合交给 Implementer / Verifier Codex。

每个 phase 的基本节奏：

```text
1. Human 从 roadmap 中选一个最小 issue。
2. Human 补成 Codex Task Card。
3. Analyst Codex 如有必要先补设计。
4. Implementer Codex 写测试和代码。
5. Verifier Codex 只读 review。
6. Human 根据 review 要求修正或 merge。
7. 更新 roadmap checkbox 和 context pack。
```

### 6.3 架构文档的使用方式

架构文档是边界，不是建议。

Codex 如果提出以下改动，必须停下来让 human 决策：

```text
把 Matrix 当数据库
绕过 Runtime 状态机
让 Codex 自动 merge
让 agent 自动写长期 memory
跳过 proof ledger
移除 human approval gate
把 capability 退化成部门 agent
把 schema validation 变成可选
直接引入生产 secrets
```

---

## 7. 分阶段 Codex 驱动方式

### Phase A：文档和仓库基线

对应：

```text
Analysis Phase 0-1
Development Phase 0
```

目标：

```text
让 Codex 先理解现有资产、建立项目语言、冻结开发纪律。
```

推荐 issue：

```text
MCR-000 docs baseline
MCR-001 repo inventory
MCR-002 existing assets map
MCR-003 AGENTS.md update for Matrix Runtime
```

给 Codex 的第一条任务：

```markdown
Task ID: MCR-001
Role: Analyst Codex
Goal: Inventory current repo assets for Matrix Runtime migration.

Read first:
- AGENTS.md
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmaps/analysis-roadmap.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md

Allowed files:
- docs/analysis/00-repo-inventory.md
- docs/analysis/01-existing-assets-map.md

Forbidden files:
- apps/**
- packages/**
- workers/**
- runtime implementation files

Acceptance criteria:
- Every existing asset is classified as keep / migrate / reference / ignore.
- codex-multica assets are mapped to Matrix Runtime equivalents.
- Gaps and risks are listed.
- No implementation code is written.

Validation commands:
- markdown lint if available
- otherwise no command required; self-check links and paths manually
```

Phase exit criteria：

```text
docs/analysis/00-repo-inventory.md 完成
docs/analysis/01-existing-assets-map.md 完成
AGENTS.md 已加入 Matrix Runtime 开发纪律
roadmap 中 MCR-000/MCR-001/MCR-002 状态更新
```

---

### Phase B：事件协议、Schema、Fixtures

对应：

```text
Analysis Phase 3
Development Phase 1
```

目标：

```text
先定义 contract，再写 gateway。
```

推荐 issue：

```text
MCR-010 event envelope schema
MCR-011 task.created schema
MCR-012 task.accepted / task.rejected schema
MCR-013 proof.submitted schema
MCR-014 approval.requested / granted / denied schema
MCR-015 memory.update.proposed schema
MCR-016 positive and negative fixtures
MCR-017 schema validation tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-010
Role: Implementer Codex
Goal: Add the base Matrix Runtime event envelope schema and validation fixtures.

Allowed files:
- schemas/matrix/event-envelope.schema.json
- fixtures/matrix-events/valid/event-envelope.valid.json
- fixtures/matrix-events/invalid/event-envelope.missing-type.json
- tests/contracts/matrix-event-envelope.spec.ts
- package.json scripts if needed

Forbidden files:
- apps/**/src/**
- packages/**/src/** except test helper if explicitly needed

Acceptance criteria:
- Schema uses namespaced event type format.
- Fixtures include at least one valid and two invalid examples.
- Contract test validates all fixtures.
- No Matrix gateway implementation is added.

Validation commands:
- pnpm test:contracts
- pnpm schemas:validate
```

Phase exit criteria：

```text
所有 MVP Matrix event schemas 有 valid / invalid fixtures
contract tests 能跑
schema validation failure 清楚可读
没有 runtime 实现依赖未完成 schema
```

---

### Phase C：Runtime 数据模型与状态机

对应：

```text
Analysis Phase 4
Development Phase 2
```

目标：

```text
建立 task lifecycle、transition rules、idempotency model。
```

推荐 issue：

```text
MCR-100 task state enum
MCR-101 state transition table
MCR-102 transition validator
MCR-103 idempotent event ingestion model
MCR-104 Postgres schema draft
MCR-105 state machine contract tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-102
Role: Implementer Codex
Goal: Implement pure TypeScript task state transition validation.

Allowed files:
- packages/state-machine/src/**
- packages/state-machine/test/**
- packages/state-machine/package.json
- tests/contracts/state-machine/** if needed

Forbidden files:
- apps/matrix-appservice/**
- workers/**
- database migrations unless explicitly requested

Acceptance criteria:
- Valid transitions pass.
- Invalid transitions fail with typed error codes.
- Terminal states cannot transition except by explicit allowed recovery rule.
- Tests cover created → accepted → scoped → dispatched → running → proof_submitted → verifying → waiting_approval → completed.
- Tests cover rejected, failed, cancelled, policy_denied, verification_failed.

Validation commands:
- pnpm --filter @mcr/state-machine test
- pnpm typecheck
```

Phase exit criteria：

```text
状态机独立于 Matrix gateway 可测试
所有非法 transition 有测试
idempotency key 规则明确
DB schema 与状态机字段一致
```

---

### Phase D：Matrix AppService Gateway

对应：

```text
Analysis Phase 7
Development Phase 3
```

目标：

```text
Matrix event → schema validation → runtime event → task accepted/rejected。
```

推荐 issue：

```text
MCR-200 appservice skeleton
MCR-201 transaction endpoint
MCR-202 hs_token validation
MCR-203 event schema validation
MCR-204 idempotency handling
MCR-205 Matrix reply adapter fake
MCR-206 gateway integration tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-203
Role: Implementer Codex
Goal: Validate incoming Matrix custom events against schemas before ingestion.

Allowed files:
- apps/matrix-appservice/src/**
- apps/matrix-appservice/test/**
- packages/event-contracts/src/**
- fixtures/matrix-events/**

Forbidden files:
- workers/**
- proof-ledger implementation
- GitHub adapter

Acceptance criteria:
- Unsupported event type is ignored or rejected according to documented policy.
- Invalid event content produces task.rejected style error payload.
- Valid task.created event becomes normalized runtime event.
- Tests cover malformed JSON, missing content, wrong namespace, duplicate event_id.

Validation commands:
- pnpm --filter @mcr/matrix-appservice test
- pnpm test:contracts
- pnpm typecheck
```

Phase exit criteria：

```text
Gateway 能接收 transaction fixture
Gateway 不信任 Matrix event content
重复 event 不重复创建 task
错误可见化
尚未调用真实 Codex worker
```

---

### Phase E：Capability Registry 与 Task Graph Compiler

对应：

```text
Analysis Phase 5
Development Phase 4
```

目标：

```text
用 capability 替代 department，用 task graph 替代 manager agent。
```

推荐 issue：

```text
MCR-250 capabilities.yaml seed
MCR-251 capability manifest schema
MCR-252 capability loader
MCR-253 router narrowest sufficient capability
MCR-254 repo patch workflow graph
MCR-255 task graph compiler tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-253
Role: Implementer Codex
Goal: Implement a deterministic router that selects the narrowest sufficient capability.

Allowed files:
- packages/capability-router/src/**
- packages/capability-router/test/**
- runtime/capabilities.yaml
- schemas/capability/**
- fixtures/capabilities/**

Acceptance criteria:
- Router considers task type, risk, required permissions, and suggested capability.
- Router refuses tasks with no safe matching capability.
- Router prefers narrower capability over broad repo.patch.vertical_slice.
- Tests include frontend, backend, CI recovery, security review, and unsupported task.

Validation commands:
- pnpm --filter @mcr/capability-router test
- pnpm schemas:validate
- pnpm typecheck
```

Phase exit criteria：

```text
Capability registry 有 schema
Router 行为确定、可测试
Task graph compiler 输出固定结构
没有 LLM manager 决策进入 MVP 主路径
```

---

### Phase F：Codex Worker Runtime

对应：

```text
Analysis Phase 6
Development Phase 5
```

目标：

```text
把 Codex 包装成 scoped worker，而不是让 Codex 直接控制系统。
```

推荐 issue：

```text
MCR-300 codex worker input schema
MCR-301 codex proof output schema
MCR-302 codex exec command builder
MCR-303 codex JSONL parser
MCR-304 worktree preparation fake
MCR-305 worker timeout and failure model
MCR-306 codex worker contract tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-303
Role: Implementer Codex
Goal: Parse Codex exec JSONL output into normalized worker events.

Allowed files:
- workers/codex-exec-worker/src/**
- workers/codex-exec-worker/test/**
- fixtures/codex-jsonl/**
- schemas/codex/**

Forbidden files:
- Matrix gateway code
- real Codex invocation code unless explicitly requested
- GitHub adapter

Acceptance criteria:
- Parser handles thread.started, turn.started, turn.completed, item.*, and error events when present.
- Parser tolerates unknown event types by preserving raw payload.
- Invalid JSONL line returns structured parse error.
- Tests use fixtures, not real Codex calls.

Validation commands:
- pnpm --filter @mcr/codex-exec-worker test
- pnpm typecheck
```

Phase exit criteria：

```text
Codex worker 有输入/输出 schema
JSONL 事件可解析
失败、timeout、schema mismatch 有状态
MVP 先用 fake Codex runner 通过测试，再接真实 codex exec
```

真实运行命令参考：

```bash
codex exec \
  --json \
  --sandbox workspace-write \
  --output-schema ./schemas/codex/repo_patch_result.schema.json \
  -
```

---

### Phase G：Proof Ledger 与 Verifier

对应：

```text
Analysis Phase 8
Development Phase 6
```

目标：

```text
agent 输出必须变成可验证 proof，而不是口头总结。
```

推荐 issue：

```text
MCR-400 proof ledger schema
MCR-401 proof entry builder
MCR-402 artifact ref model
MCR-403 validation result model
MCR-404 verifier contract
MCR-405 proof submitted Matrix event
MCR-406 proof ledger tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-401
Role: Implementer Codex
Goal: Build proof ledger entries from normalized worker output.

Allowed files:
- packages/proof-ledger/src/**
- packages/proof-ledger/test/**
- schemas/proof/**
- fixtures/proof/**

Acceptance criteria:
- Proof entry includes task_id, run_id, artifact refs, validation results, risk notes, rollback notes.
- Missing validation result fails unless task explicitly allows analysis-only proof.
- Artifact refs include hash or stable URI field.
- Tests cover passed, failed, partial, and malformed worker output.

Validation commands:
- pnpm --filter @mcr/proof-ledger test
- pnpm schemas:validate
- pnpm typecheck
```

Phase exit criteria：

```text
proof schema 固定
proof entry 可由 worker output 构造
verifier 能拒绝不完整 proof
Matrix proof event 只放摘要和引用，不塞大日志
```

---

### Phase H：Approval Gate 与 GitHub PR Flow

对应：

```text
Development Phase 7
```

目标：

```text
不可逆动作必须经过 approval。
```

推荐 issue：

```text
MCR-500 approval schema
MCR-501 approval state transition
MCR-502 policy denied test cases
MCR-503 GitHub adapter interface
MCR-504 fake PR creation
MCR-505 PR body proof template
MCR-506 approval to PR integration test
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-504
Role: Implementer Codex
Goal: Implement a fake GitHub PR adapter for approval-gated PR creation tests.

Allowed files:
- packages/github-adapter/src/**
- packages/github-adapter/test/**
- tests/integration/approval-pr-flow.spec.ts

Forbidden files:
- real GitHub token handling
- deployment logic
- merge logic

Acceptance criteria:
- PR creation is blocked before approval.
- PR creation succeeds after approval.granted for action pr.create.
- Merge is never performed by the adapter.
- PR body includes task_id, proof_id, validation summary, risk notes, rollback notes.

Validation commands:
- pnpm --filter @mcr/github-adapter test
- pnpm test:integration
- pnpm typecheck
```

Phase exit criteria：

```text
没有 approval 不能创建 PR
agent 永远不能 merge
PR body 可追溯到 task/proof
真实 GitHub adapter 仍可晚于 fake adapter
```

---

### Phase I：Memory Proposal 与 Context Pack

对应：

```text
Analysis Phase 11
Development Phase 8
```

目标：

```text
经验可沉淀，但不能自动污染长期 memory。
```

推荐 issue：

```text
MCR-600 context pack schema
MCR-601 handoff back template
MCR-602 memory proposal schema
MCR-603 memory curator prompt
MCR-604 memory proposal Matrix event
MCR-605 memory approval tests
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-602
Role: Implementer Codex
Goal: Add memory update proposal schema and fixtures.

Allowed files:
- schemas/matrix/memory.update.proposed.schema.json
- schemas/memory/**
- fixtures/matrix-events/memory/**
- tests/contracts/memory-proposal.spec.ts

Acceptance criteria:
- Memory proposal requires scope, statement, evidence_ref, confidence, and approval_required.
- Proposal cannot directly modify AGENTS.md or docs.
- Invalid proposals without evidence_ref fail validation.
- Tests cover valid proposal, missing evidence, broad global scope, and unsupported target.

Validation commands:
- pnpm test:contracts
- pnpm schemas:validate
```

Phase exit criteria：

```text
memory update 只能 propose
proposal 必须有 proof/evidence ref
human approve 后才进入真正文档 patch
context pack 能支持后续 worker 接手
```

---

### Phase J：E2E Dogfood 与 Beta Hardening

对应：

```text
Development Phase 9-10
```

目标：

```text
用系统开发系统，但仍保留 human gate。
```

推荐 issue：

```text
MCR-700 local e2e fixture flow
MCR-701 Matrix fake homeserver test
MCR-702 fake Codex worker e2e
MCR-703 real codex exec smoke test manual
MCR-704 dogfood task: fix a small repo issue
MCR-705 incident and recovery docs
MCR-706 beta hardening checklist
```

给 Codex 的任务示例：

```markdown
Task ID: MCR-702
Role: Implementer Codex
Goal: Add an E2E test using fake Matrix input and fake Codex worker output.

Allowed files:
- tests/e2e/**
- fixtures/**
- apps/matrix-appservice/test/** if needed
- workers/codex-exec-worker/test/** if needed

Acceptance criteria:
- task.created fixture enters gateway.
- runtime creates task.
- router selects capability.
- fake worker returns proof output.
- proof ledger stores entry.
- approval request is emitted.
- test asserts no PR creation before approval.

Validation commands:
- pnpm test:e2e
- pnpm verify
```

Phase exit criteria：

```text
本地 fake E2E 可跑
真实 codex exec 有人工 smoke test
README 能指导新环境启动
失败恢复路径清楚
Beta 前安全 checklist 完成
```

---

## 8. 每天如何驱动 Codex

### 8.1 每日开工流程

```text
1. 打开 roadmap，选择最多 2-3 个 Ready 任务。
2. 为每个任务补全 Codex Task Card。
3. 标记 allowed files / forbidden files。
4. 创建新分支或 worktree。
5. 启动 fresh Codex session。
6. 明确 role：Analyst / Implementer / Verifier / Test Designer。
7. 每个 session 完成后收集 Handoff Back。
8. 用 Verifier session 做只读 review。
9. 只有通过 review 和测试后才 merge。
10. 更新 roadmap checkbox、PR body、context pack。
```

### 8.2 每日收工流程

```text
1. 确认所有分支状态。
2. 确认未完成任务有 context pack。
3. 确认没有 uncommitted secrets 或临时文件。
4. 确认失败任务有 failure analysis。
5. 更新 docs/roadmap 状态。
6. 记录下一步推荐任务。
```

### 8.3 看板状态建议

```text
Backlog
Ready for Codex
In Codex
Needs Verifier Review
Needs Human Decision
Changes Requested
Ready to Merge
Done
Blocked
```

### 8.4 标签建议

```text
kind:analysis
kind:contract
kind:implementation
kind:test
kind:review
kind:security
kind:docs
phase:p0
phase:p1
phase:p2
risk:low
risk:medium
risk:high
area:matrix
area:runtime
area:codex-worker
area:proof
area:approval
area:memory
```

---

## 9. Review Gate 规则

### 9.1 必须 review 的任务

以下任务必须有 Verifier Codex + Human review：

```text
Matrix event schema
state machine transition
idempotency logic
policy / approval logic
Codex worker command execution
proof ledger construction
GitHub PR adapter
memory update proposal
任何删除或迁移脚本
任何安全相关改动
```

### 9.2 Verifier 不能做的事

Verifier session 禁止：

```text
直接改代码
顺手补实现
替 implementer 扩 scope
忽略 failing tests
把“看起来可以”当 proof
```

Verifier 只能输出：

```text
APPROVE
REQUEST_CHANGES
BLOCK
```

### 9.3 Human Gate

Human 必须批准：

```text
架构方向变更
scope 扩大
引入新生产依赖
修改安全策略
真实 GitHub token 接入
真实 Matrix homeserver 接入
真实 Codex 执行器启用
PR 创建
merge
release
```

---

## 10. 测试策略

### 10.1 测试优先级

按顺序建设：

```text
1. schema validation tests
2. pure function unit tests
3. contract tests with fixtures
4. fake adapter integration tests
5. local e2e tests
6. manual real Codex smoke tests
7. real Matrix homeserver integration tests
```

不要一开始依赖真实外部服务，否则 Codex 很容易把测试写成不可复现。

### 10.2 每类组件的测试重点

| 组件 | 测试重点 |
|---|---|
| Matrix gateway | schema validation、hs_token、idempotency、unsupported event |
| State machine | allowed / denied transitions、terminal states、recovery states |
| Capability router | narrowest sufficient capability、unsupported task、risk handling |
| Codex worker | JSONL parsing、timeout、schema mismatch、command builder |
| Proof ledger | missing validation、artifact refs、risk/rollback、malformed worker output |
| Approval gate | action blocked before approval、allowed after approval、merge always denied |
| Memory proposal | evidence required、scope required、no direct write |

### 10.3 让 Codex 写测试时的要求

每个测试任务都要要求 Codex：

```text
不要只测 happy path
至少包含 1 个 valid fixture
至少包含 2 个 invalid fixtures
错误消息要可解释
不要 mock 掉核心风险
测试名要描述行为而不是实现细节
```

---

## 11. 防止 Codex 跑偏的硬规则

### 11.1 Allowed Files 必须窄

错误示例：

```text
Allowed files:
- entire repo
```

正确示例：

```text
Allowed files:
- schemas/matrix/task.created.schema.json
- fixtures/matrix-events/task.created.*.json
- tests/contracts/task-created-event.spec.ts
```

### 11.2 Forbidden Files 必须明确

常见 forbidden：

```text
.env
.env.*
production config
secrets
main branch protection config
infra/deploy/**
apps/**/src/**      # 如果任务只是 schema
workers/**/src/**   # 如果任务只是 gateway
```

### 11.3 Scope 扩大必须停止

Codex 不能说：

```text
我顺手重构了整个 router。
我顺手改了状态机。
我顺手换了测试框架。
```

必须说：

```text
当前任务需要扩大 scope。建议拆出 MCR-XXX 后续任务。
```

### 11.4 Prompt 不是 Policy

所有关键约束最终必须落到：

```text
schema
tests
state machine
policy file
approval gate
branch protection
CI
```

不要满足于：

```text
AGENTS.md 里写了不能做，所以就安全。
```

---

## 12. Handoff Back 模板

每个 Codex session 结束必须输出：

```markdown
## Summary
- What was done in one paragraph.

## Files Changed
- `path`: why changed

## Tests Added or Updated
- `test path`: what behavior it covers

## Validation Results
- `command`: passed / failed / not run
- If failed, explain why and whether failure is in scope.

## Risk Notes
- Runtime risk
- Security risk
- Data risk
- Compatibility risk

## Rollback Notes
- How to revert safely.

## Follow-up Tasks
- MCR-XXX: reason

## Context Pack
- Current state
- Important decisions
- Open questions
- Recommended next step
```

如果 Codex 没有提供完整 Handoff Back，不要进入 review。

---

## 13. 第一批建议执行任务

建议从这 10 个 issue 开始，不要跳到 Matrix gateway 或 Codex worker。

### MCR-000：Docs Baseline

目标：

```text
把架构文档、分析 roadmap、开发 roadmap、本文档放入 docs/。
```

Codex 角色：Analyst / Implementer

允许文件：

```text
docs/architecture/**
docs/roadmaps/**
docs/roadmap/**
docs/guides/**
AGENTS.md
```

验收：

```text
文档路径稳定
AGENTS.md 告诉 Codex 先读哪些文档
README 指向这些文档
```

### MCR-001：Repo Inventory

目标：

```text
盘点现有 codex-multica 资产，分类为 keep / migrate / reference / ignore。
```

产物：

```text
docs/analysis/00-repo-inventory.md
docs/analysis/01-existing-assets-map.md
```

### MCR-010：Event Envelope Schema

目标：

```text
定义所有 Matrix Runtime event 的统一 envelope。
```

产物：

```text
schemas/matrix/event-envelope.schema.json
fixtures/matrix-events/valid/event-envelope.valid.json
fixtures/matrix-events/invalid/*.json
tests/contracts/matrix-event-envelope.spec.ts
```

### MCR-011：Task Created Schema

目标：

```text
定义 com.notyet.agent.task.created。
```

### MCR-020：Proof Schema

目标：

```text
定义最小 proof ledger entry。
```

### MCR-030：pnpm Monorepo Baseline

目标：

```text
建立 package workspace、tsconfig、lint/test/verify 脚本。
```

### MCR-100：Task State Machine Spec

目标：

```text
写出状态机表和非法 transition 表。
```

### MCR-101：State Machine Implementation

目标：

```text
实现纯 TypeScript transition validator。
```

### MCR-200：Matrix Gateway Skeleton

目标：

```text
搭建 AppService endpoint skeleton，不连接真实 homeserver。
```

### MCR-300：Codex JSONL Parser

目标：

```text
先解析 fixture，不直接调用真实 Codex。
```

---

## 14. 什么时候可以接真实 Codex exec

只有在以下条件满足后，再接真实 Codex：

```text
Codex worker input schema 已定义
Codex proof output schema 已定义
JSONL parser 已通过 fixtures
worker timeout/failure 状态已定义
worktree 路径隔离已定义
禁止动作已写入 policy
proof ledger 可保存结果
manual smoke test 任务足够小
```

真实 Codex 调用只允许在：

```text
临时 worktree
无生产 secret
无自动 merge
无自动 deploy
有 validation command
有 output schema
有 timeout
```

推荐 smoke test：

```text
让 Codex 修改一个无风险 fixture 或测试文件，生成 proof，不创建 PR。
```

---

## 15. 什么时候可以接真实 Matrix homeserver

只有在以下条件满足后，再接真实 Matrix：

```text
Matrix event schema 已有 tests
transaction endpoint 已有 fake tests
hs_token validation 已有 tests
idempotency 已有 tests
unsupported event policy 已明确
错误事件会被 rejected 并可见化
DB migration 可回滚
```

MVP 初期优先：

```text
fake Matrix event fixtures
local HTTP endpoint tests
integration tests
```

再进入：

```text
local Synapse docker-compose
real appservice registration
manual task.created event
```

---

## 16. 什么时候可以创建真实 PR

只有在以下条件满足后：

```text
approval.requested / granted schema 已定义
approval gate 测试通过
fake GitHub adapter 测试通过
PR body proof template 已定义
agent merge 被策略禁止
branch protection 由人类管理
```

第一批真实 PR 应该只来自：

```text
人类批准后的 small docs/schema/test change
```

不应来自：

```text
自动修复生产代码
自动依赖升级
自动安全策略改动
自动部署改动
```

---

## 17. Memory Update 使用方式

Codex 可以提出：

```text
memory.update.proposed
```

Codex 不可以直接：

```text
修改长期 memory
修改 AGENTS.md
修改 docs/skills
修改 runtime prompts
扩大 capability 权限
```

Memory proposal 必须包含：

```text
scope
statement
evidence_ref
confidence
created_from_task
approval_required
```

推荐 Prompt：

```markdown
Role: Memory Curator Codex

Task ID: <MCR-XXX>

Goal:
Review the completed task and propose memory updates only if they are specific, evidenced, and reusable.

Rules:
- Do not modify AGENTS.md.
- Do not modify skills.
- Do not create broad global rules.
- Every proposal must cite proof or changed files.

Required output:
## Memory Update Proposals
- Scope:
- Statement:
- Evidence:
- Why reusable:
- Expiration or review condition:

## No-Update Rationale
If no memory update is needed, explain why.
```

---

## 18. Codex 沟通中的常用短指令

### 要求先停止分析，不写代码

```text
Analysis only. Do not modify production code. Produce docs/schema/fixtures only.
```

### 要求最小变更

```text
Make the smallest reviewable change that satisfies the acceptance criteria. Do not refactor unrelated code.
```

### 要求补测试优先

```text
Write or update the failing contract test first. Then implement the minimum change to pass it.
```

### 要求只读 review

```text
Review only. Do not edit files. Return APPROVE, REQUEST_CHANGES, or BLOCK with findings.
```

### 要求遇到 scope 扩大就停

```text
If this requires changing files outside the allowed list, stop and return a blocker instead of continuing.
```

### 要求输出 handoff

```text
End with Handoff Back using the exact template from docs/guides/codex-development-usage-guide.md.
```

### 要求不要真实外部调用

```text
Use fixtures and fake adapters only. Do not call real Matrix, GitHub, Codex, cloud, or secret services.
```

---

## 19. 失败处理

### 19.1 测试失败

不要让 Codex 无限修。

规则：

```text
同一个 Codex session 最多尝试修复 2 轮。
第 3 次失败时停止，进入 Failure Analysis。
```

Failure Analysis 输出后，由 human 决定：

```text
继续当前任务
拆分任务
回滚
更新 task card
补 missing dependency
推迟到后续 phase
```

### 19.2 Codex 修改超范围

处理方式：

```text
1. 不要直接 merge。
2. 要求 Codex 输出超范围文件列表。
3. 人类判断是否保留。
4. 大多数情况下 revert 超范围文件。
5. 如果超范围修改合理，拆出新 issue。
```

### 19.3 架构冲突

如果 Codex 说：

```text
为了简单，我们可以先跳过 proof ledger。
为了 MVP，可以让 agent 直接创建 PR 不审批。
为了方便，可以把 Matrix event 直接存成状态。
```

应立即停止，并要求它输出：

```text
Architecture Drift Report
```

模板：

```markdown
## Proposed Deviation

## Why It Conflicts With Architecture

## Risk

## Safer Alternative

## Human Decision Needed
```

---

## 20. Release / Phase Gate

每个 phase 结束必须满足：

```text
所有 planned deliverables 完成或明确延期
所有 schema 有 fixtures
所有核心逻辑有 tests
pnpm verify 通过或失败原因清楚
Verifier Codex 输出 APPROVE 或已处理 REQUEST_CHANGES
Human 已确认进入下一 phase
roadmap 已更新
handoff/context pack 已存在
```

不要在 phase 未关闭时堆叠太多后续实现。否则会形成技术债和上下文债。

---

## 21. MVP 完成标准

MVP 不以“功能多”为完成标准。

MVP 完成标准：

```text
1. Matrix task.created fixture 能进入 gateway。
2. Runtime 能创建 task 并持久化。
3. Task graph compiler 能选择 repo.patch.codex 或 ci.recovery capability。
4. Codex worker 能解析 fake/real JSONL。
5. Worker output 能生成 proof ledger entry。
6. Proof 能触发 approval.requested。
7. PR creation 在 approval 前被阻止。
8. Approval 后可以通过 fake 或真实 GitHub adapter 创建 PR。
9. Agent 不能 merge。
10. Memory update 只能 propose，不能自动写入长期 memory。
11. 本地 e2e 测试覆盖完整闭环。
12. 一个真实 dogfood 任务可在人工监督下跑通。
```

---

## 22. 最推荐的实际执行顺序

如果你今天开始驱动 Codex，建议严格按这个顺序：

```text
Step 1  MCR-000：文档入库与 AGENTS.md 更新
Step 2  MCR-001：repo inventory
Step 3  MCR-002：codex-multica assets map
Step 4  MCR-030：pnpm monorepo baseline
Step 5  MCR-010：event envelope schema
Step 6  MCR-011：task.created schema + fixtures
Step 7  MCR-020：proof schema + fixtures
Step 8  MCR-100：state machine spec
Step 9  MCR-101：state machine implementation
Step 10 MCR-200：Matrix gateway skeleton
Step 11 MCR-250：capability registry seed
Step 12 MCR-300：Codex JSONL parser
Step 13 MCR-400：proof ledger builder
Step 14 MCR-500：approval gate fake flow
Step 15 MCR-700：fake E2E
```

不要提前做：

```text
真实 Matrix server
真实 Codex exec 自动执行
真实 GitHub PR adapter
真实 memory 写入
真实 deploy
```

---

## 23. 附录：给 Codex 的首条完整启动 Prompt

```markdown
You are starting development work on the Matrix Codex Capability Runtime repository.

Role: Analyst Codex
Task ID: MCR-001

Read first:
- AGENTS.md
- docs/architecture/matrix-codex-capability-runtime.md
- docs/roadmaps/analysis-roadmap.md
- docs/roadmap/matrix-codex-capability-runtime-roadmap.md
- docs/guides/codex-development-usage-guide.md

Goal:
Inventory the current repository assets and map them to the Matrix Codex Capability Runtime direction.

Allowed files:
- docs/analysis/00-repo-inventory.md
- docs/analysis/01-existing-assets-map.md

Forbidden files:
- apps/**
- packages/**
- workers/**
- runtime implementation files
- any production configuration
- any secret or env file

Constraints:
- Analysis only.
- Do not implement runtime logic.
- Do not introduce dependencies.
- Do not rewrite the architecture.

Acceptance criteria:
- List current repo files and directories relevant to the new runtime.
- Classify each asset as keep / migrate / reference / ignore.
- Map codex-multica assets to Matrix Runtime equivalents.
- Identify gaps, risks, and open questions.
- Recommend the next 3 Codex tasks.

Validation commands:
- No code validation required.
- Manually verify referenced paths exist.

Required output:
## Summary
## Files Changed
## Key Findings
## Asset Mapping
## Gaps
## Risks
## Open Questions
## Recommended Next Tasks
```

---

## 24. 核心提醒

这套系统的开发方式要和系统目标一致：

```text
不要让 Codex 变成一个巨大的、没有边界的开发 agent。
```

而是让它工作在：

```text
明确任务
窄上下文
最小权限
可验证输出
独立 review
人类 gate
可恢复 handoff
```

如果每个任务都遵守这个工作方式，系统会自然长成：

```text
Matrix 协作层
TypeScript Runtime 内核
Capability Registry
Codex Work Cell
Proof Ledger
Approval Gate
Memory Proposal Loop
```

如果跳过这些纪律，系统会退化成：

```text
一个大 prompt + 一堆工具 + 无法审计的自动化。
```

MVP 的胜利条件不是“自动化程度最高”，而是：

```text
每一次 AI 工程执行都有边界、有证据、有责任、有回滚路径。
```

---

## 25. References

- Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- Codex SDK: https://developers.openai.com/codex/sdk
- Codex CLI reference: https://developers.openai.com/codex/cli/reference
- Matrix Application Service API: https://spec.matrix.org/v1.18/application-service-api/
- Matrix specification: https://spec.matrix.org/
- Superpowers repository: https://github.com/obra/Superpowers
- Existing reference repository: https://github.com/Notyet1307/codex-multica
