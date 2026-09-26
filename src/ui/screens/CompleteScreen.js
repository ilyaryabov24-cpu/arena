// ---------------------------------------------------------------------------
// CompleteScreen — MISSION COMPLETE overlay with stats + next mission.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { MISSIONS } from '../../missions/MissionData.js';
import { audio } from '../../audio/AudioManager.js';

export function buildCompleteScreen(game, { onNext, onMenu, onReplay }) {
  const root = el('div', 'screen center-screen');
  root.id = 'screen-complete';
  root.innerHTML = `
    <div class="center-title">MISSION COMPLETE</div>
    <div class="center-sub" id="complete-sub">ALL OBJECTIVES DESTROYED</div>
    <div class="stat-block">
      <div class="stat"><div class="v" id="complete-mission">—</div><div class="k">MISSION</div></div>
      <div class="stat"><div class="v" id="complete-targets">—</div><div class="k">TARGETS</div></div>
      <div class="stat"><div class="v" id="complete-time">—</div><div class="k">TIME</div></div>
      <div class="stat"><div class="v" id="complete-lost">—</div><div class="k">DRONES LOST</div></div>
    </div>
  `;
  const actions = el('div', 'action-row');
  const next = button('NEXT MISSION', { cls: 'primary' });
  next.addEventListener('click', () => { audio.uiClick(); onNext(); });
  const replay = button('REPLAY', { small: true });
  replay.addEventListener('click', () => { audio.uiClick(); onReplay(); });
  const menu = button('MAIN MENU', { small: true });
  menu.addEventListener('click', () => { audio.uiClick(); onMenu(); });
  actions.append(next, replay, menu);
  root.appendChild(actions);

  root.setup = (info) => {
    root.querySelector('#complete-mission').textContent = String(info.index).padStart(2, '0');
    root.querySelector('#complete-targets').textContent = `${info.destroyed}/${info.required}`;
    const m = Math.floor(info.time / 60), s = Math.floor(info.time % 60);
    root.querySelector('#complete-time').textContent = `${m}:${String(s).padStart(2, '0')}`;
    root.querySelector('#complete-lost').textContent = info.dronesLost ?? 0;
    const hasNext = info.index < MISSIONS.length;
    next.style.display = hasNext ? '' : 'none';
    root.querySelector('#complete-sub').textContent = hasNext
      ? 'ALL OBJECTIVES DESTROYED — NEXT SECTOR UNLOCKED'
      : 'CAMPAIGN COMPLETE — OUTSTANDING WORK, OPERATOR';
  };
  return root;
}
