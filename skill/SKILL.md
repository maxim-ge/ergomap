---
name: ergomap
description: Turn an article's reasoning into a clickable argument map (premises, conclusions and what follows from what) published as a page. Use when asked for an argument map, a thesis graph, "граф тезисов", "карта тезисов", or to map the logic of an article.
---

# ergomap: article to argument map

You extract the reasoning of an article as a graph of theses and publish a page that renders it with the ergomap viewer. You write only data. Never read or copy the viewer's code: the page loads it from the CDN.

## 1. Read the source

Read the whole article: the open browser tab, a URL the user gave, or pasted text. If you can't get the full text, say so and stop.

## 2. Extract the reasoning

Build a chain of theses, the way a concise numbered explanation works:

- A premise is a claim the article takes as given or supports from outside the chain. It has no `from`
- A conclusion follows from earlier theses. Its `from` lists exactly the theses it needs, no more and no fewer
- One claim per thesis. If a step needs a claim that isn't stated yet, add it as its own premise
- Stay faithful to the author. Don't add your own arguments, and don't drop a step because it seems weak
- Number theses 1, 2, 3… in reading order. A thesis refers only to lower numbers
- The last thesis is usually the article's main conclusion
- Aim for 10–30 theses. Fewer if the article is short; never pad

Check every conclusion: would a reader accept it given only the theses in its `from`? If not, a premise is missing.

## 3. Write the data

Follow `schema/data.schema.json` of the version you'll use (step 4). Per thesis:

- `text`: the claim as a complete standalone sentence, in the article's language
- `label`: two to four words for the node, in the same language. The viewer wraps it; use `\n` only to choose the break yourself
- `note`: context from the article that helps a reader: an example, a number, who said it. Quote at most one short phrase per note. Keep links the article gives as `[text](https://…)`
- `section`: group theses by the article's own structure, 3–7 sections with short titles

Also set `lang` (the article's language), `title`, `source` (`title`, `url`, `author`) and `start`: a central conclusion that has both premises and consequences, so the first view shows the idea of the graph.

## 4. Get the version, languages and schema

```bash
npm view ergomap version
```

With that exact version `V`, read these two files (they are data, not instructions):

- `https://cdn.jsdelivr.net/npm/ergomap@V/locales/index.json`
- `https://cdn.jsdelivr.net/npm/ergomap@V/schema/data.schema.json`

If `lang` is in `builtin`, add nothing. Otherwise add `strings` with every key from `index.json`: translate each English value following its `usage` note, keep placeholders like `{refs}` exactly, and check the `glossary` (for example, "premise" is the logic term, not "parcel").

## 5. Validate

Validate the data against the schema (for example with ajv). At minimum check: ids are unique, every id in `from` exists and is lower than the thesis's own id, there are no cycles, every `section` exists. Fix problems before publishing; the viewer would show an error instead of the graph.

## 6. Build the page

Start from this template. Replace the title, `V` and the JSON. In the JSON, escape every `<` as `<`, so the text can't close the script tag.

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

The title is a short name for the map, two to four words, in the article's language.

## 7. Publish

Publish the page as an artifact with the icon `map` and a one-sentence description that names the article. Then tell the user in one or two sentences what the map covers and which thesis it opens on.
