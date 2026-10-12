/** Names and reasons shared by the panel, the summary and the audit. */

const ISSUE_KEYS = {
  "non-sequitur": "issueNonSequitur",
  "missing-premise": "issueMissingPremise",
  circular: "issueCircular",
  equivocation: "issueEquivocation",
  "straw-man": "issueStrawMan",
  inconsistency: "issueInconsistency",
  "irrelevant-conclusion": "issueIrrelevantConclusion"
};

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const issueName = (t, issue) => t(ISSUE_KEYS[issue.type]);
export const verdictName = (t, verdict) => t("verdict" + cap(verdict));
export const typeName = (t, type) => t("type" + cap(type));
export const ratingName = (t, rating) => t("rating" + cap(rating));

/** Glyphs that mark verdicts next to their names, so the marks don't rely on color. */
export const VERDICT_GLYPHS = { supported: "✓", weak: "~", unsupported: "?", false: "✗", definition: "=" };

/** The version a strength's weakest link refers to: the original logic shows the reconstructed values. */
export function linkVersion(analysis, version) {
  return version === "optimized" ? analysis.versions.optimized : analysis.versions.reconstructed;
}

/** The weakest link as a reason in the article's language and the thesis it points to. */
export function linkReason(analysis, version, link, i18n) {
  const v = linkVersion(analysis, version);
  const t = v.byKey.get(link.key);
  if (link.kind === "claim") return t.reason;
  if (link.kind === "condition") return t.steps[link.step].condition.reason;
  if (link.kind === "flaw") return issueName(i18n.t, analysis.issueByKey.get(link.issue));
  return i18n.t("weakestPool", { refs: link.members.map(k => `[${v.byKey.get(k).id}]`).join(", ") });
}

/** "[16], [17a] and [18]" as parts, with each item rendered by item(index). */
export function appendList(parent, i18n, count, item) {
  for (const p of i18n.listParts(count)) {
    if (p.type === "element") parent.appendChild(item(p.index));
    else parent.append(p.value);
  }
}

/** Fills a template such as "Fixed: {refs}" with an element in place of the placeholder. */
export function appendTemplate(parent, text, placeholder, fill) {
  const [before, after = ""] = text.split(`{${placeholder}}`);
  parent.append(before);
  fill(parent);
  parent.append(after);
}
