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

test("SDD: key points by the key point rule, strengths as in the calibration", async () => {
  const a = (await example("sdd-scrum-kanban.json")).analysis;
  assert.deepEqual(a.finals, ["22"]);
  assert.deepEqual(a.keyPoints, ["5", "10", "11", "14", "15", "18", "20"]);
  assert.deepEqual(strengths(a, "reconstructed", ["22", "5", "10", "11", "14", "15", "18", "20"]), {
    22: 0.38, 5: 0.95, 10: 0.76, 11: 0.76, 14: 0.61, 15: 0.53, 18: 0.48, 20: 0.38
  });
  // the pool of 16 and 17a: 16 rests on an unsupported claim, so the pool gives 17a alone
  assert.equal(round(a.strengthOf("reconstructed", "16").value), 0);
  assert.deepEqual(a.strengthOf("reconstructed", "22").link, { kind: "condition", key: "18", step: 0 });
  assert.equal(a.strengthOf("reconstructed", "10").link, null);
});

test("poetry: splitting the bundled axioms frees 22, the weakest chain still decides 27", async () => {
  const a = (await example("agentic-poetry.json")).analysis;
  assert.deepEqual(a.finals, ["20", "27"]);
  assert.deepEqual(a.keyPoints, ["6", "10", "11", "13", "18", "19"]);
  assert.deepEqual(strengths(a, "reconstructed", ["20", "27", "6", "11", "13", "18", "22", "23", "26"]), {
    20: 0.34, 27: 0.27, 6: 0.6, 11: 0.42, 13: 0.42, 18: 0.34, 22: 0.76, 23: 0.48, 26: 0.6
  });
  assert.deepEqual(a.strengthOf("reconstructed", "27").link, { kind: "condition", key: "16", step: 0 });
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
  assert.equal(a.strengthOf("original", "18"), a.strengthOf("reconstructed", "18"));
  assert.equal(a.strengthOf("original", "17"), null);
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
  assert.equal(g.theses.length, 26); // 25 reconstructed + 17 from the original
  assert.deepEqual(g.clusters, [["16", "17a"]]);
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
  assert.ok(original.edges.some(e => e.u === "17" && e.v === "18" && e.cls === "em-broken"));
  assert.equal(original.pools.length, 0);
  assert.equal(original.theses.find(t => t.key === "18").badge, "0.48");
  const reconstructed = mapView(m, "reconstructed", i18n);
  assert.deepEqual(reconstructed.pools, [{ v: "18", members: ["16", "17a"] }]);
  assert.ok(reconstructed.theses.find(t => t.key === "16a").classes.includes("em-added"));
  assert.ok(!reconstructed.edges.some(e => e.u === "17a" && e.v === "18"));
  const optimized = mapView(m, "optimized", i18n);
  assert.ok(optimized.theses.find(t => t.key === "7").faded);
  assert.ok(optimized.edges.some(e => e.u === "7" && e.v === "22" && e.cls === "em-faded"));
  assert.ok(!optimized.theses.find(t => t.key === "2").faded);
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
