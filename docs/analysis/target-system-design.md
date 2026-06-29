# Target System Design Alignment

Version: 2026-06-29

Task ID: Analysis-target-system-design-alignment

## Purpose

The local fake MVP proves the control flow and security contracts. It is not the
real service system.

The target system keeps the same boundaries while replacing fake adapters with
real, gated adapters one vertical slice at a time. The next phase must not add an
automatic commander loop, a separate review lane, or broad orchestration beyond
the existing Runtime-owned task path.

## Target System Boundary

Matrix is a collaboration entrance, human approval surface, and projection
timeline. Matrix events are untrusted input. Matrix is not the runtime source of
truth for task state, policy, work cells, proof, approval, memory, secrets, raw
logs, or worker lifecycle.

Runtime is the source of truth for:

- task state and transition history
- task graph and capability selection
- policy decisions and allowed or forbidden actions
- Work Cell creation, including branch, worktree path, base SHA, and cleanup
- proof ledger entries and proof verification
- action-scoped approval requests and approval authorization
- memory update proposals
- adapter calls after policy, proof, and approval gates pass

Codex workers execute only inside a Runtime-created Work Cell. For repo patch
work, Runtime or worker-runner creates the worktree first, records the branch and
base SHA, and launches Codex with `cwd = worktree_path`. Codex does not choose
its own worktree, edit the main checkout, push, merge, create PRs, approve its
own work, change policy, or write live memory.

The ordering is mandatory:

```text
Matrix input
-> Runtime validation and task state
-> policy decision
-> Runtime-created Work Cell
-> worker artifact
-> proof
-> proof verification
-> action-scoped approval request
-> human approval
-> external action
-> Matrix projection
-> memory.update.proposed
```

Proof comes before approval. Approval requests must reference a verified proof
id. Approval comes before external action. External actions include real Codex
exec smoke, GitHub PR creation, push, deploy, secret access, and any live memory
write path. Memory remains proposal-only in Runtime; applying a proposal must be
a reviewed human or PR path, not an automatic live memory write.

## Current Component Status

| Component | Status | Current evidence | Real gap |
|---|---|---|---|
| Matrix event schemas and fixtures | implemented fake | `schemas/matrix/*.schema.json`, `fixtures/matrix-events/**`, contract tests | No live homeserver compatibility proof. |
| Fake Matrix transaction handler | implemented fake | `apps/matrix-appservice/src/transaction-handler.ts` | No real AppService registration, HTTP server, Synapse room setup, or durable ingress store. |
| Matrix projection adapter | implemented fake | `apps/matrix-appservice/src/projection-adapter.ts` | No real Matrix send-event path. |
| Runtime event queue | implemented fake | `tests/e2e/fakes/fake-runtime-event-queue.ts` | No durable queue or replay worker. |
| Runtime task state machine | implemented fake | `packages/state-machine/**` | No production Runtime API or durable transaction boundary. |
| Runtime task store | implemented fake | `packages/runtime-store/src/in-memory-task-store.ts` | No Postgres store, migrations, locking, or replay recovery. |
| Capability registry and router | implemented fake | `packages/capability-router/**`, `runtime/capabilities.yaml` | No service-side graph compiler or runtime dispatch API. |
| Policy engine | implemented fake | `packages/policy-engine/**`, `runtime/policies/*.yaml` | No production policy service, no external identity or secret broker. |
| Work Cell manager | implemented fake | `packages/work-cell-manager/src/fake-worktree-manager.ts` | No real git worktree create/remove implementation in the Runtime path. |
| Fake Codex worker runner | implemented fake | `apps/worker-runner/src/fake-codex-process.ts`, local fake E2E | No default real Codex execution. |
| Codex exec smoke runner | guarded scaffold | `apps/worker-runner/src/codex-exec-runner.ts` | Requires explicit smoke flag, run-scoped human approval, scoped credentials, explicit env, and injected process runner. |
| Proof ledger and verifier | implemented fake | `packages/proof-ledger/**` | No object store, durable proof ledger, or verifier worker service. |
| Approval gate | implemented fake | `packages/approval-gate/**` | No durable approval service, Matrix identity binding, or production authorization store. |
| GitHub PR adapter | implemented fake | `packages/github-adapter/src/fake-github-adapter.ts` | No Octokit or GitHub API call, no real PR creation proof. |
| Memory proposal flow | implemented fake | `workers/memory-curator-worker/**` | No reviewed PR/human application path for memory proposals. Runtime must still not write live memory. |
| Local fake E2E harness | implemented fake | `tests/e2e/local-fake-mvp.test.ts` | Proves contract flow only, not service compatibility. |
| Real-service smoke runbook and tests | guarded scaffold | `docs/runbooks/real-service-smoke-tests.md`, `tests/e2e/real-service-smoke.skip.ts` | Scaffold explicitly does not call real services. |
| Real Matrix integration | not implemented real integration | No real service proof in current review | Needs disposable homeserver/room smoke after Codex smoke is proven. |
| Real GitHub PR integration | not implemented real integration | Fake adapter only | Needs action-scoped approval and disposable repo/branch smoke. |
| Production database, queue, and object storage | not implemented real integration | In-memory and fake stores only | Needs separate persistence vertical slice. |
| Commander automation or separate review lane | not implemented real integration | Out of scope by design | Do not add in the next phase. |

## Fake MVP To Real System Evolution

Keep the local fake MVP as the regression source. It should continue to prove
that invalid Matrix input, duplicate intake, worker failure, fake proof, policy
bypass, approval replay, and secret-bearing logs stop before PR creation.

Replace one fake boundary at a time:

1. Replace the fake Codex worker with a real Codex exec smoke in a
   Runtime-created worktree.
2. Replace fake Matrix ingress with a disposable Matrix AppService smoke.
3. Replace the fake GitHub adapter with a disposable PR creation smoke.
4. Add durable Runtime storage only after the adapter gates still preserve the
   same state, proof, approval, and memory boundaries.

Do not start with broad service orchestration. Do not add an automatic commander
loop. Do not add a separate review lane. The existing verifier/proof path is the
review boundary for the next slice.

## Recommended Next Vertical Slice

Build the smallest real-service slice around Codex exec only:

```text
checked-in task fixture
-> Runtime validates scope and policy
-> Runtime creates a real git worktree outside the main checkout
-> manual approval for one codex_exec_smoke run is checked before the real Codex call
-> guarded Codex exec runner uses cwd = worktree_path
-> runner captures JSONL, final JSON, diff, validation log, and proof refs
-> proof verifier accepts or rejects the proof
-> post-proof approval gate remains fake/in-memory for simulated PR only
-> GitHub remains fake; no PR API call
-> Matrix remains fake/projection-only
-> memory remains memory.update.proposed only
```

Acceptance boundary:

- requires explicit human approval before one `codex_exec_smoke` run id
- uses disposable or scoped credentials only
- rejects main-checkout cwd
- rejects secret-bearing environment
- records command, exit code, artifact refs, cleanup, risk, and rollback notes
- proves no GitHub, Matrix, deploy, merge, secret, or live memory call occurs

This slice proves the highest-risk worker boundary without expanding product
surface. Real Matrix and real GitHub smoke should wait until this Codex worker
boundary has proof.
