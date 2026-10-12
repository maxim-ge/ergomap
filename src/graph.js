const ID_STRING = /^[A-Za-z0-9_-]+$/;

export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = "DataError";
  }
}

export function fail(message) {
  throw new DataError(message);
}

export function isId(v) {
  return (Number.isInteger(v) && v >= 0) || (typeof v === "string" && ID_STRING.test(v));
}

export const ID_MESSAGE = 'must be a non-negative integer or a string of letters, digits, "-" and "_"';

/**
 * Links normalized theses ({ key, from }) into a graph: checks references and cycles, returns byKey and children.
 * prefix names the version in messages, e.g. "reconstructed: ".
 */
export function linkTheses(theses, prefix = "") {
  const byKey = new Map();
  for (const t of theses) {
    if (byKey.has(t.key)) fail(`${prefix}duplicate thesis id "${t.key}"`);
    byKey.set(t.key, t);
  }
  const children = new Map(theses.map(t => [t.key, []]));
  for (const t of theses) {
    const seen = new Set();
    for (const p of t.from) {
      if (p === t.key) fail(`${prefix}thesis ${t.key} lists itself in from`);
      if (!byKey.has(p)) fail(`${prefix}thesis ${t.key}: from refers to missing thesis "${p}"`);
      if (seen.has(p)) fail(`${prefix}thesis ${t.key}: from lists "${p}" twice`);
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
        if (c === 1) fail(`${prefix}cycle in from involving theses "${next}" and "${top[0]}"`);
        if (!c) { color.set(next, 1); stack.push([next, 0]); }
      } else {
        color.set(top[0], 2);
        stack.pop();
      }
    }
  }
  return { byKey, children };
}

export function ancestors(model, key) {
  return closure(key, k => model.byKey.get(k).from);
}

export function descendants(model, key) {
  return closure(key, k => model.children.get(k));
}

export function closure(start, next) {
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
