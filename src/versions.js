/** The steps of a thesis; theses of the original logic have one implicit step over from. */
export function stepsOf(t) {
  return t.steps || (t.from.length ? [{ from: t.from, type: null, condition: null, pool: null }] : []);
}

/**
 * The graph laid out once for all versions, so nodes keep their place when the version changes.
 * Pools become clusters, so their members stay together.
 */
export function unionGraph(model) {
  const a = model.analysis;
  if (!a) return { theses: model.theses, clusters: [] };
  const { original, reconstructed, optimized } = a.versions;
  const nodes = new Map();
  for (const v of [reconstructed, original, optimized]) {
    if (!v) continue;
    for (const t of v.theses) {
      let n = nodes.get(t.key);
      if (!n) {
        n = { key: t.key, id: t.id, labels: [], from: [] };
        nodes.set(t.key, n);
      }
      if (!n.labels.includes(t.label)) n.labels.push(t.label);
      for (const p of t.from) if (!n.from.includes(p)) n.from.push(p);
    }
  }
  const clustered = new Set();
  const clusters = [];
  for (const v of [reconstructed, optimized]) {
    if (!v) continue;
    for (const t of v.theses) {
      for (const s of t.steps) {
        if (!s.pool || s.pool.some(k => clustered.has(k))) continue;
        s.pool.forEach(k => clustered.add(k));
        clusters.push(s.pool);
      }
    }
  }
  return { theses: [...nodes.values()], clusters };
}

/**
 * What the map draws for a version: nodes with their marks, edges and pool boxes.
 * The optimized version also draws the reconstructed theses it dropped, faded.
 */
export function mapView(model, version, i18n) {
  const a = model.analysis;
  if (!a) {
    return {
      theses: model.theses.map(t => ({ key: t.key, id: t.id, label: t.label, text: t.text, classes: t.from.length ? [] : ["em-premise"] })),
      edges: model.theses.flatMap(t => t.from.map(p => ({ u: p, v: t.key, cls: "" }))),
      pools: []
    };
  }
  const v = a.versions[version];
  const { original, reconstructed } = a.versions;
  const broken = new Set();
  for (const b of a.broken) if (b && b.version === version) for (const p of b.premises) broken.add(`${p}>${b.key}`);

  const theses = [];
  const edges = [];
  const pools = [];
  const node = (t, faded) => {
    const s = faded ? null : a.strengthOf(version, t.key);
    const classes = [];
    if (!t.from.length) classes.push("em-premise");
    if (version !== "original" && !original.byKey.has(t.key)) classes.push("em-added");
    if (faded) classes.push("em-faded");
    const issues = a.issuesOf(t.key).filter(x => version === "original" || !a.fixedBy.get(x.key).length);
    return {
      key: t.key,
      id: t.id,
      label: t.label,
      text: t.text,
      classes,
      faded,
      badge: s ? i18n.strength(s.value) : null,
      low: !!(s && s.link),
      issue: !faded && issues.length > 0
    };
  };

  const shown = new Set();
  for (const t of v.theses) {
    for (const s of stepsOf(t)) {
      const pool = version === "original" ? null : s.pool;
      for (const p of s.from) {
        shown.add(`${p}>${t.key}`);
        if (!pool || !pool.includes(p)) edges.push({ u: p, v: t.key, cls: broken.has(`${p}>${t.key}`) ? "em-broken" : "" });
      }
      if (pool) pools.push({ v: t.key, members: pool });
    }
  }
  if (version === "optimized") {
    const faded = [];
    for (const t of reconstructed.theses) {
      if (!v.byKey.has(t.key)) faded.push(node(t, true));
      for (const p of t.from) if (!shown.has(`${p}>${t.key}`)) edges.unshift({ u: p, v: t.key, cls: "em-faded" });
    }
    theses.push(...faded);
  }
  theses.push(...v.theses.map(t => node(t, false)));
  return { theses, edges, pools };
}
