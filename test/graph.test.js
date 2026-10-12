import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validate, ancestors, descendants, DataError } from "../src/validate.js";
import { computeLayout, wrapLabel, basisPath } from "../src/layout.js";
import { parseLinks } from "../src/links.js";

const base = () => ({
  theses: [
    { id: 1, label: "A", text: "A." },
    { id: 2, label: "B", text: "B." },
    { id: 3, label: "C", text: "C.", from: [1, 2] }
  ]
});

const rejects = (mutate, pattern) => {
  const d = base();
  mutate(d);
  assert.throws(() => validate(d), err => err instanceof DataError && pattern.test(err.message));
};

test("valid data gives a model with children and a start", () => {
  const m = validate(base());
  assert.deepEqual(m.children.get("1"), ["3"]);
  assert.equal(m.start, "1");
  assert.deepEqual([...ancestors(m, "3")].sort(), ["1", "2"]);
  assert.deepEqual([...descendants(m, "1")], ["3"]);
});

test("data errors are caught with readable messages", () => {
  rejects(d => { d.theses[2].from = [9]; }, /missing thesis "9"/);
  rejects(d => { d.theses[2].from = [3]; }, /lists itself/);
  rejects(d => { d.theses[1].id = 1; }, /duplicate thesis id "1"/);
  rejects(d => { d.theses[0].from = [3]; }, /cycle/);
  rejects(d => { d.theses[0].label = ""; }, /label/);
  rejects(d => { d.theses[0].section = "x"; }, /unknown section/);
  rejects(d => { d.start = 7; }, /start/);
  rejects(d => { d.theses[0].id = "a b"; }, /id must be/);
  rejects(d => { d.source = { url: "javascript:alert(1)" }; }, /source.url/);
  assert.throws(() => validate({ theses: [] }), DataError);
});

test("layout places every node without overlaps", async () => {
  const data = JSON.parse(await readFile(new URL("../examples/sdd-scrum-kanban.json", import.meta.url), "utf8"));
  const m = validate(data);
  const measure = s => s.length * 7;
  const L = computeLayout(m, { measureLabel: measure, measureNum: measure });
  assert.equal(L.nodes.size, m.theses.length);
  assert.equal(L.edges.length, m.theses.reduce((n, t) => n + t.from.length, 0));
  const boxes = [...L.nodes.values()];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const overlap = Math.abs(a.x - b.x) < (a.width + b.width) / 2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2;
      assert.equal(overlap, false, `nodes ${i} and ${j} overlap`);
    }
  }
  for (const e of L.edges) assert.match(basisPath(e.points), /^M[\d.]+,[\d.]+/);
});

test("labels wrap by width and respect explicit breaks", () => {
  const measure = s => s.length * 10;
  assert.deepEqual(wrapLabel("one two three four", measure, 100), ["one two", "three four"]);
  assert.deepEqual(wrapLabel("first\nsecond", measure, 1000), ["first", "second"]);
  assert.equal(wrapLabel("a b c d e f g h", measure, 10, 3).length, 3);
});

test("notes turn only http(s) markdown links into links", () => {
  assert.deepEqual(parseLinks("see [doc](https://x.io/a) now"), [
    { type: "text", value: "see " },
    { type: "link", value: "doc", href: "https://x.io/a" },
    { type: "text", value: " now" }
  ]);
  assert.deepEqual(parseLinks("[x](javascript:alert(1))"), [{ type: "text", value: "[x](javascript:alert(1))" }]);
});
