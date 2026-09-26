// ---------------------------------------------------------------------------
// MissionSelect — campaign card list with map minimap previews, progress,
// lock state and a briefing pane with the DEPLOY action.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { MISSIONS, isUnlocked } from '../../missions/MissionData.js';
import { MAPS } from '../../world/MapRegistry.js';
import { saveManager } from '../../save/SaveManager.js';
import { audio } from '../../audio/AudioManager.js';

const SKY_TINTS = { day: '#7fa8c9', evening: '#c98d5a', overcast: '#9aa3ac', haze: '#b9c2ae' };

/** Draw a schematic top-down preview of a map onto a canvas. */
export function drawMinimap(canvas, mapDef, size = 200) {
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const S = mapDef.size;
  const toC = (x, z) => [(x + S / 2) / S * size, (z + S / 2) / S * size];

  // ground
  ctx.fillStyle = '#4d6636';
  ctx.fillRect(0, 0, size, size);
  // terrain-ish blotches
  const rng = mulberry(mapDef.terrain.seed);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = rng() < 0.5 ? 'rgba(60,82,44,0.5)' : 'rgba(110,132,72,0.4)';
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, rng() * size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  // macro zones
  for (const m of mapDef.macro || []) {
    if (m.kind === 'field') {
      const [x, y] = toC(m.rect[0], m.rect[1]);
      ctx.fillStyle = m.crop === 'wheat' ? '#b09648' : m.crop === 'crop' ? '#7d8e48' : '#6e5840';
      ctx.fillRect(x, y, m.rect[2] / S * size, m.rect[3] / S * size);
    } else if (m.kind === 'forest') {
      const [x, y] = toC(m.at[0], m.at[1]);
      ctx.fillStyle = 'rgba(38,58,32,0.9)';
      ctx.beginPath(); ctx.arc(x, y, m.r / S * size, 0, Math.PI * 2); ctx.fill();
    } else if (m.kind === 'concrete' || m.kind === 'cityConcrete') {
      const [x, y] = toC(m.at[0], m.at[1]);
      ctx.fillStyle = 'rgba(125,123,118,0.85)';
      ctx.beginPath(); ctx.arc(x, y, m.r / S * size, 0, Math.PI * 2); ctx.fill();
    }
  }
  // roads
  for (const r of mapDef.roads) {
    ctx.strokeStyle = r.type === 'asphalt' ? '#565a5e' : '#7d6c50';
    ctx.lineWidth = Math.max(1.6, r.width / S * size * 1.1);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    r.pts.forEach((p, i) => {
      const [x, y] = toC(p[0], p[1]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  // target clusters
  ctx.fillStyle = 'rgba(255,90,60,0.75)';
  for (const t of mapDef.targets || []) {
    if (t.kind === 'cluster' || t.kind === 'npcPatrol') {
      const [x, y] = toC(t.at[0], t.at[1]);
      ctx.beginPath(); ctx.arc(x, y, t.kind === 'npcPatrol' ? 2.5 : 4, 0, Math.PI * 2); ctx.fill();
    } else if (t.kind === 'convoy') {
      const road = mapDef.roads[t.road];
      if (road) {
        const p = road.pts[Math.floor(road.pts.length * (t.t0 ?? 0.1))];
        const [x, y] = toC(p[0], p[1]);
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  }
  // spawn
  const [sx, sy] = toC(mapDef.spawn.at[0], mapDef.spawn.at[1]);
  ctx.strokeStyle = '#7fd0ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx - 5, sy - 5); ctx.lineTo(sx + 5, sy + 5);
  ctx.moveTo(sx + 5, sy - 5); ctx.lineTo(sx - 5, sy + 5);
  ctx.stroke();
  // frame + label
  ctx.strokeStyle = 'rgba(127,208,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
}

const mulberry = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function buildMissionSelect(game, { onBack, onDeploy }) {
  const root = el('div', 'screen panel-screen');
  root.id = 'screen-missions';
  root.innerHTML = `
    <div class="panel-title">SELECT MISSION</div>
    <div class="panel-subtitle">OPERATIONS LIST // 5 AVAILABLE</div>
  `;
  const panel = el('div', 'panel');
  const list = el('div', 'mission-list');
  let selectedId = null;

  MISSIONS.forEach((m) => {
    const saved = saveManager.getMission(m.id);
    const unlocked = isUnlocked(m, saveManager.data);
    const card = el('div', `mission-card ${unlocked ? '' : 'locked'}`);
    card.dataset.id = m.id;
    const mapDef = MAPS[m.mapId];

    const preview = el('canvas', 'mission-preview');
    drawMinimap(preview, mapDef, 86);

    const info = el('div');
    info.innerHTML = `
      <div class="name">MISSION ${String(m.index).padStart(2, '0')} — ${m.name}</div>
      <div class="desc">${m.description}</div>
      <div class="meta">${mapDef.name} · ${m.required} ${m.targetLabel} · ${mapDef.subtitle}</div>
    `;

    const status = el('div', 'status');
    if (!unlocked) status.innerHTML = `<div class="lock">🔒 LOCKED</div><div class="lock" style="font-size:10px">COMPLETE M${m.index - 1}</div>`;
    else if (saved.completed) status.innerHTML = `<div class="done">✓ COMPLETE</div><div class="done" style="font-size:10px">BEST ${saved.bestTime ?? '—'}s</div>`;
    else if (saved.destroyedIds.length > 0) status.innerHTML = `<div class="prog">IN PROGRESS</div><div class="prog" style="font-size:10px">${saved.destroyedIds.length}/${m.required}</div>`;
    else status.innerHTML = `<div class="lock">READY</div>`;

    card.append(preview, info, status);
    if (unlocked) {
      card.addEventListener('click', () => {
        audio.uiClick();
        list.querySelectorAll('.mission-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedId = m.id;
        renderDetail();
      });
    }
    list.appendChild(card);
  });
  panel.appendChild(list);

  const detail = el('div', 'mission-detail');
  panel.appendChild(detail);

  function renderDetail() {
    const m = MISSIONS.find(x => x.id === selectedId);
    if (!m) { detail.style.display = 'none'; return; }
    detail.style.display = '';
    const mapDef = MAPS[m.mapId];
    const saved = saveManager.getMission(m.id);
    detail.innerHTML = '';
    const canvas = el('canvas');
    drawMinimap(canvas, mapDef, 200);
    const brief = el('div', 'brief');
    brief.innerHTML = `
      <h4>${m.name}</h4>
      <p>${m.description}</p>
      <div class="tag">OBJECTIVE: DESTROY ${m.required} ${m.targetLabel}</div>
      <div class="tag" style="color:var(--cyan-dim)">MAP: ${mapDef.name} — ${mapDef.subtitle}</div>
      ${saved.destroyedIds.length > 0 && !saved.completed ? `<div class="tag" style="color:var(--ok)">RESUMING: ${saved.destroyedIds.length}/${m.required} ALREADY DESTROYED</div>` : ''}
      <div class="hint" style="margin-top:10px;font-family:var(--font-mono);font-size:11px;color:var(--text-dim)">${m.hint}</div>
    `;
    const actions = el('div', 'mission-actions');
    const deploy = button('DEPLOY', { cls: 'primary' });
    deploy.addEventListener('click', () => { audio.uiClick(); onDeploy(m.id); });
    actions.appendChild(deploy);
    brief.appendChild(actions);
    detail.append(canvas, brief);
  }

  root.appendChild(panel);

  const back = button('BACK', { small: true });
  back.style.marginTop = '18px';
  back.addEventListener('click', () => { audio.uiClick(); onBack(); });
  root.appendChild(back);

  return { root, getSelected: () => selectedId };
}
