// Shared drawing primitives for the architecture loops (transformer-circuits style).
// Each composition copies this file next to its index.html.
window.D = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const css = (k) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const C = {};
  ["ink", "mid", "line", "faint", "fill", "stream", "attn", "mlp", "sq", "accent", "accent-soft", "alert", "alert-soft"].forEach((k) => {
    C[k] = css(`--${k}`);
  });

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const g = (parent, cls, attrs = {}) => el("g", { class: cls, ...attrs }, parent);

  function text(parent, x, y, str, o = {}) {
    const t = el("text", { x, y, class: o.cls ?? "t", "text-anchor": o.anchor ?? "start", style: o.style }, parent);
    t.textContent = str;
    return t;
  }
  // Math label: parts = [["W"], ["U", "sub"]] → W_U in serif italic.
  function math(parent, x, y, parts, o = {}) {
    const t = el("text", { x, y, class: `m ${o.cls ?? ""}`, "text-anchor": o.anchor ?? "middle", style: o.style }, parent);
    parts.forEach(([s, kind]) => {
      const ts = el("tspan", {}, t);
      ts.textContent = s;
      if (kind === "sub") { ts.setAttribute("baseline-shift", "sub"); ts.setAttribute("font-size", "0.72em"); }
      if (kind === "sup") { ts.setAttribute("baseline-shift", "super"); ts.setAttribute("font-size", "0.72em"); }
      if (kind === "up") ts.setAttribute("font-style", "normal");
    });
    return t;
  }

  function wire(parent, d, o = {}) {
    const p = el("path", { d, class: `wire${o.dash ? " dash" : ""}`, style: o.color ? `stroke:${o.color}` : undefined }, parent);
    if (o.arrow) {
      const len = p.getTotalLength();
      const a = p.getPointAtLength(len), b = p.getPointAtLength(Math.max(0, len - 5));
      const ang = (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI;
      p._head = el("path", { d: "M0,0 L-6.5,-3 L-6.5,3 Z", fill: o.color ?? C.line, transform: `translate(${a.x},${a.y}) rotate(${ang})` }, parent);
    }
    return p;
  }

  function plus(parent, x, y, r = 6.5) {
    const n = g(parent, "plus");
    el("circle", { cx: x, cy: y, r, fill: "#fff", stroke: C.ink, "stroke-width": 1.1 }, n);
    el("path", { d: `M${x - r + 2.5},${y} H${x + r - 2.5} M${x},${y - r + 2.5} V${y + r - 2.5}`, stroke: C.ink, "stroke-width": 1.1 }, n);
    return n;
  }

  // Attention / MLP / plain block. Attention shows parallel heads, MLP an expand–contract glyph.
  function block(parent, x, y, w, h, o = {}) {
    const n = g(parent, `blk ${o.kind ?? ""}`);
    const fill = o.kind === "attn" ? C.attn : o.kind === "mlp" ? C.mlp : "#fff";
    n._rect = el("rect", { x, y, width: w, height: h, rx: 2, fill, stroke: C.ink, "stroke-width": 1.1 }, n);
    if (o.kind === "attn") {
      // attention pattern: causal (lower-triangular) or bidirectional (full)
      const k = o.grid ?? 5, cell = Math.min((w - 10) / k, (h - 8) / k) - 1;
      const gx = x + (w - k * (cell + 1)) / 2, gy = y + (h - k * (cell + 1)) / 2;
      n._cells = [];
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
        const on = o.causal === false || j <= i;
        const wgt = !on ? 0 : i === j ? 0.85 : j === 0 ? 0.55 : 0.12 + (((i * 7 + j * 3) % 5) / 5) * 0.4;
        const c = el("rect", { x: gx + j * (cell + 1), y: gy + i * (cell + 1), width: cell, height: cell, fill: on ? C.accent : "#fff", "fill-opacity": on ? wgt : 1, stroke: on ? "none" : C.faint, "stroke-width": 0.5 }, n);
        if (on) n._cells.push(c);
      }
    }
    if (o.kind === "mlp") {
      // up-project → nonlinearity → down-project
      const cx = x + w / 2, cy = y + h / 2, cols = [[cx - 12, 3], [cx, 5], [cx + 12, 3]];
      const pts = cols.map(([px, cnt]) => Array.from({ length: cnt }, (_, i) => [px, cy + (i - (cnt - 1) / 2) * 6]));
      const lines = g(n, "mlp-lines");
      for (let c = 0; c < 2; c++) pts[c].forEach(([ax, ay]) => pts[c + 1].forEach(([bx, by]) => el("line", { x1: ax, y1: ay, x2: bx, y2: by, stroke: C.sq, "stroke-width": 0.5 }, lines)));
      n._dots = pts.flat().map(([px, py]) => el("circle", { cx: px, cy: py, r: 1.7, fill: C.mid }, n));
    }
    if (o.label) n._label = text(n, x + w / 2, y + h / 2 + 4, o.label, { cls: "t t-s t-ink", anchor: "middle" });
    if (o.math) n._label = math(n, x + w / 2, y + h / 2 + 5, o.math, { cls: "m-s" });
    return n;
  }

  // Vector of cells (column by default).
  function vec(parent, x, y, n, o = {}) {
    const cell = o.cell ?? 10, gap = o.gap ?? 2, horiz = o.dir === "h";
    const cells = [];
    for (let i = 0; i < n; i++) {
      const cx = horiz ? x + i * (cell + gap) : x, cy = horiz ? y : y + i * (cell + gap);
      cells.push(el("rect", { x: cx, y: cy, width: o.w ?? cell, height: o.h ?? cell, fill: o.fill ?? C.fill, stroke: o.stroke ?? C.line, "stroke-width": 0.7, class: o.cls }, parent));
    }
    return cells;
  }
  const trap = (parent, x1, a1, b1, x2, a2, b2, cls) =>
    el("path", { d: `M${x1},${a1} L${x2},${a2} L${x2},${b2} L${x1},${b1} Z`, fill: "#f7f8f9", stroke: C.line, "stroke-width": 0.8, class: cls }, parent);

  // Sparse autoencoder bowtie: x → W_enc → f(x) (wide, sparse) → W_dec → x̂.
  function sae(parent, x, cy, o = {}) {
    const n = g(parent, "sae");
    const nIn = o.nIn ?? 6, nLat = o.nLat ?? 16, cIn = o.cIn ?? 10, cLat = o.cLat ?? 6, gp = 2, span = o.span ?? 40;
    const hIn = nIn * (cIn + gp) - gp, hLat = nLat * (cLat + gp) - gp;
    const xIn = x, xEnc = x + cIn + 4, xLat = xEnc + span + 4, xDec = xLat + cLat + 4, xOut = xDec + span + 4;
    const yIn = cy - hIn / 2, yLat = cy - hLat / 2;
    const xs = vec(n, xIn, yIn, nIn, { cell: cIn, gap: gp });
    const enc = trap(n, xEnc, yIn, yIn + hIn, xEnc + span, yLat, yLat + hLat, "enc");
    const fs = vec(n, xLat, yLat, nLat, { cell: cLat, gap: gp, w: o.latW ?? cLat + 6, fill: "#fff" });
    const xDec2 = xLat + (o.latW ?? cLat + 6) + 4;
    const dec = trap(n, xDec2, yLat, yLat + hLat, xDec2 + span, yIn, yIn + hIn, "dec");
    const xOut2 = xDec2 + span + 4;
    const xh = vec(n, xOut2, yIn, nIn, { cell: cIn, gap: gp });
    if (o.weights !== false) {
      math(n, xEnc + span / 2, cy + 4, [["W"], ["enc", "sub"]], { cls: "m-s", style: "fill: var(--mid)" });
      math(n, xDec2 + span / 2, cy + 4, [["W"], ["dec", "sub"]], { cls: "m-s", style: "fill: var(--mid)" });
    }
    if (o.labels !== false) {
      math(n, xIn + cIn / 2, yIn + hIn + 18, [["x"]], { cls: "m-s" });
      math(n, xLat + (o.latW ?? cLat + 6) / 2, yLat + hLat + 18, [["f"], ["(x)", "up"]], { cls: "m-s" });
      math(n, xOut2 + cIn / 2, yIn + hIn + 18, [["x̂"]], { cls: "m-s" });
    }
    return { g: n, xs, fs, xh, enc, dec, inX: xIn, inY: cy, latX: xLat, outX: xOut2 + cIn, top: yLat, bottom: yLat + hLat };
  }

  // Distribution bars on a baseline.
  function bars(parent, x, base, vals, o = {}) {
    const w = o.w ?? 5, gap = o.gap ?? 2, maxH = o.maxH ?? 28;
    return vals.map((v, i) => el("rect", { x: x + i * (w + gap), y: base - v * maxH, width: w, height: v * maxH, fill: o.fill ?? C.mid, class: o.cls }, parent));
  }

  // Timeline helpers.
  function anim(tl) {
    return {
      draw(els, t, dur = 0.4, ease = "power1.inOut") {
        [].concat(els).forEach((p) => {
          if (p.classList.contains("dash")) {
            tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: dur, ease: "sine.out" }, t);
          } else {
            const len = Math.ceil(p.getTotalLength()) + 1;
            p.style.strokeDasharray = `${len} ${len}`;
            tl.fromTo(p, { strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, ease }, t);
          }
          if (p._head) tl.fromTo(p._head, { opacity: 0 }, { opacity: 1, duration: 0.1 }, t + dur - 0.06);
        });
      },
      fade(els, t, o = {}) {
        tl.fromTo(els, { opacity: 0, y: o.y ?? 0 }, { opacity: o.to ?? 1, y: 0, duration: o.dur ?? 0.4, ease: o.ease ?? "power2.out", stagger: o.stagger ?? 0 }, t);
      },
      grow(els, t, o = {}) {
        tl.fromTo(els, { scaleX: o.x ? 0 : 1, scaleY: o.x ? 1 : 0, transformOrigin: o.origin ?? "50% 100%" }, { scaleX: 1, scaleY: 1, duration: o.dur ?? 0.4, ease: o.ease ?? "power2.out", stagger: o.stagger ?? 0 }, t);
      },
      pulse(path, t, dur, o = {}) {
        const c = el("circle", { r: o.r ?? 3, fill: o.color ?? C.accent }, o.layer ?? document.getElementById("pulses"));
        const mp = (end) => ({ path, align: path, alignOrigin: [0.5, 0.5], start: 0, end });
        tl.fromTo(c, { opacity: 0, motionPath: mp(0) }, { opacity: 1, duration: 0.05 }, t);
        tl.fromTo(c, { motionPath: mp(0) }, { motionPath: mp(1), duration: dur, ease: o.ease ?? "power1.inOut", immediateRender: false }, t);
        tl.to(c, { opacity: 0, duration: 0.06 }, t + dur - 0.04);
        return c;
      },
      // A fill colour that rises and returns (seek-safe).
      flash(els, t, from, to, dur = 0.12, o = {}) {
        tl.fromTo(els, { fill: from }, { fill: to, duration: dur, yoyo: true, repeat: 1, ease: "sine.inOut", stagger: o.stagger ?? 0, immediateRender: false }, t);
      },
    };
  }

  return { C, el, g, text, math, wire, plus, block, vec, trap, sae, bars, anim };
})();
