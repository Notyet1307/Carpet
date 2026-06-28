export const RUNTIME_CONTRACTS_PACKAGE_MARKER = "runtime-contracts" as const;
export { loadJsonFile, loadJsonSchema } from "./schema-loader.ts";
export {
  createSchemaValidator,
  type SchemaValidationResult,
  type SchemaValidator,
} from "./schema-validator.ts";
