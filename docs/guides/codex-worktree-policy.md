# Codex Worktree Policy Addendum

> 建议放置路径：`docs/guides/codex-worktree-policy.md`  
> 适用项目：Matrix Codex Capability Runtime  
> 目的：规定 Codex 开发、测试、review、runtime worker 执行时的 git worktree 使用方式，避免任务互相污染、diff 混杂、状态不可追踪。

---

## 0. 结论

本项目要求：

```text
所有非文档型开发任务、测试任务、修复任务、重构任务、安全审查修复任务，默认必须在独立 git worktree 中完成。
```

例外：

```text
纯只读分析任务可以不创建 worktree。
纯文档任务可以在当前工作区完成，但推荐使用独立 docs 分支或 docs worktree。
紧急热修复可以跳过 worktree，但必须在 Handoff Back 中说明原因。
```

更精确的原则：

```text
Human-driven Codex session:
  可以让 Codex 创建或使用一个独立 worktree。

Runtime-driven Codex worker:
  不应让 Codex 自己决定 worktree 路径、分支和生命周期。
  Runtime / worker-runner 应先创建 worktree，再把 Codex 启动在该 worktree 内。
```

---

## 1. 为什么必须使用 worktree

worktree 不是安全沙箱，但它是开发隔离边界。

它解决的问题：

```text
1. 防止多个 Codex 任务互相污染同一个工作区。
2. 防止一个长任务把无关改动混进 diff。
3. 支持同一 repo 并行跑多个 Codex worker。
4. 方便按 task_id 追踪 branch、artifact、proof。
5. 方便失败后直接删除 worktree，而不破坏主工作区。
6. 方便 reviewer 对一个干净 diff 做审查。
7. 方便 Runtime 把 worktree_path、branch、base_sha 写入 proof ledger。
```

它不能解决的问题：

```text
1. 不能替代 Codex sandbox。
2. 不能替代权限控制。
3. 不能防止 secret 泄露。
4. 不能防止危险命令。
5. 不能替代 human approval。
```

所以本项目同时要求：

```text
git worktree isolation
+ Codex workspace-write sandbox
+ approval policy
+ allowed paths / forbidden paths
+ proof schema
+ human gate
```

---

## 2. 推荐 worktree 命名规范

### Branch 命名

```text
mcr/<task-id>/<short-slug>
```

示例：

```text
mcr/MCR-010/event-envelope-schema
mcr/MCR-050/codex-worker-runner
mcr/MCR-071/github-pr-approval-gate
```

### Worktree 路径

推荐放在 repo 同级目录：

```text
../.worktrees/<repo-name>/<task-id>-<short-slug>
```

示例：

```text
../.worktrees/matrix-codex-runtime/MCR-010-event-envelope-schema
```

不要放在：

```text
/tmp/random-path
~/Desktop/random-copy
repo/subdir/worktree
```

原因：proof ledger 需要稳定记录路径、branch、base_sha、cleanup 状态。

---

## 3. 标准创建命令

### 创建 worktree

```bash
git fetch origin
BASE_BRANCH="main"
TASK_ID="MCR-010"
SLUG="event-envelope-schema"
BRANCH="mcr/${TASK_ID}/${SLUG}"
WORKTREE="../.worktrees/$(basename "$PWD")/${TASK_ID}-${SLUG}"

git worktree add -b "$BRANCH" "$WORKTREE" "origin/${BASE_BRANCH}"
```

### 进入 worktree

```bash
cd "$WORKTREE"
```

### 验证 worktree 状态

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

### 删除完成后的 worktree

```bash
git worktree remove "$WORKTREE"
git worktree prune
```

---

## 4. Codex 交互式开发 Prompt 中必须包含的要求

每个实现类任务给 Codex 时，任务开头应包含：

```text
Worktree requirement:
- Do not modify the main checkout directly.
- Create or use a dedicated git worktree for this task.
- Branch name: mcr/<TASK_ID>/<short-slug>.
- Worktree path: ../.worktrees/<repo-name>/<TASK_ID>-<short-slug>.
- Make all code, test, schema, and fixture changes inside that worktree only.
- Do not touch unrelated files.
- Do not merge.
- Do not push to main.
- Include worktree path, branch name, base SHA, and changed files in Handoff Back.
```

如果 worktree 已由人类提前创建，则改成：

```text
Worktree requirement:
- Use the existing worktree: <WORKTREE_PATH>.
- Do not modify the original checkout.
- Confirm current branch and base SHA before editing.
- Make all changes only inside this worktree.
```

---

## 5. Runtime-driven worker 中的要求

Runtime worker 不应依赖 Codex 自己创建 worktree。MVP worker-runner 应该先创建 worktree，然后在该目录中执行 Codex。

推荐流程：

```text
1. Runtime receives task.
2. Runtime validates task schema.
3. Runtime computes branch name and worktree path.
4. Runtime creates worktree from base branch.
5. Runtime launches Codex with cwd = worktree_path.
6. Codex runs inside workspace-write sandbox.
7. Worker captures JSONL events, diff, logs, proof.
8. Runtime records worktree_path, branch, base_sha, head_sha.
9. Runtime requests approval before PR creation.
10. Runtime cleans up worktree after merge / cancel / failure according to cleanup policy.
```

Worker command shape:

```bash
cd "$WORKTREE_PATH"

codex exec \
  --json \
  --sandbox workspace-write \
  --output-schema "$REPO_ROOT/schemas/codex/repo-patch-result.schema.json" \
  - < "$TASK_PROMPT_FILE"
```

---

## 6. Schema / policy 字段

### `work-cell.schema.json` 应包含

```json
{
  "worktree": {
    "required": true,
    "base_branch": "main",
    "base_sha": "string",
    "task_branch": "mcr/MCR-010/event-envelope-schema",
    "worktree_path": "../.worktrees/repo/MCR-010-event-envelope-schema",
    "cleanup_policy": "keep_until_merged_or_failed_reviewed"
  }
}
```

### `runtime/policies/default.yaml` 应包含

```yaml
worktree_policy:
  required_for:
    - code_change
    - test_change
    - schema_change
    - fixture_change
    - refactor
    - security_fix
  optional_for:
    - docs_only
    - read_only_analysis
  denied:
    - direct_main_checkout_edits
  branch_pattern: "^mcr/[A-Z]+-[0-9]+/[a-z0-9-]+$"
  path_pattern: "^../\\.worktrees/.+/.+$"
  cleanup_policy: keep_until_merged_or_failed_reviewed
```

### `runtime/capabilities.yaml` 中每个实现类 capability 应包含

```yaml
execution:
  requires_isolated_worktree: true
  worktree_created_by: runtime
  codex_cwd: worktree_path
  allow_main_checkout_edits: false
```

---

## 7. Proof / Handoff Back 中必须记录

Codex Handoff Back 必须包含：

```text
Worktree:
- worktree_path:
- branch:
- base_branch:
- base_sha:
- head_sha:
- cleanup_status:
```

Proof ledger entry 必须包含：

```json
{
  "worktree": {
    "path": "../.worktrees/repo/MCR-010-event-envelope-schema",
    "branch": "mcr/MCR-010/event-envelope-schema",
    "base_branch": "main",
    "base_sha": "abc123",
    "head_sha": "def456",
    "cleanup_status": "kept_for_review"
  }
}
```

---

## 8. 应加入哪些项目文件

### 必须加入

```text
AGENTS.md
  增加：Development Isolation / Worktree Policy

docs/guides/codex-development-usage-guide.md
  增加：Codex worktree 使用方式、标准 prompt、handoff 字段

docs/roadmaps/analysis-roadmap.md
  第一批建议 issue 增加：worktree policy baseline
  Codex worker contract 分析增加：worker-runner creates worktree before codex exec

docs/architecture/matrix-codex-capability-runtime.md
  Work Cell Runtime 部分增加：isolated git worktree per run

runtime/policies/default.yaml
  增加：worktree_policy

runtime/capabilities.yaml
  每个实现类 capability 增加：requires_isolated_worktree: true

schemas/runtime/work-cell.schema.json
  增加：worktree object

schemas/proof/proof-ledger-entry.schema.json
  增加：worktree provenance
```

### 可以后续加入

```text
scripts/create-worktree.sh
scripts/remove-worktree.sh
scripts/check-worktree-clean.sh
scripts/list-agent-worktrees.sh
```

---

## 9. AGENTS.md 建议新增文本

```markdown
## Development Isolation / Worktree Policy

For any non-trivial implementation, test, schema, fixture, refactor, or security-fix task, do not work directly in the main checkout.

Use a dedicated git worktree per task.

Required convention:

- Branch: `mcr/<TASK_ID>/<short-slug>`
- Worktree path: `../.worktrees/<repo-name>/<TASK_ID>-<short-slug>`
- All edits must stay inside the task worktree.
- Do not modify the original checkout while executing the task.
- Do not merge.
- Do not push to main.
- Include worktree path, branch, base SHA, head SHA, changed files, validation commands, and cleanup status in Handoff Back.

Exceptions:

- Read-only analysis tasks may run in the current checkout.
- Docs-only tasks may run in the current checkout, but a docs worktree is preferred when multiple Codex sessions are active.
- Emergency exceptions must be explicitly documented in Handoff Back.

For Runtime-driven Codex workers, the Runtime or worker-runner must create the worktree before launching Codex. Codex should execute with its current working directory set to the worktree path.
```

---

## 10. Standard Codex task preamble

Use this at the top of every implementation task:

```text
Task ID: <TASK_ID>
Task type: implementation | test | schema | fixture | docs | analysis

Worktree requirement:
- Use a dedicated git worktree for this task.
- Branch: mcr/<TASK_ID>/<short-slug>
- Path: ../.worktrees/<repo-name>/<TASK_ID>-<short-slug>
- Do not modify the main checkout.
- Do not merge or push to main.

Allowed files:
- <paths>

Forbidden files:
- <paths>

Required validation:
- <commands>

Required Handoff Back:
- Summary
- Worktree path
- Branch
- Base SHA
- Head SHA
- Files changed
- Tests added or updated
- Validation results
- Risk notes
- Rollback notes
- Cleanup status
```
