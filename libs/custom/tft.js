/* "Track my TFT rank" card: on first open, reads rank.json written every 30 min by .github/workflows/tft-rank.yml. */
(() => {
  const card = document.getElementById('tft');
  if (!card) return;
  const APEX = ['MASTER', 'GRANDMASTER', 'CHALLENGER'];
  const COLORS = {
    IRON: '#6f6a66', BRONZE: '#8c5a3c', SILVER: '#8a9aa6', GOLD: '#c79b3b', PLATINUM: '#3a9c8f',
    EMERALD: '#2f9e6b', DIAMOND: '#5b7fd1', MASTER: '#9a4fc7', GRANDMASTER: '#c4423b', CHALLENGER: '#d9a520',
  };
  const title = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  const TIERS = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'];
  const DIVS = { IV: 0, III: 1, II: 2, I: 3 };
  // absolute ladder position so LP lines up across divisions and tiers
  const ladder = (e) => APEX.includes(e.tier) ? 2800 + e.lp : TIERS.indexOf(e.tier) * 400 + (DIVS[e.rank] ?? 0) * 100 + e.lp;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  };

  // Rank over every ranked game this set, one step per game.
  function drawHistory(history) {
    const svg = document.getElementById('tft-lp');
    if (!svg) return;
    svg.replaceChildren();
    if (history.length < 2) { svg.style.display = 'none'; return; }
    const W = 260, H = 110, L = 2, R = 4, T = 6, B = 14;
    const vals = history.map(ladder);
    const vmin = Math.min(...vals) - 20, vmax = Math.max(...vals) + 20;
    const x = (i) => L + (i / (vals.length - 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - vmin) / (vmax - vmin)) * (H - T - B);
    for (let b = Math.ceil(vmin / 400) * 400; b <= vmax; b += 400) {
      const name = b >= 2800 ? 'Master' : title(TIERS[b / 400] || '');
      svgEl('line', { x1: L, x2: W - R, y1: y(b), y2: y(b), stroke: '#dde3e8', 'stroke-dasharray': '3 3' }, svg);
      svgEl('text', { x: L + 2, y: y(b) - 3 }, svg).textContent = name;
    }
    const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    svgEl('path', { d: `${d} L${x(vals.length - 1)},${H - B} L${x(0)},${H - B} Z`, fill: '#2f5d86', 'fill-opacity': '0.08' }, svg);
    svgEl('path', { d, fill: 'none', stroke: '#2f5d86', 'stroke-width': '1.4', 'stroke-linejoin': 'round' }, svg);
    svgEl('circle', { cx: x(vals.length - 1), cy: y(vals[vals.length - 1]), r: 2.8, fill: '#2f5d86' }, svg);
    svgEl('text', { x: L, y: H - 2 }, svg).textContent = `Game ${history[0].n || 1}`;
    svgEl('text', { x: W - R, y: H - 2, 'text-anchor': 'end' }, svg).textContent = `Game ${history[history.length - 1].n || history.length}`;
  }

  const rankEl = document.getElementById('tft-rank');
  const gamesEl = document.getElementById('tft-games');
  const dot = document.getElementById('tft-dot');

  // GitHub's contents API refreshes within about a minute; raw.githubusercontent.com can lag by up to five.
  const fromApi = () => fetch(card.dataset.api, { headers: { Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const fromRaw = () => fetch(`${card.dataset.src}?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const load = () => (card.dataset.api ? fromApi().catch(fromRaw) : fromRaw())
    .then((data) => {
      const cur = data.current;
      if (!data.updated) { rankEl.textContent = 'Tracking starts soon'; return; }
      if (!cur) { rankEl.textContent = 'Unranked'; return; }
      rankEl.textContent = APEX.includes(cur.tier) ? `${title(cur.tier)} · ${cur.lp} LP` : `${title(cur.tier)} ${cur.rank} · ${cur.lp} LP`;
      dot.style.background = COLORS[cur.tier] || '';
      const games = cur.games ?? (cur.wins || 0) + (cur.losses || 0);
      gamesEl.textContent = `${games} ranked game${games === 1 ? '' : 's'}`;
      drawHistory(data.history || []);
    })
    .catch(() => { rankEl.textContent = 'Rank unavailable right now'; });

  let loaded = false;
  card.addEventListener('toggle', () => { if (card.open && !loaded) { loaded = true; load(); } });
})();
