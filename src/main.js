// ---------------------------------------------------------------------------
// DRONE STRIKE — FPV Simulator. Entry point.
// ---------------------------------------------------------------------------
import './ui/styles.css';
import { Game } from './core/Game.js';
import { audio } from './audio/AudioManager.js';
import { saveManager } from './save/SaveManager.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();

// dismiss the boot splash
const boot = document.getElementById('boot');
setTimeout(() => {
  boot.classList.add('hidden');
  setTimeout(() => boot.remove(), 500);
}, 350);

// audio must be unlocked by a user gesture (autoplay policy)
const unlock = () => {
  audio.init();
  audio.setVolumes(saveManager.settings);
  if (game.state === 'menu' || game.state === 'missions' || game.state === 'settings') {
    audio.startMusic();
  }
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
  window.removeEventListener('touchstart', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
window.addEventListener('touchstart', unlock);

// block browser gestures that fight with the controls
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (e.target.closest?.('#ui-root')) e.preventDefault();
}, { passive: false });

// pause when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'PLAYING') game.togglePause();
});
