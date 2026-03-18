// ============================================================
// InviWine — Core JS (Supabase Auth + Utils)
// ============================================================

const SUPABASE_URL = 'https://qqrtzebjxekjscgawdda.supabase.co';
const SUPABASE_ANON = 'sb_publishable_e9iG6qvoKAoQbcx6K63WUw_Ybrxzbt-';

async function loadSupabase() {
  if (window._sb) return window._sb;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
    s.onload = () => {
      window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
      resolve(window._sb);
    };
    document.head.appendChild(s);
  });
}

async function getSession() {
  const sb = await loadSupabase();
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

async function signUp(email, password, fullName) {
  const sb = await loadSupabase();
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const sb = await loadSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const sb = await loadSupabase();
  await sb.auth.signOut();
  window.location.href = '/';
}

async function getProfile(userId) {
  const sb = await loadSupabase();
  const { data } = await sb.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function guardAuth() {
  const user = await getUser();
  if (!user) { window.location.href = '/login.html'; return null; }
  return user;
}

async function redirectIfAuth() {
  const user = await getUser();
  if (user) { window.location.href = '/dashboard.html'; }
}

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const update = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const observer = new IntersectionObserver(entries => {
          entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    els.forEach(el => observer.observe(el));
    // Fallback: force visibility for elements already in viewport
    requestAnimationFrame(() => {
          els.forEach(el => {
                  const r = el.getBoundingClientRect();
                  if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
          });
    });
}

function drawSparkline(container, data, isUp, w = 80, h = 32) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', h);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const pad = 2;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const toX = i => pad + (i / (data.length - 1)) * (w - pad * 2);
  const toY = v => pad + (h - pad * 2) - ((v - min) / range) * (h - pad * 2);
  let d = `M ${toX(0)} ${toY(data[0])}`;
  for (let i = 1; i < data.length; i++) {
    const cpx = (toX(i - 1) + toX(i)) / 2;
    d += ` C ${cpx} ${toY(data[i - 1])} ${cpx} ${toY(data[i])} ${toX(i)} ${toY(data[i])}`;
  }
  const color = isUp ? '#22C55E' : '#EF4444';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d); path.setAttribute('stroke', color);
  path.setAttribute('stroke-width', '1.5'); path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  container.appendChild(svg);
}

function drawLineChart(svgEl, data, color = '#C9A84C') {
  if (!data || data.length < 2) return;
  const W = svgEl.clientWidth || 600;
  const H = svgEl.clientHeight || 160;
  const padX = 48, padY = 16;
  const cw = W - padX * 2, ch = H - padY * 2;
  const prices = data.map(d => d.price || d);
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const toX = i => padX + (i / (data.length - 1)) * cw;
  const toY = v => padY + ch - ((v - min) / range) * ch;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.innerHTML = '';
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `<linearGradient id="lg${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </linearGradient>`;
  svgEl.appendChild(defs);
  [0.25, 0.5, 0.75, 1].forEach(r => {
    const y = padY + r * ch;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', padX); line.setAttribute('y1', y);
    line.setAttribute('x2', W - padX); line.setAttribute('y2', y);
    line.setAttribute('stroke', '#2A2A2A'); line.setAttribute('stroke-width', '1');
    svgEl.appendChild(line);
    const price = max - r * range;
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', padX - 6); txt.setAttribute('y', y + 4);
    txt.setAttribute('fill', '#555'); txt.setAttribute('font-size', '10');
    txt.setAttribute('text-anchor', 'end'); txt.setAttribute('font-family', 'Inter');
    txt.textContent = price >= 1000 ? `€${(price/1000).toFixed(1)}k` : `€${price.toFixed(0)}`;
    svgEl.appendChild(txt);
  });
  let line = `M ${toX(0)} ${toY(prices[0])}`;
  let area = line;
  for (let i = 1; i < data.length; i++) {
    const cpx = (toX(i - 1) + toX(i)) / 2;
    const seg = ` C ${cpx} ${toY(prices[i-1])} ${cpx} ${toY(prices[i])} ${toX(i)} ${toY(prices[i])}`;
    line += seg; area += seg;
  }
  area += ` L ${toX(data.length-1)} ${padY+ch} L ${padX} ${padY+ch} Z`;
  const aPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  aPath.setAttribute('d', area); aPath.setAttribute('fill', `url(#lg${color.replace('#','')})`);
  svgEl.appendChild(aPath);
  const lPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  lPath.setAttribute('d', line); lPath.setAttribute('stroke', color);
  lPath.setAttribute('stroke-width', '2'); lPath.setAttribute('fill', 'none');
  lPath.setAttribute('stroke-linecap', 'round');
  svgEl.appendChild(lPath);
}

function fmtEur(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000000) return `€${(n/1000000).toFixed(2)}M`;
  if (n >= 1000) return `€${(n/1000).toFixed(1)}k`;
  return `€${n.toLocaleString('fr-FR',{minimumFractionDigits:0})}`;
}
function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

const WINES = [
  { id:'1', name:'Pétrus', producer:'Moueix', region:'Bordeaux', vintage:2015, current_price:3800, change_1m:3.2, change_1y:35.8, score:100, spark:[20,18,16,17,12,9,6,10,4,2,1,1] },
  { id:'2', name:'Romanée-Conti', producer:'DRC', region:'Bourgogne', vintage:2019, current_price:18000, change_1m:5.2, change_1y:45.2, score:100, spark:[22,19,17,14,10,7,5,3,2,1,1,1] },
  { id:'3', name:'Screaming Eagle', producer:'Screaming Eagle', region:'Napa', vintage:2018, current_price:3800, change_1m:4.2, change_1y:42.5, score:100, spark:[18,15,13,16,11,8,5,3,2,1,1,1] },
  { id:'4', name:'Harlan Estate', producer:'Harlan Estate', region:'Napa', vintage:2016, current_price:980, change_1m:3.1, change_1y:34.8, score:99, spark:[20,17,15,12,9,7,5,4,2,1,1,1] },
  { id:'5', name:'Musigny', producer:'Leroy', region:'Bourgogne', vintage:2018, current_price:8500, change_1m:4.5, change_1y:52.3, score:100, spark:[24,20,17,14,10,7,4,3,1,1,1,1] },
  { id:'6', name:'Château Latour', producer:'Château Latour', region:'Bordeaux', vintage:2016, current_price:1200, change_1m:1.8, change_1y:22.3, score:99, spark:[18,16,14,12,10,8,6,5,3,2,2,2] },
  { id:'7', name:'Hermitage', producer:'Jean-Louis Chave', region:'Rhône', vintage:2016, current_price:520, change_1m:2.2, change_1y:22.5, score:99, spark:[17,15,13,11,9,8,6,5,3,2,2,2] },
  { id:'8', name:'Château Margaux', producer:'Château Margaux', region:'Bordeaux', vintage:2015, current_price:780, change_1m:1.5, change_1y:16.2, score:98, spark:[15,14,12,11,10,8,7,5,4,3,3,3] },
  { id:'9', name:'Sassicaia', producer:'Tenuta San Guido', region:'Italie', vintage:2016, current_price:320, change_1m:1.5, change_1y:16.8, score:98, spark:[15,13,12,10,9,7,6,5,3,2,2,2] },
  { id:'10', name:'Masseto', producer:'Ornellaia', region:'Italie', vintage:2018, current_price:620, change_1m:2.4, change_1y:26.5, score:99, spark:[18,16,13,11,8,6,4,3,2,1,1,1] },
  { id:'11', name:'Krug Clos du Mesnil', producer:'Krug', region:'Champagne', vintage:2008, current_price:1200, change_1m:2.5, change_1y:28.4, score:100, spark:[19,17,15,13,10,8,5,4,2,1,1,1] },
  { id:'12', name:'La Tâche', producer:'DRC', region:'Bourgogne', vintage:2018, current_price:4200, change_1m:3.8, change_1y:38.5, score:99, spark:[21,18,16,13,10,7,5,3,2,1,1,1] },
  { id:'13', name:'Pichon Baron', producer:'Château Pichon Baron', region:'Bordeaux', vintage:2016, current_price:240, change_1m:1.2, change_1y:14.5, score:97, spark:[14,13,12,11,9,8,7,5,4,3,3,3] },
  { id:'14', name:'Cheval Blanc', producer:'Château Cheval Blanc', region:'Bordeaux', vintage:2015, current_price:680, change_1m:2.1, change_1y:20.5, score:99, spark:[16,15,13,11,9,7,6,5,3,2,2,2] },
  { id:'15', name:'Salon Le Mesnil', producer:'Salon', region:'Champagne', vintage:2012, current_price:880, change_1m:1.9, change_1y:25.3, score:99, spark:[17,16,14,12,10,8,6,5,3,2,2,2] },
  { id:'16', name:'Ornellaia', producer:'Ornellaia', region:'Italie', vintage:2017, current_price:280, change_1m:1.4, change_1y:18.9, score:97, spark:[15,13,12,10,8,7,6,4,3,2,2,2] },
];

const REGION_COLORS = {
  'Bordeaux':'#C0392B','Bourgogne':'#8E44AD','Rhône':'#D35400',
  'Champagne':'#F39C12','Italie':'#27AE60','Napa':'#2980B9','Autres':'#7F8C8D'
};

window.IW = {
  loadSupabase, getSession, getUser, signUp, signIn, signOut, getProfile,
  guardAuth, redirectIfAuth, showToast, initNavScroll, initReveal,
  drawSparkline, drawLineChart, fmtEur, fmtPct, WINES, REGION_COLORS
};
