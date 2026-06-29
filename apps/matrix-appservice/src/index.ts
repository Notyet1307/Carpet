import { pathToFileURL } from "node:url";

import {
  readManualMatrixAppserviceListenerOptions,
  readMatrixSmokeRunScaffoldOptions,
  startManualMatrixAppserviceListener,
  writeMatrixSmokeRunScaffold,
} from "./http-listener.ts";

export {
  buildMatrixSmokeRunScaffold,
  createMatrixAppserviceHttpListener,
  readManualMatrixAppserviceListenerOptions,
  readMatrixSmokeRunScaffoldOptions,
  startManualMatrixAppserviceListener,
  type MatrixAppserviceTransactionHandler,
  writeMatrixSmokeRunScaffold,
} from "./http-listener.ts";
export {
  createFixtureTransactionHandler,
  IdempotencyStore,
  MATRIX_FIXTURE_HS_TOKEN,
  TransactionHandler,
  type MatrixTransactionRequest,
  type TransactionOutcome,
} from "./transaction-handler.ts";
export {
  mapMatrixEventToRuntimeEvent,
  type MatrixEvent,
  type RuntimeEvent,
} from "./runtime-event-mapper.ts";
export {
  FakeMatrixProjectionAdapter,
  type MatrixProjectionContent,
  type MatrixProjectionRecord,
  type MatrixProjectionRequest,
} from "./projection-adapter.ts";

if (isDirectRun()) {
  const command = process.argv[2];

  try {
    if (command === "generate-matrix-smoke-config") {
      const scaffold = writeMatrixSmokeRunScaffold(
        readMatrixSmokeRunScaffoldOptions(),
      );
      console.log(`registration=${scaffold.files.registration}`);
      console.log(`log_config=${scaffold.files.logConfig}`);
      console.log(`listener_env=${scaffold.files.listenerEnv}`);
    } else if (command === "listen") {
      const options = readManualMatrixAppserviceListenerOptions();
      await startManualMatrixAppserviceListener(options);
      console.error(
        `matrix-appservice listener bound to ${options.host}:${options.port}`,
      );
    } else {
      console.error(
        "Usage: node apps/matrix-appservice/src/index.ts generate-matrix-smoke-config|listen",
      );
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function isDirectRun() {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && import.meta.url === pathToFileURL(entrypoint).href);
}
