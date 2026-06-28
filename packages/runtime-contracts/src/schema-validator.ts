import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

import type { JsonObject } from "./schema-loader.ts";

export type SchemaValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: string[] };

export type SchemaValidator = (data: unknown) => SchemaValidationResult;

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validators = new Map<string, SchemaValidator>();

export function createSchemaValidator(schema: JsonObject): SchemaValidator {
  const key = schemaCacheKey(schema);
  const cached = validators.get(key);

  if (cached) {
    return cached;
  }

  const compiled = ajv.compile(schema);
  const validator: SchemaValidator = (data) => {
    if (compiled(data)) {
      return { valid: true, errors: [] };
    }

    return { valid: false, errors: formatValidationErrors(compiled.errors) };
  };

  validators.set(key, validator);
  return validator;
}

function schemaCacheKey(schema: JsonObject) {
  const id = schema.$id;

  if (typeof id === "string" && id.length > 0) {
    return id;
  }

  return JSON.stringify(schema);
}

function formatValidationErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors?.length) {
    return ["JSON schema validation failed"];
  }

  return errors.map((error) => {
    const location = error.instancePath || "$";
    const message = error.message || "is invalid";

    return `${location} ${message}`;
  });
}
