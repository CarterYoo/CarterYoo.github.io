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
  const rankEl = document.getElementById('tft-rank');
  const gamesEl = document.getElementById('tft-games');
  const dot = document.getElementById('tft-dot');

  const load = () => fetch(`${card.dataset.src}?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      const cur = data.current;
      if (!data.updated) { rankEl.textContent = 'Tracking starts soon'; return; }
      if (!cur) { rankEl.textContent = 'Unranked'; return; }
      rankEl.textContent = APEX.includes(cur.tier) ? `${title(cur.tier)} · ${cur.lp} LP` : `${title(cur.tier)} ${cur.rank} · ${cur.lp} LP`;
      dot.style.background = COLORS[cur.tier] || '';
      const games = (cur.wins || 0) + (cur.losses || 0);
      gamesEl.textContent = `${games} ranked game${games === 1 ? '' : 's'}`;
    })
    .catch(() => { rankEl.textContent = 'Rank unavailable right now'; });

  let loaded = false;
  card.addEventListener('toggle', () => { if (card.open && !loaded) { loaded = true; load(); } });
})();
