# Changelog

Changes to the data format are marked as such, because pages and the skill depend on it.

## Unreleased

- Data format: optional `analysis` with `issues`, `concepts`, `reconstructed` and `optimized` logic; existing data is unchanged and renders as before
- Viewer: with an analysis, Summary, Audit and Logic views; strength of every thesis computed from reasoning types, verdicts and ratings, with the weakest link named; key points chosen by rule; a version switch with stable node positions, pool boxes, added and faded theses, broken inferences; views and versions in the URL
- Languages: new strings for the analysis; "premise" is now "Starting claim" for a thesis with no premises
- Skill: an analysis mode; one claim per thesis during extraction, with a check that every conclusion's premises match its claim; the escape for `<` in the page template is `<`
- Examples: both maps extracted again with one claim per thesis, and both carry an analysis

## 0.1.0

First version.

- Viewer: dagre layout left to right, nodes sized to their labels, highlight of what a thesis rests on and what follows from it, side panel, pan and zoom, hash links, keyboard navigation, light and dark themes, narrow layout for phones
- Data format: `theses` with `id`, `label`, `text`, `from`, `note`, `section`; optional `sections`, `lang`, `title`, `source`, `start`, `strings`
- Languages: built-in English and Russian, `strings` for others, per-key fallback to English
- Validation on mount with readable errors
