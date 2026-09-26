// ---------------------------------------------------------------------------
// DeathScreen — DRONE DESTROYED overlay with mission progress and the
// launch-new-drone / main-menu actions.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { audio } from '../../audio/AudioManager.js';

export function buildDeathScreen(game, { onRespawn, onMenu }) {
  const root = el('div', 'screen center-screen');
  root.id = 'screen-death';
  root.innerHTML = `
    <div class="center-title">DRONE DESTROYED</div>
    <div class="center-sub" id="death-sub">AIRFRAME LOST — TELEMETRY ENDED</div>
    <div class="stat-block">
      <div class="stat"><div class="v" id="death-mission">—</div><div class="k">MISSION</div></div>
      <div class="stat"><div class="v" id="death-progress">—</div><div class="k">PROGRESS</div></div>
      <div class="stat"><div class="v" id="death-lost">—</div><div class="k">DRONES LOST</div></div>
    </div>
  `;
  const actions = el('div', 'action-row');
  const respawn = button('LAUNCH NEW DRONE', { cls: 'primary' });
  respawn.addEventListener('click', () => { audio.uiClick(); onRespawn(); });
  const menu = button('MAIN MENU');
  menu.addEventListener('click', () => { audio.uiClick(); onMenu(); });
  actions.append(respawn, menu);
  root.appendChild(actions);

  root.setup = (info) => {
    root.querySelector('#death-mission').textContent = String(info.index).padStart(2, '0');
    root.querySelector('#death-progress').textContent = `${info.destroyed} / ${info.required}`;
    root.querySelector('#death-lost').textContent = info.dronesLost ?? 1;
    root.querySelector('#death-sub').textContent =
      info.hitTarget ? 'TARGET STRUCK — CONFIRMED KILL' : 'AIRFRAME LOST — TELEMETRY ENDED';
  };
  return root;
}
