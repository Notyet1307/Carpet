import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadJsonFile } from "../../../packages/runtime-contracts/src/index.ts";

import {
  createFixtureTransactionHandler,
  FakeRuntimeEventQueue,
} from "../src/transaction-handler.ts";
import { createMatrixAppserviceHttpListener } from "../src/http-listener.ts";

const root = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));

test("PUT transaction request reaches the existing transaction handler", async () => {
  const fixture = loadJsonFile(
    path.join(root, "fixtures/matrix-transactions/success.json"),
  ) as MatrixTransactionFixture;
  const queue = new FakeRuntimeEventQueue();
  const handler = createFixtureTransactionHandler({ runtimeEventQueue: queue });
  const server = createMatrixAppserviceHttpListener(handler);

  await listen(server);
  try {
    const response = await request(server, {
      method: "PUT",
      path: fixture.request.path,
      headers: fixture.request.headers,
      body: fixture.request.body,
    });

    assert.equal(response.status, fixture.expected.response.status);
    assert.deepEqual(response.body, fixture.expected.response.body);
    assert.equal(queue.events.length, 1);
    assert.equal(
      queue.events[0]?.matrix.transaction_id,
      fixture.request.params.txn_id,
    );
  } finally {
    await close(server);
  }
});

test("non-transaction route does not reach the handler", async () => {
  let handled = false;
  const server = createMatrixAppserviceHttpListener({
    handle() {
      handled = true;
      throw new Error("unexpected handler call");
    },
  });

  await listen(server);
  try {
    const response = await request(server, {
      method: "PUT",
      path: "/_matrix/app/v1/not-transactions/txn_http_001",
      headers: {},
      body: { events: [] },
    });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { code: "not_found", retryable: false });
    assert.equal(handled, false);
  } finally {
    await close(server);
  }
});

function listen(server: http.Server) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

type MatrixTransactionFixture = {
  request: {
    path: string;
    params: { txn_id: string };
    headers: http.OutgoingHttpHeaders;
    body: Record<string, unknown>;
  };
  expected: {
    response: {
      status: number;
      body: Record<string, unknown>;
    };
  };
};

function close(server: http.Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function request(
  server: http.Server,
  options: {
    method: string;
    path: string;
    headers: http.OutgoingHttpHeaders;
    body: Record<string, unknown>;
  },
) {
  const address = server.address();
  assert.ok(address && typeof address === "object");

  return new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: address.port,
        method: options.method,
        path: options.path,
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
          });
        });
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify(options.body));
  });
}
