import { basisPath } from "./layout.js";

const SVGNS = "http://www.w3.org/2000/svg";

function svgEl(doc, name, attrs = {}) {
  const el = doc.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

let uid = 0;

/** Creates the SVG scene: markers, edges and nodes. Returns handles for highlighting. */
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
  const edgesG = svgEl(doc, "g");
  const nodesG = svgEl(doc, "g");
  world.append(edgesG, nodesG);
  svg.append(defs, world);

  let nodeEls = new Map();
  let edgeEls = [];

  function draw(model, layout, { nodeLabel }) {
    edgesG.textContent = "";
    nodesG.textContent = "";
    nodeEls = new Map();
    edgeEls = [];

    for (const e of layout.edges) {
      const p = svgEl(doc, "path", { class: "em-edge", d: basisPath(e.points), "marker-end": markers.base });
      edgesG.appendChild(p);
      edgeEls.push({ el: p, u: e.u, v: e.v });
    }

    for (const t of model.theses) {
      const n = layout.nodes.get(t.key);
      const premise = t.from.length === 0;
      const g = svgEl(doc, "g", {
        class: "em-node" + (premise ? " em-premise" : ""),
        transform: `translate(${n.x - n.width / 2},${n.y - n.height / 2})`,
        tabindex: "0",
        role: "button",
        "aria-label": nodeLabel(t)
      });
      g.dataset.key = t.key;
      const title = svgEl(doc, "title");
      title.textContent = `${t.id}. ${t.text}`;
      const rect = svgEl(doc, "rect", { width: n.width, height: n.height, rx: 9 });
      const num = svgEl(doc, "text", { class: "em-num", x: 12, y: n.height / 2, "dominant-baseline": "central" });
      num.textContent = String(t.id);
      const lab = svgEl(doc, "text", { class: "em-lab" });
      const top = n.height / 2 - ((n.lines.length - 1) * 16) / 2;
      n.lines.forEach((line, i) => {
        const ts = svgEl(doc, "tspan", { x: n.textX, y: top + i * 16, "dominant-baseline": "central" });
        ts.textContent = line;
        lab.appendChild(ts);
      });
      g.append(title, rect, num, lab);
      nodesG.appendChild(g);
      nodeEls.set(t.key, g);
    }
  }

  function highlight(model, sel, anc, desc) {
    for (const [key, el] of nodeEls) {
      const cls = ["em-node"];
      if (model.byKey.get(key).from.length === 0) cls.push("em-premise");
      if (key === sel) cls.push("em-sel");
      else if (anc.has(key)) cls.push("em-anc");
      else if (desc.has(key)) cls.push("em-desc");
      else cls.push("em-dim");
      el.setAttribute("class", cls.join(" "));
      el.setAttribute("aria-current", key === sel ? "true" : "false");
    }
    for (const { el, u, v } of edgeEls) {
      let cls = "em-edge em-dim", m = markers.base;
      if (anc.has(u) && (v === sel || anc.has(v))) { cls = "em-edge em-anc"; m = markers.up; }
      else if ((u === sel || desc.has(u)) && desc.has(v)) { cls = "em-edge em-desc"; m = markers.down; }
      el.setAttribute("class", cls);
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
      return el ? el.dataset.key : null;
    },
    nodeEl: key => nodeEls.get(key)
  };
}
