import { DataError, fail, isId, ID_MESSAGE, linkTheses, ancestors, descendants } from "./graph.js";
import { validateAnalysis } from "./analysis.js";

export { DataError, ancestors, descendants };

/**
 * Checks the data and returns a normalized model.
 * Throws DataError with a readable message on the first problem found.
 */
export function validate(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) fail("data must be an object");
  if (!Array.isArray(data.theses) || data.theses.length === 0) fail("data.theses must be a non-empty array");

  const sections = new Map();
  if (data.sections !== undefined) {
    if (!Array.isArray(data.sections)) fail("data.sections must be an array");
    data.sections.forEach((s, i) => {
      if (!s || !isId(s.id)) fail(`sections[${i}].id ${ID_MESSAGE}`);
      if (typeof s.title !== "string" || !s.title.trim()) fail(`sections[${i}].title must be a non-empty string`);
      const key = String(s.id);
      if (sections.has(key)) fail(`duplicate section id "${key}"`);
      sections.set(key, { id: s.id, key, title: s.title });
    });
  }

  const theses = [];
  const keys = new Set();
  data.theses.forEach((t, i) => {
    const where = `theses[${i}]`;
    if (!t || typeof t !== "object") fail(`${where} must be an object`);
    if (!isId(t.id)) fail(`${where}.id ${ID_MESSAGE}`);
    const key = String(t.id);
    if (keys.has(key)) fail(`duplicate thesis id "${key}"`);
    keys.add(key);
    if (typeof t.label !== "string" || !t.label.trim()) fail(`thesis ${key}: label must be a non-empty string`);
    if (typeof t.text !== "string" || !t.text.trim()) fail(`thesis ${key}: text must be a non-empty string`);
    if (t.note !== undefined && typeof t.note !== "string") fail(`thesis ${key}: note must be a string`);
    if (t.from !== undefined && !Array.isArray(t.from)) fail(`thesis ${key}: from must be an array`);
    let section = null;
    if (t.section !== undefined) {
      section = String(t.section);
      if (!sections.has(section)) fail(`thesis ${key}: unknown section "${section}"`);
    }
    theses.push({
      id: t.id,
      key,
      index: i,
      label: t.label,
      text: t.text,
      note: t.note || "",
      section,
      from: (t.from || []).map(String)
    });
  });

  const { byKey, children } = linkTheses(theses);

  let start = theses[0].key;
  if (data.start !== undefined) {
    start = String(data.start);
    if (!byKey.has(start)) fail(`start refers to missing thesis "${start}"`);
  }

  let source = null;
  if (data.source !== undefined) {
    const s = data.source;
    if (!s || typeof s !== "object") fail("data.source must be an object");
    if (s.url !== undefined && (typeof s.url !== "string" || !/^https?:\/\//.test(s.url))) fail("data.source.url must be an http(s) URL");
    source = { title: s.title || "", url: s.url || "", author: s.author || "" };
  }

  if (data.strings !== undefined && (typeof data.strings !== "object" || Array.isArray(data.strings) || data.strings === null)) {
    fail("data.strings must be an object");
  }

  const model = {
    lang: typeof data.lang === "string" ? data.lang : "",
    title: typeof data.title === "string" ? data.title : "",
    source,
    sections,
    theses,
    byKey,
    children,
    start,
    strings: data.strings || null,
    analysis: null
  };
  if (data.analysis !== undefined) model.analysis = validateAnalysis(data.analysis, model);
  return model;
}
