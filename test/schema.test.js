import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import { validate } from "../src/validate.js";

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), "utf8"));

test("examples match the JSON schema and pass runtime validation", async () => {
  const schema = await read("../schema/data.schema.json");
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const check = ajv.compile(schema);
  for (const name of ["agentic-poetry.json"]) {
    const data = await read(`../examples/${name}`);
    assert.ok(check(data), `${name}: ${ajv.errorsText(check.errors)}`);
    assert.doesNotThrow(() => validate(data), name);
  }
});

test("schema rejects unknown fields and a missing label", async () => {
  const schema = await read("../schema/data.schema.json");
  const check = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(check({ theses: [{ id: 1, label: "a", text: "b", extra: 1 }] }), false);
  assert.equal(check({ theses: [{ id: 1, text: "b" }] }), false);
});
