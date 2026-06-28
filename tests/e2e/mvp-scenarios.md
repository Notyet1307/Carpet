# MVP E2E Scenarios

This file defines E2E behavior only. It does not add a runner and does not authorize real Matrix, Codex, GitHub, database, or secret access.

## Scenario 1: Local Fake Repo Patch Flow

Goal: prove the MVP path can move from Matrix intake to simulated PR creation without trusting Matrix as source of truth or skipping proof / approval.

Required harness:

```text
FakeMatrixHomeserver
FakeRuntimeEventQueue
InMemoryTaskStore
StaticCapabilityRegistry
FakeWorktreeManager
FakeCodexProcess
FakeArtifactStore
ProofVerifier
ApprovalGate
FakeGitHubAdapter
```

Happy path:

```text
1. FakeMatrixHomeserver submits `task.created` using `fixtures/matrix-transactions/success.json`.
2. Matrix gateway validates hs_token, room, event envelope, and task.created schema.
3. Gateway enqueues one normalized runtime event and projects `task.accepted`.
4. Runtime creates task state from `created` to `accepted`.
5. Capability router selects `repo.patch.codex` or `ci.recovery` from `runtime/capabilities.yaml`.
6. Runtime creates a work cell with branch, worktree_path, base_sha, allowed paths, and validation commands.
7. Runtime emits `worker.dispatched`; FakeWorktreeManager returns a non-main worktree path.
8. FakeCodexProcess replays `fixtures/codex-jsonl/success.jsonl` and `fixtures/codex/valid/repo-patch-result.valid.json`.
9. Worker runner stores artifact refs and emits `artifact.submitted` plus worker output.
10. Proof ledger builds a proof entry with artifact refs, validation command, exit code, risk notes, rollback notes, branch, base_sha, and head_sha.
11. Proof verifier accepts the proof and emits `verification.completed`.
12. Runtime emits `approval.requested` for action `pr.create`.
13. ApprovalGate asserts FakeGitHubAdapter has zero PR calls before approval.
14. FakeMatrixHomeserver submits matching `approval.granted`.
15. ApprovalGate validates actor, action, task_id, proof_id, expiry, and replay id.
16. FakeGitHubAdapter records one simulated PR create request with proof and rollback details.
17. Runtime emits PR artifact summary; merge remains unavailable.
18. Memory proposal flow may emit `memory.update.proposed` from the approved proof, but no live memory write occurs.
```

Required assertions:

```text
task.created -> worker.dispatched -> artifact/proof -> verification.completed -> approval.requested -> simulated PR creation
Matrix event is input/projection only; runtime store is source of truth
No PR creation before approval
No merge API exists in the fake adapter
No raw logs or secrets appear in proof, Matrix projection, or PR body
Every external side effect is fake and locally inspectable
```

## Failure Scenarios

| Scenario | Input fixture / trigger | Expected result |
|---|---|---|
| Invalid Matrix event | `fixtures/matrix-transactions/invalid-schema.json` | Gateway rejects, projects readable failure, enqueues no runtime work |
| Duplicate event | `fixtures/matrix-transactions/duplicate-event.json` | Runtime receives at most one event; task is not duplicated |
| Duplicate transaction | `fixtures/matrix-transactions/duplicate-transaction.json` | Gateway returns idempotent success without repeating side effects |
| Worker failure | `fixtures/codex-jsonl/failure.jsonl` | Task enters failed path; no proof accepted; no approval requested |
| Worker blocked | `fixtures/codex-jsonl/blocked.jsonl` | Task enters needs-human-input / blocked path; no PR requested |
| Fake proof | `fixtures/policy/fake-proof.denied.yaml` | Proof verifier or policy engine denies; approval gate is not reached |
| Policy bypass | `fixtures/policy/prompt-injection-policy-override.denied.yaml` | Runtime policy denial wins over prompt text |
| Approval replay | `fixtures/policy/approval-replay.denied.yaml` | Replay id / expired approval is rejected; no PR call |
| Secret-bearing logs | `fixtures/policy/secret-log.denied.yaml` | Proof and PR creation are denied; redacted incident can be projected |

## Later Real-Service Smoke Tests

Only after the local fake E2E passes:

```text
1. Manual real Codex smoke test against a disposable repo and low-risk fixture.
2. Local Synapse AppService smoke test with the same transaction shape.
3. GitHub test-repo PR creation smoke test with merge disabled.
```

These smoke tests validate compatibility, not core correctness.
