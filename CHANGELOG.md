# Changelog

Changes to the data format are marked as such, because pages and the skill depend on it.

## 0.1.0

First version.

- Viewer: dagre layout left to right, nodes sized to their labels, highlight of what a thesis rests on and what follows from it, side panel, pan and zoom, hash links, keyboard navigation, light and dark themes, narrow layout for phones
- Data format: `theses` with `id`, `label`, `text`, `from`, `note`, `section`; optional `sections`, `lang`, `title`, `source`, `start`, `strings`
- Languages: built-in English and Russian, `strings` for others, per-key fallback to English
- Validation on mount with readable errors
