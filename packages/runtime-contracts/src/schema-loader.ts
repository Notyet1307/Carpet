import { readFileSync } from "node:fs";

export type JsonObject = Record<string, unknown>;

export function loadJsonFile(filePath: string | URL): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

export function loadJsonSchema(filePath: string | URL): JsonObject {
  const schema = loadJsonFile(filePath);

  if (!isJsonObject(schema)) {
    throw new Error(`JSON schema must be an object: ${String(filePath)}`);
  }

  return schema;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
