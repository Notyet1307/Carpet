import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

const optInFlag = "MCR_REAL_SERVICE_SMOKE";
const credentialScopeFlag = "MCR_REAL_SERVICE_CREDENTIAL_SCOPE";
const serviceTargetFlag = "MCR_REAL_SERVICE_TARGET";
const matrixRunIdFlag = "MCR_MATRIX_SMOKE_RUN_ID";
const disposableScope = "disposable";
const matrixTarget = "matrix";
const matrixRunIdPattern = /^mcr-720-\d{8}t\d{6}z-[a-z0-9][a-z0-9-]{2,40}$/;
const manualOptInCommand = [
  `${optInFlag}=1`,
  `${credentialScopeFlag}=${disposableScope}`,
  `${serviceTargetFlag}=${matrixTarget}`,
  `${matrixRunIdFlag}=mcr-720-20260629t120000z-example`,
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

  if (env[serviceTargetFlag] !== matrixTarget) {
    reasons.push(`missing Matrix-only target: ${serviceTargetFlag}=${matrixTarget}`);
  }

  if (!env[matrixRunIdFlag] || !matrixRunIdPattern.test(env[matrixRunIdFlag])) {
    reasons.push(
      `missing Matrix smoke run id matching ${matrixRunIdFlag}=mcr-720-yyyymmddthhmmssz-<slug>`,
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
    `missing Matrix-only target: ${serviceTargetFlag}=${matrixTarget}`,
    `missing Matrix smoke run id matching ${matrixRunIdFlag}=mcr-720-yyyymmddthhmmssz-<slug>`,
  ]);
  assert.equal(attempt.wouldCallRealServices, false);
});

test("explicit opt-in still stops without Matrix disposable preflight gates", () => {
  const gate = evaluateRealServiceSmokeGate({
    [optInFlag]: "1",
  });
  const attempt = planRealServiceSmokeAttempt(gate);

  assert.equal(gate.ok, false);
  assert.deepEqual(gate.reasons, [
    `missing disposable credential scope: ${credentialScopeFlag}=${disposableScope}`,
    `missing Matrix-only target: ${serviceTargetFlag}=${matrixTarget}`,
    `missing Matrix smoke run id matching ${matrixRunIdFlag}=mcr-720-yyyymmddthhmmssz-<slug>`,
  ]);
  assert.equal(attempt.wouldCallRealServices, false);
});

test("fully gated scaffold still has no real-service implementation path", () => {
  const gate = evaluateRealServiceSmokeGate({
    [optInFlag]: "1",
    [credentialScopeFlag]: disposableScope,
    [serviceTargetFlag]: matrixTarget,
    [matrixRunIdFlag]: "mcr-720-20260629t120000z-example",
  });
  const attempt = planRealServiceSmokeAttempt(gate);

  assert.equal(gate.ok, true);
  assert.equal(attempt.wouldCallRealServices, false);
  assert.deepEqual(attempt.blockedBy, [
    "scaffold only; follow the runbook before adding a real-service runner",
  ]);
});

test("invalid Matrix target or run id still cannot call real services", () => {
  const gate = evaluateRealServiceSmokeGate({
    [optInFlag]: "1",
    [credentialScopeFlag]: disposableScope,
    [serviceTargetFlag]: "github",
    [matrixRunIdFlag]: "mcr-310-codex-proof",
  });
  const attempt = planRealServiceSmokeAttempt(gate);

  assert.equal(gate.ok, false);
  assert.deepEqual(gate.reasons, [
    `missing Matrix-only target: ${serviceTargetFlag}=${matrixTarget}`,
    `missing Matrix smoke run id matching ${matrixRunIdFlag}=mcr-720-yyyymmddthhmmssz-<slug>`,
  ]);
  assert.equal(attempt.wouldCallRealServices, false);
});

test("manual opt-in command names Matrix gates and the skipped test file", () => {
  assert.equal(manualOptInCommand.includes(`${optInFlag}=1`), true);
  assert.equal(
    manualOptInCommand.includes(`${credentialScopeFlag}=${disposableScope}`),
    true,
  );
  assert.equal(manualOptInCommand.includes(`${serviceTargetFlag}=${matrixTarget}`), true);
  assert.equal(
    manualOptInCommand.includes(`${matrixRunIdFlag}=mcr-720-20260629t120000z-example`),
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
    "matrix-only disposable resources",
    "disposable homeserver",
    "disposable room",
    "bot/appservice identity",
    "appservice registration",
    "raw matrix event bodies",
    "mcr-310 codex proof remains separate",
  ]) {
    assert.equal(
      runbook.toLowerCase().includes(requiredText),
      true,
      `missing runbook text: ${requiredText}`,
    );
  }
});

test("disposable Synapse scaffold is manual-only and contains no secrets", () => {
  const scaffoldFiles = [
    "infra/matrix/synapse/README.md",
    "infra/matrix/synapse/docker-compose.yaml",
    "infra/matrix/synapse/homeserver.example.yaml",
  ];
  const combined = scaffoldFiles
    .map((relativePath) => readFileSync(path.join(root, relativePath), "utf8"))
    .join("\n")
    .toLowerCase();

  for (const requiredText of [
    "manual-only",
    "disposable",
    "no secrets",
    "no real secrets",
    "no default service start",
    "cleanup",
    "127.0.0.1:8008:8008",
    "127.0.0.1:8448:8448",
  ]) {
    assert.equal(
      combined.includes(requiredText),
      true,
      `missing Synapse scaffold text: ${requiredText}`,
    );
  }
});

test("planning docs do not let MCR-310 authorize Matrix smoke", () => {
  for (const relativePath of [
    "docs/analysis/development-entry-review.md",
    "docs/analysis/target-system-design.md",
    "docs/roadmaps/mvp-implementation-plan.md",
  ]) {
    const content = readFileSync(path.join(root, relativePath), "utf8").toLowerCase();

    assert.equal(
      content.includes("mcr-310 codex proof remains separate"),
      true,
      `missing MCR-310 separation note in ${relativePath}`,
    );
  }
});

test("manual Matrix-only compatibility smoke is a skipped placeholder", {
  skip: "scaffold only; real Matrix services require a human-approved disposable run",
}, () => {
  assert.fail("The scaffold must not run Matrix real-service calls by default.");
});
