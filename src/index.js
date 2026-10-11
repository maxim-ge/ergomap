import css from "./styles.css";
import { validate, ancestors, descendants, DataError } from "./validate.js";
import { createI18n, resolveLocale, BUILTIN } from "./i18n.js";
import { computeLayout } from "./layout.js";
import { createScene } from "./render.js";
import { createViewport } from "./viewport.js";
import { createPanel } from "./panel.js";
import { createRouter } from "./router.js";

/* global __VERSION__ */
export const version = typeof __VERSION__ === "string" ? __VERSION__ : "dev";
export const locales = Object.keys(BUILTIN);
export { validate, DataError };

const STYLE_ID = "ergomap-styles";
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
 * Renders an argument graph into target.
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
  const nodeLabel = x => t("nodeLabel", { id: x.id, text: x.text });
  function doLayout() {
    layout = computeLayout(model, {
      measureLabel: measurer(fontOf("--em-font-body", 13, 400), 13),
      measureNum: measurer(fontOf("--em-font-mono", 13, 500), 13)
    });
    scene.draw(model, layout, { nodeLabel });
  }
  doLayout();

  let current = null;
  let destroyed = false;
  const isNarrow = () => root.classList.contains("em-narrow");
  const updateNarrow = () => root.classList.toggle("em-narrow", root.clientWidth > 0 && root.clientWidth <= 760);

  let router = null;
  const go = key => router.go(key);

  const panel = createPanel(doc, {
    i18n,
    onGo: go,
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
    onNodeClick: go,
    reduceMotion: () => !!(win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches)
  });

  function select(key, scroll) {
    if (!model.byKey.has(key)) return;
    current = key;
    scene.highlight(model, key, ancestors(model, key), descendants(model, key));
    panel.update(model, key);
    if (scroll) viewport.ensureVisible(key);
    if (typeof options.onSelect === "function") options.onSelect(model.byKey.get(key).id);
  }

  router = createRouter({ prefix: options.hash === undefined ? "t" : options.hash, win, onChange: k => select(k, true) });

  zin.addEventListener("click", () => viewport.zoomCenter(1.25));
  zout.addEventListener("click", () => viewport.zoomCenter(0.8));
  zfit.addEventListener("click", () => viewport.fitAll());

  scene.svg.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const key = scene.nodeKeyFromEvent(e);
    if (key) { e.preventDefault(); go(key); }
  });

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const tg = e.target;
    if (tg && (tg.isContentEditable || /^(input|textarea|select)$/i.test(tg.tagName || ""))) return;
    if (instances > 1 && !root.contains(doc.activeElement)) return;
    const x = model.byKey.get(current);
    const kids = model.children.get(current);
    let handled = true;
    if (e.key === "ArrowRight") { if (x.index < model.theses.length - 1) go(model.theses[x.index + 1].key); }
    else if (e.key === "ArrowLeft") { if (x.index > 0) go(model.theses[x.index - 1].key); }
    else if (e.key === "ArrowUp" && x.from.length) go(x.from[0]);
    else if (e.key === "ArrowDown" && kids.length) go(kids[0]);
    else if (e.key === "+" || e.key === "=") viewport.zoomCenter(1.25);
    else if (e.key === "-") viewport.zoomCenter(0.8);
    else if (e.key === "0") viewport.fitAll();
    else handled = false;
    if (handled) e.preventDefault();
  }
  doc.addEventListener("keydown", onKey);

  let initial = router.read();
  if (initial === null || !model.byKey.has(initial)) {
    initial = options.start !== undefined && model.byKey.has(String(options.start)) ? String(options.start) : model.start;
  }
  updateNarrow();
  select(initial, false);
  viewport.home(initial);

  let ro = null;
  if (win.ResizeObserver) {
    ro = new win.ResizeObserver(() => {
      if (destroyed) return;
      updateNarrow();
      if (!viewport.touched) viewport.home(current);
    });
    ro.observe(root);
  }

  if (doc.fonts && doc.fonts.status !== "loaded") {
    doc.fonts.ready.then(() => {
      if (destroyed) return;
      doLayout();
      select(current, false);
      if (!viewport.touched) viewport.home(current);
    });
  }

  instances++;

  return {
    get selected() { return model.byKey.get(current).id; },
    select: id => go(String(id)),
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
