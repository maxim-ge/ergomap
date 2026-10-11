import { graphlib, layout as dagreLayout } from "@dagrejs/dagre";

export const METRICS = {
  labelSize: 13,
  numSize: 13,
  lineHeight: 16,
  padX: 12,
  gap: 10,
  padY: 11,
  minWidth: 128,
  maxLabelWidth: 150,
  maxLines: 3,
  minHeight: 46
};

/**
 * Splits a node label into lines.
 * Explicit "\n" wins; otherwise words are packed greedily into lines no wider than maxWidth.
 */
export function wrapLabel(label, measure, maxWidth = METRICS.maxLabelWidth, maxLines = METRICS.maxLines) {
  const explicit = label.split("\n").map(s => s.trim()).filter(Boolean);
  if (explicit.length > 1) return explicit.slice(0, maxLines);
  const words = label.trim().split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (!cur || measure(next) <= maxWidth) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    head.push(lines.slice(maxLines - 1).join(" "));
    return head;
  }
  return lines;
}

/**
 * Computes node sizes and positions with dagre (left to right: premises first, conclusions last).
 * measureLabel/measureNum return text width in px for the label and the number fonts.
 */
export function computeLayout(model, { measureLabel, measureNum, rankdir = "LR" } = {}) {
  const m = METRICS;
  const g = new graphlib.Graph();
  g.setGraph({ rankdir, nodesep: 16, ranksep: 46, edgesep: 8, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map();
  for (const t of model.theses) {
    const lines = wrapLabel(t.label, measureLabel);
    const numW = Math.ceil(measureNum(String(t.id)));
    const textW = Math.ceil(Math.max(...lines.map(l => measureLabel(l))));
    const width = Math.max(m.minWidth, m.padX + numW + m.gap + textW + m.padX);
    const height = Math.max(m.minHeight, m.padY * 2 + lines.length * m.lineHeight);
    sizes.set(t.key, { lines, width, height, textX: m.padX + numW + m.gap });
    g.setNode(t.key, { width, height });
  }
  for (const t of model.theses) for (const p of t.from) g.setEdge(p, t.key);

  dagreLayout(g);

  const nodes = new Map();
  for (const t of model.theses) {
    const n = g.node(t.key);
    nodes.set(t.key, { ...sizes.get(t.key), x: n.x, y: n.y });
  }
  const edges = g.edges().map(e => ({ u: e.v, v: e.w, points: g.edge(e).points.map(p => [p.x, p.y]) }));
  const gg = g.graph();
  return { width: Math.ceil(gg.width), height: Math.ceil(gg.height), nodes, edges };
}

/** Smooth path through points (same curve as d3.curveBasis). */
export function basisPath(pts) {
  const f = n => Math.round(n * 10) / 10;
  if (pts.length < 3) {
    const a = pts[0], b = pts[pts.length - 1];
    return `M${f(a[0])},${f(a[1])}L${f(b[0])},${f(b[1])}`;
  }
  let [x0, y0] = pts[0];
  let [x1, y1] = pts[1];
  let d = `M${f(x0)},${f(y0)}L${f((5 * x0 + x1) / 6)},${f((5 * y0 + y1) / 6)}`;
  const seg = (x, y) => {
    d += `C${f((2 * x0 + x1) / 3)},${f((2 * y0 + y1) / 3)} ${f((x0 + 2 * x1) / 3)},${f((y0 + 2 * y1) / 3)} ${f((x0 + 4 * x1 + x) / 6)},${f((y0 + 4 * y1 + y) / 6)}`;
    x0 = x1; y0 = y1; x1 = x; y1 = y;
  };
  for (let i = 2; i < pts.length; i++) seg(pts[i][0], pts[i][1]);
  seg(x1, y1);
  return d + `L${f(x1)},${f(y1)}`;
}
