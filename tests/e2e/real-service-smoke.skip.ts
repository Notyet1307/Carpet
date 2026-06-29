import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const optInFlag = "MCR_REAL_SERVICE_SMOKE";
const credentialScopeFlag = "MCR_REAL_SERVICE_CREDENTIAL_SCOPE";
const disposableScope = "disposable";
const manualOptInCommand = [
  `${optInFlag}=1`,
  `${credentialScopeFlag}=${disposableScope}`,
  "node --test tests/e2e/real-service-smoke.skip.ts",
].join(" ");

type SmokeEnv = Record<string, string | undefined>;

function evaluateRealServiceSmokeGate(env: SmokeEnv) {
  const reasons: string[] = [];

  if (env[optInFlag] !== "1") {
    reasons.push(`missing explicit opt-in flag: ${optInFlag}=1`);
  }

  if (env[credentialScopeFlag] !== disposableScope) {
    reasons.push(
      `missing disposable credential scope: ${credentialScopeFlag}=${disposableScope}`,
    );
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

function planRealServiceSmokeAttempt(gate: ReturnType<typeof evaluateRealServiceSmokeGate>) {
  return {
    wouldCallRealServices: false,
    blockedBy: gate.ok
      ? ["scaffold only; follow the runbook before adding a real-service runner"]
      : gate.reasons,
  };
}

test("default local run stops before any real-service path", () => {
  const gate = evaluateRealServiceSmokeGate({});
  const attempt = planRealServiceSmokeAttempt(gate);

  assert.equal(gate.ok, false);
  assert.deepEqual(gate.reasons, [
    `missing explicit opt-in flag: ${optInFlag}=1`,
    `missing disposable credential scope: ${credentialScopeFlag}=${disposableScope}`,
  ]);
  assert.equal(attempt.wouldCallRealServices, false);
});

test("explicit opt-in still stops without disposable credential scope", () => {
  const gate = evaluateRealServiceSmokeGate({
    [optInFlag]: "1",
  });
  const attempt = planRealServiceSmokeAttempt(gate);

  assert.equal(gate.ok, false);
  assert.deepEqual(gate.reasons, [
    `missing disposable credential scope: ${credentialScopeFlag}=${disposableScope}`,
  ]);
  assert.equal(attempt.wouldCallRealServices, false);
});

test("fully gated scaffold still has no real-service implementation path", () => {
  const gate = evaluateRealServiceSmokeGate({
    [optInFlag]: "1",
    [credentialScopeFlag]: disposableScope,
  });
  const attempt = planRealServiceSmokeAttempt(gate);

  assert.equal(gate.ok, true);
  assert.equal(attempt.wouldCallRealServices, false);
  assert.deepEqual(attempt.blockedBy, [
    "scaffold only; follow the runbook before adding a real-service runner",
  ]);
});

test("manual opt-in command names both gates and the skipped test file", () => {
  assert.equal(manualOptInCommand.includes(`${optInFlag}=1`), true);
  assert.equal(
    manualOptInCommand.includes(`${credentialScopeFlag}=${disposableScope}`),
    true,
  );
  assert.equal(
    manualOptInCommand.includes("node --test tests/e2e/real-service-smoke.skip.ts"),
    true,
  );
});

test("runbook records manual evidence and safety boundaries", () => {
  const runbook = readFileSync(
    path.join(root, "docs/runbooks/real-service-smoke-tests.md"),
    "utf8",
  );

  for (const requiredText of [
    "manual opt-in command",
    "disposable credential scope",
    "cleanup",
    "rollback",
    "evidence capture",
    "compatibility proof",
    "not a correctness source",
  ]) {
    assert.equal(
      runbook.toLowerCase().includes(requiredText),
      true,
      `missing runbook text: ${requiredText}`,
    );
  }
});

test("manual real-service compatibility smoke is a skipped placeholder", {
  skip: "scaffold only; real services require a human-approved disposable run",
}, () => {
  assert.fail("The scaffold must not run real-service calls by default.");
});
