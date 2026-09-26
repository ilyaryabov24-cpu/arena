// ---------------------------------------------------------------------------
// PauseMenu — ESC / pause button overlay.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { audio } from '../../audio/AudioManager.js';

export function buildPauseMenu(game, { onResume, onSettings, onMenu }) {
  const root = el('div', 'screen');
  root.id = 'screen-pause';
  root.innerHTML = `<h2>PAUSED</h2>`;
  const buttons = el('div', 'menu-buttons');
  const resume = button('RESUME', { cls: 'primary' });
  resume.addEventListener('click', () => { audio.uiClick(); onResume(); });
  const settings = button('SETTINGS');
  settings.addEventListener('click', () => { audio.uiClick(); onSettings(); });
  const menu = button('ABORT MISSION');
  menu.addEventListener('click', () => { audio.uiClick(); onMenu(); });
  buttons.append(resume, settings, menu);
  root.appendChild(buttons);
  return root;
}
