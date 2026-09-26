// ---------------------------------------------------------------------------
// HUD — in-game overlay: mission/targets, speed/alt, compass tape, crosshair,
// target markers + edge arrows, boost meter, warnings, FPV frame, hit marker.
// DOM-based for crispness; text updates throttled, transforms every frame.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { EV, bus } from '../core/EventBus.js';
import { perf } from '../core/PerformanceManager.js';
import { clamp } from '../core/Utils.js';

export class HUD {
  constructor(uiRoot, game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.id = 'hud';
    this.el.className = 'screen';
    this.el.innerHTML = `
      <div id="fpv-frame">
        <div class="fpv-corner tl"></div><div class="fpv-corner tr"></div>
        <div class="fpv-corner bl"></div><div class="fpv-corner br"></div>
        <div class="rec"><i></i>REC</div>
        <div class="battery">BAT 82% &nbsp;|&nbsp; SIG ▮▮▮▯ &nbsp;|&nbsp; 5.8GHz</div>
        <div class="scanlines"></div>
        <div class="vignette"></div>
      </div>
      <div id="speedlines"><i></i></div>
      <div class="hud-corner hud-tl">
        <div class="hud-label">MISSION</div>
        <div class="hud-mission" id="hud-mission">—</div>
        <div class="hud-label" style="margin-top:8px">TARGETS</div>
        <div class="hud-targets"><span id="hud-destroyed">0</span><span class="req"> / <span id="hud-required">0</span></span></div>
      </div>
      <div class="hud-corner hud-tr">
        <div class="hud-label">SPEED</div>
        <div class="hud-value"><span id="hud-speed">0</span><small>KM/H</small></div>
        <div class="hud-label" style="margin-top:6px">ALT</div>
        <div class="hud-value"><span id="hud-alt">0</span><small>M</small></div>
      </div>
      <div id="hud-compass"><canvas width="600" height="68"></canvas></div>
      <div id="fps-counter">60 FPS</div>
      <div id="crosshair"><div class="ch-dot"></div></div>
      <div id="hitmarker"><span></span><span></span><span></span><span></span></div>
      <div id="hud-warning">LOW ALTITUDE</div>
      <div class="hud-bl">
        <div class="hud-label">THROTTLE</div>
        <div class="boost-meter"><i id="hud-boost"></i></div>
      </div>
      <div class="hud-br">
        <div id="hud-cam">FPV &nbsp;·&nbsp; [C]</div>
        <div id="hud-time">0:00</div>
      </div>
    `;
    uiRoot.appendChild(this.el);

    this.$ = (id) => this.el.querySelector('#' + id);
    this.compassCtx = this.$('hud-compass').querySelector('canvas').getContext('2d');
    this._markers = [];
    this._textAcc = 1;
    this._proj = new THREE.Vector3();
    this._lastHitFlash = 0;

    bus.on(EV.TARGET_DESTROYED, (e) => {
      if (e.counts) this.flashHitMarker();
    });
    bus.on(EV.MISSION_PROGRESS, (p) => {
      this.$('hud-destroyed').textContent = p.destroyed;
      this.$('hud-required').textContent = p.required;
      this.$('hud-mission').textContent = `M${String(p.index).padStart(2, '0')} · ${p.name}`;
    });
  }

  reset() {
    this._markers.forEach(m => m.el.remove());
    this._markers.length = 0;
    this._textAcc = 1;
  }

  flashHitMarker() {
    const hm = this.$('hitmarker');
    hm.classList.remove('show');
    void hm.offsetWidth;
    hm.classList.add('show');
  }

  update(dt, ctx) {
    const { speed, altitude, boosting, drone, camera, targets, mission, map } = ctx;

    // ---- every-frame visuals -------------------------------------------------
    const fpvFrame = this.$('fpv-frame');
    fpvFrame.classList.toggle('on', camera.mode === 'fpv' && this.game.state === 'PLAYING');
    this.$('speedlines').classList.toggle('on', boosting);

    // boost / throttle meter
    const t = (drone.targetSpeed - drone.params.minSpeed) / (drone.params.boostSpeed - drone.params.minSpeed);
    this.$('hud-boost').style.width = `${clamp(t, 0, 1) * 100}%`;

    // warnings
    const warn = this.$('hud-warning');
    const lowAlt = altitude < 26 && drone.velocity.y < 1;
    warn.classList.toggle('on', lowAlt && drone.alive);

    // target markers (every frame)
    this._updateMarkers(ctx);

    // ---- throttled text --------------------------------------------------------
    this._textAcc += dt;
    if (this._textAcc > 0.14) {
      this._textAcc = 0;
      this.$('hud-speed').textContent = Math.round(speed * 3.6);
      this.$('hud-alt').textContent = Math.round(altitude);
      this.$('hud-cam').textContent = `${camera.mode === 'fpv' ? 'FPV' : 'CHASE'}${perf.isTouch ? '' : ' · [C]'}`;
      const m = Math.floor(mission.runTime / 60), s = Math.floor(mission.runTime % 60);
      this.$('hud-time').textContent = `${m}:${String(s).padStart(2, '0')}`;
      this._drawCompass(drone.yaw);
    }
  }

  _drawCompass(yaw) {
    const ctx = this.compassCtx;
    const W = 600, H = 68;
    ctx.clearRect(0, 0, W, H);
    // heading in degrees; three convention: yaw 0 = +Z (north)
    let heading = ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
    ctx.font = '22px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pxPerDeg = 4.2;
    for (let d = -70; d <= 70; d += 5) {
      const deg = ((Math.round(heading / 5) * 5 + d) % 360 + 360) % 360;
      const x = W / 2 + (d - (heading - Math.round(heading / 5) * 5)) * pxPerDeg;
      if (x < 10 || x > W - 10) continue;
      const major = deg % 45 === 0;
      const card = deg % 90 === 0;
      ctx.fillStyle = card ? '#eaf6ff' : major ? 'rgba(127,208,255,0.8)' : 'rgba(127,208,255,0.35)';
      ctx.fillRect(x, card ? 34 : major ? 40 : 44, card ? 2.5 : 1.5, card ? 16 : major ? 10 : 6);
      if (card) {
        const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
        ctx.fillText(names[deg] ?? deg, x, 18);
      } else if (major) {
        ctx.fillStyle = 'rgba(127,208,255,0.55)';
        ctx.font = '15px "Share Tech Mono", monospace';
        ctx.fillText(String(deg).padStart(3, '0'), x, 18);
        ctx.font = '22px "Share Tech Mono", monospace';
      }
    }
    // center caret
    ctx.fillStyle = '#ffc23d';
    ctx.beginPath();
    ctx.moveTo(W / 2, 30); ctx.lineTo(W / 2 - 6, 22); ctx.lineTo(W / 2 + 6, 22);
    ctx.closePath(); ctx.fill();
  }

  _updateMarkers(ctx) {
    const { drone, camera, targets } = ctx;
    if (!targets) return;
    const cam = this.game.camera;
    const W = window.innerWidth, H = window.innerHeight;
    const near = targets.nearest(drone.position, perf.tier.targetMarkers, (t) => !t.civilian);

    // reuse marker pool
    while (this._markers.length < near.length) {
      const el = document.createElement('div');
      el.className = 'tgt-marker';
      el.innerHTML = '<div class="dist"></div>';
      this.el.appendChild(el);
      this._markers.push({ el, distEl: el.querySelector('.dist'), arrow: null });
    }
    for (let i = 0; i < this._markers.length; i++) {
      const m = this._markers[i];
      if (i >= near.length) {
        m.el.style.display = 'none';
        if (m.arrow) m.arrow.style.display = 'none';
        continue;
      }
      const { t } = near[i];
      this._proj.copy(t.worldPos);
      this._proj.y += t.height * 0.5;
      this._proj.project(cam);
      const dist = drone.position.distanceTo(t.worldPos);
      m.distEl.textContent = `${Math.round(dist)}m`;

      const behind = this._proj.z > 1;
      let x = (this._proj.x * 0.5 + 0.5) * W;
      let y = (-this._proj.y * 0.5 + 0.5) * H;
      const onScreen = !behind && x > 30 && x < W - 30 && y > 60 && y < H - 60;

      if (onScreen) {
        m.el.style.display = 'block';
        m.el.classList.toggle('primary', i === 0 && dist < 400);
        m.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        const sc = clamp(38 - dist * 0.012, 14, 38) / 38;
        m.el.style.scale = sc;
        if (m.arrow) { m.arrow.style.display = 'none'; }
      } else {
        m.el.style.display = 'none';
        // edge arrow toward target
        if (!m.arrow) {
          const a = document.createElement('div');
          a.className = 'tgt-arrow';
          this.el.appendChild(a);
          m.arrow = a;
        }
        m.arrow.style.display = 'block';
        let dx, dy;
        if (behind) { dx = -x; dy = H / 2 - y; }
        else { dx = x - W / 2; dy = y - H / 2; }
        const ang = Math.atan2(dy, dx);
        const r = Math.min(W, H) * 0.36;
        const ax = W / 2 + Math.cos(ang) * r;
        const ay = H / 2 + Math.sin(ang) * r;
        m.arrow.style.transform = `translate3d(${ax}px, ${ay}px, 0) rotate(${ang + Math.PI / 2}rad)`;
        m.arrow.style.opacity = i === 0 ? '0.95' : '0.5';
      }
    }
  }
}
