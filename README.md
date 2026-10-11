# ergomap

Article -> argument map. A skill extracts the reasoning, a one-file viewer renders it.

ergomap takes a JSON list of theses, where each conclusion names the theses it follows from, and draws a clickable graph. Click a thesis to see what it rests on and what follows from it. The viewer is a single script with no runtime dependencies: dagre and the styles are bundled in.

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

A full example is in [`examples/agentic-poetry.json`](examples/agentic-poetry.json): the 27 theses of an article on agentic development, in Russian.

## Data format

The contract is [`schema/data.schema.json`](schema/data.schema.json). In short:

| Field | Required | Meaning |
|---|---|---|
| `theses` | yes | Theses in reading order |
| `theses[].id` | yes | Integer or slug (`[A-Za-z0-9_-]+`). Shown as `[id]`, used in the URL as `#t<id>` |
| `theses[].label` | yes | Short node caption, two to four words. Wrapped automatically; `\n` forces a break |
| `theses[].text` | yes | The claim as a complete standalone sentence |
| `theses[].from` | no | Ids this thesis follows from. Empty or missing means a premise |
| `theses[].note` | no | Context from the source. Markdown links `[text](https://…)` become links |
| `theses[].section` | no | Id of a section |
| `sections` | no | `[{ id, title }]`, shown above the selected thesis |
| `lang` | no | Language of the content, picks the UI strings |
| `title`, `source` | no | Shown in the header. `source` is `{ title, url, author }` |
| `start` | no | Thesis selected on open. Defaults to the first one |
| `strings` | no | UI strings for languages without a built-in dictionary |

The viewer checks the data on mount. A reference to a missing thesis, a cycle, a duplicate id and similar mistakes show a readable error instead of a blank page.

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

Colors: `--em-bg`, `--em-canvas`, `--em-surface`, `--em-premise`, `--em-ink`, `--em-muted`, `--em-line`, `--em-edge`, `--em-up`, `--em-up-soft`, `--em-down`, `--em-down-soft`. Fonts: `--em-font-body`, `--em-font-serif`, `--em-font-mono`, `--em-font-display`. The viewer doesn't load fonts; the default stacks start with IBM Plex and fall back to system fonts.

## The skill

[`skill/SKILL.md`](skill/SKILL.md) is a skill for Claude that reads an article, extracts its reasoning as premises and conclusions, writes the data and publishes a page with the viewer. The file in this repo is the reference copy: install it in Claude yourself. The skill reads only data from the npm package (`locales/index.json`, `schema/data.schema.json`); it never downloads instructions.

## Development

```bash
npm install
npm test        # schema, i18n, validation, layout
npm run build   # dist/ergomap.js, ergomap.min.js, ergomap.mjs
npm run dev     # rebuild on change, http://localhost:8000/examples/
```

Releases go to npm from GitHub Actions when a version tag is pushed:

```bash
npm version minor
git push --follow-tags
```

The release workflow uses npm trusted publishing, so the repository and workflow must be linked to the package in its settings on npmjs.com.

## License

MIT. The bundle includes [dagre](https://github.com/dagrejs/dagre) and graphlib, both MIT; their notices are kept at the end of each file in `dist/`.
