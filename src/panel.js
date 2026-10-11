import { appendRichText } from "./links.js";

function el(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Side panel: the selected thesis in full, its premises and consequences, prev/next. */
export function createPanel(doc, { i18n, onGo, onToggle }) {
  const t = i18n.t;
  const root = el(doc, "aside", "em-panel");
  root.setAttribute("aria-live", "polite");

  const head = el(doc, "div", "em-panel-head");
  const eyebrow = el(doc, "span", "em-eyebrow");
  const toggle = el(doc, "button", "em-iconbtn", t("collapse"));
  toggle.type = "button";
  head.append(eyebrow, toggle);

  const body = el(doc, "div", "em-panel-body");
  const headrow = el(doc, "div", "em-headrow");
  const numBox = el(doc, "div");
  const num = el(doc, "div", "em-bign");
  const kind = el(doc, "span", "em-kind");
  numBox.append(num, kind);
  const textBox = el(doc, "div", "em-textbox");
  const derived = el(doc, "p", "em-derived");
  const thesis = el(doc, "p", "em-thesis");
  textBox.append(derived, thesis);
  headrow.append(numBox, textBox);

  const note = el(doc, "p", "em-note");

  const mkRel = (cls, title) => {
    const s = el(doc, "section", "em-rel " + cls);
    s.append(el(doc, "h3", "", title));
    const list = el(doc, "div", "em-chips");
    s.append(list);
    return { s, list };
  };
  const up = mkRel("em-up", t("restsOn"));
  const down = mkRel("em-down", t("leadsTo"));

  const pager = el(doc, "div", "em-pager");
  const prev = el(doc, "button", "em-pbtn", t("prev"));
  const next = el(doc, "button", "em-pbtn", t("next"));
  prev.type = next.type = "button";
  pager.append(prev, next);

  const hint = el(doc, "p", "em-hint", t("hint"));

  body.append(headrow, note, up.s, down.s, pager, hint);
  root.append(head, body);

  let model = null;
  let current = null;

  toggle.addEventListener("click", () => {
    const collapsed = root.classList.toggle("em-collapsed");
    toggle.textContent = collapsed ? t("expand") : t("collapse");
    onToggle(collapsed);
  });
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));

  function step(d) {
    const i = model.byKey.get(current).index + d;
    if (i >= 0 && i < model.theses.length) onGo(model.theses[i].key);
  }

  function ref(key) {
    const b = el(doc, "button", "em-ref", `[${model.byKey.get(key).id}]`);
    b.type = "button";
    b.title = model.byKey.get(key).text;
    b.addEventListener("click", () => onGo(key));
    return b;
  }

  function chip(key) {
    const x = model.byKey.get(key);
    const b = el(doc, "button", "em-chip");
    b.type = "button";
    b.append(el(doc, "span", "em-n", `[${x.id}]`), el(doc, "span", "em-tx", x.text));
    b.addEventListener("click", () => onGo(key));
    return b;
  }

  function update(m, key) {
    model = m;
    current = key;
    const x = m.byKey.get(key);
    const section = x.section ? m.sections.get(x.section) : null;
    eyebrow.textContent = section ? section.title : "";
    num.textContent = String(x.id);
    kind.textContent = x.from.length ? t("conclusion") : t("premise");

    derived.textContent = "";
    derived.hidden = x.from.length === 0;
    if (x.from.length) {
      const tpl = t("derived");
      const [before, after = ""] = tpl.split("{refs}");
      derived.append(before);
      for (const p of i18n.listParts(x.from.length)) {
        if (p.type === "element") derived.appendChild(ref(x.from[p.index]));
        else derived.append(p.value);
      }
      derived.append(after);
    }
    thesis.textContent = x.text;

    note.textContent = "";
    note.hidden = !x.note;
    if (x.note) appendRichText(note, x.note);

    up.list.textContent = "";
    if (x.from.length) x.from.forEach(k => up.list.appendChild(chip(k)));
    else up.list.appendChild(el(doc, "div", "em-empty", t("noPremises")));

    down.list.textContent = "";
    const kids = m.children.get(key);
    if (kids.length) kids.forEach(k => down.list.appendChild(chip(k)));
    else down.list.appendChild(el(doc, "div", "em-empty", t("noConsequences")));

    prev.disabled = x.index === 0;
    next.disabled = x.index === m.theses.length - 1;
    body.scrollTop = 0;
  }

  return {
    root,
    update,
    get collapsed() { return root.classList.contains("em-collapsed"); }
  };
}
