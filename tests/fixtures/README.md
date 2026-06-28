# Fixture Baseline

Fixtures are golden examples for contracts and fake adapter tests. They are durable test inputs, not runtime storage.

## Fixture Groups

| Path | Owner boundary | Used by |
|---|---|---|
| `fixtures/matrix-events/valid` | Matrix custom event schemas | `schema-fixtures.test.mjs`, future gateway unit tests |
| `fixtures/matrix-events/invalid` | Matrix event rejection cases | `schema-fixtures.test.mjs`, future gateway/security tests |
| `fixtures/matrix-transactions` | AppService transaction ingestion | `matrix-appservice-transaction.test.mjs`, future fake Matrix E2E |
| `fixtures/runtime` | Runtime work cell contracts | `schema-fixtures.test.mjs`, future worker-runner tests |
| `fixtures/capabilities` | Capability registry examples | `capability-schema.test.mjs`, future router tests |
| `fixtures/codex-jsonl` | Codex worker stream samples | `codex-jsonl-parser.test.mjs`, future `FakeCodexProcess` |
| `fixtures/codex` | Codex final output samples | `codex-output-schema.test.mjs`, future worker-runner tests |
| `fixtures/proof` | Proof and approval samples | `proof-ledger-entry.test.mjs`, future proof verifier / approval gate tests |
| `fixtures/policy` | Policy allow/deny decisions | `policy-decisions.test.mjs`, future policy engine tests |

## Golden Fixture Rules

1. Use stable ids, trace ids, timestamps, and artifact refs.
2. Store summaries and refs, not raw stdout, raw diffs, or secrets.
3. Keep each fixture focused on one expected result.
4. Name failure fixtures after the failure being protected.
5. Never mutate an existing golden fixture to make a new behavior pass; add a new fixture unless the old fixture was wrong.

## Required Failure Coverage

| Failure case | Fixture signal |
|---|---|
| Invalid Matrix event | `fixtures/matrix-transactions/invalid-schema.json`, `fixtures/matrix-events/invalid/task.created.empty-goal.invalid.json` |
| Duplicate event | `fixtures/matrix-transactions/duplicate-event.json`, `fixtures/matrix-transactions/duplicate-transaction.json` |
| Fake proof | `fixtures/policy/fake-proof.denied.yaml`, `fixtures/proof/invalid/approval.missing-proof.invalid.json` |
| Policy bypass | `fixtures/policy/prompt-injection-policy-override.denied.yaml`, `fixtures/policy/dangerous-command.denied.yaml` |
| Worker failure | `fixtures/codex-jsonl/failure.jsonl`, `fixtures/codex-jsonl/blocked.jsonl` |
| Approval replay | `fixtures/policy/approval-replay.denied.yaml` |
| Secret-bearing logs | `fixtures/policy/secret-log.denied.yaml`, `fixtures/matrix-events/invalid/proof.submitted.raw-proof-logs.invalid.json` |

## Fake Adapter Use

Fake adapters should load these fixtures directly:

```text
FakeMatrixHomeserver       -> fixtures/matrix-transactions/*.json
FakeCodexProcess           -> fixtures/codex-jsonl/*.jsonl + fixtures/codex/**/*.json
FakeArtifactStore          -> fixtures/proof/**/*.json artifact refs
FakePolicyEngine harness   -> fixtures/policy/*.yaml
FakeGitHubAdapter          -> proof + approval fixtures, no network
```

If a fake needs behavior not represented here, add the fixture before adding the fake assertion.
