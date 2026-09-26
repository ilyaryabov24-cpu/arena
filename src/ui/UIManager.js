// ---------------------------------------------------------------------------
// UIManager — builds all screens, wires navigation between game states,
// hosts the HUD + mobile controls, toasts and the loading screen.
// ---------------------------------------------------------------------------
import { GameState } from '../core/GameState.js';
import { EV, bus } from '../core/EventBus.js';
import { HUD } from './HUD.js';
import { MobileControls } from './MobileControls.js';
import { buildMainMenu } from './screens/MainMenu.js';
import { buildMissionSelect } from './screens/MissionSelect.js';
import { buildSettingsMenu } from './screens/SettingsMenu.js';
import { buildLoadingScreen, buildBriefingScreen } from './screens/LoadingScreen.js';
import { buildDeathScreen } from './screens/DeathScreen.js';
import { buildPauseMenu } from './screens/PauseMenu.js';
import { buildCompleteScreen } from './screens/CompleteScreen.js';
import { MISSIONS } from '../missions/MissionData.js';
import { audio } from '../audio/AudioManager.js';
import { saveManager } from '../save/SaveManager.js';
import { TIPS } from './tips.js';

export class UIManager {
  constructor(game) {
    this.game = game;
    const root = document.getElementById('ui-root');

    this.hud = new HUD(root, game);
    this.mobile = new MobileControls(root, game);

    this.screens = {};
    this._loadingSteps = 0;

    // menu
    this.screens.menu = buildMainMenu(game, {
      onPlay: () => this.go(GameState.MISSIONS),
      onSettings: () => this.go(GameState.SETTINGS),
    });

    // mission select
    const ms = buildMissionSelect(game, {
      onBack: () => this.go(GameState.MENU),
      onDeploy: (missionId) => game.startMission(missionId),
    });
    this.screens.missions = ms.root;

    // settings
    this.screens.settings = buildSettingsMenu(game, {
      onBack: () => this.go(this._settingsFrom ?? GameState.MENU),
    });

    // loading
    this.screens.loading = buildLoadingScreen(game);
    this.screens.loading.querySelector('#load-tip').textContent =
      TIPS[Math.floor(Math.random() * TIPS.length)];

    // briefing
    this.screens.briefing = buildBriefingScreen(game, {
      onLaunch: () => {
        game.setState(GameState.PLAYING);
        game.input.requestPointerLock();
      },
      onAbort: () => game.returnToMenu(),
    });

    // death
    this.screens.death = buildDeathScreen(game, {
      onRespawn: () => game.launchNewDrone(),
      onMenu: () => game.returnToMenu(),
    });

    // pause
    this.screens.pause = buildPauseMenu(game, {
      onResume: () => { game.setState(GameState.PLAYING); game.input.requestPointerLock(); },
      onSettings: () => { this._settingsFrom = GameState.PAUSED; this.go(GameState.SETTINGS); },
      onMenu: () => game.returnToMenu(),
    });

    // complete
    this.screens.complete = buildCompleteScreen(game, {
      onNext: () => {
        const cur = this.game.missionManager.mission;
        const next = MISSIONS.find(m => m.index === cur.index + 1);
        if (next) this.game.startMission(next.id);
        else this.game.returnToMenu();
      },
      onReplay: () => {
        const cur = this.game.missionManager.mission;
        if (cur) this.game.startMission(cur.id); else this.game.returnToMenu();
      },
      onMenu: () => this.game.returnToMenu(),
    });

    for (const s of Object.values(this.screens)) root.appendChild(s);

    // toasts
    this.toasts = document.createElement('div');
    this.toasts.id = 'toasts';
    root.appendChild(this.toasts);

    this.fpsEl = this.hud.el.querySelector('#fps-counter');
    this.setFpsVisible(saveManager.settings.showFps);

    // wire event-driven screens
    bus.on(EV.MISSION_COMPLETE, (info) => {
      this.screens.complete.setup(info);
    });
    bus.on(EV.STATE_CHANGED, (s) => this._onState(s));
  }

  _onState(s) {
    if (s === GameState.DEATH) {
      const mm = this.game.missionManager;
      this.screens.death.setup({
        ...mm.progress(),
        dronesLost: mm.dronesLost,
        hitTarget: this.game._lastDeathHitTarget ?? false,
      });
    }
  }

  go(state) {
    this.game.setState(state);
  }

  showScreen(state) {
    const map = {
      [GameState.MENU]: 'menu',
      [GameState.MISSIONS]: 'missions',
      [GameState.SETTINGS]: 'settings',
      [GameState.LOADING]: 'loading',
      [GameState.BRIEFING]: 'briefing',
      [GameState.PAUSED]: 'pause',
      [GameState.DEATH]: 'death',
      [GameState.COMPLETE]: 'complete',
    };
    const key = map[state];
    for (const [k, el] of Object.entries(this.screens)) {
      el.classList.toggle('active', k === key);
    }
    // HUD only during play-ish states
    const hudOn = state === GameState.PLAYING || state === GameState.PAUSED ||
      state === GameState.DEATH || state === GameState.COMPLETE || state === GameState.BRIEFING;
    this.hud.el.classList.toggle('active', hudOn);
    this.mobile.show(state === GameState.PLAYING);
  }

  setLoading(label) {
    const scr = this.screens.loading;
    const fill = scr.querySelector('#load-fill');
    const step = scr.querySelector('#load-step');
    const mission = this.game.missionManager?.mission;
    if (mission && this._loadingSteps === 0) {
      scr.querySelector('#load-mission').textContent = `MISSION ${String(mission.index).padStart(2, '0')} — ${mission.name}`;
      scr.querySelector('#load-map').textContent = mission ? '' : '';
    }
    this._loadingSteps++;
    const pct = Math.min(96, this._loadingSteps * 7);
    fill.style.width = `${pct}%`;
    if (label && label !== 'done') step.textContent = label.toUpperCase();
    if (label === 'done') {
      fill.style.width = '100%';
      step.textContent = 'COMPLETE';
    }
  }

  resetLoading() {
    this._loadingSteps = 0;
    this.screens.loading.querySelector('#load-fill').style.width = '0%';
    this.screens.loading.querySelector('#load-tip').textContent =
      TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  setFpsVisible(v) { this.fpsEl.classList.toggle('on', !!v); }
  updateFps(fps) {
    if (this.fpsEl.classList.contains('on')) {
      this.fpsEl.textContent = `${Math.round(fps)} FPS`;
    }
  }

  toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    this.toasts.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }
}
