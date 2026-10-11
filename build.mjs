// Builds dist/ergomap.js (IIFE, global `Ergomap`), dist/ergomap.min.js and dist/ergomap.mjs (ESM).
// dagre and the stylesheet are bundled in, so the output has no runtime dependencies.
// `node build.mjs --serve` rebuilds on change and serves the repo at http://localhost:8000/examples/
import * as esbuild from "esbuild";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const banner = `/*! ergomap ${pkg.version} | MIT | https://github.com/maxim-ge/ergomap */`;

// MIT requires keeping the notices of bundled code: append dagre's and graphlib's licenses.
const third = [];
for (const name of ["@dagrejs/dagre", "@dagrejs/graphlib"]) {
  const text = await readFile(new URL(`./node_modules/${name}/LICENSE`, import.meta.url), "utf8");
  third.push(`${name}\n\n${text.trim()}`);
}
const footer = `/*! Bundled third-party code:\n\n${third.join("\n\n---\n\n").replace(/\*\//g, "* /")}\n*/`;

const common = {
  entryPoints: ["src/index.js"],
  bundle: true,
  target: ["es2020"],
  loader: { ".css": "text" },
  define: { __VERSION__: JSON.stringify(pkg.version) },
  banner: { js: banner },
  footer: { js: footer },
  legalComments: "none",
  logLevel: "info"
};

const builds = [
  { ...common, format: "iife", globalName: "Ergomap", outfile: "dist/ergomap.js" },
  { ...common, format: "iife", globalName: "Ergomap", outfile: "dist/ergomap.min.js", minify: true },
  { ...common, format: "esm", outfile: "dist/ergomap.mjs" }
];

if (process.argv.includes("--serve")) {
  const ctx = await esbuild.context(builds[0]);
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: ".", port: 8000 });
  console.log(`Serving on http://localhost:${port}/examples/`);
} else {
  await Promise.all(builds.map(b => esbuild.build(b)));
}
