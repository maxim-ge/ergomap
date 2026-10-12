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
  for (const name of ["sdd-scrum-kanban.json", "agentic-poetry.json"]) {
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

test("schema checks the analysis: names from fixed lists, analysis fields only in versions", async () => {
  const schema = await read("../schema/data.schema.json");
  const check = new Ajv2020({ strict: false }).compile(schema);
  const theses = [{ id: 1, label: "a", text: "b" }];
  assert.equal(check({ theses, analysis: { reconstructed: [{ id: 1, verdict: "supported", reason: "r" }] } }), true);
  assert.equal(check({ theses, analysis: { reconstructed: [{ id: 1, verdict: "likely", reason: "r" }] } }), false);
  assert.equal(check({ theses, analysis: {} }), false);
  assert.equal(check({ theses: [{ id: 1, label: "a", text: "b", verdict: "weak" }] }), false);
  const issue = { id: "i1", type: "post-hoc", severity: "flaw", target: "thesis", theses: [1], explanation: "e", quote: "q" };
  assert.equal(check({ theses, analysis: { issues: [issue], reconstructed: [{ id: 1, verdict: "weak", reason: "r" }] } }), false);
});
