// ---------------------------------------------------------------------------
// MainMenu — title screen rendered over the 3D drone showcase scene.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { saveManager } from '../../save/SaveManager.js';
import { audio } from '../../audio/AudioManager.js';
import { MISSIONS } from '../../missions/MissionData.js';

export function buildMainMenu(game, { onPlay, onSettings }) {
  const root = el('div', 'screen');
  root.id = 'screen-menu';

  const stats = saveManager.data.stats;
  const nextMission = MISSIONS.find(m => !saveManager.getMission(m.id).completed) || MISSIONS[MISSIONS.length - 1];

  root.innerHTML = `
    <div class="menu-title">
      <span class="t1">DRONE</span>
      <span class="t2">STRIKE</span>
    </div>
    <div class="menu-sub">FPV STRIKE SIMULATOR // OPERATIONS TERMINAL</div>
  `;
  const buttons = el('div', 'menu-buttons');
  const play = button(nextMission.index === 1 ? 'PLAY' : `CONTINUE · M${nextMission.index}`);
  play.classList.add('primary');
  play.addEventListener('click', () => { audio.init(); audio.uiClick(); onPlay(); });
  const settings = button('SETTINGS');
  settings.addEventListener('click', () => { audio.init(); audio.uiClick(); onSettings(); });
  const reset = button('RESET CAMPAIGN', { cls: 'danger', small: true });
  reset.addEventListener('click', () => {
    audio.uiClick();
    if (reset.dataset.confirm) {
      MISSIONS.forEach(m => saveManager.resetMission(m.id));
      saveManager.data.stats = { totalTargets: 0, dronesLost: 0 };
      saveManager.save();
      reset.textContent = 'RESET CAMPAIGN';
      delete reset.dataset.confirm;
      game.ui.toast('CAMPAIGN PROGRESS WIPED');
    } else {
      reset.dataset.confirm = '1';
      reset.textContent = 'CONFIRM WIPE?';
      setTimeout(() => { if (reset.dataset.confirm) { reset.textContent = 'RESET CAMPAIGN'; delete reset.dataset.confirm; } }, 2600);
    }
  });
  buttons.append(play, settings, reset);
  root.appendChild(buttons);

  root.appendChild(el('div', 'menu-footer',
    `CONFIRMED STRIKES: ${stats.totalTargets} &nbsp;·&nbsp; DRONES LOST: ${stats.dronesLost}`));
  root.appendChild(el('div', 'menu-version', 'DRONE STRIKE v1.0'));

  return root;
}
