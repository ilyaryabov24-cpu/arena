// ==== DOM-интерфейс ====
import { B, CATS, NEWS } from './data.js';
import { getSprite, getPortrait } from './assets.js';

let S = null;
export const uiState = { tool: null, tab: 'res' };
const listeners = {};
export function on(ev, fn) { listeners[ev] = fn; }
function emit(ev, a, b) { if (listeners[ev]) listeners[ev](a, b); }

const $ = id => document.getElementById(id);

export function initUI(state) {
  S = state;
  buildTabs();
  buildItems('res');
  // иконки в топбаре
  document.querySelectorAll('[data-ico]').forEach(img => {
    const s = getSprite(img.dataset.ico);
    if (s) img.src = s.src;
  });
  $('btn-sound').onclick = () => emit('sound');
  $('btn-pause').onclick = () => emit('pause');
  $('btn-menu').onclick = () => { $('menu').classList.remove('hidden'); emit('menuchange', true); };
  $('m-continue').onclick = () => { $('menu').classList.add('hidden'); emit('menuchange', false); };
  $('m-save').onclick = () => emit('save');
  $('m-help').onclick = () => $('menu-help').classList.toggle('hidden');
  $('m-restart').onclick = () => emit('restart');
}

function buildTabs() {
  const tabs = $('bb-tabs');
  tabs.innerHTML = '';
  for (const c of CATS) {
    const b = document.createElement('button');
    b.className = 'bb-tab' + (c.id === uiState.tab ? ' active' : '');
    b.textContent = c.name;
    b.onclick = () => { uiState.tab = c.id; buildTabs(); buildItems(c.id); };
    tabs.appendChild(b);
  }
}

function buildItems(cat) {
  const box = $('bb-items');
  box.innerHTML = '';
  for (const [key, d] of Object.entries(B)) {
    if (d.cat !== cat) continue;
    const el = document.createElement('div');
    el.className = 'bb-item' + (uiState.tool === key ? ' sel' : '');
    el.title = d.name;
    let im = null;
    if (d.sprite) im = getSprite(d.sprite);
    else if (key === 'road') im = getSprite('ground.asphalt');
    else if (key === 'sidewalk') im = getSprite('ground.paving');
    if (im) { const i = document.createElement('img'); i.src = im.src; el.appendChild(i); }
    if (d.cost > 0) { const c = document.createElement('span'); c.className = 'cost'; c.textContent = d.cost; el.appendChild(c); }
    el.onclick = () => {
      uiState.tool = uiState.tool === key ? null : key;
      buildItems(uiState.tab);
      setInfo(uiState.tool ? `${d.name} — ${d.desc}` : 'Выбери, что построить. Город не любит спешки.');
      emit('tool', uiState.tool);
    };
    el.onmouseenter = () => setInfo(`${d.name} · ${d.cost ? d.cost + ' тыс. ₽ · ' : ''}${d.desc}`);
    box.appendChild(el);
  }
}

export function setInfo(t) { $('bb-info-text').textContent = t; }

export function refreshHUD(S) {
  $('hud-money').textContent = fmt(S.money);
  $('hud-pop').textContent = S.pop;
  $('hud-soul').textContent = S.soul;
  $('hud-tour').textContent = S.tourists;
  $('m-fuel').style.width = S.fuel + '%';
  $('m-fuel').style.background = S.fuel < 25 ? 'var(--bad)' : '';
  $('m-power').style.width = S.power + '%';
  const season = S._seasonRu || '';
  $('hud-season').textContent = season;
  $('hud-day').textContent = S.day;
  const h = Math.floor(S.t), m = Math.floor((S.t % 1) * 60 / 10) * 10;
  $('hud-clock').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
export function fmt(n) { return (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

// тикер
let newsIdx = 0, localNews = [];
export function pushNews(t) { localNews.unshift(t); if (localNews.length > 5) localNews.pop(); }
export function tickTicker() {
  const el = $('ticker-text');
  const src = localNews.length && Math.random() < 0.5 ? localNews : NEWS;
  newsIdx = (newsIdx + 1) % src.length;
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = '··· ' + src[newsIdx]; el.style.opacity = 1; }, 400);
}

// тост
let toastT = 0;
export function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.opacity = 1;
  clearTimeout(toastT);
  toastT = setTimeout(() => el.style.opacity = 0, 4200);
}

// модалка событий
export function showModal(ev, onChoice) {
  $('modal').classList.remove('hidden');
  $('modal-title').textContent = ev.title;
  $('modal-sub').textContent = ev.who;
  $('modal-text').textContent = ev.text;
  const p = getPortrait(ev.portrait);
  if (p) $('modal-portrait').src = p.src;
  const box = $('modal-choices');
  box.innerHTML = '';
  for (const ch of ev.choices) {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.innerHTML = ch.label + (ch.note ? `<small>${ch.note}</small>` : '');
    b.onclick = () => { $('modal').classList.add('hidden'); onChoice(ch); };
    box.appendChild(b);
  }
}
export function hideModal() { $('modal').classList.add('hidden'); }

// пузырь мысли
let thoughtT = 0;
export function showThought(sx, sy, text) {
  const el = $('thought');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.left = Math.max(8, Math.min(window.innerWidth - 270, sx - 20)) + 'px';
  el.style.top = Math.max(60, sy - 90) + 'px';
  clearTimeout(thoughtT);
  thoughtT = setTimeout(() => el.classList.add('hidden'), 4500);
}

export function setPauseIcon(paused) { $('btn-pause').textContent = paused ? '▶' : '⏸'; }
