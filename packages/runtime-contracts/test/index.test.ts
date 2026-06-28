import { strictEqual } from "node:assert";
import test from "node:test";

import { RUNTIME_CONTRACTS_PACKAGE_MARKER } from "runtime-contracts";

test("exports a stable runtime contracts package marker", () => {
  strictEqual(RUNTIME_CONTRACTS_PACKAGE_MARKER, "runtime-contracts");
});
