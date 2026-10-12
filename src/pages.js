import { issueName, verdictName, linkReason, appendList, appendTemplate, VERDICT_GLYPHS } from "./explain.js";
import { SEVERITIES } from "./analysis.js";

const VERDICT_ORDER = ["false", "unsupported", "weak", "supported", "definition"];

function el(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function section(doc, title, extra) {
  const s = el(doc, "section", "em-sec");
  s.append(el(doc, "h2", "", title));
  if (extra) s.append(el(doc, "p", "em-count", extra));
  return s;
}

/** A clickable [id] that opens the thesis in the logic view. */
function refButton(doc, x, open) {
  const b = el(doc, "button", "em-ref", `[${x.id}]`);
  b.type = "button";
  b.title = x.text;
  b.addEventListener("click", open);
  return b;
}

function meter(doc, value) {
  const m = el(doc, "span", "em-meter");
  const fill = el(doc, "i");
  fill.style.width = `${Math.round(Math.min(1, value) * 100)}%`;
  m.append(fill);
  return m;
}

/**
 * Summary: final conclusions and key points, each with its strength and, when a weak rating or a flaw
 * lowered it, its weakest link; then the key concepts. openThesis(key, version) opens the logic view.
 */
export function renderSummary(page, { model, i18n, openThesis }) {
  const doc = page.ownerDocument;
  const a = model.analysis;
  const t = i18n.t;
  const sheet = el(doc, "div", "em-sheet");

  const item = key => {
    const x = a.versions.original.byKey.get(key);
    const s = a.strengthOf("reconstructed", key);
    const li = el(doc, "li");
    const b = el(doc, "button", "em-item");
    b.type = "button";
    const score = el(doc, "span", "em-score");
    score.append(el(doc, "b", "em-sval", s ? i18n.strength(s.value) : "–"), meter(doc, s ? s.value : 0));
    const main = el(doc, "span", "em-main");
    const head = el(doc, "span", "em-ihead");
    head.append(el(doc, "span", "em-n", `[${x.id}]`), " ", el(doc, "span", "em-label", x.label.replace(/\s*\n\s*/g, " ")));
    main.append(head, el(doc, "span", "em-text", x.text));
    if (s && s.link) {
      const v = a.versions.reconstructed.byKey.get(s.link.key);
      main.append(el(doc, "span", "em-why", `${t("weakest", { reason: linkReason(a, "reconstructed", s.link, i18n) })} [${v.id}]`));
    }
    b.append(score, main);
    b.addEventListener("click", () => openThesis(key, "reconstructed"));
    li.append(b);
    return li;
  };
  const list = keys => {
    const ul = el(doc, "ul", "em-list");
    keys.forEach(k => ul.append(item(k)));
    return ul;
  };

  const finals = section(doc, t("finalConclusions"));
  finals.append(list(a.finals));
  const points = section(doc, t("keyPoints"));
  points.append(list(a.keyPoints));
  sheet.append(finals, points);

  if (a.concepts.length) {
    const concepts = section(doc, t("keyConcepts"));
    const ul = el(doc, "ul", "em-concepts");
    for (const c of a.concepts) {
      const li = el(doc, "li", "em-concept");
      const term = el(doc, "div", "em-term", c.term);
      if (c.senses.length > 1) term.append(" ", el(doc, "span", "em-flag", "! " + t("senses", { count: c.senses.length })));
      li.append(term);
      const senses = el(doc, c.senses.length > 1 ? "ol" : "div", "em-senses");
      for (const s of c.senses) {
        const p = el(doc, c.senses.length > 1 ? "li" : "p", "em-def", s.definition + " ");
        for (const k of s.theses) p.append(refButton(doc, thesisOf(a, k), () => openThesis(k, "original")), " ");
        senses.append(p);
      }
      li.append(senses);
      ul.append(li);
    }
    concepts.append(ul);
    sheet.append(concepts);
  }

  page.textContent = "";
  page.append(sheet);
}

/**
 * Audit: the issues, flaws first, each with its explanation, quote, theses and fix;
 * then the verdicts on the starting claims of the reconstructed logic, the weakest first.
 */
export function renderAudit(page, { model, i18n, openThesis }) {
  const doc = page.ownerDocument;
  const a = model.analysis;
  const t = i18n.t;
  const sheet = el(doc, "div", "em-sheet");
  const items = new Map();

  const counts = { flaw: 0, weakness: 0 };
  for (const x of a.issues) counts[x.severity]++;
  const issues = section(doc, t("issues"), t("issueCount", { flaws: counts.flaw, weaknesses: counts.weakness }));
  const ul = el(doc, "ul", "em-issues");
  const sorted = [...a.issues].sort((p, q) => SEVERITIES.indexOf(p.severity) - SEVERITIES.indexOf(q.severity));
  for (const x of sorted) {
    const li = el(doc, "li", "em-issue " + (x.severity === "flaw" ? "em-flaw" : "em-weak"));
    li.tabIndex = -1;
    const head = el(doc, "div", "em-ihead");
    head.append(el(doc, "span", "em-sev", t(x.severity)), " ", el(doc, "span", "em-iname", issueName(t, x)));
    li.append(head, el(doc, "p", "em-expl", x.explanation), el(doc, "blockquote", "em-quote", x.quote));

    const about = el(doc, "p", "em-about");
    if (x.target === "concept") about.append(t("concept", { term: x.concept }), " ");
    if (x.target === "argument") about.append(t("wholeArgument"), " ");
    for (const k of x.theses) about.append(refButton(doc, thesisOf(a, k), () => openThesis(k, "original")), " ");
    if (about.childNodes.length) li.append(about);

    const fixed = a.fixedBy.get(x.key);
    const fix = el(doc, "p", "em-fix");
    if (fixed.length) {
      appendTemplate(fix, t("fixedBy"), "refs", p => {
        appendList(p, i18n, fixed.length, i => refButton(doc, a.versions.reconstructed.byKey.get(fixed[i]), () => openThesis(fixed[i], "reconstructed")));
      });
    } else {
      fix.textContent = t("noFix");
    }
    li.append(fix);
    ul.append(li);
    items.set(x.key, li);
  }
  issues.append(ul);
  sheet.append(issues);

  const claims = a.versions.reconstructed.theses.filter(x => !x.steps.length);
  const tally = { supported: 0, weak: 0, unsupported: 0, false: 0 };
  for (const x of claims) if (x.verdict in tally) tally[x.verdict]++;
  const verdicts = section(doc, t("startingClaims"), t("claimCount", tally));
  const cl = el(doc, "ul", "em-claims");
  const order = [...claims].sort((p, q) => VERDICT_ORDER.indexOf(p.verdict) - VERDICT_ORDER.indexOf(q.verdict) || p.index - q.index);
  for (const x of order) {
    const li = el(doc, "li", "em-claim");
    const head = el(doc, "div", "em-ihead");
    head.append(
      el(doc, "span", "em-verdict em-v-" + x.verdict, `${VERDICT_GLYPHS[x.verdict]} ${verdictName(t, x.verdict)}`), " ",
      refButton(doc, x, () => openThesis(x.key, "reconstructed")), " ",
      el(doc, "span", "em-text", x.text)
    );
    li.append(head, el(doc, "p", "em-reason", x.reason));
    if (x.added) li.append(el(doc, "p", "em-added-tag", t("added")));
    cl.append(li);
  }
  verdicts.append(cl);
  sheet.append(verdicts);

  page.textContent = "";
  page.append(sheet);

  return {
    /** Scrolls to an issue and marks it for a moment. */
    show(key) {
      const li = items.get(key);
      if (!li) return;
      li.scrollIntoView({ block: "center" });
      li.focus({ preventScroll: true });
      li.classList.remove("em-flash");
      void li.offsetWidth;
      li.classList.add("em-flash");
    }
  };
}

/** A thesis by id, looked up in the original logic first. */
function thesisOf(a, key) {
  for (const v of [a.versions.original, a.versions.reconstructed, a.versions.optimized]) {
    if (v && v.byKey.has(key)) return v.byKey.get(key);
  }
  return { id: key, text: "" };
}
