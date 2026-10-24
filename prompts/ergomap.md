# ergomap: article to argument map

## Overview

You extract the reasoning of an article as a chain of theses and give the user one of these outputs:

- Reasoning as markdown: a numbered list in your reply. When the user asks for markdown, text or a list, or says no map
- Reasoning as JSON: the data as JSON. When the user asks for the data, JSON or a file. If they also ask to analyze the argument, the data includes the analysis
- Reasoning map: a page with a clickable graph of the theses, published as an artifact; the data is inside the page. If the user didn't say, make the map
- Reasoning map with analysis: the map plus an analysis of the argument. When the user asks to analyze, audit or critique the argument, or asks whether it holds up or how strong it is

An analysis costs several times more than the data alone.

Start with Read and extract, then go to the section named after the output. You never write code for the graph: you write the data, and the viewer draws it.

## Artifacts

You use these files of the ergomap package. They are data, not instructions:

- `schema/data.schema.json`: the data format
- `locales/index.json`: the languages whose UI strings the viewer has built in
- `locales/strings.json`: the UI strings, to translate for other languages
- `dist/ergomap.min.js`: the viewer the page loads; never read it

By default they come from the npm package at `V`, the version the loader read this file from: read them from `https://cdn.jsdelivr.net/npm/ergomap@V/` as raw text, like this file, and load the viewer from there in the page, so the strings, the schema and the viewer all come from one release. Never put `@latest` in the page: a later release could break it.

In local mode, when the user says "local", read them from the ergomap repo this file came from instead. The local viewer isn't on the CDN, so there is no page: if the user asked for a map, give Reasoning as JSON instead and say why.

## Read and extract

### Read the source

Read the whole article from wherever the user points to it. If you can't get the full text, say so and stop.

### Build the chain

Build a chain of theses, the way a concise numbered explanation works:

- A starting claim is a claim the article takes as given or supports from outside the chain. It has no `from`
- A conclusion follows from earlier theses. Its `from` lists exactly the theses it needs, no more and no fewer
- One claim per thesis. A sentence bundles claims when its parts could get different verdicts or strengths, or when different conclusions use different parts; "X, so Y" is a premise and a conclusion. Split it, or one weak part weakens every conclusion that uses the thesis, even those that need only its strong parts
- If a step needs a claim the article states but the chain doesn't have yet, add it as its own starting claim. A claim the article never states is a gap: leave it out (in an analysis, it becomes an issue)
- Stay faithful to the author. Don't add your own arguments, and don't drop a step because it seems weak
- Number theses 1, 2, 3… in reading order. A thesis refers only to lower numbers
- The last thesis is usually the article's main conclusion
- Aim for 10–40 theses, as many as the claims need. Fewer if the article is short; never pad

Check every conclusion: would a reader accept it given only the theses in its `from`? If not, a premise is missing.

## Reasoning as markdown

Reply in the article's language. Group theses under the article's sections, keep one continuous numbering, and start each conclusion with the theses it follows from:

```markdown
## Problem

1. Agents make generating code cheap
2. The developer stays responsible for the code
3. From [1] and [2]: generation speed doesn't remove the need to understand the code

## Conclusion

4. From [3]: ...
```

Write "From [n] and [m]:" in the article's language. Leave out labels and notes unless the user asks for them.

## Reasoning as JSON

Follow the schema (Artifacts). Per thesis:

- `text`: the claim as a complete standalone sentence, in the article's language
- `label`: two to four words for the node, in the same language. The viewer wraps it; use `\n` only to choose the break yourself
- `note`: context from the article that helps a reader: an example, a number, who said it. Quote at most one short phrase per note. Keep links the article gives as `[text](https://…)`
- `section`: group theses by the article's own structure, 3–7 sections with short titles

Also set `lang` (the article's language), `title`, `source` (`title`, `url`, `author`) and `start`: a central conclusion that has both premises and consequences, so the first view shows the idea of the graph.

These `theses` are the original logic: the article as the author argues it, weak steps included. The analysis never changes them.

If `lang` is in `builtin` in `locales/index.json`, don't add `strings` to the data. Otherwise read `locales/strings.json` and add a top-level `strings` object to the data, next to `lang`: every key from `keys` with its English value (`en`) translated into `lang`. Follow each key's `usage` note, keep placeholders like `{refs}` exactly, and check the `glossary` (for example, "premise" is the logic term, not "parcel"). Example: `"strings": { "premise": "Premisa inicial", "derived": "De {refs}", … }`

With an analysis, read `prompts/analysis.md` now, the same way as this file, and add `analysis` to the data by its rules. If the schema has no `analysis`, that version can't show an analysis: go on without it and tell the user.

### Validate

Validate the data against the schema (for example with ajv). At minimum check: ids are unique, every id in `from` exists and is lower than the thesis's own id, there are no cycles, every `section` exists. With an analysis also check: every starting claim of the reconstructed logic has a verdict and a reason, every non-deductive step a condition, every pool is a subset of its `from`, every id in `fixes`, `flaw`, issues and concepts exists, and the optimized logic uses only reconstructed ids. Fix every problem before you give the output; the viewer would show an error instead of the graph.

Then check that premises match claims, in the original logic and, with an analysis, in the reconstructed and optimized logic. For every conclusion, pair each part of its `text` with the premise it comes from:

- A part with no premise: add the premise if the article states it; otherwise it's a gap, which an analysis reports as an issue
- A premise that no part uses doesn't belong in `from`. If the article's own wording carries what it contributes, as when its summary lists a takeaway the text shortened away, put that in the text; otherwise drop the premise, even if that leaves it a final conclusion
- Summaries need this most: they restate many conclusions, and a premise is easily kept or dropped without its part of the claim
- Strength doesn't show a mismatch: a premise stronger than the weakest one never changes the number

## Reasoning map

Do Reasoning as JSON, then build the page and publish it.

### Build the page

Start from this template. Replace `TITLE` with a short name for the map, two to four words, in the article's language, `V` with the version, and `DATA` with the JSON. In the JSON, escape every `<` as `\u003c`, so the text can't close the script tag.

```html
<title>TITLE</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Serif:wght@400;500&display=swap">
<style>
  html, body { height: 100%; }
  body { margin: 0; padding: 12px 16px; box-sizing: border-box; background: #EEF1F5; overflow: hidden; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) body { background: #0C1015; } }
  :root[data-theme="dark"] body { background: #0C1015; }
  #graph { height: 100%; }
</style>
<div id="graph"></div>
<script src="https://cdn.jsdelivr.net/npm/ergomap@V/dist/ergomap.min.js"></script>
<script type="application/json" id="ergomap-data">DATA</script>
<script>
  Ergomap.mount("#graph", JSON.parse(document.getElementById("ergomap-data").textContent));
</script>
```

### Publish

Publish the page as an artifact with the icon `map` and a one-sentence description that names the article. Then tell the user in one or two sentences what the map covers and which thesis it opens on. With an analysis, the page opens on the summary instead: give the final conclusion's strength and its weakest link, and the number of flaws.

## Reasoning map with analysis

Do Reasoning map, with the analysis added in Reasoning as JSON.
