import en from "../locales/en.json" with { type: "json" };
import ru from "../locales/ru.json" with { type: "json" };

export const BUILTIN = { en, ru };
export const KEYS = Object.keys(en);

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(s) {
  return new Set(Array.from(s.matchAll(PLACEHOLDER), m => m[1]));
}

function keepsPlaceholders(reference, candidate) {
  if (typeof candidate !== "string" || candidate.trim() === "") return false;
  const have = placeholders(candidate);
  for (const p of placeholders(reference)) if (!have.has(p)) return false;
  return true;
}

/** Picks the UI language: explicit option, then data.lang, then the page's lang, then "en". */
export function resolveLocale({ option, dataLang, pageLang } = {}) {
  for (const v of [option, dataLang, pageLang]) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "en";
}

/**
 * Builds the string table for a locale.
 * Order per key: strings override → built-in dictionary for the language → English.
 * A value that drops a placeholder present in the English text is rejected for that key.
 */
export function createI18n({ locale = "en", strings = null, warn = () => {} } = {}) {
  const lang = String(locale).toLowerCase().split(/[-_]/)[0] || "en";
  const builtin = BUILTIN[lang] || null;
  const table = {};
  const missing = [];
  const broken = [];

  for (const key of KEYS) {
    const ref = en[key];
    const override = strings ? strings[key] : undefined;
    if (override !== undefined) {
      if (keepsPlaceholders(ref, override)) { table[key] = override; continue; }
      broken.push(key);
    }
    if (builtin && keepsPlaceholders(ref, builtin[key])) { table[key] = builtin[key]; continue; }
    if (!builtin && override === undefined) missing.push(key);
    table[key] = ref;
  }

  const unknown = strings ? Object.keys(strings).filter(k => !(k in en)) : [];
  if (missing.length && lang !== "en") warn(`ergomap: no built-in strings for "${lang}", using English for: ${missing.join(", ")}`);
  if (broken.length) warn(`ergomap: strings dropped a placeholder, using fallback for: ${broken.join(", ")}`);
  if (unknown.length) warn(`ergomap: unknown string keys ignored: ${unknown.join(", ")}`);

  let listFormat = null;
  try { listFormat = new Intl.ListFormat(locale, { type: "conjunction", style: "long" }); } catch { listFormat = null; }

  return {
    lang,
    locale,
    table,
    missing,
    broken,
    unknown,
    t(key, vars = {}) {
      const s = key in table ? table[key] : key;
      return s.replace(PLACEHOLDER, (m, name) => (name in vars ? String(vars[name]) : m));
    },
    /** Splits a conjunction list of n items into parts, so items can be rendered as elements. */
    listParts(n) {
      const marks = Array.from({ length: n }, (_, i) => `⁣${i}⁣`);
      if (!listFormat) {
        const parts = [];
        marks.forEach((_, i) => { if (i) parts.push({ type: "literal", value: ", " }); parts.push({ type: "element", index: i }); });
        return parts;
      }
      return listFormat.formatToParts(marks).map(p =>
        p.type === "element" ? { type: "element", index: Number(p.value.replace(/⁣/g, "")) } : { type: "literal", value: p.value }
      );
    }
  };
}
