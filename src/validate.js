const ID_STRING = /^[A-Za-z0-9_-]+$/;

export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataError";
  }
}

function fail(message) {
  throw new DataError(message);
}

function isId(v) {
  return (Number.isInteger(v) && v >= 0) || (typeof v === "string" && ID_STRING.test(v));
}

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
      if (!s || !isId(s.id)) fail(`sections[${i}].id must be a non-negative integer or a string of letters, digits, "-" and "_"`);
      if (typeof s.title !== "string" || !s.title.trim()) fail(`sections[${i}].title must be a non-empty string`);
      const key = String(s.id);
      if (sections.has(key)) fail(`duplicate section id "${key}"`);
      sections.set(key, { id: s.id, key, title: s.title });
    });
  }

  const theses = [];
  const byKey = new Map();
  data.theses.forEach((t, i) => {
    const where = `theses[${i}]`;
    if (!t || typeof t !== "object") fail(`${where} must be an object`);
    if (!isId(t.id)) fail(`${where}.id must be a non-negative integer or a string of letters, digits, "-" and "_"`);
    const key = String(t.id);
    if (byKey.has(key)) fail(`duplicate thesis id "${key}"`);
    if (typeof t.label !== "string" || !t.label.trim()) fail(`thesis ${key}: label must be a non-empty string`);
    if (typeof t.text !== "string" || !t.text.trim()) fail(`thesis ${key}: text must be a non-empty string`);
    if (t.note !== undefined && typeof t.note !== "string") fail(`thesis ${key}: note must be a string`);
    if (t.from !== undefined && !Array.isArray(t.from)) fail(`thesis ${key}: from must be an array`);
    let section = null;
    if (t.section !== undefined) {
      section = String(t.section);
      if (!sections.has(section)) fail(`thesis ${key}: unknown section "${section}"`);
    }
    const node = {
      id: t.id,
      key,
      index: i,
      label: t.label,
      text: t.text,
      note: t.note || "",
      section,
      from: (t.from || []).map(String)
    };
    byKey.set(key, node);
    theses.push(node);
  });

  const children = new Map(theses.map(t => [t.key, []]));
  for (const t of theses) {
    const seen = new Set();
    for (const p of t.from) {
      if (p === t.key) fail(`thesis ${t.key} lists itself in from`);
      if (!byKey.has(p)) fail(`thesis ${t.key}: from refers to missing thesis "${p}"`);
      if (seen.has(p)) fail(`thesis ${t.key}: from lists "${p}" twice`);
      seen.add(p);
      children.get(p).push(t.key);
    }
  }

  // cycle check: iterative DFS with colors
  const color = new Map();
  for (const start of theses) {
    if (color.get(start.key)) continue;
    const stack = [[start.key, 0]];
    color.set(start.key, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const parents = byKey.get(top[0]).from;
      if (top[1] < parents.length) {
        const next = parents[top[1]++];
        const c = color.get(next);
        if (c === 1) fail(`cycle in from involving theses "${next}" and "${top[0]}"`);
        if (!c) { color.set(next, 1); stack.push([next, 0]); }
      } else {
        color.set(top[0], 2);
        stack.pop();
      }
    }
  }

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

  return {
    lang: typeof data.lang === "string" ? data.lang : "",
    title: typeof data.title === "string" ? data.title : "",
    source,
    sections,
    theses,
    byKey,
    children,
    start,
    strings: data.strings || null
  };
}

export function ancestors(model, key) {
  return closure(key, k => model.byKey.get(k).from);
}

export function descendants(model, key) {
  return closure(key, k => model.children.get(k));
}

function closure(start, next) {
  const seen = new Set();
  const stack = [...next(start)];
  while (stack.length) {
    const k = stack.pop();
    if (seen.has(k)) continue;
    seen.add(k);
    stack.push(...next(k));
  }
  return seen;
}
