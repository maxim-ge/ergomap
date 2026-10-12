# ergomap

Article -> argument map. A skill extracts the reasoning, a one-file viewer renders it.

ergomap takes a JSON list of theses, where each conclusion names the theses it follows from, and draws a clickable graph. Click a thesis to see what it rests on and what follows from it. The viewer is a single script with no runtime dependencies: dagre and the styles are bundled in.

With an optional analysis, the page also judges the argument: a summary of the final conclusions and key points with the strength of each, an audit of the issues and of the starting claims, and the map in three versions (the author's logic, the reconstructed logic and the optimized one).

## Quick start

```html
<div id="graph" style="height: 100vh"></div>
<script src="https://cdn.jsdelivr.net/npm/ergomap@0.1.0/dist/ergomap.min.js"></script>
<script>
  Ergomap.mount("#graph", {
    lang: "en",
    title: "Why tests matter",
    theses: [
      { id: 1, label: "Code changes", text: "Code changes all the time." },
      { id: 2, label: "Changes break things", text: "Every change can break existing behavior." },
      { id: 3, label: "Need fast feedback", text: "We need fast feedback on what broke.", from: [1, 2] }
    ]
  });
</script>
```

Always pin an exact version in the script URL. Published versions never change, so a page keeps working when a new version comes out.

Full examples, both with an analysis: [`examples/sdd-scrum-kanban.json`](examples/sdd-scrum-kanban.json), the reasoning of an article on spec-driven development in Scrum and Kanban as 34 theses in six sections, and [`examples/agentic-poetry.json`](examples/agentic-poetry.json), a Russian article on writing code with agents.

## Data format

The contract is [`schema/data.schema.json`](schema/data.schema.json). In short:

| Field | Required | Meaning |
|---|---|---|
| `theses` | yes | Theses in reading order |
| `theses[].id` | yes | Integer or slug (`[A-Za-z0-9_-]+`). Shown as `[id]`, used in the URL as `#t<id>` |
| `theses[].label` | yes | Short node caption, two to four words. Wrapped automatically; `\n` forces a break |
| `theses[].text` | yes | The claim as a complete standalone sentence |
| `theses[].from` | no | Ids this thesis follows from. Empty or missing means a starting claim |
| `theses[].note` | no | Context from the source. Markdown links `[text](https://…)` become links |
| `theses[].section` | no | Id of a section |
| `sections` | no | `[{ id, title }]`, shown above the selected thesis |
| `lang` | no | Language of the content, picks the UI strings |
| `title`, `source` | no | Shown in the header. `source` is `{ title, url, author }` |
| `start` | no | Thesis selected on open. Defaults to the first one |
| `strings` | no | UI strings for languages without a built-in dictionary |
| `analysis` | no | The argument analysis, see below |

The viewer checks the data on mount. A reference to a missing thesis, a cycle, a duplicate id and similar mistakes show a readable error instead of a blank page.

### Analysis

`theses` is the original logic, faithful to the author. `analysis` adds:

- `reconstructed`: the original made explicit. Each thesis repeats its id and inherits the original's `label`, `text`, `note` and `section`; it gives its own `from`, and either a `verdict` and `reason` (a starting claim: `supported`, `weak`, `unsupported`, `false` or `definition`) or a step: `type` (`deductive` by default, `generalization`, `abductive`, `analogy`), an implicit `condition` `{ text, rating, reason }` rated `strong`, `weak` or `none`, and a `pool` of premises that are alternative evidence. Reasons of different types for one conclusion go in `steps`. New theses, the implicit premises, bring their own `label` and `text`. `fixes` names the issues whose fix added or changed a thesis; `flaw` names a flaw with no fix, which sets the thesis to 0
- `optimized`: the reconstructed logic with the fewest starting claims that keep every final conclusion at the same strength. Ids from the reconstructed logic, which they inherit from, `from` and `pool` excepted
- `issues`: `{ id, type, severity, target, theses, concept, explanation, quote }`; types are `non-sequitur`, `missing-premise`, `circular`, `equivocation`, `straw-man`, `inconsistency` and `irrelevant-conclusion`, severities `flaw` and `weakness`
- `concepts`: up to 7 `{ term, senses: [{ definition, theses }] }`; a term used in two senses lists both

The data names types, verdicts and ratings; the viewer computes the numbers. A starting claim's strength is its verdict's (supported 0.95, weak 0.6, unsupported and false 0, definition 1). A conclusion's strength is its step's (deductive 1, generalization 0.9, abductive 0.8, analogy 0.7) times the weakest of its premises and its condition (strong 0.95, weak 0.6, none 0). A pool, and separate steps of one conclusion, combine as 0.95 × (1 − ∏(1 − sᵢ/0.95)). Where a weak rating or a flaw lowered a strength, the viewer names that weakest link. Key points are chosen by rule: conclusions ranked by the theses behind them times the theses depending on them, cut where a score falls below half of the previous one, at most 7.

With an analysis the page opens on the Summary view; Audit lists the issues and the verdicts, and Logic is the map with a switch between the versions. The view is in the URL: `#summary`, `#audit`, `#t18`, `#reconstructed/t18`, `#optimized/t18`.

## API

```js
const graph = Ergomap.mount(target, data, options);
graph.select(13);   // select a thesis by id
graph.fitAll();     // show the whole graph
graph.selected;     // id of the selected thesis
graph.destroy();
```

`target` is an element or a selector. Give it a height: the viewer fills its container.

| Option | Default | Meaning |
|---|---|---|
| `locale` | `data.lang`, then the page's `lang`, then `"en"` | UI language |
| `strings` | none | Overrides for UI strings, merged over `data.strings` |
| `hash` | `"t"` | Prefix for `#t13` links. `false` keeps the selection out of the URL |
| `start` | `data.start` | Thesis selected on open |
| `theme` | follows the page | `"light"` or `"dark"` to force one |
| `header` | `true` | `false` hides the title and source line |
| `onSelect` | none | Called with the id of each newly selected thesis |
| `warn` | `console.warn` | Receives warnings about missing or broken strings |

Also exported: `Ergomap.version`, `Ergomap.locales` (built-in languages), `Ergomap.validate(data)`.

The ESM build is `dist/ergomap.mjs`: `import { mount } from "ergomap"`.

## Languages

Built-in: English and Russian. For any other language, put the strings in `data.strings`:

```json
{
  "lang": "es",
  "strings": { "premise": "Premisa", "conclusion": "Conclusión", "restsOn": "Se apoya en", "leadsTo": "De aquí se sigue", "derived": "De {refs}" }
}
```

Every key, its English text and where it appears are listed in [`locales/index.json`](locales/index.json), together with a short glossary of terms that are easy to mistranslate. A missing key falls back to English, and so does a string that drops a placeholder such as `{refs}`. The list of references in "From [1], [4] and [5]" uses `Intl.ListFormat`, so each language gets its own conjunction.

## Styling

All styles are scoped to `.ergomap` and driven by custom properties, so you can override them on the container:

```css
#graph .ergomap {
  --em-font-body: "Inter", system-ui, sans-serif;
  --em-up: #7c3aed;
}
```

Colors: `--em-bg`, `--em-canvas`, `--em-surface`, `--em-premise`, `--em-ink`, `--em-muted`, `--em-line`, `--em-edge`, `--em-up`, `--em-up-soft`, `--em-down`, `--em-down-soft`, `--em-warn`, `--em-warn-soft`, `--em-bad`, `--em-bad-soft`. Fonts: `--em-font-body`, `--em-font-serif`, `--em-font-mono`, `--em-font-display`. The viewer doesn't load fonts; the default stacks start with IBM Plex and fall back to system fonts.

## The skill

[`skill/SKILL.md`](skill/SKILL.md) is a skill for Claude that reads an article, extracts its reasoning as premises and conclusions, writes the data and publishes a page with the viewer. Asked for an analysis, it also audits the argument and writes the reconstructed and optimized logic. The file in this repo is the reference copy: install it in Claude yourself. The skill reads only data from the npm package (`locales/index.json`, `schema/data.schema.json`); it never downloads instructions.

## Development

```bash
npm install
npm test        # schema, i18n, validation, analysis, layout
npm run build   # dist/ergomap.js, ergomap.min.js, ergomap.mjs
npm run dev     # rebuild on change, http://localhost:8000/examples/ (?agentic-poetry for the other example)
```

Releases go to npm from GitHub Actions when a version tag is pushed:

```bash
npm version minor
git push --follow-tags
```

The release workflow uses npm trusted publishing, so the repository and workflow must be linked to the package in its settings on npmjs.com.

## License

MIT. The bundle includes [dagre](https://github.com/dagrejs/dagre) and graphlib, both MIT; their notices are kept at the end of each file in `dist/`.
