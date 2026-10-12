const ID = "([A-Za-z0-9_-]+)";

/**
 * Keeps the view in location.hash, so links and the Back button work:
 * #<prefix><id> (the map, original logic), #reconstructed/<prefix><id>, #optimized/<prefix><id>, #summary, #audit, #audit/<issue>.
 * A state is { view: "logic", version, key } | { view: "summary" } | { view: "audit", issue }.
 * With prefix === false the state lives only in memory.
 */
export function createRouter({ prefix = "t", win = window, onChange }) {
  const memory = prefix === false || prefix === null;
  const p = memory ? "t" : String(prefix).replace(/[^A-Za-z0-9_~-]/g, "");
  const thesis = new RegExp(`^#(?:(reconstructed|optimized)/)?${p}${ID}$`);
  const audit = new RegExp(`^#audit(?:/${ID})?$`);

  const parse = hash => {
    if (hash === "#summary") return { view: "summary" };
    let m = audit.exec(hash);
    if (m) return { view: "audit", issue: m[1] || null };
    m = thesis.exec(hash);
    if (m) return { view: "logic", version: m[1] || "original", key: m[2] };
    return null;
  };
  const format = s => {
    if (s.view === "summary") return "#summary";
    if (s.view === "audit") return "#audit" + (s.issue ? "/" + s.issue : "");
    return "#" + (s.version && s.version !== "original" ? s.version + "/" : "") + p + s.key;
  };

  if (memory) {
    return { parse, format, read: () => null, go: s => onChange(s), destroy() {} };
  }
  const read = () => parse(win.location.hash);
  const listener = () => {
    const s = read();
    if (s) onChange(s);
  };
  win.addEventListener("hashchange", listener);
  return {
    parse,
    format,
    read,
    go(s) {
      const target = format(s);
      if (win.location.hash === target) onChange(s);
      else win.location.hash = target;
    },
    destroy() {
      win.removeEventListener("hashchange", listener);
    }
  };
}
