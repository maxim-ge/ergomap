import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validate, DataError } from "../src/validate.js";
import { combine } from "../src/analysis.js";
import { unionGraph, mapView } from "../src/versions.js";
import { computeLayout } from "../src/layout.js";
import { createI18n } from "../src/i18n.js";
import { createRouter } from "../src/router.js";

const example = async name => validate(JSON.parse(await readFile(new URL(`../examples/${name}`, import.meta.url), "utf8")));
const round = v => Math.round(v * 100) / 100;
const strengths = (a, version, keys) => Object.fromEntries(keys.map(k => [k, round(a.strengthOf(version, k).value)]));

test("SDD: key points by the key point rule, strengths from the weakest chains", async () => {
  const a = (await example("sdd-scrum-kanban.json")).analysis;
  assert.deepEqual(a.finals, ["10", "32", "33", "34"]);
  assert.deepEqual(a.keyPoints, ["6", "15", "17", "20", "21", "26", "29"]);
  assert.deepEqual(strengths(a, "reconstructed", ["10", "32", "33", "34", "6", "16", "20", "21", "26", "29"]), {
    10: 0.38, 32: 0.38, 33: 0.48, 34: 0.48, 6: 0.95, 16: 0.76, 20: 0.61, 21: 0.53, 26: 0, 29: 0.48
  });
  // the pool of 26 and 27: 26 rests on an unsupported claim, so the pool gives 27 alone
  assert.equal(round(a.strengthOf("reconstructed", "29").value), 0.48);
  assert.deepEqual(a.strengthOf("reconstructed", "34").link, { kind: "condition", key: "29", step: 0 });
  assert.equal(a.strengthOf("reconstructed", "16").link, null);
});

test("poetry: one claim per thesis keeps weak parts out of conclusions that don't use them", async () => {
  const a = (await example("agentic-poetry.json")).analysis;
  assert.deepEqual(a.finals, ["27", "36", "37", "38", "39", "41", "42"]);
  assert.deepEqual(a.keyPoints, ["6", "11", "12", "16", "17", "24", "25"]);
  assert.deepEqual(strengths(a, "reconstructed", ["27", "36", "37", "38", "41", "42", "6", "12", "17", "34"]), {
    27: 0.34, 36: 0.48, 37: 0.27, 38: 0.76, 41: 0.6, 42: 0.34, 6: 0.6, 12: 0.42, 17: 0.42, 34: 0.76
  });
  assert.deepEqual(a.strengthOf("reconstructed", "37").link, { kind: "condition", key: "21", step: 0 });
  assert.deepEqual(a.strengthOf("reconstructed", "6").link, { kind: "claim", key: "5" });
});

test("optimized logic keeps every final conclusion at the same strength with fewer starting claims", async () => {
  for (const name of ["sdd-scrum-kanban.json", "agentic-poetry.json"]) {
    const a = (await example(name)).analysis;
    for (const k of a.finals) {
      assert.equal(a.strengthOf("optimized", k).value, a.strengthOf("reconstructed", k).value, `${name}: ${k}`);
    }
    assert.ok(a.counts.optimized.claims < a.counts.reconstructed.claims, name);
  }
});

test("the original logic shows the reconstructed values", async () => {
  const a = (await example("sdd-scrum-kanban.json")).analysis;
  assert.equal(a.strengthOf("original", "29"), a.strengthOf("reconstructed", "29"));
  assert.ok(!a.versions.original.byKey.has("35"));
  assert.equal(round(a.strengthOf("original", "35").value), 0.6);
});

test("pools and steps of different types combine toward 0.95", () => {
  assert.equal(combine([0.6]), 0.6);
  assert.equal(round(combine([0.6, 0.6])), 0.82);
  assert.equal(round(combine([0.6, 0.6, 0.6])), 0.9);
  assert.equal(round(combine([0.6, 0.95])), 0.95);
  assert.equal(round(combine([0.6, 1])), 0.95);

  const data = {
    theses: [
      { id: 1, label: "a", text: "A." },
      { id: 2, label: "b", text: "B." },
      { id: 3, label: "c", text: "C.", from: [1, 2] }
    ],
    analysis: {
      reconstructed: [
        { id: 1, verdict: "weak", reason: "r" },
        { id: 2, verdict: "supported", reason: "r" },
        {
          id: 3,
          steps: [
            { from: [1], type: "abductive", condition: { text: "c", rating: "strong", reason: "r" } },
            { from: [2], type: "analogy", condition: { text: "c", rating: "weak", reason: "r" } }
          ]
        }
      ]
    }
  };
  const a = validate(data).analysis;
  // 0.8 * 0.6 = 0.48 and 0.7 * 0.6 = 0.42 combine like pool members; a reason of another type never lowers the conclusion
  assert.equal(round(a.strengthOf("reconstructed", "3").value), round(combine([0.48, 0.42])));
  assert.ok(a.strengthOf("reconstructed", "3").value > 0.48);
});

test("a flaw with no fix sets its thesis to 0", () => {
  const a = validate({
    theses: [{ id: 1, label: "a", text: "A." }, { id: 2, label: "b", text: "B.", from: [1] }],
    analysis: {
      issues: [{ id: "x", type: "inconsistency", severity: "flaw", target: "pair", theses: [1, 2], explanation: "e", quote: "q" }],
      reconstructed: [{ id: 1, verdict: "supported", reason: "r" }, { id: 2, from: [1], flaw: "x" }]
    }
  }).analysis;
  assert.deepEqual(a.strengthOf("reconstructed", "2"), { value: 0, link: { kind: "flaw", key: "2", issue: "x" } });
});

test("analysis errors are caught with readable messages", () => {
  const base = () => ({
    theses: [{ id: 1, label: "a", text: "A." }, { id: 2, label: "b", text: "B.", from: [1] }],
    analysis: {
      issues: [{ id: "i1", type: "non-sequitur", severity: "weakness", target: "inference", theses: [1, 2], explanation: "e", quote: "q" }],
      concepts: [{ term: "T", senses: [{ definition: "d", theses: [1] }] }],
      reconstructed: [{ id: 1, verdict: "supported", reason: "r" }, { id: 2, from: [1] }],
      optimized: [{ id: 1 }, { id: 2, from: [1] }]
    }
  });
  const rejects = (mutate, pattern) => {
    const d = base();
    mutate(d.analysis);
    assert.throws(() => validate(d), err => err instanceof DataError && pattern.test(err.message), String(pattern));
  };
  assert.doesNotThrow(() => validate(base()));
  rejects(a => { delete a.reconstructed[0].verdict; }, /needs a verdict/);
  rejects(a => { a.reconstructed[1].type = "abductive"; }, /needs an implicit condition/);
  rejects(a => { a.reconstructed[1].condition = { text: "c", rating: "strong", reason: "r" }; }, /deductive step has no implicit condition/);
  rejects(a => { a.reconstructed[1].verdict = "weak"; }, /only a starting claim has a verdict/);
  rejects(a => { a.reconstructed[1].pool = [1, 3]; }, /pool member "3" isn't in from/);
  rejects(a => { a.reconstructed.push({ id: 3, verdict: "weak", reason: "r" }); }, /needs a label and a text/);
  rejects(a => { a.reconstructed[1].from = [3]; }, /reconstructed: thesis 2: from refers to missing thesis "3"/);
  rejects(a => { a.optimized.push({ id: 5 }); }, /optimized: thesis 5 isn't in the reconstructed logic/);
  rejects(a => { a.reconstructed[1].fixes = ["nope"]; }, /missing issue "nope"/);
  rejects(a => { a.reconstructed[1].flaw = "i1"; }, /which is a weakness/);
  rejects(a => { a.issues[0].type = "post-hoc"; }, /type must be one of/);
  rejects(a => { a.issues[0].target = "pair"; a.issues[0].theses = [1]; }, /exactly two/);
  rejects(a => { a.issues[0].theses = [1]; }, /inference target/);
  rejects(a => { a.issues[0].target = "concept"; a.issues[0].concept = "U"; }, /term from analysis.concepts/);
  rejects(a => { a.concepts[0].senses[0].theses = [9]; }, /missing thesis "9"/);
  rejects(a => { delete a.reconstructed; }, /reconstructed is required/);
});

test("versions share one layout: every node of every version placed, pools kept as clusters", async () => {
  const m = await example("sdd-scrum-kanban.json");
  const g = unionGraph(m);
  assert.equal(g.theses.length, 35); // 34 in the original + the implicit premise 35
  assert.deepEqual(g.clusters, [["26", "27"]]);
  const measure = s => s.length * 7;
  const L = computeLayout(g, { measureLabel: measure, measureNum: measure, badge: 32 });
  const boxes = [...L.nodes.values()];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.equal(Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2, false, `nodes ${i} and ${j} overlap`);
    }
  }
});

test("each version draws its own theses, edges and pools", async () => {
  const m = await example("sdd-scrum-kanban.json");
  const i18n = createI18n({ locale: "en" });
  const original = mapView(m, "original", i18n);
  assert.ok(original.edges.some(e => e.u === "28" && e.v === "29" && e.cls === "em-broken"));
  assert.equal(original.pools.length, 0);
  assert.equal(original.theses.find(t => t.key === "29").badge, "0.48");
  const reconstructed = mapView(m, "reconstructed", i18n);
  assert.deepEqual(reconstructed.pools, [{ v: "29", members: ["26", "27"] }]);
  assert.ok(reconstructed.theses.find(t => t.key === "35").classes.includes("em-added"));
  assert.ok(!reconstructed.edges.some(e => e.u === "27" && e.v === "29"));
  const optimized = mapView(m, "optimized", i18n);
  assert.ok(optimized.theses.find(t => t.key === "22").faded);
  assert.ok(optimized.edges.some(e => e.u === "26" && e.v === "29" && e.cls === "em-faded"));
  assert.ok(!optimized.theses.find(t => t.key === "27").faded);
});

test("the router keeps views and versions in the hash", () => {
  const win = { location: { hash: "" }, addEventListener() {}, removeEventListener() {} };
  const r = createRouter({ win, onChange() {} });
  const states = [
    { view: "summary" },
    { view: "audit", issue: null },
    { view: "audit", issue: "i1" },
    { view: "logic", version: "original", key: "18" },
    { view: "logic", version: "reconstructed", key: "16a" },
    { view: "logic", version: "optimized", key: "22" }
  ];
  for (const s of states) assert.deepEqual(r.parse(r.format(s)), s);
  assert.equal(r.format({ view: "logic", version: "original", key: "18" }), "#t18");
  assert.equal(r.parse("#nothing"), null);
});
