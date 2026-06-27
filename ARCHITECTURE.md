# Matrix Codex Capability Runtime：整体架构与 MVP 规划

> 版本：2026-06-27  
> 建议放置路径：`docs/architecture/matrix-codex-capability-runtime.md` 或项目根目录 `MATRIX_CODEX_CAPABILITY_RUNTIME_ARCHITECTURE.md`  
> 设计目标：用 Matrix 承载协作和审计，用 TypeScript Runtime 承载任务状态、能力路由、权限、proof、memory，用 Codex 承载工程执行。

---

## 0. 结论

推荐方案：

```text
Matrix = 协作协议 + 审计时间线 + 人类审批界面
TypeScript Runtime = 真正的 Agent OS 内核
Codex = 工程执行 worker
GitHub = 代码产物、PR、CI、merge gate
Capability Registry = AI-native 能力目录
Proof Ledger = accountability layer
Memory Proposal = 受控学习闭环
```

不要把系统做成：

```text
公司部门树
CEO Agent
VP Agent
Manager Agent
Worker Agent
```

应该做成：

```text
Intent
→ Task Graph
→ Capability Routing
→ Work Cell
→ Artifact
→ Proof
→ Verification
→ Human Gate
→ Memory Proposal
```

TypeScript 可以作为主语言，尤其适合：

```text
Matrix Application Service
Runtime API
event schema validation
capability router
Codex SDK integration
worker orchestration
GitHub integration
OpenTelemetry instrumentation
```

但不要求所有东西都用 TypeScript。少量 Python 可以保留在：

```text
兼容现有 codex-multica 的 validator / scripts
一次性迁移脚本
轻量数据清洗脚本
安全扫描 glue script
```

第一阶段不要追求“自进化 agent”。先追求：

```text
任务可结构化
权限可收缩
执行可隔离
输出可验证
失败可复盘
经验可审批后沉淀
```

---

## 1. 背景依据

### 1.1 Matrix 适合做什么

Matrix 规范把 Matrix 定义为一种通过 homeserver、room、event 同步 JSON 对象的开放通信协议。Matrix 支持自定义 event type，非官方 event type 应使用类似 Java package naming convention 的反向域名命名，例如 `com.example.event`。

Matrix Application Service 是被动组件：

```text
可以观察 homeserver 推送的事件
可以向自己参与的房间注入事件
不能阻止事件发送
不能修改原始事件内容
```

因此 Matrix 应作为：

```text
协作层
审计时间线
人工审批界面
agent check-in 层
```

不应作为：

```text
任务状态数据库
权限决策引擎
worker 生命周期管理器
proof 原始日志存储
secret 管理系统
```

参考：

- Matrix v1.18 Application Service API: https://spec.matrix.org/v1.18/application-service-api/
- Matrix v1.18 custom event type / namespaced identifier: https://spec.matrix.org/v1.18/appendices/#common-namespaced-identifier-grammar
- Matrix architecture overview: https://spec.matrix.org/v1.18/

### 1.2 Codex 适合做什么

Codex 适合作为工程执行 worker，而不是公司级总控 agent。

MVP 阶段优先使用：

```bash
codex exec --json --sandbox workspace-write --output-schema ./schemas/codex/repo_patch_result.schema.json -
```

后续需要持续线程、resume、streamed events、产品内深度集成时，再切换到 Codex SDK。

Codex SDK 官方 TypeScript library 用于服务端应用，要求 Node.js 18+，适合在自研 runtime 中程序化控制 Codex。Codex CLI / SDK 支持 JSONL 事件流，这适合把 worker 执行过程写入 proof ledger。

参考：

- Codex SDK: https://developers.openai.com/codex/sdk
- Codex non-interactive mode: https://developers.openai.com/codex/noninteractive
- Codex SDK TypeScript README: https://github.com/openai/codex/blob/main/sdk/typescript/README.md

### 1.3 codex-multica 可复用什么

现有仓库 `Notyet1307/codex-multica` 当前定位是 Codex + Multica + GitHub 的 agent operating template，不是完整 frontend / backend / database / auth / production runtime。它已经有以下可复用资产：

```text
AGENTS.md                    → repo-wide durable operating rules
.agents/skills/              → skill source templates
.github/workflows/           → CI / review / CodeQL / readiness patterns
.github/codex/prompts/       → Codex prompt references
multica/agents.yaml          → agent/capability seed catalog
multica/squads.yaml          → narrowest competent owner routing idea
multica/issue-template.md    → structured intake template
scripts/                     → readiness and validation scripts
```

迁移时不要把 Multica runtime 迁过来，而是把里面的规则、prompt、issue template、proof / handoff 模式迁移到 Matrix Runtime。

参考：

- Repo: https://github.com/Notyet1307/codex-multica
- README 中的 package contents / dogfood loop / minimal operating rule
- `AGENTS.md` 中的 durable operating manual 思路
- `multica/agents.yaml` 中的 agent capability seed

### 1.4 Superpowers 可以参考什么

Superpowers 最新检查版本：`v6.0.3`，GitHub 显示 latest release 时间为 2026-06-18。

Superpowers 的核心不是“更长 prompt”，而是：

```text
skills as mandatory workflows
brainstorm → spec → plan → implementation
git worktree isolation
TDD
fresh subagent per task
review after each task
final branch review
progress ledger
file-based handoff
verification before completion
```

这些设计非常适合迁移到 Matrix Codex Runtime，但要转译成 runtime-enforced workflow，而不是只靠 prompt 约束。

参考：

- Superpowers repo: https://github.com/obra/Superpowers
- Superpowers v6.0.3 release: https://github.com/obra/superpowers/releases/tag/v6.0.3
- `writing-plans`: https://raw.githubusercontent.com/obra/Superpowers/main/skills/writing-plans/SKILL.md
- `subagent-driven-development`: https://raw.githubusercontent.com/obra/Superpowers/main/skills/subagent-driven-development/SKILL.md
- `test-driven-development`: https://raw.githubusercontent.com/obra/Superpowers/main/skills/test-driven-development/SKILL.md
- Superpowers article: https://blog.fsck.com/2025/10/09/superpowers/

---

## 2. 产品语言

本系统不要使用传统公司组织语言。建议统一使用下面这些对象。

| 术语 | 定义 | 不要混淆为 |
|---|---|---|
| Workspace | 一个隔离的业务 / 项目边界 | 公司大脑 |
| Room | Matrix 中的人机协作和审计空间 | 数据库 / 队列 |
| Intent | 人类、cron、webhook、GitHub 事件输入的目标 | 聊天消息 |
| Task | 可执行、可跟踪、可验证的工作单元 | 随口需求 |
| Task Graph | Runtime 编译出的任务 DAG | 部门转派流程 |
| Capability | 一项可调用能力，带输入、输出、权限、proof 要求 | agent 岗位 |
| Work Cell | 一次临时执行环境，绑定任务、上下文、权限、预算 | 长期员工 |
| Worker | Codex / verifier / browser / scanner 等执行器 | 自治部门 |
| Artifact | 代码、patch、PR、报告、日志等产物 | agent 回复 |
| Proof | 证明工作完成的证据链 | 口头总结 |
| Verifier | 独立检查 proof / artifact 的能力 | 主管 |
| Approval | 人类或 policy 对高风险动作的批准 | 聊天确认 |
| Memory Proposal | agent 提出的经验沉淀建议 | 自动改记忆 |
| Capability Version | 能力定义、prompt、skills、policy 的可回滚版本 | agent 自我进化 |

一句话原则：

```text
Agent 不重要，Capability 重要。
Prompt 不重要，Proof 重要。
部门不重要，Task Graph 重要。
聊天不重要，Provenance 重要。
自动化不重要，可控自治重要。
```

---

## 3. 总体架构

```text
┌─────────────────────────────────────────────────────────────┐
│ Inputs                                                       │
│ Human / Matrix message / GitHub webhook / Cron / CI alert    │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Matrix Homeserver                                            │
│ rooms, custom events, approvals, visible audit timeline       │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Matrix Application Service Gateway                           │
│ hs_token verification, event ingestion, schema validation,    │
│ idempotency, Matrix reply projection                          │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ TypeScript Runtime Orchestrator                              │
│ task lifecycle, graph compiler, router, policy, queue,        │
│ approvals, proof ledger, memory proposal, replay              │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Capability Registry                                          │
│ spec.scope, repo.patch.codex, ci.recovery, security.review,   │
│ proof.verify, memory.propose                                 │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Work Cell Runtime                                            │
│ isolated worktree/container, context pack, policy envelope,   │
│ validation commands, timeout, budget                          │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Worker Pool                                                  │
│ Codex exec / Codex SDK / verifier / memory curator / scanner  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Artifact + Proof Layer                                       │
│ patch, branch, PR, test logs, CI URLs, diff, risk, rollback   │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ Approval + Memory Layer                                      │
│ Matrix approval event, GitHub PR review, memory proposal      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. TypeScript 主语言方案

### 4.1 为什么 TypeScript 合适

TypeScript 适合作为主语言，原因是：

```text
1. Codex SDK 官方 TypeScript 支持服务端集成。
2. Matrix AppService / bot / HTTP gateway 生态可以直接用 Node.js 实现。
3. JSON event / schema / CloudEvents / webhook / GitHub API 都是 TypeScript 友好场景。
4. Runtime 主要瓶颈是 I/O、队列、外部 worker、GitHub、Matrix、Codex，不是 CPU 密集计算。
5. TS 类型系统适合把 Task、Capability、Proof、Policy 建成可维护的数据契约。
```

TypeScript 不代表所有东西都必须在一个 Node 进程里。建议：

```text
核心 runtime：TypeScript
worker orchestration：TypeScript
validator：TypeScript + Ajv/Zod
少量历史脚本：Python 可保留
未来高性能隔离 runner：可用 Rust/Go 重写
```

### 4.2 推荐 TypeScript 基础栈

| 层 | 推荐 | 说明 |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo / Nx | MVP 可只用 pnpm workspaces |
| Runtime API | Fastify / Hono | 比 NestJS 更轻，适合 runtime core |
| Type system | TypeScript strict | 所有 package 开启 strict |
| Event validation | JSON Schema + Ajv | Matrix / proof / capability contract |
| Internal DTO | Zod | API 边界和开发体验好 |
| DB access | Kysely / Drizzle / node-postgres | 不建议早期用过重 ORM |
| Queue | BullMQ + Redis | MVP 简单可靠 |
| Workflow v1 | Temporal TypeScript SDK | 长任务、暂停、恢复、retry 升级方向 |
| Object storage | MinIO / S3 | logs、patch、review package、proof raw data |
| Observability | OpenTelemetry JS | trace_id 贯穿 Matrix → Runtime → Worker |
| GitHub | Octokit / GitHub CLI | PR、checks、comments、workflow status |
| Matrix AS | Fastify direct implementation 或 matrix-appservice-bridge | 先 direct 更可控 |

### 4.3 不建议 MVP 采用的技术

MVP 阶段先不要引入：

```text
Temporal
OPA
OpenFGA
Kubernetes operator
Firecracker
A2A
full MCP mesh
multi-tenant billing
advanced web UI
```

这些可以在 v1/v2 加。

---

## 5. 推荐仓库结构

```text
/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── matrix-appservice/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── routes/matrix-transactions.ts
│   │   │   ├── matrix/send-event.ts
│   │   │   └── validation/verify-hs-token.ts
│   │   └── appservice-registration.yaml.example
│   ├── runtime-api/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── tasks/
│   │   │   ├── approvals/
│   │   │   └── health/
│   │   └── package.json
│   └── worker-runner/
│       ├── src/
│       │   ├── index.ts
│       │   ├── codex-exec.ts
│       │   ├── worktree.ts
│       │   └── log-capture.ts
│       └── package.json
├── packages/
│   ├── event-contracts/
│   ├── db/
│   ├── capability-router/
│   ├── policy-engine/
│   ├── proof-ledger/
│   ├── matrix-events/
│   ├── github-integration/
│   └── telemetry/
├── runtime/
│   ├── capabilities.yaml
│   ├── policies/
│   │   ├── default.yaml
│   │   ├── repo-patch.yaml
│   │   └── security-review.yaml
│   ├── workflows/
│   │   ├── repo-patch.yaml
│   │   ├── ci-recovery.yaml
│   │   └── memory-proposal.yaml
│   ├── prompts/
│   │   ├── controller.md
│   │   ├── codex-scoper.md
│   │   ├── codex-repo-patch.md
│   │   ├── codex-ci-recovery.md
│   │   ├── proof-verifier.md
│   │   └── memory-curator.md
│   └── skills/
│       ├── using-skills/SKILL.md
│       ├── writing-plans/SKILL.md
│       ├── tdd/SKILL.md
│       ├── systematic-debugging/SKILL.md
│       ├── verification-before-completion/SKILL.md
│       ├── proof-handoff/SKILL.md
│       └── memory-proposal/SKILL.md
├── schemas/
│   ├── matrix/
│   │   ├── task.created.schema.json
│   │   ├── task.accepted.schema.json
│   │   ├── proof.submitted.schema.json
│   │   ├── approval.requested.schema.json
│   │   └── approval.granted.schema.json
│   ├── capability/
│   │   └── capability.schema.json
│   ├── codex/
│   │   └── repo_patch_result.schema.json
│   └── proof/
│       └── proof_ledger_entry.schema.json
├── workers/
│   ├── codex-exec-worker/
│   ├── verifier-worker/
│   └── memory-curator-worker/
├── mcp/
│   ├── repo-mcp/
│   ├── github-mcp/
│   └── memory-mcp/
├── infra/
│   ├── docker-compose.yml
│   ├── synapse/
│   ├── postgres/
│   ├── redis/
│   └── minio/
├── docs/
│   ├── architecture/
│   │   └── matrix-codex-capability-runtime.md
│   ├── events.md
│   ├── proof-loop.md
│   ├── security-model.md
│   ├── mvp-plan.md
│   └── superpowers-inspired-workflows.md
└── scripts/
    ├── validate-schemas.ts
    ├── seed-capabilities.ts
    ├── create-matrix-rooms.ts
    ├── run-codex-worker.ts
    └── check-runtime-ready.ts
```

---

## 6. Matrix 房间设计

MVP 不建议每个任务一个房间。先用固定房间 + task_id / trace_id 关联。

```text
#agent-control      workspace 级控制、配置变更、人工命令
#agent-intake       人类创建任务
#agent-runtime      runtime 状态事件
#agent-proof        proof 摘要与 artifact 引用
#agent-approvals    人类审批
#agent-memory       memory update proposal
#agent-incidents    失败、越权、超时、回滚
```

房间原则：

```text
1. Matrix 房间只放人类可读摘要和结构化 event。
2. 原始日志、diff、review package、worker stdout 不直接塞进 Matrix。
3. 大对象放 object storage，Matrix event 只放 URI、hash、summary。
4. 所有 Matrix event 都要有 task_id、run_id、trace_id。
5. 所有自定义 event type 使用 com.notyet.agent.* 命名空间。
```

---

## 7. Matrix Event Contract

### 7.1 Event namespace

```text
com.notyet.agent.task.created
com.notyet.agent.task.accepted
com.notyet.agent.task.rejected
com.notyet.agent.task.scoped
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

### 7.2 CloudEvents-style envelope

Matrix event `content` 使用 CloudEvents 风格 envelope：

```json
{
  "specversion": "1.0",
  "id": "evt_01j...",
  "source": "matrix://notyet.local/#agent-intake/$matrixEventId",
  "type": "com.notyet.agent.task.created",
  "subject": "task_20260627_001",
  "time": "2026-06-27T12:00:00+09:00",
  "datacontenttype": "application/json",
  "data": {}
}
```

### 7.3 task.created 示例

```json
{
  "type": "com.notyet.agent.task.created",
  "content": {
    "specversion": "1.0",
    "id": "evt_01jz...",
    "source": "matrix://notyet.local/#agent-intake/$abc",
    "type": "com.notyet.agent.task.created",
    "subject": "task_20260627_001",
    "time": "2026-06-27T12:00:00+09:00",
    "data": {
      "workspace_id": "dogfood",
      "title": "Fix failing readiness check",
      "goal": "Diagnose and fix the failing readiness check in the repository.",
      "context": {
        "repo": "git@github.com:Notyet1307/codex-multica.git",
        "base_branch": "main",
        "links": []
      },
      "scope": {
        "allowed_paths": ["scripts/**", "tests/**", ".github/workflows/**"],
        "forbidden_paths": ["secrets/**", ".env", "production/**"]
      },
      "acceptance_criteria": [
        "root cause identified",
        "minimal patch produced",
        "make verify passes or blocker is explained with proof",
        "risk and rollback notes included",
        "no merge, no direct push to main"
      ],
      "suggested_capability": "ci.recovery",
      "risk": "medium"
    }
  }
}
```

### 7.4 proof.submitted 示例

```json
{
  "type": "com.notyet.agent.proof.submitted",
  "content": {
    "specversion": "1.0",
    "id": "evt_01jz...",
    "source": "runtime://proof-ledger",
    "type": "com.notyet.agent.proof.submitted",
    "subject": "task_20260627_001",
    "time": "2026-06-27T12:35:00+09:00",
    "data": {
      "task_id": "task_20260627_001",
      "run_id": "run_01jz...",
      "proof_id": "proof_01jz...",
      "artifact_refs": [
        {
          "type": "git_diff",
          "uri": "s3://agent-runs/run_01jz/diff.patch",
          "sha256": "..."
        }
      ],
      "validation": [
        {
          "name": "make verify",
          "status": "passed",
          "exit_code": 0,
          "log_ref": "s3://agent-runs/run_01jz/make-verify.log"
        }
      ],
      "risk_notes": ["No production secrets touched", "No deployment change"],
      "rollback_notes": ["Revert branch task_20260627_001"],
      "requires_human_approval": true
    }
  }
}
```

---

## 8. Runtime 状态机

### 8.1 Task states

```text
created
→ accepted
→ intake_validated
→ scoped
→ graph_compiled
→ capability_selected
→ policy_checked
→ dispatched
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
failed
cancelled
policy_denied
verification_failed
approval_denied
needs_human_input
```

### 8.2 Work cell states

```text
created
→ context_mounted
→ sandbox_ready
→ worker_started
→ worker_streaming
→ worker_completed
→ proof_generated
→ cleaned_up
```

### 8.3 核心原则

```text
1. Matrix event 触发 Runtime，但 Runtime state 以 Postgres 为准。
2. Runtime event 必须幂等。
3. 每个 worker run 必须有 run_id。
4. 每个外部副作用必须经过 policy decision。
5. 每个 high-risk action 必须进入 approval gate。
6. 每个 completed task 必须有 proof_id。
```

---

## 9. Capability Registry

### 9.1 Capability 替代部门

不要定义：

```text
Engineering Department Agent
Security Department Agent
Release Department Agent
```

应该定义：

```text
spec.scope
repo.patch.codex
ci.recovery
security.review
proof.verify
memory.propose
release.notes
```

### 9.2 MVP capabilities

```yaml
capabilities:
  - id: spec.scope
    display_name: Spec Scoping
    worker_type: llm
    risk_level: low
    description: Turn ambiguous Matrix intake into a structured task spec.
    output_schema: schemas/codex/scoped_task.schema.json
    permissions:
      allow: [read_task, read_memory]
      deny: [repo.write, git.push, pr.merge, deploy.run, secret.read]
    proof_required:
      - clarified_goal
      - constraints
      - acceptance_criteria
      - open_questions

  - id: repo.patch.codex
    display_name: Codex Repo Patch
    worker_type: codex_exec
    risk_level: medium
    description: Produce a minimal code patch in an isolated worktree.
    input_schema: schemas/codex/repo_patch_input.schema.json
    output_schema: schemas/codex/repo_patch_result.schema.json
    permissions:
      allow: [repo.read, worktree.write, test.run, patch.create]
      deny: [main.push, pr.merge, deploy.run, secret.read, external.write]
    proof_required:
      - root_cause
      - changed_files
      - commands_run
      - validation_results
      - risk_notes
      - rollback_notes
    required_skills:
      - using-skills
      - writing-plans
      - tdd
      - verification-before-completion
      - proof-handoff
    verifier: proof.verify
    human_gate:
      required_for: [pr.create, merge, deploy, security_exception]

  - id: ci.recovery
    display_name: CI Recovery
    worker_type: codex_exec
    risk_level: medium
    description: Diagnose failing CI and produce minimal patch or blocker proof.
    permissions:
      allow: [repo.read, worktree.write, test.run, ci.read]
      deny: [main.push, pr.merge, deploy.run, secret.read]
    required_skills:
      - systematic-debugging
      - verification-before-completion
      - proof-handoff

  - id: security.review
    display_name: Security Review
    worker_type: codex_exec
    risk_level: high
    description: Review diff for secrets, authz mistakes, injection, dependency risks.
    permissions:
      allow: [repo.read, diff.read, scanner.run]
      deny: [repo.write, main.push, pr.merge, deploy.run, secret.read]
    proof_required:
      - findings
      - severity_rationale
      - file_line_refs
      - scanner_logs
      - false_positive_notes

  - id: proof.verify
    display_name: Proof Verification
    worker_type: verifier
    risk_level: low
    description: Check artifact and proof consistency before approval.
    permissions:
      allow: [artifact.read, proof.read, logs.read]
      deny: [repo.write, git.push, pr.merge, deploy.run]

  - id: memory.propose
    display_name: Memory Proposal
    worker_type: llm
    risk_level: low
    description: Propose scoped memory updates based on approved proof.
    permissions:
      allow: [proof.read, memory.propose]
      deny: [memory.write_live, repo.write, pr.merge]
```

---

## 10. Superpowers-inspired prompt / workflow 设计

### 10.1 参考原则

Superpowers 的可借鉴部分应该变成 runtime contract：

| Superpowers 模式 | 本系统转译 |
|---|---|
| skills mandatory | capability 声明 required_skills，Runtime 注入 skill refs |
| brainstorm → plan → implement | intake → scope → graph compile → worker run |
| git worktree | Work Cell 创建隔离 worktree/container |
| TDD | behavior change task 默认要求 test-first 或说明例外 |
| fresh subagent per task | 每个 graph node 启动 fresh work cell |
| review after each task | 每个 artifact 经过 verifier capability |
| final branch review | PR 前 proof.verify + security.review |
| progress ledger | Postgres task_node ledger + object store report |
| file handoff | task brief / diff / report 用 artifact refs，不粘贴大文本 |
| verification before completion | completed 前必须有 commands_run + exit_code + proof |

### 10.2 Skill 不是 prompt 糖衣

不要只在 system prompt 里写：

```text
Please use skills.
```

应该做成：

```text
Capability.required_skills
→ Runtime resolves skill files
→ Prompt includes skill manifest + exact paths
→ Worker must declare used_skills in final JSON
→ Proof verifier checks required skill contract fields
```

### 10.3 Runtime skill layout

```text
runtime/skills/
├── using-skills/SKILL.md
├── writing-plans/SKILL.md
├── tdd/SKILL.md
├── systematic-debugging/SKILL.md
├── verification-before-completion/SKILL.md
├── proof-handoff/SKILL.md
└── memory-proposal/SKILL.md
```

每个 `SKILL.md` 建议结构：

```yaml
---
id: tdd
version: 0.1.0
when_to_use:
  - feature implementation
  - bug fix
  - behavior change
required_outputs:
  - failing_test_command
  - failing_test_result
  - passing_test_command
  - passing_test_result
exceptions_require:
  - human_approval_or_explicit_rationale
---
```

正文：

```markdown
# TDD Skill

## Contract
For behavior changes, prove RED before GREEN unless the task explicitly qualifies for an exception.

## Required proof fields
- red_test_command
- red_test_exit_code
- red_test_failure_summary
- green_test_command
- green_test_exit_code
- green_test_summary

## Stop conditions
- Cannot write a meaningful test
- Test environment unavailable
- Behavior is not specified
```

### 10.4 Prompt 分层

不要做一个巨大 prompt。建议分四层。

```text
base runtime prompt
capability prompt
task brief
required skills
```

#### A. Base Runtime Prompt

所有 worker 共享：

```markdown
You are a scoped worker inside Matrix Codex Capability Runtime.

You do not own the task. The Runtime owns the task state.
You do not own permissions. The Work Cell permission envelope defines allowed actions.
You do not decide completion. Proof and verification decide completion.

You must:
1. Stay within allowed paths and allowed actions.
2. Use the required skills listed in the task brief.
3. Produce only the requested artifact.
4. Produce structured proof matching the output schema.
5. Stop and report BLOCKED when constraints prevent safe completion.

You must not:
1. Push main.
2. Merge PRs.
3. Deploy.
4. Read production secrets.
5. Expand scope without approval.
6. Hide failing tests.
7. Claim completion without proof.
```

#### B. Capability Prompt

例如 `runtime/prompts/codex-ci-recovery.md`：

```markdown
# Capability: ci.recovery

Goal: diagnose a failing CI or local verification failure and produce the smallest safe patch.

Operating mode:
1. Read task brief.
2. Read repo AGENTS.md.
3. Read required skills.
4. Inspect CI logs or local failure.
5. Identify root cause.
6. Create minimal patch.
7. Run validation commands.
8. Produce proof JSON.

Stop instead of guessing when:
- Required logs are missing.
- Failure cannot be reproduced.
- Fix requires secrets or production access.
- Fix requires changing forbidden paths.
- Validation environment is unavailable.
```

#### C. Task Brief

由 Runtime 生成：

```markdown
# Task Brief: task_20260627_001

## Goal
Diagnose and fix the failing readiness check.

## Context
- Repo: git@github.com:Notyet1307/codex-multica.git
- Base branch: main
- Matrix event: $eventid
- Related proof refs: none

## Constraints
- Allowed paths: scripts/**, tests/**, .github/workflows/**
- Forbidden paths: .env, secrets/**, production/**
- No direct push to main
- No merge
- No deployment

## Required Skills
- systematic-debugging
- verification-before-completion
- proof-handoff

## Definition of Done
- Root cause identified
- Minimal patch produced
- `make verify` passes, or blocker is reported with evidence
- Risk notes included
- Rollback notes included
- Proof JSON matches schema

## Output Schema
schemas/codex/repo_patch_result.schema.json
```

#### D. Final output contract

```json
{
  "status": "DONE | DONE_WITH_CONCERNS | BLOCKED | FAILED",
  "task_id": "task_...",
  "used_skills": ["systematic-debugging", "verification-before-completion"],
  "root_cause": "string",
  "changes_made": ["string"],
  "files_changed": ["string"],
  "commands_run": [
    {
      "command": "make verify",
      "exit_code": 0,
      "summary": "string",
      "log_ref": "object://..."
    }
  ],
  "diff_summary": {
    "additions": 0,
    "deletions": 0
  },
  "risk_notes": ["string"],
  "rollback_notes": ["string"],
  "memory_update_proposals": ["string"],
  "ready_for_review": true
}
```

### 10.5 不直接照搬 Superpowers 的地方

Superpowers 是 agent-side methodology。本系统是 product runtime。因此：

```text
Superpowers 的“agent 自觉使用 skill”
→ Runtime 强制绑定 required skills

Superpowers 的“.superpowers/sdd/progress.md”
→ Postgres task_node ledger + object storage reports

Superpowers 的“subagent dispatch”
→ Work Cell dispatch

Superpowers 的“reviewer subagent”
→ proof.verify capability

Superpowers 的“final branch review”
→ PR proof + security review + human gate

Superpowers 的“skill self-improvement”
→ memory.update.proposed + eval + human approval
```

---

## 11. 数据模型

MVP Postgres 表：

```sql
create table workspaces (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table matrix_rooms (
  id text primary key,
  workspace_id text not null references workspaces(id),
  room_id text not null unique,
  alias text,
  purpose text not null
);

create table matrix_events (
  id text primary key,
  workspace_id text not null references workspaces(id),
  matrix_event_id text not null unique,
  room_id text not null,
  sender text not null,
  event_type text not null,
  content jsonb not null,
  received_at timestamptz not null default now(),
  validation_status text not null
);

create table tasks (
  id text primary key,
  workspace_id text not null references workspaces(id),
  title text not null,
  goal text not null,
  status text not null,
  risk_level text not null,
  source_matrix_event_id text references matrix_events(id),
  trace_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_nodes (
  id text primary key,
  task_id text not null references tasks(id),
  capability_id text not null,
  status text not null,
  depends_on text[] not null default '{}',
  input jsonb not null,
  output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table work_cells (
  id text primary key,
  task_id text not null references tasks(id),
  task_node_id text not null references task_nodes(id),
  capability_id text not null,
  worker_type text not null,
  status text not null,
  worktree_path text,
  sandbox_profile text not null,
  permission_envelope jsonb not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table worker_runs (
  id text primary key,
  work_cell_id text not null references work_cells(id),
  worker_type text not null,
  command text,
  status text not null,
  stdout_ref text,
  stderr_ref text,
  jsonl_ref text,
  final_output jsonb,
  exit_code int,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table artifacts (
  id text primary key,
  task_id text not null references tasks(id),
  run_id text references worker_runs(id),
  artifact_type text not null,
  uri text not null,
  sha256 text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table proof_entries (
  id text primary key,
  task_id text not null references tasks(id),
  run_id text references worker_runs(id),
  proof jsonb not null,
  verification_status text not null,
  created_at timestamptz not null default now()
);

create table approvals (
  id text primary key,
  task_id text not null references tasks(id),
  requested_action text not null,
  status text not null,
  requested_event_id text references matrix_events(id),
  decision_event_id text references matrix_events(id),
  approved_by text,
  conditions jsonb not null default '[]',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table memory_proposals (
  id text primary key,
  task_id text not null references tasks(id),
  scope text not null,
  proposed_updates jsonb not null,
  evidence_proof_id text references proof_entries(id),
  status text not null,
  created_at timestamptz not null default now()
);
```

---

## 12. Policy / Permission 模型

### 12.1 MVP YAML policy

```yaml
version: 0.1.0

default_deny:
  - main.push
  - pr.merge
  - deploy.run
  - secret.read
  - external.write
  - production.data.read

capabilities:
  repo.patch.codex:
    allow:
      - repo.read
      - worktree.write
      - test.run
      - patch.create
    deny:
      - main.push
      - pr.merge
      - deploy.run
      - secret.read
    approval_required:
      - pr.create

  security.review:
    allow:
      - repo.read
      - diff.read
      - scanner.run
    deny:
      - repo.write
      - git.push
      - pr.merge
      - deploy.run
      - secret.read
```

### 12.2 未来升级

v1/v2 可引入：

```text
OPA       policy as code
OpenFGA   workspace/repo/task/tool 细粒度授权
Vault     short-lived secret broker
gVisor / Firecracker / Kubernetes Job  worker isolation
SPIFFE/SPIRE workload identity
```

参考：

- OPA: https://openpolicyagent.org/
- OpenFGA: https://openfga.dev/

---

## 13. Proof Ledger

### 13.1 Proof 原则

```text
agent output 是主观陈述
artifact 是可检查产物
proof 是完成证据
verification 是独立确认
approval 是责任转移
```

### 13.2 Proof 必填字段

```text
task_id
run_id
worker_id
capability_id
artifact_refs
changed_files
diff_summary
commands_run
exit_codes
log_refs
ci_urls
risk_notes
rollback_notes
used_skills
policy_decisions
human_approval_refs
```

### 13.3 Proof schema 示例

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://notyet.local/schemas/proof/repo_patch_proof.json",
  "type": "object",
  "required": [
    "task_id",
    "run_id",
    "capability_id",
    "status",
    "artifact_refs",
    "commands_run",
    "risk_notes",
    "rollback_notes"
  ],
  "properties": {
    "task_id": { "type": "string" },
    "run_id": { "type": "string" },
    "capability_id": { "type": "string" },
    "status": { "enum": ["DONE", "DONE_WITH_CONCERNS", "BLOCKED", "FAILED"] },
    "used_skills": { "type": "array", "items": { "type": "string" } },
    "artifact_refs": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "uri", "sha256"],
        "properties": {
          "type": { "type": "string" },
          "uri": { "type": "string" },
          "sha256": { "type": "string" }
        }
      }
    },
    "commands_run": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["command", "exit_code", "summary", "log_ref"],
        "properties": {
          "command": { "type": "string" },
          "exit_code": { "type": "integer" },
          "summary": { "type": "string" },
          "log_ref": { "type": "string" }
        }
      }
    },
    "risk_notes": { "type": "array", "items": { "type": "string" } },
    "rollback_notes": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## 14. Memory 设计

### 14.1 不做 Workspace Brain，做 Context Graph

Memory 不应是一团聊天摘要。应拆成：

```text
facts
rules
decisions
examples
failure_modes
security_constraints
validation_commands
run_traces
artifact_refs
ownership
```

每条 memory 必须有：

```text
scope
source
evidence_ref
confidence
created_at
expires_at
owner
approved_by
related_capabilities
```

### 14.2 Memory update 只能 proposal

禁止：

```text
agent 自动改 AGENTS.md
agent 自动改 live prompt
agent 自动改 capability policy
agent 自动扩大权限
```

允许：

```text
memory.update.proposed
→ human review
→ PR patch to AGENTS.md/docs/runtime/skills
→ CI validates
→ human final merge
```

### 14.3 Memory proposal 示例

```json
{
  "task_id": "task_20260627_001",
  "scope": "repo:codex-matrix-runtime",
  "proposed_updates": [
    {
      "target": "AGENTS.md",
      "statement": "Readiness checks must include shell syntax validation before workflow validation.",
      "reason": "The failing CI was caused by invalid shell syntax that was not caught before workflow execution.",
      "evidence_ref": "proof_01jz..."
    }
  ],
  "requires_human_approval": true
}
```

---

## 15. MVP 规划

### MVP 目标

跑通一个真实工程闭环：

```text
Matrix task.created
→ TypeScript Runtime 接收并校验
→ capability router 选择 ci.recovery / repo.patch.codex
→ 创建隔离 worktree
→ Codex 执行 patch
→ 运行验证命令
→ 生成 proof
→ verifier 检查
→ Matrix 请求 human approval
→ 创建 PR
→ GitHub checks
→ human final merge
→ memory proposal
```

### MVP 非目标

```text
不做完整 web app
不做多租户计费
不做生产部署自动化
不做 agent 自动 merge
不做自动更新 live memory
不做跨组织 federation
不做 A2A
不做 full MCP ecosystem
不做 self-evolving prompt
```

---

## 16. MVP Milestones

### Milestone 0：架构与契约冻结

产物：

```text
docs/architecture/matrix-codex-capability-runtime.md
schemas/matrix/*.json
schemas/proof/*.json
runtime/capabilities.yaml
runtime/policies/default.yaml
runtime/workflows/repo-patch.yaml
runtime/workflows/ci-recovery.yaml
```

验收：

```text
1. task lifecycle 明确。
2. event type 明确。
3. capability schema 明确。
4. proof schema 明确。
5. high-risk action 有 human gate。
6. 所有 schema 可通过 pnpm validate:schema。
```

### Milestone 1：Matrix AppService Gateway

产物：

```text
apps/matrix-appservice
appservice-registration.yaml.example
packages/matrix-events
packages/event-contracts
```

功能：

```text
1. 接收 /_matrix/app/v1/transactions/{txnId}。
2. 验证 Authorization Bearer hs_token。
3. 按 txnId + event_id 幂等去重。
4. 校验 com.notyet.agent.* event schema。
5. 写入 matrix_events。
6. 创建 task。
7. 发送 task.accepted 或 task.rejected 到 #agent-runtime。
```

验收：

```text
在 #agent-intake 发 task.created，DB 创建 task，#agent-runtime 出现 task.accepted。
重复 event 不重复创建 task。
非法 schema 被拒绝并给出可读错误。
```

### Milestone 2：Capability Router + Task Graph Compiler

产物：

```text
packages/capability-router
runtime/capabilities.yaml
runtime/workflows/ci-recovery.yaml
```

功能：

```text
1. 从 task goal/context/scope/risk 选择 capability。
2. 编译 task graph。
3. 生成 task_node。
4. 生成 work_cell spec。
5. 生成 worker task brief。
```

验收：

```text
一个 CI 修复任务能编译成：
intake.validate → spec.scope → ci.recovery → repo.patch.codex → proof.verify → approval.request → memory.propose
```

### Milestone 3：Codex Exec Worker

产物：

```text
workers/codex-exec-worker
apps/worker-runner
schemas/codex/repo_patch_result.schema.json
```

功能：

```text
1. clone repo 或创建 worktree。
2. 挂载 AGENTS.md、task brief、required skills。
3. 调用 codex exec --json --sandbox workspace-write --output-schema。
4. 保存 stdout/stderr/jsonl 到 object storage。
5. 捕获 final JSON。
6. 生成 diff artifact。
```

验收：

```text
Codex 能对一个低风险 repo 任务生成 patch。
worker stdout JSONL 可追踪。
final output 符合 schema。
make verify 或指定命令结果被写入 proof。
```

### Milestone 4：Proof Ledger + Verifier

产物：

```text
packages/proof-ledger
workers/verifier-worker
schemas/proof/proof_ledger_entry.schema.json
```

功能：

```text
1. 保存 artifact refs。
2. 保存 validation logs。
3. 校验 proof schema。
4. 校验 required skills 是否出现。
5. 校验 required commands 是否有 exit_code。
6. 校验 forbidden paths 未被修改。
7. 向 #agent-proof 发布 proof.submitted。
```

验收：

```text
没有 proof 的 task 不能进入 waiting_approval。
proof 不完整时进入 verification_failed。
forbidden path change 被拒绝。
```

### Milestone 5：Approval Gate + GitHub PR

产物：

```text
packages/github-integration
packages/policy-engine
approval service
```

功能：

```text
1. Runtime 发布 approval.requested 到 #agent-approvals。
2. Human 发送 approval.granted。
3. Runtime 校验 approver 权限。
4. 创建 PR。
5. PR body 包含 task_id、proof_id、validation、risk、rollback。
6. merge 仍由 human 在 GitHub 完成。
```

验收：

```text
未经 approval 不创建 PR。
agent 无法 merge。
agent 无法 direct push main。
approval event 可追溯到 Matrix user。
```

### Milestone 6：Memory Proposal

产物：

```text
workers/memory-curator-worker
runtime/skills/memory-proposal/SKILL.md
schemas/matrix/memory.update.proposed.schema.json
```

功能：

```text
1. 从 approved proof 中提取可沉淀经验。
2. 生成 memory.update.proposed。
3. 每条 proposal 必须有 evidence_ref。
4. human approve 后才允许创建 docs/AGENTS patch。
```

验收：

```text
memory proposal 不会自动改 live rules。
每条 proposal 都有 scope 和 proof 引用。
```

---

## 17. 第一版开发顺序

建议实际编码顺序：

```text
1. pnpm workspace + TypeScript strict + lint/test
2. JSON schemas + Ajv validation
3. Postgres schema + migrations
4. Matrix AppService transaction endpoint
5. Matrix send event helper
6. task.created → task.accepted 闭环
7. capability router 静态选择
8. worktree manager
9. codex exec worker
10. artifact/log object storage
11. proof ledger
12. verifier
13. approval gate
14. GitHub PR create
15. memory proposal
```

---

## 18. 复用 codex-multica 的迁移清单

| 现有文件 | 新位置 | 迁移方式 |
|---|---|---|
| `AGENTS.md` | `AGENTS.md` + `runtime/prompts/base.md` | 保留 durable rules，拆出 runtime prompt |
| `.agents/skills/*` | `runtime/skills/*` | 作为 skill seed，重写 metadata 和 proof contract |
| `multica/agents.yaml` | `runtime/capabilities.yaml` | agent → capability |
| `multica/squads.yaml` | `runtime/router-policy.yaml` | squad routing → narrowest sufficient capability |
| `multica/issue-template.md` | `schemas/matrix/task.created.schema.json` + docs intake template | issue template → Matrix task schema |
| `multica/agent-system-prompts/*` | `runtime/prompts/*` | 复用 prompt 思路，去掉 Multica-specific language |
| `.github/workflows/*` | 保留 | GitHub checks / CodeQL / readiness 继续作为 proof gate |
| `scripts/validate_*` | `scripts/` 或迁移到 TS | 能迁就迁，短期可保留 Python |
| `docs/agents/*` | `docs/agents/*` + `runtime/skills/*` | 规则转成 skill / policy / proof docs |

---

## 19. 安全模型

### 19.1 MVP 默认禁止

```text
main.push
pr.merge
deploy.run
secret.read
production.data.read
external.write
permission.expand
memory.write_live
prompt.self_modify
```

### 19.2 Agent 允许做

```text
read repo
read task brief
read scoped memory
write isolated worktree
run local tests
create patch artifact
request PR creation
submit proof
propose memory update
```

### 19.3 Human 必须拥有

```text
product direction
architecture acceptance
security exception
production deployment
owner/admin bypass
final merge
live memory update approval
capability policy change approval
```

### 19.4 Matrix 安全边界

```text
1. Matrix event content 不可信。
2. 所有 custom event 必须 schema validation。
3. AppService 必须验证 hs_token。
4. event_id / txnId 必须幂等。
5. Matrix 不保存 secret。
6. Matrix 只保存 proof summary，不保存大日志和敏感原始内容。
7. MVP 不开放 federation，或只在明确需要时启用。
```

### 19.5 Synapse 许可注意

如果 MVP 使用 Synapse，需要注意当前 Element 维护的 Synapse 使用 AGPL 或商业许可。内部 dogfood 通常可接受，但如果产品化分发或作为 SaaS 运行修改版，需要单独评估许可和部署模式。

参考：

- Element Synapse GitHub: https://github.com/element-hq/synapse
- Element AGPL announcement: https://element.io/blog/element-to-adopt-agplv3/

---

## 20. Open-source 组件建议

### MVP 必选

| 能力 | 组件 |
|---|---|
| Matrix homeserver | Synapse / Element Synapse |
| AppService Gateway | TypeScript + Fastify |
| Schema validation | Ajv + JSON Schema |
| Runtime DB | Postgres |
| Queue | Redis + BullMQ |
| Object storage | MinIO / S3 |
| Codex worker | Codex CLI `exec` |
| GitHub integration | Octokit / GitHub CLI |
| Observability | OpenTelemetry |

### v1/v2 逐步引入

| 能力 | 组件 |
|---|---|
| Durable workflow | Temporal |
| Machine event bus | NATS / CloudEvents |
| Tool/context protocol | MCP |
| Policy as code | OPA |
| Fine-grained authorization | OpenFGA |
| Workload identity | SPIFFE / SPIRE |
| Sandboxing | gVisor / Firecracker / Kubernetes Jobs |
| Supply chain proof | in-toto / Sigstore / SLSA |

参考：

- MCP: https://modelcontextprotocol.io/docs/getting-started/intro
- Temporal: https://temporal.io/
- CloudEvents: https://cloudevents.io/
- OpenTelemetry: https://opentelemetry.io/
- JSON Schema: https://json-schema.org/

---

## 21. 成功指标

MVP 不用“agent 很聪明”衡量。

用这些指标：

```text
1. 任务结构化率：多少 task.created 能通过 intake schema。
2. 首次可执行率：多少任务不需要人类补充信息即可进入 worker。
3. Proof 完整率：多少 worker run 产生完整 proof。
4. Verification pass rate：多少 proof 被 verifier 一次通过。
5. Forbidden action block rate：越权动作是否真的被阻止。
6. Human approval clarity：审批人是否能根据 proof 判断风险。
7. Re-run success：失败任务能否用同一 task_id/trace_id 复盘和重跑。
8. Memory usefulness：memory proposal 是否减少重复错误。
9. Agent drift rate：worker 是否越做越偏，是否被 proof/policy 拉回。
```

---

## 22. 最小 Demo 场景

选择一个低风险 dogfood 任务：

```text
修复一个故意失败的 shell syntax check 或 README path validator。
```

完整流程：

```text
1. Human 在 #agent-intake 发 task.created。
2. Matrix AppService 接收事件。
3. Runtime 创建 task_001。
4. Router 选择 ci.recovery。
5. Work Cell 创建 branch worktree。
6. Codex 读取 task brief + AGENTS.md + skills。
7. Codex 运行 make verify，定位失败。
8. Codex 修改最小文件。
9. Codex 再跑 make verify。
10. Runtime 保存 logs、diff、JSONL。
11. Proof verifier 校验 proof。
12. #agent-proof 发布 proof.submitted。
13. #agent-approvals 请求 pr.create。
14. Human 批准。
15. Runtime 创建 GitHub PR。
16. GitHub checks 通过。
17. Human merge。
18. Runtime 生成 memory.update.proposed。
```

---

## 23. 未来演进路线

### v0：Matrix Codex MVP

```text
单 workspace
单 repo
task.created
Codex exec worker
proof ledger
human approval
GitHub PR
memory proposal
```

### v1：Durable Runtime

```text
Temporal
NATS / CloudEvents
MCP repo/github/memory tools
OpenTelemetry full traces
capability versioning
eval dataset
```

### v2：Policy + Enterprise Controls

```text
OPA
OpenFGA
secret broker
container sandbox
workspace isolation
audit export
RBAC / SSO
```

### v3：Capability Marketplace

```text
capability scoring
canary rollout
regression eval
third-party capability adapter
A2A / cross-workspace collaboration
```

---

## 24. 最终原则

```text
Matrix 是协议，不是大脑。
Codex 是 worker，不是公司。
Runtime 是产品内核。
Capability 是组织单位。
Work Cell 是执行单位。
Proof 是完成标准。
Memory Proposal 是进化入口。
Human Gate 是责任边界。
```

第一版只做一件事：

```text
让 Codex 通过 Matrix 接收工程任务，并在严格边界内产出可验证的 PR/proof。
```

只要这个闭环可靠，后续再逐步扩展到更多 capability，而不是扩展更多“AI 部门”。
