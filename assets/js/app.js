/* ============================================================
   Blockfarm — app.js
   Live DeFi yield data (DefiLlama) · APY simulator · IL calc
   Zero dependencies. No API keys. Works fully client-side.
   ============================================================ */
'use strict';

const API_URL   = 'https://yields.llama.fi/pools';
const LS_WATCH  = 'blockfarm_watchlist_v1';
const LS_FILTER = 'blockfarm_filters_v1';
const PAGE_SIZE = 25;

/* ---------- tiny DOM helper ---------- */
const el = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/* ---------- fallback demo dataset (used when API unreachable) ---------- */
const FALLBACK_POOLS = [
  { pool:'demo-lido',      chain:'Ethereum', project:'lido',          symbol:'STETH',        tvlUsd:9_300_000_000, apy:3.1,  apyBase:3.1,  apyReward:null, stablecoin:false, ilRisk:'no',  poolMeta:null,          predictions:{predictedClass:'Stable/Up'} },
  { pool:'demo-aave-usdc', chain:'Ethereum', project:'aave-v3',       symbol:'USDC',         tvlUsd:720_000_000,   apy:4.8,  apyBase:4.8,  apyReward:null, stablecoin:true,  ilRisk:'no',  poolMeta:null,          predictions:{predictedClass:'Stable/Up'} },
  { pool:'demo-curve-3',   chain:'Ethereum', project:'curve-dex',     symbol:'DAI-USDC-USDT',tvlUsd:210_000_000,   apy:5.6,  apyBase:2.1,  apyReward:3.5,  stablecoin:true,  ilRisk:'no',  poolMeta:'3pool',       predictions:{predictedClass:'Stable/Up'} },
  { pool:'demo-uni-ethusdc',chain:'Ethereum',project:'uniswap-v3',    symbol:'WETH-USDC',    tvlUsd:340_000_000,   apy:18.4, apyBase:18.4, apyReward:null, stablecoin:false, ilRisk:'yes', poolMeta:'0.05%',       predictions:{predictedClass:'Volatile'} },
  { pool:'demo-gmx',       chain:'Arbitrum', project:'gmx-v2',        symbol:'GM',           tvlUsd:280_000_000,   apy:11.2, apyBase:11.2, apyReward:null, stablecoin:false, ilRisk:'yes', poolMeta:'ETH-USDC',    predictions:{predictedClass:'Volatile'} },
  { pool:'demo-aero',      chain:'Base',     project:'aerodrome-slipstream', symbol:'WETH-USDC', tvlUsd:150_000_000, apy:32.5, apyBase:24.1, apyReward:8.4, stablecoin:false, ilRisk:'yes', poolMeta:'CL',        predictions:{predictedClass:'Down'} },
  { pool:'demo-morpho',    chain:'Base',     project:'morpho-blue',   symbol:'USDC',         tvlUsd:190_000_000,   apy:7.9,  apyBase:7.9,  apyReward:null, stablecoin:true,  ilRisk:'no',  poolMeta:null,          predictions:{predictedClass:'Stable/Up'} },
  { pool:'demo-pancake',   chain:'Binance',  project:'pancakeswap-amm-v3', symbol:'WBNB-USDT', tvlUsd:96_000_000,  apy:26.3, apyBase:14.8, apyReward:11.5, stablecoin:false, ilRisk:'yes', poolMeta:'0.05%',       predictions:{predictedClass:'Volatile'} },
  { pool:'demo-raydium',   chain:'Solana',   project:'raydium-clmm',  symbol:'SOL-USDC',     tvlUsd:120_000_000,   apy:41.7, apyBase:30.2, apyReward:11.5, stablecoin:false, ilRisk:'yes', poolMeta:null,          predictions:{predictedClass:'Volatile'} },
  { pool:'demo-venus',     chain:'Binance',  project:'venus-core-pool', symbol:'USDT',       tvlUsd:310_000_000,   apy:3.9,  apyBase:3.9,  apyReward:null, stablecoin:true,  ilRisk:'no',  poolMeta:null,          predictions:{predictedClass:'Stable/Up'} },
  { pool:'demo-crvusd',    chain:'Ethereum', project:'curve-llamalend', symbol:'CRVUSD',     tvlUsd:60_000_000,    apy:9.4,  apyBase:9.4,  apyReward:null, stablecoin:true,  ilRisk:'no',  poolMeta:null,          predictions:{predictedClass:'Stable/Up'} },
  { pool:'demo-jupiter',   chain:'Solana',   project:'jupiter-lend',  symbol:'USDC',         tvlUsd:88_000_000,    apy:8.8,  apyBase:8.8,  apyReward:null, stablecoin:true,  ilRisk:'no',  poolMeta:null,          predictions:{predictedClass:'Stable/Up'} },
];

/* ---------- state ---------- */
const state = {
  pools: [],
  source: 'loading',           // 'live' | 'demo'
  updatedAt: null,
  watchlist: loadJSON(LS_WATCH, []),
  filters: Object.assign(
    { search:'', chain:'all', minTvl:10_000_000, stableOnly:false, hideInsane:true },
    loadJSON(LS_FILTER, {})
  ),
  sort: { key:'tvlUsd', dir:-1, str:false },
  shown: PAGE_SIZE,
};
state.watchlist = new Set(Array.isArray(state.watchlist) ? state.watchlist : []);

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

/* ---------- formatting ---------- */
function fmtUSD(n){
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a/1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a/1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}$${(a/1e3).toFixed(1)}K`;
  return `${s}$${a.toFixed(a < 10 ? 2 : 0)}`;
}
function fmtPct(n){
  if (n == null || isNaN(n)) return '—';
  if (n > 9999) return '>9,999%';
  return `${n.toFixed(Math.abs(n) < 10 ? 2 : Math.abs(n) < 100 ? 1 : 0)}%`;
}
function timeAgo(d){
  if (!d) return '';
  const s = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return d.toLocaleTimeString();
}
function median(arr){
  if (!arr.length) return 0;
  const s = [...arr].sort((a,b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg){
  const t = el('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   DATA
   ============================================================ */
async function loadPools(){
  const badge = el('netBadge'), lbl = el('netLabel');
  badge.className = 'net-badge'; lbl.textContent = 'connecting…';
  el('refreshBtn').disabled = true;

  try {
    const res = await fetch(API_URL, { headers:{ 'Accept':'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = Array.isArray(json.data) ? json.data : [];
    if (!data.length) throw new Error('empty payload');

    state.pools = data.filter(p => p && p.symbol && p.tvlUsd > 0 && p.apy != null && isFinite(p.apy));
    state.source = 'live';
    state.updatedAt = new Date();
    badge.classList.add('live');
    lbl.textContent = 'LIVE · DefiLlama';
  } catch (err) {
    console.warn('[Blockfarm] Live fetch failed, using demo dataset:', err);
    state.pools = FALLBACK_POOLS;
    state.source = 'demo';
    state.updatedAt = new Date();
    badge.classList.add('demo');
    lbl.textContent = 'DEMO DATA · offline';
  }
  el('refreshBtn').disabled = false;
  buildChainFilter();
  renderStats();
  renderTable();
  renderWatchlist();
  updateDataStatus();
}

function updateDataStatus(){
  const src = state.source === 'live'
    ? 'Source: <strong>DefiLlama</strong> (yields.llama.fi)'
    : 'Source: <strong>built-in demo dataset</strong> (API unreachable)';
  el('dataStatus').innerHTML =
    `${src} · ${state.pools.length.toLocaleString()} pools · updated ${timeAgo(state.updatedAt)}`;
}

/* ---------- stats ---------- */
function renderStats(){
  const pools   = state.pools;
  const chains  = new Set(pools.map(p => p.chain)).size;
  const tvl     = pools.reduce((t,p) => t + (p.tvlUsd || 0), 0);
  const saneApy = pools.filter(p => p.tvlUsd >= 1e6 && p.apy <= 1000).map(p => p.apy);

  animateValue(el('statPools'),  pools.length, v => Math.round(v).toLocaleString());
  animateValue(el('statTvl'),    tvl,          fmtUSD);
  animateValue(el('statChains'), chains,       v => Math.round(v));
  animateValue(el('statApy'),    median(saneApy), fmtPct);
}

function animateValue(node, target, fmt, dur = 700){
  const t0 = performance.now();
  (function tick(t){
    const k = Math.min(1, (t - t0) / dur);
    const ease = 1 - Math.pow(1 - k, 3);
    node.textContent = fmt(target * ease);
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ============================================================
   POOL EXPLORER
   ============================================================ */
function buildChainFilter(){
  const counts = {};
  state.pools.forEach(p => { counts[p.chain] = (counts[p.chain] || 0) + 1; });
  const top = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 24);

  const sel = el('chainFilter');
  const cur = state.filters.chain;
  sel.innerHTML = '<option value="all">⛓ All chains</option>' +
    top.map(([c,n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`).join('');
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : 'all';
  state.filters.chain = sel.value;
}

function getFiltered(){
  const f = state.filters;
  const q = f.search.trim().toLowerCase();

  const rows = state.pools.filter(p => {
    if (f.chain !== 'all' && p.chain !== f.chain) return false;
    if (p.tvlUsd < f.minTvl) return false;
    if (f.stableOnly && !p.stablecoin) return false;
    if (f.hideInsane && p.apy > 10000) return false;
    if (q && !`${p.symbol} ${p.project} ${p.chain}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const s = state.sort;
  rows.sort((a,b) => s.str
    ? s.dir * String(a[s.key] ?? '').localeCompare(String(b[s.key] ?? ''))
    : s.dir * ((a[s.key] ?? 0) - (b[s.key] ?? 0)));
  return rows;
}

function riskOf(p){
  let score = 0;
  if (!p.stablecoin) score += 2;
  if (p.tvlUsd < 1e6) score += 2; else if (p.tvlUsd < 1e7) score += 1;
  if (p.apy > 100) score += 2;    else if (p.apy > 30)   score += 1;
  if (p.ilRisk === 'yes') score += 1;
  if (p.predictions?.predictedClass === 'Down') score += 1;
  if (score <= 2) return { label:'Low',   cls:'low'   };
  if (score <= 4) return { label:'Med',   cls:'med'   };
  return             { label:'Degen', cls:'degen' };
}

const OUTLOOK = {
  'Stable/Up': { cls:'up',  txt:'↗ Stable/Up' },
  'Down':      { cls:'down',txt:'↘ Down'      },
  'Volatile':  { cls:'vol', txt:'⚡ Volatile'  },
};

function rowHTML(p){
  const r = riskOf(p);
  const o = OUTLOOK[p.predictions?.predictedClass] || null;
  const on = state.watchlist.has(p.pool);
  const breakdown = (p.apyReward != null && p.apyReward > 0.01)
    ? `<span class="apy-sub">${fmtPct(p.apyBase ?? 0)} + ${fmtPct(p.apyReward)} rewards</span>` : '';
  return `<tr>
    <td><button class="star ${on ? 'on' : ''}" data-id="${esc(p.pool)}" title="Add to watchlist">★</button></td>
    <td><div class="pool-name">${esc(p.symbol)}</div>${p.poolMeta ? `<div class="pool-sub">${esc(p.poolMeta)}</div>` : ''}</td>
    <td>${esc(p.project)}</td>
    <td><span class="chain">${esc(p.chain)}</span></td>
    <td class="num">${fmtUSD(p.tvlUsd)}</td>
    <td class="num"><span class="apy">${fmtPct(p.apy)}</span>${breakdown}</td>
    <td><span class="risk ${r.cls}">${r.label}</span></td>
    <td>${o ? `<span class="pred ${o.cls}">${o.txt}</span>` : '<span class="muted">—</span>'}</td>
    <td><button class="mini-btn usecalc" data-apy="${p.apy}" data-name="${esc(p.symbol)}">Simulate</button></td>
  </tr>`;
}

function renderTable(){
  const rows  = getFiltered();
  const slice = rows.slice(0, state.shown);
  el('poolRows').innerHTML = slice.map(rowHTML).join('');
  el('tableEmpty').hidden  = rows.length > 0;
  el('loadMore').style.display = rows.length > state.shown ? '' : 'none';
  el('tableStatus').textContent =
    `Showing ${slice.length.toLocaleString()} of ${rows.length.toLocaleString()} matching pools`;
}

/* ---------- watchlist ---------- */
function saveWatch(){
  localStorage.setItem(LS_WATCH, JSON.stringify([...state.watchlist]));
  el('watchCount').textContent = state.watchlist.size;
}
function toggleWatch(id){
  if (state.watchlist.has(id)) { state.watchlist.delete(id); toast('Removed from watchlist'); }
  else { state.watchlist.add(id); toast('⭐ Saved to watchlist'); }
  saveWatch(); renderTable(); renderWatchlist();
}
function renderWatchlist(){
  const rows = state.pools.filter(p => state.watchlist.has(p.pool));
  el('wlRows').innerHTML  = rows.map(rowHTML).join('');
  el('wlEmpty').hidden    = rows.length > 0;
  el('wlStatus').textContent = rows.length
    ? `${rows.length} pool${rows.length > 1 ? 's' : ''} starred · stored locally in your browser`
    : '';
}

/* ============================================================
   CHART ENGINE (hand-rolled SVG area/line chart)
   ============================================================ */
function renderChart(containerId, cfg){
  // cfg: { labels:[], series:[{name,color,data:[],dash?,area?}], yFmt, markerIdx? }
  const W = 720, H = 260, padL = 62, padR = 18, padT = 18, padB = 34;
  const n = cfg.labels.length;
  const all = cfg.series.flatMap(s => s.data);
  let min = Math.min(...all), max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.08; min -= pad; max += pad;

  const X = i => padL + (i / (n - 1)) * (W - padL - padR);
  const Y = v => padT + ((max - v) / (max - min)) * (H - padT - padB);

  const gid = 'g_' + containerId;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="chart"><defs>
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${cfg.series[0].color}" stop-opacity=".28"/>
      <stop offset="1" stop-color="${cfg.series[0].color}" stop-opacity="0"/>
    </linearGradient></defs>`;

  // horizontal gridlines + y labels
  for (let g = 0; g <= 4; g++){
    const v = min + (g / 4) * (max - min);
    const y = Y(v);
    svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(255,255,255,.07)"/>`;
    svg += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="10.5" fill="#8ba596">${esc(cfg.yFmt(v))}</text>`;
  }
  // x labels (max ~9)
  const step = Math.max(1, Math.ceil(n / 9));
  for (let i = 0; i < n; i += step){
    svg += `<text x="${X(i)}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="#8ba596">${esc(cfg.labels[i])}</text>`;
  }
  // series
  cfg.series.forEach((s, si) => {
    const pts = s.data.map((v,i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    const line = `M${pts.join(' L')}`;
    if (s.area){
      svg += `<path d="${line} L${X(n-1)},${Y(min)} L${X(0)},${Y(min)} Z" fill="url(#${gid})"/>`;
    }
    svg += `<path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="7 6"' : ''}/>`;
    // last-value tag for series 0
    if (si === 0){
      const lx = X(n-1), ly = Y(s.data[n-1]);
      svg += `<circle cx="${lx}" cy="${ly}" r="3.5" fill="${s.color}"/>`;
    }
  });
  // scenario marker
  if (cfg.markerIdx != null && cfg.markerIdx >= 0 && cfg.markerIdx < n){
    const mx = X(cfg.markerIdx), my = Y(cfg.series[0].data[cfg.markerIdx]);
    svg += `<circle cx="${mx}" cy="${my}" r="6" fill="none" stroke="#fff" stroke-width="2"/>
            <circle cx="${mx}" cy="${my}" r="3" fill="#fff"/>`;
  }
  svg += '</svg>';
  el(containerId).innerHTML = svg;
}

/* ============================================================
   APY CALCULATOR
   ============================================================ */
function computeApy(){
  const P      = Math.max(0, parseFloat(el('apyPrincipal').value) || 0);
  const rate   = Math.max(0, parseFloat(el('apyRate').value) || 0) / 100;
  const n      = parseInt(el('apyFreq').value, 10);        // 0 = simple
  const months = parseInt(el('apyMonths').value, 10);
  const t      = months / 12;

  el('apyMonthsLabel').textContent = `${months} month${months > 1 ? 's' : ''}`;

  const final  = n === 0 ? P * (1 + rate * t) : P * Math.pow(1 + rate / n, n * t);
  const profit = final - P;
  const effApy = n === 0 ? rate * 100 : (Math.pow(1 + rate / n, n) - 1) * 100;

  el('resFinal').textContent    = fmtUSD(final);
  el('resProfit').textContent   = '+' + fmtUSD(profit);
  el('resEff').textContent      = fmtPct(effApy);
  el('resPerMonth').textContent = fmtUSD(profit / months);

  // chart series (monthly points)
  const labels = [], comp = [], simple = [];
  for (let m = 0; m <= months; m++){
    labels.push(m === 0 ? 'now' : `M${m}`);
    const tm = m / 12;
    comp.push(n === 0 ? P * (1 + rate * tm) : P * Math.pow(1 + rate / n, n * tm));
    simple.push(P * (1 + rate * tm));
  }
  renderChart('apyChart', {
    labels,
    series: [
      { name:'Compounded',     color:'#a3ff5e', data:comp,   area:true },
      { name:'No compounding', color:'#5ea9ff', data:simple, dash:true },
    ],
    yFmt: fmtUSD,
  });
}

function prefillApy(apy, name){
  if (apy != null && isFinite(apy)){
    el('apyRate').value = Math.min(Math.abs(apy), 10000).toFixed(2);
    computeApy();
  }
  switchTab('apy');
  toast(`📈 Simulating ${name}`);
}

/* ============================================================
   IMPERMANENT LOSS CALCULATOR
   ============================================================ */
function computeIL(){
  const P    = Math.max(0, parseFloat(el('ilStart').value) || 0);
  const move = parseFloat(el('ilMove').value) || 0;         // % price change
  const k    = Math.max(1e-4, 1 + move / 100);              // price ratio new/old

  const il   = 2 * Math.sqrt(k) / (1 + k) - 1;              // <= 0
  const lp   = P * Math.sqrt(k);
  const hodl = P * (1 + k) / 2;

  el('ilResPct').textContent  = fmtPct(il * 100);
  el('ilResLp').textContent   = fmtUSD(lp);
  el('ilResHodl').textContent = fmtUSD(hodl);
  el('ilResDiff').textContent = fmtUSD(lp - hodl);

  // curve: k from 0.05 (-95%) to 12 (+1100%), log spaced
  const N = 90, lo = Math.log10(0.05), hi = Math.log10(12);
  const data = [], labels = [];
  let markerIdx = -1, bestDist = Infinity;
  for (let i = 0; i < N; i++){
    const kk = Math.pow(10, lo + (i / (N - 1)) * (hi - lo));
    data.push((2 * Math.sqrt(kk) / (1 + kk) - 1) * 100);
    const pct = Math.round((kk - 1) * 100);
    labels.push(`${pct > 0 ? '+' : ''}${pct}%`);
    const d = Math.abs(Math.log(kk / k));
    if (d < bestDist) { bestDist = d; markerIdx = i; }
  }
  renderChart('ilChart', {
    labels,
    series: [{ name:'IL %', color:'#ff6b81', data, area:true }],
    yFmt: v => `${v.toFixed(1)}%`,
    markerIdx,
  });
}

/* ============================================================
   NAV / EVENTS / INIT
   ============================================================ */
function switchTab(name){
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  window.scrollTo({ top: 0, behavior:'smooth' });
}

function saveFilters(){
  const { search, ...rest } = state.filters;  // don't persist free-text search
  localStorage.setItem(LS_FILTER, JSON.stringify(rest));
}

function debounce(fn, ms){
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function init(){
  /* ---- tabs ---- */
  el('tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab');
    if (b) switchTab(b.dataset.tab);
  });

  /* ---- filters ---- */
  const f = state.filters;
  el('search').value       = '';
  el('tvlFilter').value    = String(f.minTvl);
  el('stableFilter').checked = f.stableOnly;
  el('degenFilter').checked  = f.hideInsane;
  el('sortBy').value       = 'tvlUsd:desc';

  el('search').addEventListener('input', debounce(e => {
    state.filters.search = e.target.value; state.shown = PAGE_SIZE; renderTable();
  }, 180));
  el('chainFilter').addEventListener('change', e => {
    state.filters.chain = e.target.value; state.shown = PAGE_SIZE; saveFilters(); renderTable();
  });
  el('tvlFilter').addEventListener('change', e => {
    state.filters.minTvl = parseFloat(e.target.value); state.shown = PAGE_SIZE; saveFilters(); renderTable();
  });
  el('stableFilter').addEventListener('change', e => {
    state.filters.stableOnly = e.target.checked; state.shown = PAGE_SIZE; saveFilters(); renderTable();
  });
  el('degenFilter').addEventListener('change', e => {
    state.filters.hideInsane = e.target.checked; state.shown = PAGE_SIZE; saveFilters(); renderTable();
  });
  el('sortBy').addEventListener('change', e => {
    const [key, ord] = e.target.value.split(':');
    state.sort = { key, dir: ord === 'desc' ? -1 : 1, str: key === 'symbol' };
    renderTable();
  });
  el('refreshBtn').addEventListener('click', () => { loadPools(); toast('↻ Refreshing pools…'); });
  el('loadMore').addEventListener('click', () => { state.shown += PAGE_SIZE; renderTable(); });

  /* ---- table actions (delegated) ---- */
  const onRowClick = e => {
    const star = e.target.closest('.star');
    if (star) { toggleWatch(star.dataset.id); return; }
    const sim = e.target.closest('.usecalc');
    if (sim) prefillApy(parseFloat(sim.dataset.apy), sim.dataset.name);
  };
  el('poolRows').addEventListener('click', onRowClick);
  el('wlRows').addEventListener('click', onRowClick);

  /* ---- calculators ---- */
  ['apyPrincipal','apyRate','apyFreq','apyMonths'].forEach(id =>
    el(id).addEventListener('input', computeApy));
  ['ilStart','ilMove'].forEach(id =>
    el(id).addEventListener('input', computeIL));
  document.querySelectorAll('.chip').forEach(c =>
    c.addEventListener('click', () => { el('ilMove').value = c.dataset.move; computeIL(); }));

  /* ---- go ---- */
  saveWatch();          // sets initial watch counter
  computeApy();
  computeIL();
  loadPools();
  setInterval(updateDataStatus, 30_000);   // keep "updated Xs ago" fresh
}

document.addEventListener('DOMContentLoaded', init);
