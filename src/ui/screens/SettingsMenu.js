// ---------------------------------------------------------------------------
// SettingsMenu — graphics / audio / controls settings, persisted instantly.
// ---------------------------------------------------------------------------
import { el, button } from '../dom.js';
import { saveManager } from '../../save/SaveManager.js';
import { audio } from '../../audio/AudioManager.js';
import { perf } from '../../core/PerformanceManager.js';

export function buildSettingsMenu(game, { onBack }) {
  const root = el('div', 'screen panel-screen');
  root.id = 'screen-settings';
  root.innerHTML = `
    <div class="panel-title">SETTINGS</div>
    <div class="panel-subtitle">SYSTEMS CONFIGURATION</div>
  `;
  const panel = el('div', 'panel');
  const grid = el('div', 'settings-grid');
  const S = saveManager.settings;

  const row = (label, control, valueId) => {
    const r = el('div', 'setting-row');
    const lab = el('label', '', `${label}<span class="value" id="${valueId}"></span>`);
    r.append(lab, control);
    grid.appendChild(r);
    return r;
  };

  const seg = (options, current, onChange) => {
    const s = el('div', 'seg');
    options.forEach(opt => {
      const b = el('button', '', opt.label);
      if (opt.value === current) b.classList.add('active');
      b.addEventListener('click', () => {
        s.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        audio.uiClick();
        onChange(opt.value);
      });
      s.appendChild(b);
    });
    return s;
  };

  const slider = (min, max, step, value, onChange) => {
    const input = el('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step; input.value = value;
    const updateFill = () => input.style.setProperty('--fill', `${(input.value - min) / (max - min) * 100}%`);
    updateFill();
    input.addEventListener('input', () => { updateFill(); onChange(parseFloat(input.value)); });
    return input;
  };

  const toggle = (value, onChange) => {
    const t = el('div', `toggle ${value ? 'on' : ''}`);
    t.addEventListener('click', () => {
      t.classList.toggle('on');
      audio.uiClick();
      onChange(t.classList.contains('on'));
    });
    return t;
  };

  // ---- graphics ---------------------------------------------------------------
  row('GRAPHICS QUALITY',
    seg([
      { label: 'Auto', value: 'auto' },
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
    ], S.quality, (v) => {
      saveManager.updateSetting('quality', v);
      perf.applyUserPreference(v, game.renderer);
      game._resize();
    }), 'v-quality');

  row('SHADOWS', toggle(S.shadows, v => {
    saveManager.updateSetting('shadows', v);
    game.renderer.shadowMap.enabled = v && perf.tier.shadowMapSize > 0;
    game.scene?.traverse?.(o => { if (o.material) o.material.needsUpdate = true; });
  }), 'v-shadows');

  row('DRAW DISTANCE', slider(0.6, 1.4, 0.05, S.drawDistance, v => {
    saveManager.updateSetting('drawDistance', v);
    if (game.map?.sky?.fog) game.map.sky.fog.density = game.map.sky.preset.fogDensity * (1 / Math.max(0.4, v * perf.tier.drawDistance));
  }), 'v-dist');

  row('FPS INDICATOR', toggle(S.showFps, v => {
    saveManager.updateSetting('showFps', v);
    game.ui.setFpsVisible(v);
  }), 'v-fps');

  row('PERFORMANCE MODE', toggle(S.performanceMode, v => {
    saveManager.updateSetting('performanceMode', v);
    perf.setPerformanceMode(v, game.renderer);
    game._resize();
  }), 'v-perf');

  // ---- audio -------------------------------------------------------------------
  row('MASTER VOLUME', slider(0, 1, 0.05, S.masterVolume, v => {
    saveManager.updateSetting('masterVolume', v);
    audio.setVolumes(saveManager.settings);
  }), 'v-master');
  row('MUSIC VOLUME', slider(0, 1, 0.05, S.musicVolume, v => {
    saveManager.updateSetting('musicVolume', v);
    audio.setVolumes(saveManager.settings);
  }), 'v-music');
  row('SFX VOLUME', slider(0, 1, 0.05, S.sfxVolume, v => {
    saveManager.updateSetting('sfxVolume', v);
    audio.setVolumes(saveManager.settings);
  }), 'v-sfx');

  // ---- controls ------------------------------------------------------------------
  row('LOOK SENSITIVITY', slider(0.3, 2.5, 0.05, S.sensitivity, v => {
    saveManager.updateSetting('sensitivity', v);
  }), 'v-sens');
  row('INVERT PITCH', toggle(S.invertY, v => {
    saveManager.updateSetting('invertY', v);
  }), 'v-inv');
  row('CAMERA SHAKE', toggle(S.cameraShake, v => {
    saveManager.updateSetting('cameraShake', v);
  }), 'v-shake');
  row('DEFAULT CAMERA',
    seg([{ label: 'FPV', value: 'fpv' }, { label: 'Chase', value: 'chase' }], S.cameraMode, v => {
      saveManager.updateSetting('cameraMode', v);
    }), 'v-cam');
  row('VIBRATION', toggle(S.vibration, v => {
    saveManager.updateSetting('vibration', v);
  }), 'v-vib');

  panel.appendChild(grid);
  root.appendChild(panel);

  const back = button('BACK', { small: true });
  back.style.marginTop = '18px';
  back.addEventListener('click', () => { audio.uiClick(); onBack(); });
  root.appendChild(back);

  // live value labels
  const refresh = () => {
    const $ = (id) => root.querySelector('#' + id);
    $('v-quality').textContent = S.quality.toUpperCase();
    $('v-shadows').textContent = S.shadows ? 'ON' : 'OFF';
    $('v-dist').textContent = `${Math.round(S.drawDistance * 100)}%`;
    $('v-fps').textContent = S.showFps ? 'ON' : 'OFF';
    $('v-master').textContent = `${Math.round(S.masterVolume * 100)}%`;
    $('v-music').textContent = `${Math.round(S.musicVolume * 100)}%`;
    $('v-sfx').textContent = `${Math.round(S.sfxVolume * 100)}%`;
    $('v-sens').textContent = S.sensitivity.toFixed(2);
    $('v-inv').textContent = S.invertY ? 'ON' : 'OFF';
    $('v-shake').textContent = S.cameraShake ? 'ON' : 'OFF';
    $('v-cam').textContent = S.cameraMode.toUpperCase();
    $('v-vib').textContent = S.vibration ? 'ON' : 'OFF';
  };
  root.addEventListener('input', refresh);
  root.addEventListener('click', refresh);
  refresh();

  return root;
}
