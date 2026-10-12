import { fail, isId, ID_MESSAGE, linkTheses, closure } from "./graph.js";

/* The numbers of the strength model. The data names reasoning types, verdicts and ratings, never numbers. */
export const STEP_STRENGTH = { deductive: 1, generalization: 0.9, abductive: 0.8, analogy: 0.7 };
export const VERDICTS = { supported: 0.95, weak: 0.6, unsupported: 0, false: 0, definition: 1 };
export const RATINGS = { strong: 0.95, weak: 0.6, none: 0 };

export const ISSUE_TYPES = ["non-sequitur", "missing-premise", "circular", "equivocation", "straw-man", "inconsistency", "irrelevant-conclusion"];
export const SEVERITIES = ["flaw", "weakness"];
export const TARGETS = ["inference", "thesis", "concept", "pair", "argument"];
export const VERSIONS = ["original", "reconstructed", "optimized"];

/** Nothing that can be wrong scores above a supported claim. */
const LIMIT = VERDICTS.supported;
const KEY_POINTS_MAX = 7;
const CONCEPTS_MAX = 7;
const EPS = 1e-9;

const has = (table, name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(table, name);
const isObject = v => !!v && typeof v === "object" && !Array.isArray(v);
const isText = v => typeof v === "string" && v.trim() !== "";

function parseIds(raw, where) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail(`${where} must be an array`);
  return raw.map(v => {
    if (!isId(v)) fail(`${where}: "${v}" isn't a thesis id`);
    return String(v);
  });
}

/**
 * Checks data.analysis against the original model and returns everything the views need:
 * the three versions, issues, concepts, strengths, key points and final conclusions.
 */
export function validateAnalysis(raw, original) {
  if (!isObject(raw)) fail("data.analysis must be an object");
  const concepts = parseConcepts(raw.concepts);
  const issues = parseIssues(raw.issues);
  if (raw.reconstructed === undefined) fail("analysis.reconstructed is required: strength is computed in the reconstructed logic");
  const reconstructed = parseVersion("reconstructed", raw.reconstructed, original, original);
  const optimized = raw.optimized === undefined ? null : parseVersion("optimized", raw.optimized, reconstructed, original);
  const versions = { original, reconstructed, optimized };

  const issueByKey = new Map(issues.map(x => [x.key, x]));
  for (const v of [reconstructed, optimized]) {
    if (!v) continue;
    for (const t of v.theses) {
      for (const f of t.fixes) if (!issueByKey.has(f)) fail(`${v.name}: thesis ${t.key}: fixes refers to missing issue "${f}"`);
      if (t.flaw === null) continue;
      const x = issueByKey.get(t.flaw);
      if (!x) fail(`${v.name}: thesis ${t.key}: flaw refers to missing issue "${t.flaw}"`);
      if (x.severity !== "flaw") fail(`${v.name}: thesis ${t.key}: flaw refers to issue "${t.flaw}", which is a weakness`);
    }
  }
  for (const x of issues) checkTarget(x, versions, concepts);
  for (const c of concepts) {
    for (const s of c.senses) for (const k of s.theses) if (!findThesis(versions, k)) fail(`concept "${c.term}": theses refers to missing thesis "${k}"`);
  }

  const strength = { reconstructed: computeStrength(reconstructed), optimized: optimized ? computeStrength(optimized) : null };
  const byThesis = new Map();
  for (const x of issues) {
    for (const k of x.theses) {
      if (!byThesis.has(k)) byThesis.set(k, []);
      byThesis.get(k).push(x);
    }
  }
  const count = v => ({ theses: v.theses.length, claims: v.theses.filter(t => !t.steps.length).length });

  return {
    versions,
    issues,
    concepts,
    issueByKey,
    fixedBy: new Map(issues.map(x => [x.key, reconstructed.theses.filter(t => t.fixes.includes(x.key)).map(t => t.key)])),
    broken: issues.filter(x => x.severity === "flaw" && x.target === "inference").map(x => inference(x, versions)),
    finals: finalConclusions(original),
    keyPoints: keyPoints(original),
    counts: { reconstructed: count(reconstructed), optimized: optimized ? count(optimized) : null },
    issuesOf: key => byThesis.get(key) || [],
    /** Strength of a thesis in a version; the original logic shows the values of the reconstructed one. */
    strengthOf(version, key) {
      const table = version === "optimized" ? strength.optimized : strength.reconstructed;
      return (table && table.get(key)) || null;
    }
  };
}

// ---- versions

function parseVersion(name, list, base, original) {
  if (!Array.isArray(list) || list.length === 0) fail(`analysis.${name} must be a non-empty array of theses`);
  const theses = list.map((raw, i) => parseVersionThesis(raw, i, name, base, original));
  const { byKey, children } = linkTheses(theses, `${name}: `);
  const start = byKey.has(original.start) ? original.start : theses[0].key;
  return { name, theses, byKey, children, sections: original.sections, start };
}

/**
 * A thesis of the reconstructed or optimized logic. Label, text, note and section default to the thesis
 * with the same id in the version it's built from; the optimized logic also inherits verdicts, steps' types
 * and implicit conditions, fixes and flaws. from and pool are never inherited.
 */
function parseVersionThesis(raw, i, name, base, original) {
  if (!isObject(raw)) fail(`analysis.${name}[${i}] must be an object`);
  if (!isId(raw.id)) fail(`analysis.${name}[${i}].id ${ID_MESSAGE}`);
  const key = String(raw.id);
  const at = `${name}: thesis ${key}`;
  const inherited = base.byKey.get(key) || null;
  const analysed = name === "optimized" ? inherited : null;
  if (name === "optimized" && !inherited) fail(`${at} isn't in the reconstructed logic`);

  for (const f of ["label", "text"]) if (raw[f] !== undefined && !isText(raw[f])) fail(`${at}: ${f} must be a non-empty string`);
  if (raw.note !== undefined && typeof raw.note !== "string") fail(`${at}: note must be a string`);
  const label = raw.label !== undefined ? raw.label : inherited && inherited.label;
  const text = raw.text !== undefined ? raw.text : inherited && inherited.text;
  if (!label || !text) fail(`${at}: a thesis that isn't in the original needs a label and a text`);
  let section = inherited ? inherited.section : null;
  if (raw.section !== undefined) {
    section = String(raw.section);
    if (!original.sections.has(section)) fail(`${at}: unknown section "${section}"`);
  }

  const steps = parseSteps(raw, at, analysed);
  let verdict = null;
  let reason = "";
  if (!steps.length) {
    const own = analysed && !analysed.steps.length ? analysed : null;
    verdict = raw.verdict !== undefined ? raw.verdict : own && own.verdict;
    reason = raw.reason !== undefined ? raw.reason : own && own.reason;
    if (!has(VERDICTS, verdict)) fail(`${at}: a starting claim needs a verdict: ${Object.keys(VERDICTS).join(", ")}`);
    if (!isText(reason)) fail(`${at}: the verdict needs a reason`);
  } else if (raw.verdict !== undefined || raw.reason !== undefined) {
    fail(`${at}: only a starting claim has a verdict`);
  }

  const fixes = raw.fixes !== undefined ? parseIds(raw.fixes, `${at}: fixes`) : analysed ? analysed.fixes : [];
  let flaw = analysed && steps.length ? analysed.flaw : null;
  if (raw.flaw !== undefined) {
    if (!isId(raw.flaw)) fail(`${at}: flaw must be an issue id`);
    if (!steps.length) fail(`${at}: only a conclusion has a flaw`);
    flaw = String(raw.flaw);
  }

  return {
    id: raw.id,
    key,
    index: i,
    label,
    text,
    note: raw.note !== undefined ? raw.note : (inherited && inherited.note) || "",
    section,
    from: steps.flatMap(s => s.from),
    steps,
    verdict,
    reason,
    fixes,
    flaw,
    added: !original.byKey.has(key)
  };
}

function parseSteps(raw, at, analysed) {
  if (raw.steps !== undefined) {
    for (const f of ["from", "type", "condition", "pool"]) {
      if (raw[f] !== undefined) fail(`${at}: give either steps or from, type, condition and pool`);
    }
    if (!Array.isArray(raw.steps) || raw.steps.length < 2) fail(`${at}: steps lists at least two steps; a single step goes in from`);
    return raw.steps.map((s, j) => {
      if (!isObject(s)) fail(`${at}: step ${j + 1} must be an object`);
      return parseStep(s, `${at}, step ${j + 1}`, null);
    });
  }
  const from = parseIds(raw.from, `${at}: from`);
  if (!from.length) {
    for (const f of ["type", "condition", "pool"]) if (raw[f] !== undefined) fail(`${at}: a starting claim has no ${f}`);
    return [];
  }
  const inherit = analysed && analysed.steps.length === 1 && raw.type === undefined && raw.condition === undefined ? analysed.steps[0] : null;
  return [parseStep(raw, at, inherit)];
}

function parseStep(raw, at, inherit) {
  const from = parseIds(raw.from, `${at}: from`);
  if (!from.length) fail(`${at}: a step needs premises in from`);
  const type = raw.type !== undefined ? raw.type : inherit ? inherit.type : "deductive";
  if (!has(STEP_STRENGTH, type)) fail(`${at}: type must be one of ${Object.keys(STEP_STRENGTH).join(", ")}`);
  let condition = null;
  if (type !== "deductive") {
    const c = raw.condition !== undefined ? raw.condition : inherit ? inherit.condition : undefined;
    if (!isObject(c)) fail(`${at}: a ${type} step needs an implicit condition`);
    if (!isText(c.text)) fail(`${at}: the implicit condition needs a text`);
    if (!has(RATINGS, c.rating)) fail(`${at}: the implicit condition's rating must be one of ${Object.keys(RATINGS).join(", ")}`);
    if (!isText(c.reason)) fail(`${at}: the implicit condition needs a reason`);
    condition = { text: c.text, rating: c.rating, reason: c.reason };
  } else if (raw.condition !== undefined) {
    fail(`${at}: a deductive step has no implicit condition`);
  }
  let pool = null;
  if (raw.pool !== undefined) {
    pool = parseIds(raw.pool, `${at}: pool`);
    if (pool.length < 2) fail(`${at}: a pool needs at least two members`);
    if (new Set(pool).size !== pool.length) fail(`${at}: pool lists a member twice`);
    for (const m of pool) if (!from.includes(m)) fail(`${at}: pool member "${m}" isn't in from`);
  }
  return { from, type, condition, pool };
}

// ---- issues and concepts

function parseIssues(raw) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail("analysis.issues must be an array");
  const keys = new Set();
  return raw.map((x, i) => {
    if (!isObject(x)) fail(`analysis.issues[${i}] must be an object`);
    if (!isId(x.id)) fail(`analysis.issues[${i}].id ${ID_MESSAGE}`);
    const key = String(x.id);
    const at = `issue ${key}`;
    if (keys.has(key)) fail(`duplicate issue id "${key}"`);
    keys.add(key);
    if (!ISSUE_TYPES.includes(x.type)) fail(`${at}: type must be one of ${ISSUE_TYPES.join(", ")}`);
    if (!SEVERITIES.includes(x.severity)) fail(`${at}: severity must be one of ${SEVERITIES.join(", ")}`);
    if (!TARGETS.includes(x.target)) fail(`${at}: target must be one of ${TARGETS.join(", ")}`);
    if (!isText(x.explanation)) fail(`${at}: explanation must be a non-empty string`);
    if (!isText(x.quote)) fail(`${at}: quote must be a non-empty string`);
    if (x.concept !== undefined && !isText(x.concept)) fail(`${at}: concept must be a non-empty string`);
    return {
      id: x.id,
      key,
      type: x.type,
      severity: x.severity,
      target: x.target,
      theses: parseIds(x.theses, `${at}: theses`),
      concept: x.concept === undefined ? null : x.concept,
      explanation: x.explanation,
      quote: x.quote
    };
  });
}

function parseConcepts(raw) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail("analysis.concepts must be an array");
  if (raw.length > CONCEPTS_MAX) fail(`analysis.concepts lists at most ${CONCEPTS_MAX} concepts`);
  const terms = new Set();
  return raw.map((c, i) => {
    if (!isObject(c) || !isText(c.term)) fail(`analysis.concepts[${i}].term must be a non-empty string`);
    if (terms.has(c.term)) fail(`duplicate concept "${c.term}"`);
    terms.add(c.term);
    if (!Array.isArray(c.senses) || !c.senses.length) fail(`concept "${c.term}": senses must be a non-empty array`);
    const senses = c.senses.map((s, j) => {
      if (!isObject(s) || !isText(s.definition)) fail(`concept "${c.term}": sense ${j + 1} needs a definition`);
      const theses = parseIds(s.theses, `concept "${c.term}": sense ${j + 1}: theses`);
      if (!theses.length) fail(`concept "${c.term}": sense ${j + 1} needs the theses that use it`);
      return { definition: s.definition, theses };
    });
    return { term: c.term, senses };
  });
}

/** Issues and concepts refer to the original logic first, then to the reconstructed and optimized ones. */
export function findThesis(versions, key) {
  for (const name of VERSIONS) {
    const v = versions[name];
    if (v && v.byKey.has(key)) return { version: name, thesis: v.byKey.get(key) };
  }
  return null;
}

/** The conclusion of an inference target: the listed thesis that follows from all the others. */
function inference(issue, versions) {
  for (const name of ["original", "reconstructed"]) {
    const v = versions[name];
    for (const k of issue.theses) {
      const t = v.byKey.get(k);
      const others = issue.theses.filter(o => o !== k);
      if (t && t.from.length && others.every(o => t.from.includes(o))) {
        return { version: name, key: k, premises: others.length ? others : t.from, issue: issue.key };
      }
    }
  }
  return null;
}

function checkTarget(issue, versions, concepts) {
  const at = `issue ${issue.key}`;
  for (const k of issue.theses) if (!findThesis(versions, k)) fail(`${at}: theses refers to missing thesis "${k}"`);
  const n = issue.theses.length;
  if (issue.target === "thesis" && n !== 1) fail(`${at}: a thesis target lists exactly one thesis`);
  if (issue.target === "pair" && n !== 2) fail(`${at}: a pair target lists exactly two theses`);
  if (issue.target === "inference" && !inference(issue, versions)) {
    fail(`${at}: an inference target lists a conclusion and, optionally, the premises at fault`);
  }
  if (issue.target === "concept" && !concepts.some(c => c.term === issue.concept)) fail(`${at}: concept must be a term from analysis.concepts`);
  if (issue.target !== "concept" && issue.concept !== null) fail(`${at}: only a concept target names a concept`);
}

// ---- strength

/**
 * Pool strength: each member closes its share of the gap that remains to a supported claim's number,
 * LIMIT * (1 - (1 - s1/LIMIT)(1 - s2/LIMIT)...), each s counted as at most LIMIT. One member gives itself.
 * Steps of different types for one conclusion combine the same way.
 */
export function combine(values) {
  if (values.length === 1) return values[0];
  let gap = 1;
  for (const v of values) gap *= 1 - Math.min(v, LIMIT) / LIMIT;
  return LIMIT * (1 - gap);
}

/**
 * A thesis's strength is its step's strength times the weakest of its premises and its implicit condition;
 * a starting claim's is its verdict's number; a flaw with no fix sets it to 0.
 * Each value carries the weakest link that lowered it: a weak, unsupported or false starting claim,
 * a weak or failed implicit condition, a flaw, or a pool of such evidence; null when only step strengths lowered it.
 */
export function computeStrength(version) {
  const memo = new Map();

  const step = (t, s, index) => {
    const parts = [];
    if (s.condition) {
      parts.push({ value: RATINGS[s.condition.rating], link: s.condition.rating === "strong" ? null : { kind: "condition", key: t.key, step: index } });
    }
    const pool = s.pool || [];
    for (const p of s.from) if (!pool.includes(p)) parts.push(strength(p));
    if (pool.length) {
      const members = pool.map(strength);
      parts.push({
        value: combine(members.map(m => m.value)),
        link: members.some(m => m.link) ? { kind: "pool", key: t.key, step: index, members: pool } : null
      });
    }
    const min = Math.min(...parts.map(p => p.value));
    const weakest = parts.filter(p => p.value <= min + EPS);
    return { value: STEP_STRENGTH[s.type] * min, link: (weakest.find(p => p.link) || weakest[0]).link };
  };

  const strength = key => {
    let s = memo.get(key);
    if (s) return s;
    const t = version.byKey.get(key);
    if (t.flaw !== null) {
      s = { value: 0, link: { kind: "flaw", key, issue: t.flaw } };
    } else if (!t.steps.length) {
      const value = VERDICTS[t.verdict];
      s = { value, link: value < LIMIT ? { kind: "claim", key } : null };
    } else {
      const results = t.steps.map((x, i) => step(t, x, i));
      const best = results.reduce((a, b) => (b.value > a.value + EPS ? b : a));
      s = { value: combine(results.map(r => r.value)), link: best.link };
    }
    memo.set(key, s);
    return s;
  };

  for (const t of version.theses) strength(t.key);
  return memo;
}

// ---- argument structure

/** Conclusions that nothing else follows from. */
export function finalConclusions(model) {
  return model.theses.filter(t => t.from.length && !model.children.get(t.key).length).map(t => t.key);
}

/**
 * The key point rule: conclusions ranked by the number of theses behind them times the number depending on them,
 * cut where a score falls below half of the previous one, at most 7. Returned in reading order.
 */
export function keyPoints(model) {
  const scored = [];
  for (const t of model.theses) {
    if (!t.from.length || !model.children.get(t.key).length) continue;
    const behind = closure(t.key, k => model.byKey.get(k).from).size;
    const ahead = closure(t.key, k => model.children.get(k)).size;
    scored.push({ key: t.key, index: t.index, score: behind * ahead });
  }
  scored.sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const s of scored) {
    if (chosen.length === KEY_POINTS_MAX || (chosen.length && s.score < chosen[chosen.length - 1].score / 2)) break;
    chosen.push(s);
  }
  return chosen.sort((a, b) => a.index - b.index).map(s => s.key);
}
