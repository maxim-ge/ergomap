import { appendRichText } from "./links.js";
import { issueName, verdictName, typeName, ratingName, linkReason, linkVersion, appendList, VERDICT_GLYPHS } from "./explain.js";
import { STEP_STRENGTH, combine } from "./analysis.js";

function el(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Side panel: the selected thesis in full, its analysis, its premises and consequences, prev/next.
 * onGo(key, version) opens a thesis, in another version when it isn't in the current one; onIssue(key) opens an issue.
 */
export function createPanel(doc, { i18n, analysis, onGo, onIssue, onToggle }) {
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
  const facts = el(doc, "div", "em-facts");

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

  body.append(headrow, note, facts, up.s, down.s, pager, hint);
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

  /** A clickable [id]; in a version that lacks the thesis it opens the version that has it. */
  function ref(key, version) {
    const x = (version || model).byKey.get(key);
    const b = el(doc, "button", "em-ref", `[${x.id}]`);
    b.type = "button";
    b.title = x.text;
    b.addEventListener("click", () => onGo(key, version ? version.name : undefined));
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

  function issueButton(issue) {
    const b = el(doc, "button", "em-issue-ref " + (issue.severity === "flaw" ? "em-flaw" : "em-weak"));
    b.type = "button";
    b.append(el(doc, "span", "em-sev", t(issue.severity)), " ", issueName(t, issue));
    b.addEventListener("click", () => onIssue(issue.key));
    return b;
  }

  function fact(label, ...content) {
    const row = el(doc, "div", "em-fact");
    row.append(el(doc, "span", "em-fk", label));
    const v = el(doc, "div", "em-fv");
    v.append(...content);
    row.append(v);
    facts.append(row);
    return v;
  }

  /** Strength, verdict or step, implicit condition, pool, fixes and issues of the selected thesis. */
  function analysisFacts(x, version) {
    facts.textContent = "";
    facts.hidden = !analysis;
    if (!analysis) return;
    const name = version;
    const base = linkVersion(analysis, name);
    const r = base.byKey.get(x.key) || null;
    const s = analysis.strengthOf(name, x.key);

    if (s) {
      const meter = el(doc, "span", "em-meter");
      const fill = el(doc, "i");
      fill.style.width = `${Math.round(Math.min(1, s.value) * 100)}%`;
      meter.append(fill);
      const v = fact(t("strength"), el(doc, "b", "em-sval", i18n.strength(s.value)), meter);
      if (s.link) {
        const why = el(doc, "p", "em-why", t("weakest", { reason: linkReason(analysis, name, s.link, i18n) }) + " ");
        why.append(ref(s.link.key, base));
        v.append(why);
      }
    }

    // the original logic shows the analysis of the reconstructed thesis only where both agree on its kind
    const same = r && (name !== "original" || !r.steps.length === !x.from.length);
    if (same && !r.steps.length) {
      fact(t("verdict"), el(doc, "b", "em-verdict em-v-" + r.verdict, `${VERDICT_GLYPHS[r.verdict]} ${verdictName(t, r.verdict)}`), ": ", r.reason);
    }
    if (same && r.steps.length) {
      r.steps.forEach(st => {
        fact(t("step"), `${typeName(t, st.type)} · ${i18n.strength(STEP_STRENGTH[st.type])}`);
        if (name === "original") return;
        if (st.condition) {
          const c = st.condition;
          fact(`${t("condition")}: ${ratingName(t, c.rating)}`, c.text, el(doc, "span", "em-reason", ` (${c.reason})`));
        }
        if (st.pool) {
          const v = fact(t("pool"));
          appendList(v, i18n, st.pool.length, i => ref(st.pool[i], base));
          v.append(": ", i18n.strength(combine(st.pool.map(k => analysis.strengthOf(name, k).value))));
        }
      });
    }
    if (r && name !== "original") {
      if (r.added) facts.append(el(doc, "p", "em-added-tag", t("added")));
      if (r.fixes.length) fact(t("fixes"), ...r.fixes.map(k => issueButton(analysis.issueByKey.get(k))));
      if (r.flaw !== null) facts.append(el(doc, "p", "em-why", t("flawNoFix")), issueButton(analysis.issueByKey.get(r.flaw)));
    }
    const issues = analysis.issuesOf(x.key).filter(i => name === "original" || !analysis.fixedBy.get(i.key).length);
    if (issues.length) fact(t("issues"), ...issues.map(issueButton));
    facts.hidden = !facts.childNodes.length;
  }

  function update(m, key, version = "original") {
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
      const [before, after = ""] = t("derived").split("{refs}");
      derived.append(before);
      appendList(derived, i18n, x.from.length, i => ref(x.from[i]));
      derived.append(after);
    }
    thesis.textContent = x.text;

    note.textContent = "";
    note.hidden = !x.note;
    if (x.note) appendRichText(note, x.note);

    analysisFacts(x, version);

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
