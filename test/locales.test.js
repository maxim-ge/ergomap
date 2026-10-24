import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { BUILTIN } from "../src/i18n.js";

const read = async p => JSON.parse(await readFile(new URL(p, import.meta.url), "utf8"));
const ph = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

test("strings.json lists exactly the keys of en.json with the same English text", async () => {
  const en = await read("../locales/en.json");
  const strings = await read("../locales/strings.json");
  assert.deepEqual(Object.keys(strings.keys).sort(), Object.keys(en).sort());
  for (const [k, v] of Object.entries(strings.keys)) {
    assert.equal(v.en, en[k], k);
    assert.ok(v.usage, `${k} needs a usage note`);
  }
});

test("every built-in dictionary has all keys and keeps placeholders", async () => {
  const en = await read("../locales/en.json");
  const index = await read("../locales/index.json");
  for (const lang of index.builtin) {
    const d = await read(`../locales/${lang}.json`);
    assert.deepEqual(Object.keys(d).sort(), Object.keys(en).sort(), lang);
    for (const k of Object.keys(en)) assert.deepEqual(ph(d[k]), ph(en[k]), `${lang}.${k}`);
  }
});

// The skill skips translating a language listed here, so a listed language the viewer doesn't bundle would show English UI.
test("index.json lists exactly the languages the viewer bundles", async () => {
  const index = await read("../locales/index.json");
  assert.deepEqual([...index.builtin].sort(), Object.keys(BUILTIN).sort());
});
