// ---------------------------------------------------------------------------
// MobileControls — dual virtual sticks + BOOST / PAUSE / CAM buttons.
// Writes axis values straight into DroneInput's touch state.
// Large hit areas, kept out of the screen center.
// ---------------------------------------------------------------------------

import { perf } from '../core/PerformanceManager.js';

export class MobileControls {
  constructor(uiRoot, game) {
    this.game = game;
    this.input = game.input;
    this.el = document.createElement('div');
    this.el.id = 'mobile-controls';
    this.el.innerHTML = `
      <div class="stick-zone left" id="stick-left">
        <div class="stick-label">THROTTLE / ROLL</div>
        <div class="stick-knob"></div>
      </div>
      <div class="stick-zone right" id="stick-right">
        <div class="stick-label">PITCH / YAW</div>
        <div class="stick-knob"></div>
      </div>
      <div class="touch-btn" id="btn-boost">BOOST</div>
      <div class="touch-btn" id="btn-pause">II</div>
      <div class="touch-btn" id="btn-cam">CAM</div>
    `;
    uiRoot.appendChild(this.el);

    this._stick(this.el.querySelector('#stick-left'), (x, y) => {
      this.input.touch.leftX = x;
      this.input.touch.leftY = -y; // up = throttle up
    });
    this._stick(this.el.querySelector('#stick-right'), (x, y) => {
      this.input.touch.rightX = x;
      this.input.touch.rightY = y; // down = pitch down (like mouse)
    });

    const boost = this.el.querySelector('#btn-boost');
    const boostOn = (e) => { e.preventDefault(); this.input.touch.boost = true; boost.classList.add('active'); if (navigator.vibrate && this.game.settings?.vibration !== false) navigator.vibrate(12); };
    const boostOff = (e) => { e.preventDefault(); this.input.touch.boost = false; boost.classList.remove('active'); };
    boost.addEventListener('touchstart', boostOn, { passive: false });
    boost.addEventListener('touchend', boostOff, { passive: false });
    boost.addEventListener('touchcancel', boostOff, { passive: false });
    boost.addEventListener('mousedown', boostOn);
    boost.addEventListener('mouseup', boostOff);
    boost.addEventListener('mouseleave', boostOff);

    const pause = this.el.querySelector('#btn-pause');
    pause.addEventListener('touchstart', (e) => { e.preventDefault(); this.game.togglePause(); }, { passive: false });
    pause.addEventListener('click', (e) => { e.preventDefault(); this.game.togglePause(); });

    const cam = this.el.querySelector('#btn-cam');
    const camToggle = (e) => {
      e.preventDefault();
      const mode = this.game.droneCam?.toggle();
      this.game.saveManagerSettings?.();
    };
    cam.addEventListener('touchstart', camToggle, { passive: false });
    cam.addEventListener('click', camToggle);

    this.show(false);
  }

  /** Attach a virtual joystick to a zone element. */
  _stick(zone, onChange) {
    const knob = zone.querySelector('.stick-knob');
    let activeId = null;
    const rect = () => zone.getBoundingClientRect();
    const R = 52;

    const move = (cx, cy) => {
      const r = rect();
      let dx = cx - (r.left + r.width / 2);
      let dy = cy - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      onChange(dx / R, dy / R);
    };
    const reset = () => {
      knob.style.transform = 'translate(0px, 0px)';
      onChange(0, 0);
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeId !== null) return;
      const t = e.changedTouches[0];
      activeId = t.identifier;
      this.input.setTouchActive(true);
      move(t.clientX, t.clientY);
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) move(t.clientX, t.clientY);
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) {
          activeId = null;
          reset();
        }
      }
    };
    zone.addEventListener('touchend', end, { passive: false });
    zone.addEventListener('touchcancel', end, { passive: false });
  }

  show(v) {
    this.el.classList.toggle('on', v && perf.isTouch);
  }
}
