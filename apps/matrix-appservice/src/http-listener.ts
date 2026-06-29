import http from "node:http";

import type {
  MatrixTransactionRequest,
  TransactionOutcome,
} from "./transaction-handler.ts";

export type MatrixAppserviceTransactionHandler = {
  handle(request: MatrixTransactionRequest): TransactionOutcome;
};

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
