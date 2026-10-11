const TOP = 48; // room for the legend above the graph

/**
 * Pan and zoom for the scene: drag, wheel (Ctrl/Cmd + wheel zooms), pinch, buttons.
 * A click without movement on a node calls onNodeClick(key).
 */
export function createViewport({ svg, world, stage, visibleRect, isNarrow, getLayout, nodeKeyFromEvent, onNodeClick, reduceMotion }) {
  const view = { k: 1, x: 0, y: 0 };
  let touched = false;
  let anim = 0;
  const win = svg.ownerDocument.defaultView;

  const apply = () => world.setAttribute("transform", `translate(${view.x},${view.y}) scale(${view.k})`);

  function fitAll() {
    const L = getLayout();
    const vr = visibleRect();
    const pad = 16;
    const k = Math.max(0.3, Math.min(1, Math.min((vr.w - pad * 2) / L.width, (vr.h - TOP - pad) / L.height)));
    view.k = k;
    view.x = vr.x + (vr.w - L.width * k) / 2;
    view.y = vr.y + TOP + (vr.h - TOP - L.height * k) / 2;
    apply();
  }

  /** Readable default: fit the height (within limits) and center on the selected node. */
  function home(key) {
    const L = getLayout();
    const vr = visibleRect();
    const pad = 12;
    const minK = isNarrow() ? 0.62 : 0.72;
    const k = Math.max(minK, Math.min(0.92, (vr.h - TOP - pad) / L.height));
    view.k = k;
    const gw = L.width * k, gh = L.height * k;
    const n = L.nodes.get(key);
    if (gw <= vr.w) view.x = vr.x + (vr.w - gw) / 2;
    else view.x = Math.min(pad, Math.max(vr.x + vr.w - gw - pad, vr.x + vr.w / 2 - n.x * k));
    if (gh <= vr.h - TOP) view.y = vr.y + TOP + (vr.h - TOP - gh) / 2;
    else view.y = vr.y + TOP + (vr.h - TOP) / 2 - n.y * k;
    apply();
  }

  function zoomAt(f, px, py) {
    const k = Math.max(0.25, Math.min(2.5, view.k * f));
    const wx = (px - view.x) / view.k, wy = (py - view.y) / view.k;
    view.k = k; view.x = px - wx * k; view.y = py - wy * k;
    apply();
  }

  function zoomCenter(f) {
    const vr = visibleRect();
    zoomAt(f, vr.x + vr.w / 2, vr.y + vr.h / 2);
    touched = true;
  }

  function panTo(tx, ty) {
    if (anim) win.cancelAnimationFrame(anim);
    if (reduceMotion()) { view.x = tx; view.y = ty; apply(); return; }
    const sx = view.x, sy = view.y, t0 = win.performance.now(), dur = 280;
    const step = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      view.x = sx + (tx - sx) * e; view.y = sy + (ty - sy) * e; apply();
      anim = p < 1 ? win.requestAnimationFrame(step) : 0;
    };
    anim = win.requestAnimationFrame(step);
  }

  function ensureVisible(key) {
    const L = getLayout();
    const n = L.nodes.get(key);
    if (!n) return;
    const vr = visibleRect();
    const sx = view.x + n.x * view.k, sy = view.y + n.y * view.k;
    const mx = (n.width / 2) * view.k + 20, my = (n.height / 2) * view.k + 20;
    if (sx - mx < vr.x || sx + mx > vr.x + vr.w || sy - my < vr.y + TOP || sy + my > vr.y + vr.h) {
      panTo(vr.x + vr.w / 2 - n.x * view.k, vr.y + TOP / 2 + vr.h / 2 - n.y * view.k);
    }
  }

  // pointer input
  const pointers = new Map();
  let drag = null, pinch = null;

  function down(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (pointers.size === 1) {
      drag = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, node: nodeKeyFromEvent(e) };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: view.k };
      drag = null;
    }
  }
  function move(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const r = svg.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((pinch.k * d / pinch.d) / view.k, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      touched = true;
    } else if (drag) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; svg.classList.add("em-dragging"); }
      if (drag.moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; apply(); touched = true; }
    }
  }
  function up(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (drag && !drag.moved && drag.node && e.type === "pointerup") onNodeClick(drag.node);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) { drag = null; svg.classList.remove("em-dragging"); }
  }
  function wheel(e) {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) {
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0025)), e.clientX - r.left, e.clientY - r.top);
    } else {
      const unit = e.deltaMode === 1 ? 16 : 1;
      let dx = e.deltaX * unit, dy = e.deltaY * unit;
      const fitsV = getLayout().height * view.k <= stage.clientHeight - TOP;
      if (e.shiftKey || (fitsV && Math.abs(dy) > Math.abs(dx))) { dx = dy; dy = 0; }
      view.x -= dx; view.y -= dy; apply();
    }
    touched = true;
  }

  svg.addEventListener("pointerdown", down);
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
  svg.addEventListener("wheel", wheel, { passive: false });

  return {
    apply,
    fitAll() { touched = true; fitAll(); },
    home,
    zoomCenter,
    ensureVisible,
    get touched() { return touched; },
    destroy() {
      if (anim) win.cancelAnimationFrame(anim);
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", up);
      svg.removeEventListener("wheel", wheel);
    }
  };
}
