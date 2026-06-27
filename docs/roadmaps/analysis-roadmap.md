# Matrix Codex Capability Runtime：分析阶段 Roadmap Plan

> 版本：2026-06-27  
> 建议放置路径：`docs/roadmaps/analysis-roadmap.md`  
> 上游架构文档：`MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md`  
> 目标：把整体架构拆成可被 Codex 逐步完成的分析任务、规格产物、测试契约和 MVP 开发入口。

---

## 0. 本文的使用方式

这不是普通项目计划，而是一个 **Codex 驱动开发前的分析执行计划**。

使用方式：

```text
1. 把本文放进项目目录。
2. 让 Codex 先读：
   - AGENTS.md
   - MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md
   - docs/roadmaps/analysis-roadmap.md
3. 按本文的 Phase / Task Card 一个个开分支、跑分析、产出文档、schema、测试契约。
4. 每个分析任务都必须有 verifier review。
5. 分析阶段完成后，再进入 MVP 实现。
```

分析阶段的核心目标：

```text
不是立即写 runtime 代码，
而是把系统拆成清晰、可测试、可验证、可回滚的开发单元。
```

---

## 1. 总体判断

### 1.1 TypeScript 可以作为主语言

推荐：**TypeScript-first，不是 TypeScript-only。**

TypeScript 适合承担：

```text
Matrix Application Service Gateway
Runtime API
Task State Machine
Capability Router
Schema Validation
Codex Worker Orchestration
GitHub Integration
Proof Ledger API
Policy Evaluation Glue
OpenTelemetry Instrumentation
```

原因：

```text
1. 这个系统主要是事件、I/O、状态机、schema、API、worker orchestration，而不是 CPU 密集计算。
2. TypeScript 的类型系统适合表达 event contract、task state、capability manifest、proof schema。
3. Codex SDK 官方提供 TypeScript 使用路径，适合后续从 codex exec 迁移到 SDK。
4. Matrix、GitHub、JSON Schema、OpenTelemetry、Fastify/Hono、BullMQ 等生态对 TypeScript 友好。
5. 团队能用同一语言完成 runtime、测试、schema、worker glue、CLI。
```

不建议所有东西都强行 TypeScript。以下可以保留其他语言：

```text
Python：一次性迁移脚本、数据清洗、已有 repo validator、轻量安全扫描 glue
Shell：本地开发、CI、readiness check
Rust/Go：只有在真实 profiler 证明 TypeScript runtime 成为瓶颈后再考虑
```

性能原则：

```text
先通过边界、队列、幂等、异步 worker、数据库索引和日志采样解决性能。
不要在 MVP 阶段为了假想性能问题引入多语言复杂度。
```

---

## 2. 分析阶段的工作纪律

### 2.1 禁止事项

在分析阶段，Codex 不应做这些：

```text
不实现完整 runtime
不写大块生产代码
不引入框架迁移
不连接真实 secrets
不写 deploy 逻辑
不自动改架构方向
不修改主分支
不把 prompt 当作 policy
不把聊天总结当作 proof
```

允许做：

```text
补文档
补 schema
补 fixtures
补接口草案
补测试计划
补最小 skeleton
补 fake adapter
补 validation script
补 ADR
补 Mermaid 图
补 issue backlog
```

### 2.2 一个分析任务的标准闭环

每个 Codex 分析任务必须遵守：

```text
Task Brief
→ Repo Read
→ Current State Notes
→ Proposed Artifact
→ Self-check
→ Verifier Review
→ Human Review
→ Merge
```

每个任务必须产出至少一种可审查文件：

```text
docs/**/*.md
schemas/**/*.json
runtime/**/*.yaml
fixtures/**/*.json
tests/contracts/**/*.spec.ts
adr/**/*.md
```

### 2.3 每个任务的分支策略

```text
branch: analysis/<phase>-<short-name>
commit: analysis(<area>): <what changed>
PR title: [Analysis][P<phase>] <deliverable>
```

示例：

```text
analysis/p2-event-contracts
analysis(p2): define Matrix task event schemas
```

### 2.4 参考 Superpowers，但要 runtime 化

可以参考 Superpowers 最新版的几个思想：

```text
brainstorm before implementation
plan before coding
task brief as file, not pasted long prompt
fresh worker per task
review after each task
progress ledger for recovery
worktree isolation
TDD / verification before completion
file-based handoff instead of giant context paste
```

但不能照搬成“prompt 纪律”。在本项目里要转译为：

```text
Skill / prompt        → repo checked-in .agents/skills 或 runtime/prompts
Task brief            → docs/analysis/tasks/*.md
Progress ledger       → .agent-runtime/progress-ledger.md，gitignored
Worktree isolation    → Runtime work cell contract
Review after task     → verifier worker contract + human review
TDD                   → contract tests and fixtures first
File handoff          → artifact refs and proof refs
```

---

## 3. Codex 使用模式

### 3.1 三类 Codex 角色

分析阶段只使用三类角色。

#### A. Analyst Codex

职责：

```text
读资料
梳理现状
拆边界
提出文件级变更
生成 ADR / schema / plan / fixture
```

禁止：

```text
不实现业务逻辑
不改 runtime 主路径代码
不引入生产依赖
```

#### B. Verifier Codex

职责：

```text
只读 review
检查规格一致性
检查是否违背架构文档
检查是否遗漏错误态 / 权限 / proof
检查 schema 是否可验证
```

禁止：

```text
不修改文件
不替 analyst 辩护
不接受“以后再补”的关键缺口
```

#### C. Test Designer Codex

职责：

```text
把规格转换为测试矩阵
生成 contract test skeleton
生成 fake adapter 行为表
生成 golden fixtures
定义 MVP 的 E2E 测试场景
```

禁止：

```text
不写完整 production implementation
不 mock 掉系统关键风险
```

---

## 4. 推荐目录结构

分析阶段结束时，至少应该形成：

```text
.
├── AGENTS.md
├── MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md
├── docs/
│   ├── roadmaps/
│   │   └── analysis-roadmap.md
│   ├── analysis/
│   │   ├── 00-repo-inventory.md
│   │   ├── 01-existing-assets-map.md
│   │   ├── 02-product-language.md
│   │   ├── 03-bounded-contexts.md
│   │   ├── 04-matrix-integration-analysis.md
│   │   ├── 05-codex-worker-analysis.md
│   │   ├── 06-proof-ledger-analysis.md
│   │   ├── 07-security-threat-model.md
│   │   ├── 08-test-strategy.md
│   │   └── 09-mvp-backlog.md
│   ├── adr/
│   │   ├── 0001-typescript-first-runtime.md
│   │   ├── 0002-matrix-as-collaboration-surface.md
│   │   ├── 0003-codex-exec-before-sdk.md
│   │   ├── 0004-proof-ledger-before-memory-write.md
│   │   └── 0005-human-gate-for-irreversible-actions.md
│   └── diagrams/
│       ├── context.mmd
│       ├── runtime-container.mmd
│       ├── task-lifecycle.mmd
│       └── mvp-sequence.mmd
├── runtime/
│   ├── capabilities.yaml
│   ├── policies/
│   │   └── default.yaml
│   ├── workflows/
│   │   ├── repo-patch.yaml
│   │   └── ci-recovery.yaml
│   └── prompts/
│       ├── analyst.md
│       ├── verifier.md
│       ├── codex-repo-patch.md
│       └── proof-verifier.md
├── schemas/
│   ├── matrix/
│   │   ├── task.created.schema.json
│   │   ├── task.accepted.schema.json
│   │   ├── worker.dispatched.schema.json
│   │   ├── proof.submitted.schema.json
│   │   └── approval.granted.schema.json
│   ├── runtime/
│   │   ├── task.schema.json
│   │   ├── task-state-transition.schema.json
│   │   ├── capability.schema.json
│   │   └── work-cell.schema.json
│   ├── codex/
│   │   └── repo-patch-result.schema.json
│   └── proof/
│       └── proof-ledger-entry.schema.json
├── fixtures/
│   ├── matrix-events/
│   ├── codex-jsonl/
│   └── proof/
└── tests/
    ├── contracts/
    └── fixtures/
```

---

## 5. 编号模型：Phase 与 MCR 不同

本文使用两套编号，不能互相推导。

```text
Phase = 分析路线顺序
MCR   = 可执行任务 / issue 编号
```

判断下一步时，优先级是：

```text
1. 先看 Analysis Phase 是否完成。
2. 再看该 Phase 下有哪些产物缺口。
3. 最后选择或创建对应 MCR task。
```

不要因为某个 MCR 编号更小或当前技术缺口更明显，就跳过未完成的前置 Phase。若确实要偏离 Phase 顺序，必须把偏离原因写入 handoff，并让 human owner 明确批准。

### 5.1 Analysis Phase 顺序

| Phase | 目标 | 当前状态 |
|---|---|---|
| Phase 0 | Repo Orientation 与资料基线 | 部分完成：docs baseline、inventory、asset map、worktree policy baseline 已完成；ADR 仍缺 |
| Phase 1 | 产品语言与范围锁定 | 未完成 |
| Phase 2 | 架构边界与组件分解 | 未完成 |
| Phase 3 | Matrix Event Contract 分析 | 部分完成：event envelope、task.created baseline 已完成；其余事件缺 |
| Phase 4 | Runtime State Machine 与 Task Graph | 未完成 |
| Phase 5 | Capability Registry 与 Routing 规则 | 部分完成：capabilities seed 已有；schema/routing analysis 缺 |
| Phase 6 | Codex Worker Contract 分析 | 未完成 |
| Phase 7 | Matrix AppService Gateway 分析 | 未完成 |
| Phase 8 | Proof Ledger 与 Approval 分析 | 部分完成：proof ledger baseline 已有；approval 缺 |
| Phase 9 | Security Threat Model 与 Policy 分析 | 部分完成：worktree policy baseline 已有；threat model/deny-by-default matrix 缺 |
| Phase 10 | Testing Strategy 与 Test Matrix | 未完成 |
| Phase 11 | Prompt / Skill 设计分析 | 未完成 |
| Phase 12 | MVP Backlog 与开发入口 | 未完成 |

### 5.2 MCR 编号范围

MCR 编号按工作流领域分段，不等于 Phase 编号。

| MCR 范围 | 含义 | 典型 Phase |
|---|---|---|
| MCR-000 到 MCR-009 | repo/docs/analysis baseline | Phase 0-1 |
| MCR-010 到 MCR-099 | event/schema/fixture baseline | Phase 3 |
| MCR-100 到 MCR-199 | task state machine / runtime model | Phase 4 |
| MCR-200 到 MCR-249 | Matrix gateway | Phase 7 |
| MCR-250 到 MCR-299 | capability registry / routing | Phase 5 |
| MCR-300 到 MCR-399 | Codex worker contract | Phase 6 |
| MCR-400 到 MCR-499 | proof ledger / verifier | Phase 8 |
| MCR-500 到 MCR-599 | approval / GitHub PR flow | Phase 8-9 |
| MCR-600 到 MCR-699 | memory proposal / context pack | Phase 11 |
| MCR-700 到 MCR-799 | E2E / dogfood / beta hardening | Phase 10-12 |

### 5.3 当前推荐顺序

当前应先补齐 Phase 0 closeout，再进入 Phase 1：

```text
1. docs/adr/0001-typescript-first-runtime.md
2. docs/analysis/02-product-language.md
3. docs/adr/0002-matrix-as-collaboration-surface.md
```

Capability schema 这类技术缺口属于后续 Phase 5，除非 human owner 明确批准偏离 roadmap，否则不应作为下一步默认推荐。

---

## 6. Phase Roadmap

## Phase 0：Repo Orientation 与资料基线

### 目标

让 Codex 完整理解现有仓库、上游架构文档、可复用资产和缺口。

### 输入

```text
AGENTS.md
MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md
现有 codex-multica 目录结构
.github 工作流
multica/*.yaml
.agents/skills
scripts
```

### 产物

```text
docs/analysis/00-repo-inventory.md
docs/analysis/01-existing-assets-map.md
docs/adr/0001-typescript-first-runtime.md
```

### Codex Task Card 0.1：仓库盘点

```text
Title: Analyze current repository assets for Matrix Codex Runtime migration
Role: Analyst Codex
Sandbox: read-only preferred; workspace-write only for docs output
Allowed changes:
  - docs/analysis/00-repo-inventory.md
  - docs/analysis/01-existing-assets-map.md
Forbidden changes:
  - runtime code
  - package manager changes
  - CI changes
  - secrets or env files
Prompt:
  Read AGENTS.md and MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md first.
  Inventory the repository as a source for Matrix Codex Capability Runtime.
  Map each existing asset to one of:
    1. keep as-is
    2. migrate to runtime equivalent
    3. use as reference only
    4. delete or ignore for MVP
  Produce docs/analysis/00-repo-inventory.md and docs/analysis/01-existing-assets-map.md.
  Include gaps, risks, and questions.
Done when:
  - Inventory covers docs, multica config, skills, workflows, scripts, prompts.
  - Asset map includes target paths in the new architecture.
  - No implementation code is changed.
Verifier prompt:
  Review the inventory against the architecture document.
  Flag missing assets, false assumptions, and any recommended code change that belongs to implementation rather than analysis.
```

### 验收标准

```text
每个现有资产都有去向
每个迁移建议都有理由
没有隐含“直接复制 Multica runtime”的假设
明确 TypeScript-first 的边界
```

---

## Phase 1：产品语言与范围锁定

### 目标

统一系统语言，避免重新滑向“公司部门制”。

### 产物

```text
docs/analysis/02-product-language.md
docs/adr/0002-matrix-as-collaboration-surface.md
```

### 必须锁定的术语

```text
Intent
Task
Task Graph
Capability
Work Cell
Worker
Artifact
Proof
Verifier
Approval
Memory Proposal
Capability Version
```

### Codex Task Card 1.1：产品语言文件

```text
Title: Define product language for Matrix Codex Capability Runtime
Role: Analyst Codex
Allowed changes:
  - docs/analysis/02-product-language.md
Prompt:
  Create a product language document for this system.
  The document must explain why we use Capability / Work Cell / Proof instead of Department / Lead Agent / Worker hierarchy.
  Include canonical definitions, non-goals, and examples.
  Use concrete examples from engineering tasks, not abstract organization metaphors.
Done when:
  - Each term has definition, example, anti-example.
  - The document explains how Matrix rooms relate to tasks without becoming departments.
  - The document can be used by future Codex runs as terminology source.
Verifier prompt:
  Check whether any term encourages department hierarchy or all-knowing agent design.
```

### 验收标准

```text
全项目统一使用 capability，而不是 department
全项目统一使用 work cell，而不是 employee/agent seat
全项目统一使用 proof，而不是 summary
```

---

## Phase 2：架构边界与组件分解

### 目标

把总体架构拆成可开发组件，并标明每个组件的输入、输出、状态、依赖和测试方式。

### 产物

```text
docs/analysis/03-bounded-contexts.md
docs/diagrams/context.mmd
docs/diagrams/runtime-container.mmd
docs/diagrams/mvp-sequence.mmd
```

### 组件边界

```text
Matrix Homeserver
Matrix AppService Gateway
Runtime API
Task Store
Capability Router
Policy Engine
Work Cell Manager
Codex Worker Runner
Proof Ledger
Approval Service
Memory Proposal Service
GitHub Adapter
Object Store Adapter
```

### Codex Task Card 2.1：组件边界分析

```text
Title: Decompose architecture into bounded contexts and component interfaces
Role: Analyst Codex
Allowed changes:
  - docs/analysis/03-bounded-contexts.md
  - docs/diagrams/context.mmd
  - docs/diagrams/runtime-container.mmd
  - docs/diagrams/mvp-sequence.mmd
Prompt:
  Based on the architecture document, decompose the system into bounded contexts.
  For each component define:
    - responsibility
    - inputs
    - outputs
    - owned state
    - external dependencies
    - failure modes
    - test strategy
  Add Mermaid diagrams for context, container, and MVP task sequence.
Done when:
  - Every MVP component has a testable boundary.
  - Matrix is not treated as source of truth for runtime state.
  - Proof logs are not stored directly in Matrix.
Verifier prompt:
  Check if responsibilities overlap or if any component owns state that belongs elsewhere.
```

### 验收标准

```text
每个组件能单独被测试
所有跨组件通信都有事件或接口
没有组件被设计成“万能 runtime”
```

---

## Phase 3：Matrix Event Contract 分析

### 目标

定义 Matrix custom event 与 Runtime event 的契约，并把所有外部输入视为不可信。

### 依据

Matrix Application Service 是 homeserver 旁的被动组件，靠注册 namespace 接收感兴趣事件；它可以注入事件，但不能修改或阻止原始事件。Matrix 规范也明确提示 event body 是不可信数据，应用使用前必须校验 schema。

### 产物

```text
docs/analysis/04-matrix-integration-analysis.md
schemas/matrix/task.created.schema.json
schemas/matrix/task.accepted.schema.json
schemas/matrix/task.rejected.schema.json
schemas/matrix/worker.dispatched.schema.json
schemas/matrix/proof.submitted.schema.json
schemas/matrix/approval.requested.schema.json
schemas/matrix/approval.granted.schema.json
schemas/matrix/memory.update.proposed.schema.json
fixtures/matrix-events/*.json
tests/contracts/matrix-event-schemas.spec.ts
```

### Matrix event namespace

```text
com.notyet.agent.task.created
com.notyet.agent.task.accepted
com.notyet.agent.task.rejected
com.notyet.agent.capability.selected
com.notyet.agent.worker.dispatched
com.notyet.agent.worker.progress
com.notyet.agent.artifact.submitted
com.notyet.agent.proof.submitted
com.notyet.agent.verification.completed
com.notyet.agent.approval.requested
com.notyet.agent.approval.granted
com.notyet.agent.approval.denied
com.notyet.agent.memory.update.proposed
com.notyet.agent.incident.created
```

### Codex Task Card 3.1：事件 schema

```text
Title: Define Matrix event schemas and contract fixtures
Role: Analyst Codex + Test Designer Codex
Allowed changes:
  - docs/analysis/04-matrix-integration-analysis.md
  - schemas/matrix/*.schema.json
  - fixtures/matrix-events/*.json
  - tests/contracts/matrix-event-schemas.spec.ts
Prompt:
  Define JSON Schemas for MVP Matrix custom events.
  Use reverse-DNS event names under com.notyet.agent.*.
  Each event content should include trace_id, workspace_id, task_id where applicable, actor, created_at, and data.
  Treat every Matrix event as untrusted input.
  Add valid and invalid fixtures.
  Add contract test skeleton that validates all fixtures using ajv.
Done when:
  - Valid fixtures pass.
  - Invalid fixtures are explicit and meaningful.
  - task.created includes goal, context, scope, acceptance criteria, proof requirements, risk.
  - approval events cannot approve ambiguous actions.
Verifier prompt:
  Check schema consistency, required fields, failure cases, and replay/idempotency fields.
```

### 验收标准

```text
所有 Matrix inbound event 都有 JSON Schema
所有 schema 都有 valid/invalid fixtures
schema 明确 trace_id 和 event_id/idempotency_key
approval event 不能是自然语言“同意”
```

---

## Phase 4：Runtime State Machine 与 Task Graph

### 目标

定义任务生命周期、状态转换、失败态、重试、取消、等待人工输入，以及 MVP 工作流。

### 产物

```text
docs/analysis/task-state-machine.md
docs/diagrams/task-lifecycle.mmd
runtime/workflows/repo-patch.yaml
runtime/workflows/ci-recovery.yaml
schemas/runtime/task.schema.json
schemas/runtime/task-state-transition.schema.json
tests/contracts/task-state-machine.spec.ts
```

### MVP 状态机

```text
created
→ accepted
→ scoped
→ graph_compiled
→ capability_selected
→ work_cell_created
→ worker_dispatched
→ running
→ artifact_submitted
→ proof_submitted
→ verifying
→ waiting_approval
→ approved
→ pr_created
→ completed
```

失败态：

```text
rejected
blocked
needs_human_input
policy_denied
worker_failed
verification_failed
approval_denied
cancelled
```

### Codex Task Card 4.1：状态机分析

```text
Title: Define task lifecycle and state transition contract
Role: Analyst Codex + Test Designer Codex
Allowed changes:
  - docs/analysis/task-state-machine.md
  - docs/diagrams/task-lifecycle.mmd
  - schemas/runtime/task.schema.json
  - schemas/runtime/task-state-transition.schema.json
  - tests/contracts/task-state-machine.spec.ts
Prompt:
  Define the MVP task state machine.
  Include allowed transitions, forbidden transitions, actor allowed to trigger each transition, required proof or approval, and failure states.
  Write contract test skeletons for legal and illegal transitions.
Done when:
  - Every state has entry condition, exit condition, timeout behavior, and audit event.
  - Irreversible actions require explicit approval.
  - Cancel/retry semantics are defined.
Verifier prompt:
  Find missing transitions, ambiguous states, impossible recovery paths, and states that mix machine execution with human judgment.
```

### 验收标准

```text
可以根据状态机实现 Runtime without guessing
所有高风险动作必须经过 waiting_approval
所有失败态都有可见 incident 或 blocker
```

---

## Phase 5：Capability Registry 与 Routing 规则

### 目标

把现有 `multica/agents.yaml` 里的 agent seed 改造成 capability registry。

### 产物

```text
runtime/capabilities.yaml
schemas/runtime/capability.schema.json
runtime/policies/default.yaml
docs/analysis/capability-routing.md
tests/contracts/capability-schema.spec.ts
fixtures/capabilities/*.yaml
```

### MVP capabilities

```text
spec.scope
repo.patch.codex
ci.recovery
test.run
proof.verify
memory.propose
security.review
release.notes
```

### Codex Task Card 5.1：能力目录

```text
Title: Convert agent seed catalog into capability registry
Role: Analyst Codex
Allowed changes:
  - runtime/capabilities.yaml
  - schemas/runtime/capability.schema.json
  - runtime/policies/default.yaml
  - docs/analysis/capability-routing.md
Prompt:
  Use multica/agents.yaml as reference, but do not preserve department or squad language.
  Define MVP capabilities with:
    - id
    - display_name
    - description
    - input_schema
    - output_schema
    - worker_type
    - permissions allow/deny
    - proof_required
    - verifier
    - human_gate
    - risk_level
    - examples
  Add routing rules based on narrowest sufficient capability.
Done when:
  - Capability registry is not an agent org chart.
  - Every capability has permission and proof requirements.
  - Dangerous actions are denied by default.
Verifier prompt:
  Check whether a broad capability can accidentally do too much.
  Check if routing could select an overpowered worker when a narrower capability exists.
```

### 验收标准

```text
Router 可以只靠 capability manifest 初步选 worker
capability 不是岗位描述，而是输入/输出/权限/proof 组合
```

---

## Phase 6：Codex Worker Contract 分析

### 目标

定义 Codex worker 的输入、输出、sandbox、worktree、JSONL 事件采集、final output schema 和失败语义。

### 产物

```text
docs/analysis/05-codex-worker-analysis.md
schemas/codex/repo-patch-result.schema.json
fixtures/codex-jsonl/success.jsonl
fixtures/codex-jsonl/failure.jsonl
fixtures/codex-jsonl/blocked.jsonl
tests/contracts/codex-jsonl-parser.spec.ts
tests/contracts/codex-output-schema.spec.ts
runtime/prompts/codex-repo-patch.md
runtime/prompts/proof-verifier.md
```

### Codex worker MVP 命令

```bash
codex exec \
  --json \
  --sandbox workspace-write \
  --output-schema ./schemas/codex/repo-patch-result.schema.json \
  -o ./runs/<run_id>/final.json \
  "<worker prompt>"
```

### Final output schema 必须表达

```text
task_id
run_id
root_cause
changes_made
files_changed
commands_run
validation_results
diff_summary
risk_notes
rollback_notes
security_notes
blockers
memory_update_proposals
ready_for_review
```

### Codex Task Card 6.1：Codex worker 契约

```text
Title: Define Codex worker contract and output schema
Role: Analyst Codex + Test Designer Codex
Allowed changes:
  - docs/analysis/05-codex-worker-analysis.md
  - schemas/codex/repo-patch-result.schema.json
  - fixtures/codex-jsonl/*.jsonl
  - tests/contracts/codex-jsonl-parser.spec.ts
  - tests/contracts/codex-output-schema.spec.ts
  - runtime/prompts/codex-repo-patch.md
Prompt:
  Define the MVP contract for a Codex repo patch worker.
  Codex must run in a work cell with scoped context, allowed paths, denied paths, validation commands, and proof requirements.
  Use codex exec JSONL and output schema as the automation interface.
  Add fixtures for success, failure, and blocked worker runs.
  Design prompts to force structured proof, not vague completion claims.
Done when:
  - Output schema distinguishes success, blocked, failed, and needs_human_input.
  - JSONL parser tests cover thread.started, turn.completed, item command execution, error.
  - Prompt includes explicit DoD and forbidden actions.
Verifier prompt:
  Check if a worker can claim success without validation logs.
  Check if the schema can represent partial progress and blockers.
```

### 验收标准

```text
Codex output 可以被 Runtime 自动判断
失败不会伪装成完成
验证命令 exit_code 是 proof 的一部分
```

---

## Phase 7：Matrix AppService Gateway 分析

### 目标

设计 Matrix 到 Runtime 的边界：认证、幂等、schema validation、event translation、room mapping、错误回写。

### 产物

```text
docs/analysis/matrix-appservice-gateway.md
schemas/runtime/runtime-event.schema.json
fixtures/matrix-transactions/*.json
tests/contracts/matrix-appservice-transaction.spec.ts
docs/adr/0002-matrix-as-collaboration-surface.md
```

### 关键设计点

```text
hs_token validation
as_token usage
namespace registration
txn_id idempotency
event_id deduplication
schema validation before runtime enqueue
room_id → workspace mapping
Matrix event → Runtime event mapping
Runtime event → Matrix outbound event mapping
```

### Codex Task Card 7.1：AppService 边界规格

```text
Title: Specify Matrix AppService Gateway contract
Role: Analyst Codex + Test Designer Codex
Allowed changes:
  - docs/analysis/matrix-appservice-gateway.md
  - fixtures/matrix-transactions/*.json
  - tests/contracts/matrix-appservice-transaction.spec.ts
Prompt:
  Specify how the Matrix AppService Gateway receives homeserver transactions and converts them into runtime events.
  Include authentication, idempotency, schema validation, room mapping, and failure replies.
  Do not implement the gateway yet; produce testable contracts and fixtures.
Done when:
  - Duplicate transactions are harmless.
  - Invalid events produce task.rejected or incident events.
  - Matrix is not used as runtime source of truth.
Verifier prompt:
  Check replay behavior, spoofed actor risk, and room/workspace boundary assumptions.
```

### 验收标准

```text
Gateway 可以被 fake Matrix transaction 测试
所有不可信输入都先 schema 校验
重复事件不会重复创建任务
```

---

## Phase 8：Proof Ledger 与 Approval 分析

### 目标

定义 proof ledger 的数据模型、artifact 引用方式、approval gate 和 PR 创建条件。

### 产物

```text
docs/analysis/06-proof-ledger-analysis.md
schemas/proof/proof-ledger-entry.schema.json
schemas/proof/approval.schema.json
fixtures/proof/*.json
tests/contracts/proof-ledger-entry.spec.ts
docs/adr/0004-proof-ledger-before-memory-write.md
docs/adr/0005-human-gate-for-irreversible-actions.md
```

### Proof entry 必须包含

```text
proof_id
task_id
run_id
worker_id
capability_id
artifact_refs
validation_results
commands_run
diff_summary
risk_notes
rollback_notes
security_notes
approval_refs
hashes
created_at
```

### Approval gate 默认策略

```text
允许：生成 patch、创建本地 branch、运行测试、生成 proof
需要审批：push branch、create PR、external write、secret access
禁止：direct push main、merge PR、deploy production、读取 production secrets
```

### Codex Task Card 8.1：Proof + Approval 契约

```text
Title: Define proof ledger and approval gate contracts
Role: Analyst Codex + Test Designer Codex
Allowed changes:
  - docs/analysis/06-proof-ledger-analysis.md
  - schemas/proof/*.schema.json
  - fixtures/proof/*.json
  - tests/contracts/proof-ledger-entry.spec.ts
Prompt:
  Define the MVP proof ledger entry and approval event contracts.
  Proof must be evidence, not summary.
  Approval must approve a specific action, not the whole task vaguely.
  Include PR creation as a gated action.
Done when:
  - Proof schema can reference logs/artifacts without embedding huge logs.
  - Approval schema requires action, actor, task_id, proof_id, conditions.
  - Memory update requires proof reference.
Verifier prompt:
  Check if any irreversible action can bypass approval.
  Check if proof is sufficient for a human reviewer to understand risk and rollback.
```

### 验收标准

```text
没有 proof，不进入 approval
没有 approval，不执行 PR create / external write
proof 可以独立审计
```

---

## Phase 9：Security Threat Model 与 Policy 分析

### 目标

系统性分析 agent runtime 的风险，定义 MVP policy，并区分 prompt 约束和 runtime enforcement。

### 产物

```text
docs/analysis/07-security-threat-model.md
runtime/policies/default.yaml
runtime/policies/repo-patch.yaml
tests/contracts/policy-decisions.spec.ts
fixtures/policy/*.yaml
```

### 必须覆盖的威胁

```text
Matrix event spoofing
room/workspace boundary confusion
prompt injection from issue/context/docs
malicious repo code reading secrets
Codex command execution risk
API key exposure
unapproved external writes
path traversal in artifact refs
fake proof / fabricated validation
memory poisoning
approval replay
branch/PR confusion
logs containing secrets
```

### Codex Task Card 9.1：威胁模型

```text
Title: Produce security threat model and MVP policy matrix
Role: Analyst Codex + Verifier Codex
Allowed changes:
  - docs/analysis/07-security-threat-model.md
  - runtime/policies/default.yaml
  - runtime/policies/repo-patch.yaml
  - tests/contracts/policy-decisions.spec.ts
Prompt:
  Produce a threat model for Matrix Codex Capability Runtime.
  Use STRIDE-style categories if useful, but keep the result actionable.
  For each threat include:
    - attack scenario
    - impact
    - MVP control
    - v1 control
    - test or audit signal
  Then define default deny policy and repo patch policy.
Done when:
  - Prompt constraints are not listed as the only control for dangerous actions.
  - Secret handling and approval replay are covered.
  - Policy can be tested with contract fixtures.
Verifier prompt:
  Try to bypass the proposed policy using malicious Matrix events, malicious repo files, and fake proof.
```

### 验收标准

```text
默认 deny
生产 secret 不进入 worker
approval 是 action-scoped
proof 可校验
memory write 不能自动发生
```

---

## Phase 10：Testing Strategy 与 Test Matrix

### 目标

在实现前定义测试分层、fixtures、fake adapters、contract tests 和 MVP E2E 场景。

### 产物

```text
docs/analysis/08-test-strategy.md
tests/contracts/README.md
tests/fixtures/README.md
tests/e2e/mvp-scenarios.md
```

### 测试分层

```text
Unit tests
  schema validators
  state machine transitions
  router scoring
  policy decisions
  proof validation

Contract tests
  Matrix event schemas
  Matrix transaction ingestion
  Codex JSONL parser
  Codex final output schema
  Capability manifest schema
  Proof ledger entry schema

Integration tests
  fake Matrix → AppService Gateway → Runtime event queue
  Runtime → fake Codex worker → proof ledger
  Runtime → fake GitHub adapter → PR request

E2E tests
  Local Synapse or fake Matrix harness
  one task.created event
  one worker run
  proof.submitted
  approval.requested
  PR creation simulated or test repo
```

### Codex Task Card 10.1：测试策略

```text
Title: Define test strategy before implementation
Role: Test Designer Codex
Allowed changes:
  - docs/analysis/08-test-strategy.md
  - tests/contracts/README.md
  - tests/fixtures/README.md
  - tests/e2e/mvp-scenarios.md
Prompt:
  Define the testing strategy for the MVP.
  Include unit, contract, integration, E2E, security regression, and golden fixture tests.
  For each component, define the first tests to write before implementation.
  Keep tests executable in TypeScript where possible.
Done when:
  - Every MVP component has at least one contract test.
  - E2E scenario is specific enough to implement.
  - Test fixtures are named and scoped.
Verifier prompt:
  Check if tests would catch fake proof, invalid Matrix event, duplicate event, policy bypass, and worker failure.
```

### 验收标准

```text
先有测试契约，再实现 runtime
没有 fake-proof 漏洞
没有只测 happy path
```

---

## Phase 11：Prompt / Skill 设计分析

### 目标

把 prompt 设计成可版本化、可审查、可测试的工作流组件，而不是散落在代码里的字符串。

### 产物

```text
runtime/prompts/analyst.md
runtime/prompts/verifier.md
runtime/prompts/codex-repo-patch.md
runtime/prompts/proof-verifier.md
runtime/prompts/memory-curator.md
.agents/skills/matrix-runtime-analysis/SKILL.md
.agents/skills/proof-driven-development/SKILL.md
.agents/skills/codex-worker-contracts/SKILL.md
```

### Prompt 设计原则

```text
1. Prompt 只定义行为，不替代权限。
2. Prompt 必须引用 task brief、capability、DoD、proof schema。
3. Prompt 必须要求输出证据引用，而不是泛泛总结。
4. Prompt 必须区分 blocked / failed / completed。
5. Prompt 必须要求 memory update 只能 propose。
6. Prompt 必须要求不可执行 forbidden actions。
7. Prompt 必须短，长规则放进 skill 或 reference 文件。
```

### Skill 设计参考

Codex 支持 `AGENTS.md` 和 skills。`AGENTS.md` 适合项目级长期约束，skills 适合可复用工作流。技能目录应放在 `.agents/skills/<skill-name>/SKILL.md`。

建议 skills：

```text
matrix-runtime-analysis
  Use when designing Matrix Runtime architecture, events, state, policies.

proof-driven-development
  Use when designing or implementing a task that must submit proof.

codex-worker-contracts
  Use when writing schemas, prompts, or tests for Codex worker execution.

security-boundary-review
  Use when reviewing changes touching policy, secrets, sandbox, Matrix ingest, approval.
```

### Codex Task Card 11.1：Prompt pack

```text
Title: Create initial prompt and skill pack for analysis and MVP implementation
Role: Analyst Codex
Allowed changes:
  - runtime/prompts/*.md
  - .agents/skills/*/SKILL.md
Prompt:
  Create a small prompt and skill pack for Matrix Codex Capability Runtime.
  Reference Superpowers-style workflows only as design inspiration: plan first, task brief as file, review after each task, proof before completion.
  Keep prompts concise and move reusable rules into skills.
  Include clear trigger descriptions for skills.
Done when:
  - Prompts are versioned files.
  - Skills have frontmatter name and description.
  - Skills do not contain secrets or environment assumptions.
  - Prompt pack separates analyst, implementer, verifier, memory curator.
Verifier prompt:
  Check for prompt bloat, ambiguous instructions, missing proof requirements, and unsafe autonomy.
```

### 验收标准

```text
未来 Codex 能通过读取 AGENTS.md + skill + task brief 开始工作
prompt 不把权限和 proof 伪装成自然语言纪律
```

---

## Phase 12：MVP Backlog 与开发入口

### 目标

把分析产物转成可执行的 MVP backlog。

### 产物

```text
docs/analysis/09-mvp-backlog.md
docs/roadmaps/mvp-implementation-plan.md
docs/analysis/development-entry-review.md
```

### MVP Epics

```text
E1 Project foundation
E2 Schema and contract tests
E3 Matrix AppService Gateway
E4 Runtime state machine
E5 Capability router
E6 Codex worker runner
E7 Proof ledger
E8 Approval gate
E9 GitHub PR adapter
E10 Memory proposal flow
E11 Local E2E harness
```

### Codex Task Card 12.1：MVP backlog

```text
Title: Generate MVP implementation backlog from analysis artifacts
Role: Analyst Codex + Verifier Codex
Allowed changes:
  - docs/analysis/09-mvp-backlog.md
  - docs/roadmaps/mvp-implementation-plan.md
  - docs/analysis/development-entry-review.md
Prompt:
  Read all docs/analysis, schemas, runtime manifests, and test strategy.
  Generate a sequenced MVP implementation backlog.
  Each issue must include:
    - objective
    - allowed files
    - forbidden files
    - dependencies
    - tests to add first
    - implementation notes
    - acceptance criteria
    - rollback notes
    - verifier checklist
Done when:
  - Backlog is sequenced from contracts to runtime to E2E.
  - No issue is too large for one focused Codex run.
  - Every implementation issue has tests-first requirements.
Verifier prompt:
  Check if backlog tasks are independently reviewable and if any task hides architecture decisions that should have been resolved in analysis.
```

### 验收标准

```text
Codex 可以按 backlog 逐个 issue 开发
每个 issue 都有明确测试入口
没有“实现整个 runtime”这种大任务
```

---

## 7. 分析阶段总检查清单

进入 MVP 实现前，必须全部满足：

```text
[ ] 产品语言已锁定，避免部门制
[ ] TypeScript-first ADR 已通过
[ ] Matrix 作为协作层的 ADR 已通过
[ ] Codex exec before SDK 的 ADR 已通过
[ ] 所有 MVP Matrix event 有 JSON Schema
[ ] 所有 MVP Runtime object 有 schema 或 TypeScript interface 草案
[ ] task state machine 已定义合法/非法转换
[ ] capability registry 有 schema 和 MVP capabilities
[ ] default policy 是 deny-by-default
[ ] Codex worker 输出 schema 能表达 success/failed/blocked
[ ] proof ledger schema 能独立表达证据链
[ ] approval 是 action-scoped，不是 vague approval
[ ] memory update 只能 propose，不能自动写
[ ] test strategy 覆盖 happy path 和 failure path
[ ] MVP backlog 已拆成小任务
[ ] 每个实现任务都有 tests-first 要求
```

---

## 8. Development Entry Gate

只有当下面的 gate 通过，才允许 Codex 开始实现 runtime：

```text
Gate A: Contract Lock
  - schemas/matrix/*.schema.json 已存在
  - schemas/runtime/*.schema.json 已存在
  - schemas/codex/*.schema.json 已存在
  - schemas/proof/*.schema.json 已存在
  - fixtures 至少覆盖 valid/invalid

Gate B: State Lock
  - task state machine 文档完成
  - legal/illegal transitions 列表完成
  - failure states 完成

Gate C: Policy Lock
  - deny-by-default policy 完成
  - worktree policy 完成
  - high-risk actions 明确
  - approval schema 完成

Gate D: Test Lock
  - contract test skeleton 完成
  - E2E MVP 场景完成

Gate E: Backlog Lock
  - MVP backlog 任务足够小
  - 每个任务有 allowed files / forbidden files
```

若任何 gate 不通过，Codex 只能继续分析，不允许进入实现。

---

## 9. MVP 实现顺序建议

分析阶段完成后，按以下顺序驱动 Codex：

```text
1. repo foundation
   - package manager
   - tsconfig
   - lint/test setup
   - schema validation helper

2. contract tests first
   - JSON Schema loading
   - valid/invalid fixtures
   - task state transition tests

3. Matrix AppService fake harness
   - no real Synapse first
   - fake transaction ingestion
   - idempotency tests

4. Runtime task store
   - Postgres schema or in-memory first
   - task creation
   - event append

5. Capability router
   - read runtime/capabilities.yaml
   - match suggested capability
   - reject unknown/unsafe capability

6. Codex worker fake runner
   - parse fake JSONL
   - produce proof
   - validate final output

7. Codex real runner behind feature flag
   - codex exec integration
   - worktree creation
   - artifact capture

8. Proof ledger
   - store proof metadata
   - object refs for logs
   - proof.submitted Matrix event

9. Approval gate
   - approval.requested
   - approval.granted
   - action-scoped gating

10. GitHub adapter
   - fake first
   - real PR create later

11. Memory proposal
   - create memory.update.proposed
   - no auto write

12. Local E2E
   - fake Matrix E2E first
   - Synapse E2E later
```

---

## 10. 直接可用的 Codex Meta Prompt

### 10.1 分析任务启动 Prompt

```text
You are working on Matrix Codex Capability Runtime.

Read these files first:
- AGENTS.md
- MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md
- docs/roadmaps/analysis-roadmap.md

Your current task is: <TASK_TITLE>

Mode:
- Analysis only.
- Do not implement runtime logic unless the task explicitly allows test skeletons or schemas.
- Prefer small, reviewable file changes.
- Produce durable artifacts under docs/, schemas/, runtime/, fixtures/, or tests/contracts/.
- Treat Matrix event content as untrusted input.
- Treat prompt rules as insufficient for security; note runtime enforcement where needed.
- Separate what is decided, what remains open, and what must be verified.

Required output:
1. Files changed
2. Summary of decisions
3. Open questions
4. Risks
5. Verification performed
6. Suggested next task
```

### 10.2 Verifier Prompt

```text
You are the verifier for a Matrix Codex Capability Runtime analysis task.

Read:
- AGENTS.md
- MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md
- docs/roadmaps/analysis-roadmap.md
- the changed files in this branch

Review only. Do not modify files unless explicitly asked.

Check:
1. Does the work match the architecture direction?
2. Does it avoid department/manager/worker hierarchy language?
3. Are Matrix events treated as untrusted input?
4. Are permissions enforced by runtime/policy, not prompt only?
5. Is proof evidence-based, not summary-based?
6. Are failure states and blocked states represented?
7. Are tests or fixtures sufficient to catch bad inputs?
8. Are any tasks too large or ambiguous for Codex implementation?

Return:
- verdict: pass / needs-fix / reject
- blocking issues
- non-blocking issues
- missing tests or fixtures
- recommended next action
```

### 10.3 Test Designer Prompt

```text
You are the test designer for Matrix Codex Capability Runtime.

Read the relevant analysis doc and schema files.
Create tests before implementation.

For each behavior, define:
- input fixture
- expected output
- failure case
- edge case
- what fake adapter is needed
- what real integration test should later replace the fake

Do not hide critical behavior behind mocks.
Specifically test:
- invalid Matrix events
- duplicate Matrix events
- policy-denied actions
- worker failure
- fake proof
- approval replay
- memory poisoning attempt
```

---

## 11. 第一批建议创建的 Issues

可直接转成 GitHub Issues 或 Matrix `task.created`。

```text
[Analysis P0] Inventory current repo assets for Matrix Runtime migration
[Analysis P0] Define worktree policy baseline
[Analysis P1] Define product language and anti-department terminology
[Analysis P2] Decompose architecture into bounded contexts and diagrams
[Analysis P3] Define MVP Matrix event schemas and fixtures
[Analysis P4] Define Runtime task state machine and transition tests
[Analysis P5] Convert agents.yaml concepts into capability registry
[Analysis P6] Define Codex worker contract and final output schema
[Analysis P7] Specify Matrix AppService Gateway ingestion contract
[Analysis P8] Define Proof Ledger and Approval schemas
[Analysis P9] Produce threat model and default policy matrix
[Analysis P10] Define test strategy and MVP E2E scenario
[Analysis P11] Create prompt and skill pack for analysis / verifier / worker
[Analysis P12] Generate MVP implementation backlog with tests-first tasks
```

---

## 12. 关键风险与控制

| 风险 | 表现 | 分析阶段控制 |
|---|---|---|
| Codex 提前实现 | 没有 contracts 就写 runtime | 分析阶段禁止大块 production code |
| Matrix 被当数据库 | 状态靠 room history 推断 | ADR 明确 Postgres 为 source of truth |
| Capability 退化成部门 | OpenAI-backend / OpenAI-test 变岗位 | capability manifest 必须有 input/output/permission/proof |
| Proof 退化成总结 | agent 说测试通过但无日志 | proof schema 必须有 command、exit_code、log_ref |
| Approval 含糊 | “同意继续”触发多个动作 | approval schema 必须 action-scoped |
| Prompt 代替安全 | “不要读 secret”写在 prompt 里 | runtime policy deny-by-default |
| Memory 污染 | agent 自动写长期规则 | memory.update.proposed + human approval |
| 测试只测 happy path | MVP 看似跑通但不安全 | contract fixtures 必须有 invalid / attack cases |
| 上下文爆炸 | 每次把所有 docs 塞给 Codex | task brief 文件 + skill progressive disclosure |

---

## 13. 参考资料

- Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- Codex SDK: https://developers.openai.com/codex/sdk
- Codex AGENTS.md guidance: https://developers.openai.com/codex/guides/agents-md
- Codex skills: https://developers.openai.com/codex/skills
- Matrix Application Service API: https://spec.matrix.org/v1.18/application-service-api/
- Matrix specification: https://spec.matrix.org/
- Synapse Application Services: https://matrix-org.github.io/synapse/latest/application_services.html
- Superpowers repository: https://github.com/obra/Superpowers
- Superpowers releases: https://github.com/obra/superpowers/releases

---

## 14. 最终判断

分析阶段的真正产物不是文档数量，而是：

```text
Codex 可以被约束在小任务里工作。
每个小任务都有输入、输出、测试、proof、review。
Runtime 的边界在实现前已经固定。
安全关键点不依赖 prompt 自觉。
失败可以被复盘，成功可以被复用。
```

完成本文定义的分析阶段后，再让 Codex 进入 MVP 实现，会显著降低以下失败模式：

```text
写出一堆不可组合的代码
把 Matrix 当数据库
把 agent prompt 当权限系统
没有 proof 却宣称完成
没有测试却快速迭代
长期记忆被错误污染
```

MVP 的起点应该是：

```text
schema + fixtures + contract tests
```

而不是：

```text
先写一个能跑的万能 agent
```
