import * as yaml from "yaml/yaml/mod.ts";
import { Testcases } from "./compiler.ts";

export function parseTestCases(yamlData: string): Testcases {
  // zod나 ajv로 parsing?
  return yaml.parse(yamlData) as Testcases
}