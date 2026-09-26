// ---------------------------------------------------------------------------
// MissionManager — tracks the active mission, target progress, completion
// and persistence (destroyed target ids survive respawns & reloads).
// ---------------------------------------------------------------------------

import { MISSIONS, getMission, isUnlocked } from './MissionData.js';
import { saveManager } from '../save/SaveManager.js';
import { EV, bus } from '../core/EventBus.js';

export class MissionManager {
  constructor() {
    this.mission = null;
    this.destroyedCount = 0;
    this.runTime = 0;
    this.dronesLost = 0;
    this.completed = false;
    this._off = bus.on(EV.TARGET_DESTROYED, (e) => this._onTargetDestroyed(e));
  }

  start(missionId) {
    this.mission = getMission(missionId);
    if (!this.mission) throw new Error(`Unknown mission ${missionId}`);
    const saved = saveManager.getMission(missionId);
    saved.attempts++;
    saveManager.save();
    this.destroyedCount = saved.destroyedIds.length;
    this.runTime = 0;
    this.dronesLost = 0;
    this.completed = false;
    bus.emit(EV.MISSION_PROGRESS, this.progress());
  }

  get save() { return saveManager.getMission(this.mission.id); }

  progress() {
    return {
      missionId: this.mission.id,
      index: this.mission.index,
      name: this.mission.name,
      destroyed: this.destroyedCount,
      required: this.mission.required,
      completed: this.completed,
    };
  }

  _onTargetDestroyed(e) {
    if (!this.mission || this.completed) return;
    if (!e.counts) return;
    if (!this.mission.types.includes(e.type)) return;

    this.destroyedCount++;
    saveManager.addDestroyedTarget(this.mission.id, e.uid ?? e.id);
    bus.emit(EV.MISSION_PROGRESS, this.progress());

    if (this.destroyedCount >= this.mission.required) {
      this.completed = true;
      saveManager.setMissionCompleted(this.mission.id, this.runTime);
      bus.emit(EV.MISSION_COMPLETE, {
        ...this.progress(),
        time: this.runTime,
        dronesLost: this.dronesLost,
      });
    }
  }

  countDroneLost() {
    this.dronesLost++;
    saveManager.countDroneLost();
  }

  update(dt) {
    if (this.mission && !this.completed) this.runTime += dt;
  }

  reset() {
    this.mission = null;
    this.destroyedCount = 0;
  }
}
