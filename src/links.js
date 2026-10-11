const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** Splits text into plain and link segments. Only http(s) links are recognized. */
export function parseLinks(text) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(LINK)) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "link", value: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/** Appends text to el, turning markdown links into anchors. Never parses HTML. */
export function appendRichText(el, text) {
  const doc = el.ownerDocument;
  for (const seg of parseLinks(text)) {
    if (seg.type === "text") {
      el.appendChild(doc.createTextNode(seg.value));
    } else {
      const a = doc.createElement("a");
      a.href = seg.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = seg.value;
      el.appendChild(a);
    }
  }
}
