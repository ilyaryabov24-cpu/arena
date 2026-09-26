// ---------------------------------------------------------------------------
// LoadingScreen — map loading progress + mission briefing / launch screen.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { MAPS } from '../../world/MapRegistry.js';
import { saveManager } from '../../save/SaveManager.js';
import { audio } from '../../audio/AudioManager.js';

const TIPS = [
  'Bank into your turns — the airframe follows your camera.',
  'Hold BOOST (SPACE) to close distance on fast convoys.',
  'Explosions chain: fuel trucks near other vehicles do extra work.',
  'Press C to switch between FPV and chase camera.',
  'Dive from altitude — gravity is free speed.',
  'Soldiers will spot you and react when you fly low nearby.',
  'Wrecks stay destroyed. Progress persists between sorties.',
  'Watch the LOW ALTITUDE warning when skimming terrain.',
];

export function buildLoadingScreen(game) {
  const root = el('div', 'screen');
  root.id = 'screen-loading';
  root.innerHTML = `
    <div class="loading-title" id="load-mission">LOADING</div>
    <div class="loading-map" id="load-map">—</div>
    <div class="loading-bar"><i id="load-fill"></i></div>
    <div class="loading-step" id="load-step">INITIALIZING</div>
    <div class="loading-tip" id="load-tip"></div>
  `;
  return root;
}

export function buildBriefingScreen(game, { onLaunch, onAbort }) {
  const root = el('div', 'screen briefing');
  root.id = 'screen-briefing';
  const panel = el('div', 'panel');
  root.appendChild(panel);

  root.setup = (mission) => {
    const mapDef = MAPS[mission.mapId];
    const saved = saveManager.getMission(mission.id);
    panel.innerHTML = `
      <h2>${mission.name}</h2>
      <div class="obj">OBJECTIVE — DESTROY ${mission.required} ${mission.targetLabel}</div>
      <p>${mission.description}</p>
      <div class="hint">${mission.hint}</div>
      ${saved.destroyedIds.length > 0 && !saved.completed ? `<div class="hint" style="color:var(--ok)">RESUMING SORTIE — ${saved.destroyedIds.length}/${mission.required} DESTROYED</div>` : ''}
    `;
    const actions = el('div', 'mission-actions');
    actions.style.justifyContent = 'center';
    const launch = button('LAUNCH DRONE', { cls: 'primary' });
    launch.addEventListener('click', () => { audio.uiClick(); onLaunch(); });
    const abort = button('ABORT', { small: true });
    abort.addEventListener('click', () => { audio.uiClick(); onAbort(); });
    actions.append(launch, abort);
    panel.appendChild(actions);
  };
  return root;
}
