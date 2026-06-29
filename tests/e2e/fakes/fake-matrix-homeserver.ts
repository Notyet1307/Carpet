import { readFileSync } from "node:fs";
import path from "node:path";

import { FakeRuntimeEventQueue } from "./fake-runtime-event-queue.ts";

export type FakeMatrixHomeserverOptions = {
  root: string;
  createHandler: (input: {
    queue: FakeRuntimeEventQueue;
    fixture: MatrixTransactionFixture;
  }) => {
    handle(request: MatrixTransactionFixture["request"]): MatrixTransactionOutcome;
  };
};

export type MatrixTransactionFixture = {
  preexisting?: {
    processed_transaction_ids?: string[];
    processed_event_ids?: string[];
  };
  request: {
    params: { txn_id: string };
    headers: { authorization?: string };
    body: { events: unknown[] };
  };
};

export type MatrixTransactionOutcome = {
  response: {
    status: number;
    body: { code: string; retryable: boolean };
  };
  committed: boolean;
  runtimeEvents: unknown[];
  failureEvents: Array<{ enqueue: { status: string } }>;
};

export class FakeMatrixHomeserver {
  private readonly root: string;
  private readonly createHandler: FakeMatrixHomeserverOptions["createHandler"];

  constructor(options: FakeMatrixHomeserverOptions) {
    this.root = options.root;
    this.createHandler = options.createHandler;
  }

  submitFixture(name: string) {
    const queue = new FakeRuntimeEventQueue();
    const fixture = JSON.parse(
      readFileSync(
        path.join(this.root, "fixtures/matrix-transactions", `${name}.json`),
        "utf8",
      ),
    ) as MatrixTransactionFixture;
    const handler = this.createHandler({ queue, fixture });
    const outcome = handler.handle(fixture.request);

    return {
      ...outcome,
      fixture,
      queue,
    };
  }
}
