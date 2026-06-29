import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createFixtureTransactionHandler,
  FakeRuntimeEventQueue,
  type MatrixTransactionRequest,
  type TransactionOutcome,
} from "./transaction-handler.ts";

export const DEFAULT_MATRIX_APPSERVICE_HOST = "127.0.0.1";
export const DEFAULT_MATRIX_APPSERVICE_PORT = 9009;
export const DEFAULT_MATRIX_APPSERVICE_REGISTRATION_URL =
  "http://host.docker.internal:9009";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const matrixRunIdPattern =
  /^mcr-720-\d{8}t\d{6}z-[a-z0-9][a-z0-9-]{2,40}$/;

export type MatrixAppserviceTransactionHandler = {
  handle(request: MatrixTransactionRequest): TransactionOutcome;
};

export type ManualMatrixAppserviceListenerOptions = {
  host: string;
  port: number;
  hsToken: string;
  roomMap: Map<string, string>;
};

export type ManualMatrixAppserviceStartOptions =
  ManualMatrixAppserviceListenerOptions & {
    runtimeEventQueue?: FakeRuntimeEventQueue;
  };

export type MatrixSmokeRunScaffoldInput = {
  runId: string;
  registrationUrl?: string;
  outputDir?: string;
  asToken?: string;
  hsToken?: string;
};

export type MatrixSmokeRunScaffoldOptions = Required<MatrixSmokeRunScaffoldInput>;

export type MatrixSmokeRunScaffold = {
  files: {
    registration: string;
    logConfig: string;
    listenerEnv: string;
  };
  registrationYaml: string;
  logConfig: string;
  listenerEnv: string;
};

export function readManualMatrixAppserviceListenerOptions(
  env: Record<string, string | undefined> = process.env,
): ManualMatrixAppserviceListenerOptions {
  return {
    host: env.MCR_MATRIX_APPSERVICE_HOST ?? DEFAULT_MATRIX_APPSERVICE_HOST,
    port: readPort(env.MCR_MATRIX_APPSERVICE_PORT),
    hsToken: requiredEnv(env, "MCR_MATRIX_APPSERVICE_HS_TOKEN"),
    roomMap: readRoomMap(env),
  };
}

export function readMatrixSmokeRunScaffoldOptions(
  env: Record<string, string | undefined> = process.env,
): MatrixSmokeRunScaffoldOptions {
  const runId = requiredEnv(env, "MCR_MATRIX_SMOKE_RUN_ID");
  assertRunId(runId);

  return {
    runId,
    registrationUrl:
      env.MCR_MATRIX_APPSERVICE_REGISTRATION_URL ??
      DEFAULT_MATRIX_APPSERVICE_REGISTRATION_URL,
    outputDir:
      env.MCR_MATRIX_RUN_DIR ??
      path.join(root, "infra/matrix/synapse/generated", runId),
    asToken: env.MCR_MATRIX_APPSERVICE_AS_TOKEN ?? runToken("as", runId),
    hsToken: env.MCR_MATRIX_APPSERVICE_HS_TOKEN ?? runToken("hs", runId),
  };
}

export function buildMatrixSmokeRunScaffold(
  input: MatrixSmokeRunScaffoldInput,
): MatrixSmokeRunScaffold {
  assertRunId(input.runId);
  const registrationUrl =
    input.registrationUrl ?? DEFAULT_MATRIX_APPSERVICE_REGISTRATION_URL;
  assertHttpUrl(registrationUrl);

  const outputDir =
    input.outputDir ??
    path.join(root, "infra/matrix/synapse/generated", input.runId);
  const asToken = input.asToken ?? runToken("as", input.runId);
  const hsToken = input.hsToken ?? runToken("hs", input.runId);
  const localpart = input.runId.replaceAll("-", "_");
  const registration = path.join(outputDir, "appservice-registration.yaml");
  const logConfig = path.join(outputDir, "log.config");
  const listenerEnv = path.join(outputDir, "listener.env");

  return {
    files: {
      registration,
      logConfig,
      listenerEnv,
    },
    registrationYaml: [
      `# Generated for ${input.runId}; do not commit.`,
      `id: "${input.runId}-appservice"`,
      `url: "${registrationUrl}"`,
      `as_token: "${asToken}"`,
      `hs_token: "${hsToken}"`,
      `sender_localpart: "${localpart}_appservice"`,
      "rate_limited: false",
      "",
      "namespaces:",
      "  users:",
      "    - exclusive: true",
      `      regex: "@${localpart}_.*:mcr-720.localhost"`,
      "  aliases:",
      "    - exclusive: true",
      `      regex: "#${localpart}_.*:mcr-720.localhost"`,
      "  rooms: []",
      "",
    ].join("\n"),
    logConfig: [
      "version: 1",
      "formatters:",
      "  precise:",
      "    format: '%(asctime)s - %(name)s - %(levelname)s - %(request)s - %(message)s'",
      "handlers:",
      "  console:",
      "    class: logging.StreamHandler",
      "    formatter: precise",
      "loggers:",
      "  synapse:",
      "    level: INFO",
      "root:",
      "  level: INFO",
      "  handlers: [console]",
      "disable_existing_loggers: false",
      "",
    ].join("\n"),
    listenerEnv: [
      `MCR_MATRIX_APPSERVICE_HS_TOKEN=${hsToken}`,
      `MCR_MATRIX_APPSERVICE_HOST=${DEFAULT_MATRIX_APPSERVICE_HOST}`,
      `MCR_MATRIX_APPSERVICE_PORT=${DEFAULT_MATRIX_APPSERVICE_PORT}`,
      "",
    ].join("\n"),
  };
}

export function writeMatrixSmokeRunScaffold(
  input: MatrixSmokeRunScaffoldInput,
): MatrixSmokeRunScaffold {
  const scaffold = buildMatrixSmokeRunScaffold(input);
  mkdirSync(path.dirname(scaffold.files.registration), { recursive: true });
  writeFileSync(scaffold.files.registration, scaffold.registrationYaml, {
    mode: 0o600,
  });
  writeFileSync(scaffold.files.logConfig, scaffold.logConfig, { mode: 0o600 });
  writeFileSync(scaffold.files.listenerEnv, scaffold.listenerEnv, { mode: 0o600 });

  return scaffold;
}

export async function startManualMatrixAppserviceListener(
  options: ManualMatrixAppserviceStartOptions,
) {
  const handler = createFixtureTransactionHandler({
    hsToken: options.hsToken,
    roomMap: options.roomMap,
    runtimeEventQueue: options.runtimeEventQueue,
  });
  const server = createMatrixAppserviceHttpListener(handler);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return server;
}

function readPort(value: string | undefined) {
  if (value === undefined) {
    return DEFAULT_MATRIX_APPSERVICE_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MCR_MATRIX_APPSERVICE_PORT must be an integer TCP port");
  }

  return port;
}

function readRoomMap(env: Record<string, string | undefined>) {
  if (env.MCR_MATRIX_ROOM_MAP_JSON) {
    const parsed = JSON.parse(env.MCR_MATRIX_ROOM_MAP_JSON) as Record<
      string,
      unknown
    >;

    return new Map(
      Object.entries(parsed).map(([roomId, workspaceId]) => {
        if (typeof workspaceId !== "string" || workspaceId.length === 0) {
          throw new Error("MCR_MATRIX_ROOM_MAP_JSON values must be strings");
        }

        return [roomId, workspaceId];
      }),
    );
  }

  const roomId = requiredEnv(env, "MCR_MATRIX_ROOM_ID");
  const workspaceId = requiredEnv(env, "MCR_MATRIX_WORKSPACE_ID");
  return new Map([[roomId, workspaceId]]);
}

function requiredEnv(env: Record<string, string | undefined>, name: string) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function assertRunId(runId: string) {
  if (!matrixRunIdPattern.test(runId)) {
    throw new Error(
      "MCR_MATRIX_SMOKE_RUN_ID must match mcr-720-yyyymmddthhmmssz-<slug>",
    );
  }
}

function assertHttpUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("registration URL must use http or https");
  }
}

function runToken(prefix: "as" | "hs", runId: string) {
  return `${prefix}_${runId}_${randomBytes(18).toString("base64url")}`;
}

export function createMatrixAppserviceHttpListener(
  handler: MatrixAppserviceTransactionHandler,
) {
  return http.createServer(async (req, res) => {
    const transactionId = getTransactionId(req);
    if (transactionId === null) {
      sendJson(res, 404, { code: "not_found", retryable: false });
      return;
    }

    if (req.method !== "PUT") {
      sendJson(res, 405, { code: "method_not_allowed", retryable: false });
      return;
    }

    let body: MatrixTransactionRequest["body"];
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { code: "invalid_json", retryable: false });
      return;
    }

    const outcome = handler.handle({
      params: { txn_id: transactionId },
      headers: { authorization: req.headers.authorization },
      body,
    });

    sendJson(res, outcome.response.status, outcome.response.body);
  });
}

function getTransactionId(req: http.IncomingMessage) {
  const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  const match = /^\/_matrix\/app\/v1\/transactions\/([^/]+)$/.exec(pathname);

  return match ? match[1] : null;
}

async function readJsonBody(req: http.IncomingMessage) {
  let rawBody = "";
  req.setEncoding("utf8");

  for await (const chunk of req) {
    rawBody += chunk;
  }

  const body = JSON.parse(rawBody) as MatrixTransactionRequest["body"];
  if (!Array.isArray(body.events)) {
    throw new Error("Matrix transaction body must include events");
  }

  return body;
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: Record<string, unknown>,
) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
