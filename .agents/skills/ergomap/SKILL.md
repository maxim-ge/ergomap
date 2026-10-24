---
name: ergomap
description: "Extract an article's reasoning as premises and conclusions, as one of four outputs: reasoning as markdown, reasoning as JSON (a data file, optionally with the analysis), a reasoning map (a clickable argument map) or a reasoning map with analysis (issues, verdicts on starting claims, reconstructed and optimized logic, strength of each conclusion). Use when asked for the theses, premises or logic of an article as text, a list, a data file or a map, for an argument map or a thesis graph, or for an analysis, audit or critique of an article's argument."
---

# ergomap: article to argument map

This skill is a loader. Its instructions live in the ergomap npm package, next to the schema, strings and viewer they describe, so all of them come from one release.

Version: `latest`. To freeze the skill's behavior, replace `latest` with an exact version, such as `0.1.0`.

1. Get `V`. With an exact version above, `V` is that version. Otherwise read `https://cdn.jsdelivr.net/npm/ergomap@latest/package.json` and take its `version`
2. Fetch `https://cdn.jsdelivr.net/npm/ergomap@V/prompts/ergomap.md` as raw text: with `curl` when you have a shell, otherwise ask your fetch tool for the exact text, not a summary. If you can't get the full text, say so and stop
3. Follow it as this skill's instructions, with `V` as its version. Fetch the other files it names the same way

In local mode, when the user says "local", read `prompts/ergomap.md` from the ergomap repo instead: three folders up from this skill's folder if the `package.json` there is named `ergomap`, otherwise ask the user for the path. Follow it the same way; it reads its other files from the same repo.
