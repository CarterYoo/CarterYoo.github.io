/* "Track my TFT rank" card: on first open, reads rank.json written every 30 min by .github/workflows/tft-rank.yml. */
(() => {
  const card = document.getElementById('tft');
  if (!card) return;
  const $ = (id) => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
  const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
  const DIVS = { IV: 0, III: 1, II: 2, I: 3 };
  const COLORS = {
    IRON: '#6f6a66', BRONZE: '#8c5a3c', SILVER: '#8a9aa6', GOLD: '#c79b3b', PLATINUM: '#3a9c8f',
    EMERALD: '#2f9e6b', DIAMOND: '#5b7fd1', MASTER: '#9a4fc7', GRANDMASTER: '#c4423b', CHALLENGER: '#d9a520',
  };
  const title = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  // Absolute ladder position so LP lines up across divisions and tiers.
  const ladder = (e) => APEX.includes(e.tier) ? 2800 + e.lp : TIERS.indexOf(e.tier) * 400 + DIVS[e.rank] * 100 + e.lp;
  const rankText = (e) => APEX.includes(e.tier) ? `${title(e.tier)} · ${e.lp} LP` : `${title(e.tier)} ${e.rank} · ${e.lp} LP`;
  const ago = (t) => {
    const m = Math.max(0, Math.round((Date.now() / 1000 - t) / 60));
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
  };
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  };

  function drawLp(history) {
    const svg = $('tft-lp');
    svg.replaceChildren();
    const W = 260, H = 84, L = 4, R = 6, T = 8, B = 10;
    if (history.length < 2) {
      el('text', { x: W / 2, y: H / 2 + 3, 'text-anchor': 'middle' }, svg).textContent = 'LP graph fills in as I play';
      return;
    }
    const pts = history.map((h) => ({ t: h.t, v: ladder(h) }));
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
    const vmin = Math.min(...pts.map((p) => p.v)) - 30, vmax = Math.max(...pts.map((p) => p.v)) + 30;
    const x = (t) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - R);
    const y = (v) => T + (1 - (v - vmin) / (vmax - vmin)) * (H - T - B);
    // tier boundaries inside the visible range
    for (let b = Math.ceil(vmin / 400) * 400; b <= vmax; b += 400) {
      const name = b >= 2800 ? 'Master' : title(TIERS[b / 400] || '');
      el('line', { x1: L, x2: W - R, y1: y(b), y2: y(b), stroke: '#dde3e8', 'stroke-dasharray': '3 3' }, svg);
      el('text', { x: L + 2, y: y(b) - 3 }, svg).textContent = name;
    }
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    el('path', { d: `${d} L${x(t1)},${H - B} L${x(t0)},${H - B} Z`, fill: '#2f5d86', 'fill-opacity': '0.08' }, svg);
    el('path', { d, fill: 'none', stroke: '#2f5d86', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }, svg);
    const last = pts[pts.length - 1];
    el('circle', { cx: x(last.t), cy: y(last.v), r: 3, fill: '#2f5d86' }, svg);
  }

  function drawPlacements(matches) {
    const box = $('tft-places');
    box.replaceChildren();
    const ranked = matches.filter((m) => m.ranked);
    const games = (ranked.length ? ranked : matches).slice(0, 20).reverse();
    if (!games.length) {
      box.innerHTML = '<span class="tft-empty">No recent games yet</span>';
      $('tft-avg').textContent = '';
      return;
    }
    for (const g of games) {
      const bar = document.createElement('span');
      bar.className = `tft-place${g.placement <= 4 ? ' top4' : ''}${g.placement === 1 ? ' first' : ''}`;
      bar.style.height = `${((9 - g.placement) / 8) * 100}%`;
      bar.title = `#${g.placement} · ${new Date(g.t * 1000).toLocaleDateString()}`;
      box.appendChild(bar);
    }
    const avg = games.reduce((s, g) => s + g.placement, 0) / games.length;
    const top4 = games.filter((g) => g.placement <= 4).length / games.length;
    $('tft-avg').textContent = `avg ${avg.toFixed(1)} · top 4 ${Math.round(top4 * 100)}%`;
  }

  let loaded = false;
  card.addEventListener('toggle', () => { if (card.open && !loaded) { loaded = true; load(); } });
  // an always-open card (no <details>) loads right away
  if (card.tagName !== 'DETAILS') setTimeout(() => { loaded = true; load(); });

  const load = () => fetch(`${card.dataset.src}?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      if (!data.updated) {
        $('tft-rank').textContent = 'Tracking starts soon';
        drawLp([]);
        drawPlacements([]);
        return;
      }
      const cur = data.current;
      $('tft-rank').textContent = cur ? rankText(cur) : 'Unranked';
      $('tft-dot').style.background = cur ? COLORS[cur.tier] || '#c9cdd1' : '#c9cdd1';
      drawLp(data.history || []);
      drawPlacements(data.matches || []);
      $('tft-updated').textContent = `Updated ${ago(data.updated)}`;
    })
    .catch(() => {
      $('tft-rank').textContent = 'Rank unavailable right now';
      drawLp([]);
      drawPlacements([]);
    });
})();
