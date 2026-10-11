/**
 * Keeps the selected thesis in location.hash as #<prefix><id>, so links and the Back button work.
 * With prefix === false the selection lives only in memory.
 */
export function createRouter({ prefix = "t", win = window, onChange }) {
  if (prefix === false || prefix === null) {
    return {
      read: () => null,
      go: key => onChange(key),
      destroy() {}
    };
  }
  prefix = String(prefix).replace(/[^A-Za-z0-9_~-]/g, "");
  const re = new RegExp("^#" + prefix + "([A-Za-z0-9_-]+)$");
  const read = () => {
    const m = re.exec(win.location.hash);
    return m ? m[1] : null;
  };
  const listener = () => {
    const k = read();
    if (k !== null) onChange(k);
  };
  win.addEventListener("hashchange", listener);
  return {
    read,
    go(key) {
      const target = "#" + prefix + key;
      if (win.location.hash === target) onChange(key);
      else win.location.hash = target;
    },
    destroy() {
      win.removeEventListener("hashchange", listener);
    }
  };
}
