import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const text = p => readFile(new URL(p, import.meta.url), "utf8");
const SKILL = "../.agents/skills/ergomap/SKILL.md";
const PROMPTS = ["../prompts/ergomap.md", "../prompts/analysis.md"];
// A package file named in a prompt, bare or at the end of a CDN URL
const PACKAGE_PATH = /\b(?:dist|locales|schema|prompts)\/[\w.-]+\.(?:json|md|js|mjs)\b/g;

test("the skill loads prompts/ergomap.md, which loads prompts/analysis.md", async () => {
  assert.ok((await text(SKILL)).includes("prompts/ergomap.md"));
  assert.ok((await text(PROMPTS[0])).includes("prompts/analysis.md"));
});

test("the skill and the prompts name only package files that exist and are published", async () => {
  const pkg = JSON.parse(await text("../package.json"));
  const build = await text("../build.mjs");
  for (const file of [SKILL, ...PROMPTS]) {
    for (const path of new Set((await text(file)).match(PACKAGE_PATH))) {
      assert.ok(pkg.files.includes(path.split("/")[0]), `${file}: ${path} is not published`);
      // dist/ exists only after a build, so its files are checked against the build's outputs
      if (path.startsWith("dist/")) assert.ok(build.includes(`"${path}"`), `${file}: ${path} is not built`);
      else await access(new URL(`../${path}`, import.meta.url));
    }
  }
});
