import { basisPath, METRICS } from "./layout.js";

const SVGNS = "http://www.w3.org/2000/svg";
const POOL_PAD = 8;

function svgEl(doc, name, attrs = {}) {
  const el = doc.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

let uid = 0;

/** Creates the SVG scene: markers, pools, edges and nodes. Returns handles for highlighting. */
export function createScene(doc, { label }) {
  const id = "em" + (++uid);
  const svg = svgEl(doc, "svg", { class: "em-svg", role: "img", "aria-label": label });
  const defs = svgEl(doc, "defs");
  const markers = {};
  for (const [name, cls] of [["base", "em-ah"], ["up", "em-ah em-up"], ["down", "em-ah em-down"]]) {
    const mk = svgEl(doc, "marker", {
      id: `${id}-${name}`, viewBox: "0 0 10 10", refX: "9", refY: "5",
      markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse"
    });
    mk.appendChild(svgEl(doc, "path", { class: cls, d: "M0,1 L9,5 L0,9 z" }));
    defs.appendChild(mk);
    markers[name] = `url(#${id}-${name})`;
  }
  const world = svgEl(doc, "g", { class: "em-world" });
  const poolsG = svgEl(doc, "g");
  const edgesG = svgEl(doc, "g");
  const nodesG = svgEl(doc, "g");
  world.append(poolsG, edgesG, nodesG);
  svg.append(defs, world);

  let nodeEls = new Map();
  let edgeEls = [];

  /**
   * Draws a view (see versions.js mapView) at the positions of a layout.
   * Faded nodes are drawn but can't be selected.
   */
  function draw(view, layout, { nodeLabel }) {
    poolsG.textContent = "";
    edgesG.textContent = "";
    nodesG.textContent = "";
    nodeEls = new Map();
    edgeEls = [];

    const edgePoints = new Map(layout.edges.map(e => [`${e.u}>${e.v}`, e.points]));
    for (const e of view.edges) {
      const points = edgePoints.get(`${e.u}>${e.v}`);
      if (!points) continue;
      const base = "em-edge" + (e.cls ? " " + e.cls : "");
      const p = svgEl(doc, "path", { class: base, d: basisPath(points), "marker-end": markers.base });
      edgesG.appendChild(p);
      edgeEls.push({ el: p, from: [e.u], to: e.v, base, fixed: e.cls === "em-faded" });
    }

    for (const pool of view.pools) {
      const boxes = pool.members.map(k => layout.nodes.get(k));
      const x1 = Math.min(...boxes.map(n => n.x - n.width / 2)) - POOL_PAD;
      const x2 = Math.max(...boxes.map(n => n.x + n.width / 2)) + POOL_PAD;
      const y1 = Math.min(...boxes.map(n => n.y - n.height / 2)) - POOL_PAD;
      const y2 = Math.max(...boxes.map(n => n.y + n.height / 2)) + POOL_PAD;
      poolsG.appendChild(svgEl(doc, "rect", { class: "em-pool", x: x1, y: y1, width: x2 - x1, height: y2 - y1, rx: 13 }));
      const t = layout.nodes.get(pool.v);
      const sx = x2, sy = (y1 + y2) / 2, tx = t.x - t.width / 2, ty = t.y;
      const dx = Math.max(24, (tx - sx) / 2);
      const p = svgEl(doc, "path", {
        class: "em-edge",
        d: `M${sx},${sy}C${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`,
        "marker-end": markers.base
      });
      edgesG.appendChild(p);
      edgeEls.push({ el: p, from: pool.members, to: pool.v, base: "em-edge", fixed: false });
    }

    for (const t of view.theses) {
      const n = layout.nodes.get(t.key);
      const g = svgEl(doc, "g", {
        class: ["em-node", ...t.classes].join(" "),
        transform: `translate(${n.x - n.width / 2},${n.y - n.height / 2})`
      });
      if (t.faded) {
        g.setAttribute("aria-hidden", "true");
      } else {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", nodeLabel(t));
        g.dataset.key = t.key;
      }
      const title = svgEl(doc, "title");
      title.textContent = `${t.id}. ${t.text}`;
      const rect = svgEl(doc, "rect", { width: n.width, height: n.height, rx: 9 });
      const num = svgEl(doc, "text", { class: "em-num", x: 12, y: n.height / 2, "dominant-baseline": "central" });
      num.textContent = String(t.id);
      const lab = svgEl(doc, "text", { class: "em-lab" });
      const lines = n.linesByLabel.get(t.label) || n.lines;
      const top = n.height / 2 - ((lines.length - 1) * METRICS.lineHeight) / 2;
      lines.forEach((line, i) => {
        const ts = svgEl(doc, "tspan", { x: n.textX, y: top + i * METRICS.lineHeight, "dominant-baseline": "central" });
        ts.textContent = line;
        lab.appendChild(ts);
      });
      g.append(title, rect, num, lab);
      if (t.badge) {
        const b = svgEl(doc, "text", {
          class: "em-badge" + (t.low ? " em-low" : ""),
          x: n.width - METRICS.padX, y: n.height / 2, "dominant-baseline": "central", "text-anchor": "end"
        });
        b.textContent = t.badge;
        g.appendChild(b);
      }
      if (t.issue) {
        const mark = svgEl(doc, "g", { class: "em-mark", transform: `translate(${n.width - 4},4)` });
        const c = svgEl(doc, "circle", { r: 8 });
        const x = svgEl(doc, "text", { "text-anchor": "middle", "dominant-baseline": "central" });
        x.textContent = "!";
        mark.append(c, x);
        g.appendChild(mark);
      }
      nodesG.appendChild(g);
      nodeEls.set(t.key, { el: g, base: g.getAttribute("class"), faded: t.faded });
    }
  }

  function highlight(sel, anc, desc) {
    for (const [key, { el, base, faded }] of nodeEls) {
      if (faded) continue;
      let state = "em-dim";
      if (key === sel) state = "em-sel";
      else if (anc.has(key)) state = "em-anc";
      else if (desc.has(key)) state = "em-desc";
      el.setAttribute("class", `${base} ${state}`);
      el.setAttribute("aria-current", key === sel ? "true" : "false");
    }
    for (const { el, from, to, base, fixed } of edgeEls) {
      if (fixed) continue;
      let state = "em-dim", m = markers.base;
      if (from.some(u => anc.has(u)) && (to === sel || anc.has(to))) { state = "em-anc"; m = markers.up; }
      else if (from.some(u => u === sel || desc.has(u)) && desc.has(to)) { state = "em-desc"; m = markers.down; }
      el.setAttribute("class", `${base} ${state}`);
      el.setAttribute("marker-end", m);
    }
  }

  return {
    svg,
    world,
    draw,
    highlight,
    nodeKeyFromEvent(e) {
      const el = e.target && e.target.closest ? e.target.closest(".em-node") : null;
      return el && el.dataset.key ? el.dataset.key : null;
    },
    nodeEl: key => (nodeEls.get(key) || {}).el
  };
}
