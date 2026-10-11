import { test } from "node:test";
import assert from "node:assert/strict";
import { createI18n, resolveLocale, KEYS } from "../src/i18n.js";

test("resolveLocale prefers option, then data, then page", () => {
  assert.equal(resolveLocale({ option: "de", dataLang: "ru", pageLang: "en" }), "de");
  assert.equal(resolveLocale({ dataLang: "ru", pageLang: "en" }), "ru");
  assert.equal(resolveLocale({ pageLang: "en-GB" }), "en-GB");
  assert.equal(resolveLocale({}), "en");
});

test("built-in language is used as is", () => {
  const i = createI18n({ locale: "ru-RU" });
  assert.equal(i.lang, "ru");
  assert.equal(i.t("premise"), "Посылка");
  assert.deepEqual(i.missing, []);
});

test("unknown language falls back to English per key and warns", () => {
  const warnings = [];
  const i = createI18n({ locale: "es", strings: { premise: "Premisa" }, warn: w => warnings.push(w) });
  assert.equal(i.t("premise"), "Premisa");
  assert.equal(i.t("conclusion"), "Conclusion");
  assert.ok(i.missing.includes("conclusion"));
  assert.ok(warnings.some(w => w.includes("es")));
});

test("a string that drops a placeholder is rejected", () => {
  const warnings = [];
  const i = createI18n({ locale: "es", strings: { derived: "De" }, warn: w => warnings.push(w) });
  assert.equal(i.t("derived"), "From {refs}");
  assert.deepEqual(i.broken, ["derived"]);
});

test("unknown keys are reported, placeholders are filled", () => {
  const warnings = [];
  const i = createI18n({ locale: "en", strings: { nope: "x" }, warn: w => warnings.push(w) });
  assert.deepEqual(i.unknown, ["nope"]);
  assert.equal(i.t("nodeLabel", { id: 3, text: "T" }), "Thesis 3: T");
});

test("listParts follows the language's conjunction rules", () => {
  const join = (i, n) => i.listParts(n).map(p => (p.type === "element" ? `[${p.index}]` : p.value)).join("");
  assert.equal(join(createI18n({ locale: "ru" }), 3), "[0], [1] и [2]");
  assert.equal(join(createI18n({ locale: "en" }), 3), "[0], [1], and [2]");
  assert.equal(join(createI18n({ locale: "en" }), 1), "[0]");
});

test("every key has a value in every built-in language", () => {
  for (const lang of ["en", "ru"]) {
    const i = createI18n({ locale: lang });
    for (const k of KEYS) assert.ok(i.table[k], `${lang}.${k}`);
  }
});
