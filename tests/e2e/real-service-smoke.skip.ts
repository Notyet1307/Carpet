import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MCR_850_VERTICAL_SMOKE_ALLOWED_ACTIONS,
  MCR_850_VERTICAL_SMOKE_STEPS,
  planMcr850VerticalSmoke,
  runMcr850VerticalSmokeScaffold,
  type Mcr850VerticalSmokeInput,
} from "../../apps/runtime-orchestrator/src/vertical-smoke-runner-scaffold.ts";

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
    "appservice registration scaffold",
    "tokens must be generated per approved run",
    "never committed",
    "raw matrix event bodies",
    "mcr-310 codex proof remains separate",
    "appservice http listener start is manual-only",
    "registration url must match the listener host and port",
    "host.docker.internal:9009",
    "generate-matrix-smoke-config",
    "mcr_matrix_run_dir",
    "mcr_matrix_appservice_hs_token",
    "appservice-registration.yaml",
    "log.config",
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

test("AppService registration scaffold uses only run-scoped placeholders", () => {
  const registrationPath =
    "infra/matrix/synapse/appservice-registration.example.yaml";

  assert.equal(
    existsSync(path.join(root, registrationPath)),
    true,
    "missing AppService registration scaffold",
  );

  const registration = readFileSync(path.join(root, registrationPath), "utf8");

  for (const requiredText of [
    "MCR-720",
    "placeholder-only",
    "run-scoped",
    "cleanup",
    "never commit",
    "as_token: \"mcr-720-example-as-token-replace-per-approved-run\"",
    "hs_token: \"mcr-720-example-hs-token-replace-per-approved-run\"",
    "url: \"http://host.docker.internal:9009\"",
    "must match the manually started listener host and port",
    "regex: \"@mcr_720_.*:mcr-720.localhost\"",
  ]) {
    assert.equal(
      registration.includes(requiredText),
      true,
      `missing registration text: ${requiredText}`,
    );
  }

  const homeserver = readFileSync(
    path.join(root, "infra/matrix/synapse/homeserver.example.yaml"),
    "utf8",
  );
  assert.equal(
    homeserver.includes("/data/appservice-registration.yaml"),
    true,
    "homeserver example must reference the generated registration mount",
  );
  assert.equal(
    homeserver.includes("/data/appservice-registration.example.yaml"),
    false,
    "homeserver must not use the tracked example registration for smoke",
  );
});

test("Synapse compose uses generated run files, not tracked smoke credentials", () => {
  const compose = readFileSync(
    path.join(root, "infra/matrix/synapse/docker-compose.yaml"),
    "utf8",
  );
  const homeserver = readFileSync(
    path.join(root, "infra/matrix/synapse/homeserver.example.yaml"),
    "utf8",
  );

  assert.equal(compose.includes("MCR_MATRIX_RUN_DIR"), true);
  assert.equal(compose.includes("/data/appservice-registration.yaml"), true);
  assert.equal(compose.includes("/data/log.config"), true);
  assert.equal(
    compose.includes(
      "./appservice-registration.example.yaml:/data/appservice-registration.example.yaml",
    ),
    false,
    "compose must not mount the tracked example registration as live smoke config",
  );
  assert.equal(homeserver.includes("/data/appservice-registration.yaml"), true);
  assert.equal(homeserver.includes("/data/log.config"), true);
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

test("MCR-850 vertical smoke scaffold is disabled by default", async () => {
  const calls: string[] = [];
  const result = await runMcr850VerticalSmokeScaffold({}, async (step) => {
    calls.push(step);
  });

  assert.equal(result.wouldCallRealServices, false);
  assert.equal(result.status, "blocked");
  assert.equal(calls.length, 0);
  assert.deepEqual(result.steps, MCR_850_VERTICAL_SMOKE_STEPS);
});

test("MCR-850 fully gated manual path signals real-service readiness with injected runner only", async () => {
  const calls: string[] = [];
  const result = await runMcr850VerticalSmokeScaffold(mcr850ValidInput(), async (step) => {
    calls.push(step);
  });

  assert.equal(result.status, "planned");
  assert.equal(result.wouldCallRealServices, true);
  assert.deepEqual(calls, MCR_850_VERTICAL_SMOKE_STEPS);
  assert.deepEqual(result.steps, [
    "matrix_or_local_fixture_ingress",
    "runtime_snapshot",
    "approved_codex_exec",
    "proof_verification",
    "approval",
    "disposable_github_pr_create",
    "cleanup_projection",
  ]);
});

test("MCR-850 vertical smoke gate blocks missing approval token cleanup or evidence", async () => {
  for (const [name, input] of [
    [
      "missing approval",
      { ...mcr850ValidInput(), human_approval_scope: undefined },
    ],
    [
      "missing disposable GitHub token",
      { ...mcr850ValidInput(), github_token_status: "unset" },
    ],
    [
      "missing cleanup plan",
      { ...mcr850ValidInput(), cleanup_plan: [] },
    ],
    [
      "missing evidence dir",
      { ...mcr850ValidInput(), evidence_dir: undefined },
    ],
  ] as const) {
    const calls: string[] = [];
    const result = await runMcr850VerticalSmokeScaffold(input, async (step) => {
      calls.push(step);
    });

    assert.equal(result.status, "blocked", name);
    assert.equal(result.wouldCallRealServices, false, name);
    assert.equal(calls.length, 0, name);
  }
});

test("MCR-850 vertical smoke gate rejects production main GitHub target", async () => {
  const result = await runMcr850VerticalSmokeScaffold(
    {
      ...mcr850ValidInput(),
      github_base_branch: "main",
    },
    async () => {
      assert.fail("production main target must block before runner execution");
    },
  );

  assert.equal(result.status, "blocked");
  assert.equal(result.wouldCallRealServices, false);
  assert.ok(result.blockedBy.includes("github base branch must be disposable, not main"));
});

test("MCR-850 vertical smoke allowed actions exclude merge deploy and live memory", () => {
  for (const forbidden of ["merge", "deploy", "live_memory_write"]) {
    assert.equal(MCR_850_VERTICAL_SMOKE_ALLOWED_ACTIONS.includes(forbidden), false);
  }

  const plan = planMcr850VerticalSmoke({
    ...mcr850ValidInput(),
    requested_actions: ["merge"],
  });

  assert.equal(plan.status, "blocked");
  assert.equal(plan.wouldCallRealServices, false);
  assert.ok(plan.blockedBy.includes("forbidden action requested: merge"));
});

test("runbook records MCR-850 manual vertical smoke scaffold boundaries", () => {
  const runbook = readFileSync(
    path.join(root, "docs/runbooks/real-service-smoke-tests.md"),
    "utf8",
  ).toLowerCase();

  for (const requiredText of [
    "mcr-850 manual vertical smoke scaffold",
    "does not authorize real execution",
    "requires another action-scoped human approval",
    "matrix/local fixture ingress -> runtime snapshot -> approved codex exec -> proof verification -> approval -> disposable github pr create -> cleanup/projection",
    "wouldcallrealservices=true",
    "disposable github token presence only",
    "no token values",
    "no merge",
    "no deploy",
    "no live memory write",
  ]) {
    assert.equal(runbook.includes(requiredText), true, `missing MCR-850 runbook text: ${requiredText}`);
  }
});

function mcr850ValidInput(): Mcr850VerticalSmokeInput {
  const runId = "mcr-850-20260629t160000z-vertical-smoke-01";

  return {
    run_id: runId,
    human_approval_scope: "mcr_850_vertical_smoke",
    matrix_target: "disposable",
    codex_approval_scope: "codex_exec_smoke",
    codex_credential_scope: "disposable",
    codex_env_keys: ["PATH"],
    github_token_status: "set",
    github_repository: "Notyet1307/github-pr-smoke-sandbox",
    github_target_kind: "disposable_repository",
    github_base_branch: `mcr-850-base-${runId}`,
    github_head_branch: `mcr-850-head-${runId}`,
    evidence_dir: `.mcr/runs/${runId}`,
    cleanup_plan: [
      "stop_matrix_services",
      "close_pr",
      "delete_disposable_branches",
      "revoke_disposable_credentials",
      "remove_generated_matrix_files",
    ],
    requested_actions: [...MCR_850_VERTICAL_SMOKE_ALLOWED_ACTIONS],
  };
}
