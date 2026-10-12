import css from "./styles.css";
import { validate, ancestors, descendants, DataError } from "./validate.js";
import { VERSIONS } from "./analysis.js";
import { createI18n, resolveLocale, BUILTIN } from "./i18n.js";
import { computeLayout } from "./layout.js";
import { unionGraph, mapView } from "./versions.js";
import { createScene } from "./render.js";
import { createViewport } from "./viewport.js";
import { createPanel } from "./panel.js";
import { renderSummary, renderAudit } from "./pages.js";
import { createRouter } from "./router.js";

/* global __VERSION__ */
export const version = typeof __VERSION__ === "string" ? __VERSION__ : "dev";
export const locales = Object.keys(BUILTIN);
export { validate, DataError };

const STYLE_ID = "ergomap-styles";
const BADGE = 32; // room for a strength such as 0.48 in each node
const VIEWS = [["summary", "viewSummary"], ["audit", "viewAudit"], ["logic", "viewLogic"]];
const VERSION_KEYS = { original: "versionOriginal", reconstructed: "versionReconstructed", optimized: "versionOptimized" };
let instances = 0;

function injectStyles(doc) {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement("style");
  s.id = STYLE_ID;
  s.textContent = css;
  doc.head.appendChild(s);
}

function el(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Renders an argument graph into target. Data with an analysis also gets a summary and an audit,
 * and the map switches between the original, reconstructed and optimized logic.
 * @param {Element|string} target  container element or selector; give it a height
 * @param {object} data            see schema/data.schema.json
 * @param {object} [options]       locale, strings, hash, start, theme, header, onSelect, warn
 */
export function mount(target, data, options = {}) {
  const host = typeof target === "string" ? document.querySelector(target) : target;
  if (!host) throw new Error("ergomap: mount target not found");
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  injectStyles(doc);

  const warn = options.warn || (m => win.console && win.console.warn(m));
  const pageLang = doc.documentElement.getAttribute("lang") || "";

  host.textContent = "";
  const root = el(doc, "div", "ergomap");
  if (options.theme === "light" || options.theme === "dark") root.dataset.emTheme = options.theme;
  host.appendChild(root);

  let model;
  try {
    model = validate(data);
  } catch (err) {
    const i18n = createI18n({
      locale: resolveLocale({ option: options.locale, dataLang: data && data.lang, pageLang }),
      strings: options.strings || (data && data.strings) || null
    });
    const box = el(doc, "div", "em-error");
    box.setAttribute("role", "alert");
    box.textContent = i18n.t("error", { message: err.message });
    root.appendChild(box);
    if (!(err instanceof DataError)) throw err;
    warn("ergomap: " + err.message);
    return { error: err, selected: null, select() {}, fitAll() {}, destroy() { root.remove(); } };
  }

  const strings = model.strings || options.strings ? { ...(model.strings || {}), ...(options.strings || {}) } : null;
  const i18n = createI18n({ locale: resolveLocale({ option: options.locale, dataLang: model.lang, pageLang }), strings, warn });
  const t = i18n.t;
  root.setAttribute("lang", i18n.locale);

  const analysis = model.analysis;
  const versions = analysis ? VERSIONS.filter(v => analysis.versions[v]) : ["original"];
  const logicOf = v => (analysis ? analysis.versions[v] : model);

  // header
  if (options.header !== false && (model.title || (model.source && model.source.url))) {
    const top = el(doc, "header", "em-top");
    if (model.title) top.appendChild(el(doc, "h1", "em-title", model.title));
    if (model.source && model.source.url) {
      const p = el(doc, "p", "em-src");
      p.append(t("source") + ": ");
      const a = el(doc, "a", "", model.source.title || model.source.url);
      a.href = model.source.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      p.appendChild(a);
      if (model.source.author) p.append(" · " + model.source.author);
      top.appendChild(p);
    }
    root.appendChild(top);
  }

  // views and versions, with an analysis only
  const tabs = new Map();
  const switches = new Map();
  let switcher = null, counter = null;
  if (analysis) {
    const bar = el(doc, "nav", "em-bar");
    const tablist = el(doc, "div", "em-tabs");
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", t("views"));
    for (const [view, key] of VIEWS) {
      const b = el(doc, "button", "em-tab", t(key));
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => go(view === "logic" ? { view, version: currentVersion, key: current } : { view }));
      tabs.set(view, b);
      tablist.append(b);
    }
    switcher = el(doc, "div", "em-switch");
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", t("versions"));
    for (const v of versions) {
      const b = el(doc, "button", "", t(VERSION_KEYS[v]));
      b.type = "button";
      b.addEventListener("click", () => go({ view: "logic", version: v, key: current }));
      switches.set(v, b);
      switcher.append(b);
    }
    counter = el(doc, "span", "em-counter");
    bar.append(tablist, switcher, counter);
    root.appendChild(bar);
  }

  // summary and audit
  const openThesis = (key, prefer) => {
    const v = [prefer, "reconstructed", "original"].find(n => n && logicOf(n) && logicOf(n).byKey.has(key));
    if (v) go({ view: "logic", version: v, key });
  };
  let summaryPage = null, auditPage = null, audit = null;
  if (analysis) {
    summaryPage = el(doc, "div", "em-page");
    auditPage = el(doc, "div", "em-page");
    renderSummary(summaryPage, { model, i18n, openThesis });
    audit = renderAudit(auditPage, { model, i18n, openThesis });
    root.append(summaryPage, auditPage);
  }

  // stage
  const stage = el(doc, "div", "em-stage");
  root.appendChild(stage);
  const scene = createScene(doc, { label: t("graphLabel") });
  stage.appendChild(scene.svg);

  const legend = el(doc, "div", "em-legend");
  legend.setAttribute("aria-hidden", "true");
  for (const [cls, key, opt] of [["em-s-sel", "legendSelected"], ["em-s-up", "legendAncestors"], ["em-s-down", "legendDescendants"], ["em-s-prem", "premise", true], ["em-s-der", "conclusion", true]]) {
    const s = el(doc, "span", opt ? "em-opt" : "");
    s.append(el(doc, "i", "em-sw " + cls), t(key).toLowerCase());
    legend.appendChild(s);
  }
  stage.appendChild(legend);

  const zoom = el(doc, "div", "em-zoom");
  const zin = el(doc, "button", "", "+");
  const zout = el(doc, "button", "", "−");
  const zfit = el(doc, "button", "em-fit", t("fitAll"));
  zin.type = zout.type = zfit.type = "button";
  zin.setAttribute("aria-label", t("zoomIn"));
  zout.setAttribute("aria-label", t("zoomOut"));
  zoom.append(zin, zout, zfit);
  stage.appendChild(zoom);

  // text measurement for node sizes
  const canvas = doc.createElement("canvas");
  const ctx = canvas.getContext ? canvas.getContext("2d") : null;
  const fontOf = (name, size, weight) => {
    const fam = win.getComputedStyle(root).getPropertyValue(name).trim() || "sans-serif";
    return `${weight} ${size}px ${fam}`;
  };
  const measurer = (font, size) => text => {
    if (!ctx) return text.length * size * 0.6;
    ctx.font = font;
    return ctx.measureText(text).width;
  };

  let layout = null;
  let current = null;
  let currentVersion = "original";
  let currentView = "logic";
  let destroyed = false;
  const graph = unionGraph(model);
  const nodeLabel = x => t("nodeLabel", { id: x.id, text: x.text });
  const draw = () => scene.draw(mapView(model, currentVersion, i18n), layout, { nodeLabel });
  function doLayout() {
    layout = computeLayout(graph, {
      measureLabel: measurer(fontOf("--em-font-body", 13, 400), 13),
      measureNum: measurer(fontOf("--em-font-mono", 13, 500), 13),
      badge: analysis ? BADGE : 0
    });
    draw();
  }
  doLayout();

  const isNarrow = () => root.classList.contains("em-narrow");
  const updateNarrow = () => root.classList.toggle("em-narrow", root.clientWidth > 0 && root.clientWidth <= 760);
  const logicShown = () => currentView === "logic";

  let router = null;
  const go = s => router.go(s);

  const panel = createPanel(doc, {
    i18n,
    analysis,
    onGo: (key, v) => openThesis(key, v || currentVersion),
    onIssue: issue => go({ view: "audit", issue }),
    onToggle: () => { if (!viewport.touched) viewport.home(current); }
  });
  stage.appendChild(panel.root);

  const visibleRect = () => {
    const W = stage.clientWidth, H = stage.clientHeight;
    const r = { x: 0, y: 0, w: W, h: H };
    if (isNarrow()) r.h = H - panel.root.offsetHeight - 16;
    else if (!panel.collapsed) r.w = W - panel.root.offsetWidth - 24;
    return r;
  };

  const viewport = createViewport({
    svg: scene.svg,
    world: scene.world,
    stage,
    visibleRect,
    isNarrow,
    getLayout: () => layout,
    nodeKeyFromEvent: scene.nodeKeyFromEvent,
    onNodeClick: key => go({ view: "logic", version: currentVersion, key }),
    reduceMotion: () => !!(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches)
  });

  function select(key, scroll) {
    const logic = logicOf(currentVersion);
    if (!logic.byKey.has(key)) return;
    current = key;
    scene.highlight(key, ancestors(logic, key), descendants(logic, key));
    panel.update(logic, key, currentVersion);
    if (scroll) viewport.ensureVisible(key);
    if (typeof options.onSelect === "function") options.onSelect(logic.byKey.get(key).id);
  }

  function setVersion(v) {
    if (v === currentVersion) return;
    currentVersion = v;
    draw();
    for (const [name, b] of switches) b.setAttribute("aria-pressed", String(name === v));
    if (!counter) return;
    const r = analysis.counts.reconstructed, o = analysis.counts.optimized;
    counter.textContent = v === "optimized" ? t("reduction", { theses: `${r.theses} → ${o.theses}`, claims: `${r.claims} → ${o.claims}` }) : "";
  }

  function setView(view) {
    const entering = view === "logic" && currentView !== "logic";
    currentView = view;
    for (const [name, b] of tabs) b.setAttribute("aria-selected", String(name === view));
    if (summaryPage) summaryPage.hidden = view !== "summary";
    if (auditPage) auditPage.hidden = view !== "audit";
    stage.hidden = view !== "logic";
    if (switcher) switcher.hidden = counter.hidden = view !== "logic";
    return entering;
  }

  function apply(s, first) {
    if (!analysis && s.view !== "logic") return;
    if (s.view !== "logic") {
      setView(s.view);
      if (s.view === "audit" && s.issue) audit.show(s.issue);
      return;
    }
    setVersion(versions.includes(s.version) ? s.version : "original");
    const logic = logicOf(currentVersion);
    const key = logic.byKey.has(s.key) ? s.key : logic.byKey.has(current) ? current : logic.start;
    const entering = setView("logic");
    updateNarrow();
    select(key, !first && !entering);
    if (first || (entering && !viewport.touched)) viewport.home(key);
  }

  router = createRouter({ prefix: options.hash === undefined ? "t" : options.hash, win, onChange: s => apply(s, false) });

  zin.addEventListener("click", () => viewport.zoomCenter(1.25));
  zout.addEventListener("click", () => viewport.zoomCenter(0.8));
  zfit.addEventListener("click", () => viewport.fitAll());

  scene.svg.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const key = scene.nodeKeyFromEvent(e);
    if (key) { e.preventDefault(); go({ view: "logic", version: currentVersion, key }); }
  });

  function onKey(e) {
    if (!logicShown() || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(input|textarea|select)$/i.test(tg.tagName || ""))) return;
    if (instances > 1 && !root.contains(doc.activeElement)) return;
    const logic = logicOf(currentVersion);
    const x = logic.byKey.get(current);
    const kids = logic.children.get(current);
    const to = key => go({ view: "logic", version: currentVersion, key });
    let handled = true;
    if (e.key === "ArrowRight") { if (x.index < logic.theses.length - 1) to(logic.theses[x.index + 1].key); }
    else if (e.key === "ArrowLeft") { if (x.index > 0) to(logic.theses[x.index - 1].key); }
    else if (e.key === "ArrowUp" && x.from.length) to(x.from[0]);
    else if (e.key === "ArrowDown" && kids.length) to(kids[0]);
    else if (e.key === "+" || e.key === "=") viewport.zoomCenter(1.25);
    else if (e.key === "-") viewport.zoomCenter(0.8);
    else if (e.key === "0") viewport.fitAll();
    else handled = false;
    if (handled) e.preventDefault();
  }
  doc.addEventListener("keydown", onKey);

  const startKey = options.start !== undefined && model.byKey.has(String(options.start)) ? String(options.start) : model.start;
  current = startKey;
  let initial = router.read();
  if (initial && initial.view === "logic" && !(versions.includes(initial.version) && logicOf(initial.version).byKey.has(initial.key))) initial = null;
  if (initial && initial.view !== "logic" && !analysis) initial = null;
  if (!initial) initial = analysis ? { view: "summary" } : { view: "logic", version: "original", key: startKey };
  for (const [name, b] of switches) b.setAttribute("aria-pressed", String(name === currentVersion));
  if (initial.view !== "logic") select(current, false);
  apply(initial, true);

  let ro = null;
  if (win.ResizeObserver) {
    ro = new win.ResizeObserver(() => {
      if (destroyed) return;
      updateNarrow();
      if (logicShown() && !viewport.touched) viewport.home(current);
    });
    ro.observe(root);
  }

  if (doc.fonts && doc.fonts.status !== "loaded") {
    doc.fonts.ready.then(() => {
      if (destroyed) return;
      doLayout();
      select(current, false);
      if (logicShown() && !viewport.touched) viewport.home(current);
    });
  }

  instances++;

  return {
    get selected() { return logicOf(currentVersion).byKey.get(current).id; },
    select: id => go({ view: "logic", version: currentVersion, key: String(id) }),
    fitAll: () => viewport.fitAll(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      instances--;
      doc.removeEventListener("keydown", onKey);
      router.destroy();
      viewport.destroy();
      if (ro) ro.disconnect();
      root.remove();
    }
  };
}
