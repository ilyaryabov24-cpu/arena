// ---------------------------------------------------------------------------
// Game — central GameManager: renderer, app states, game loop, mission flow,
// drone death/respawn, collisions, menu showcase scene.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { GameState } from './GameState.js';
import { EV, bus } from './EventBus.js';
import { perf } from './PerformanceManager.js';
import { saveManager } from '../save/SaveManager.js';
import { clamp, formatTime } from './Utils.js';
import { GameMap } from '../world/MapBuilder.js';
import { MAPS } from '../world/MapRegistry.js';
import { Drone } from '../drone/Drone.js';
import { DroneInput } from '../drone/DroneInput.js';
import { DroneCamera } from '../drone/DroneCamera.js';
import { TargetManager } from '../targets/TargetManager.js';
import { TargetSpawner } from '../targets/TargetSpawner.js';
import { VFXManager } from '../effects/VFXManager.js';
import { MissionManager } from '../missions/MissionManager.js';
import { buildDrone } from '../assets/builders/DroneBuilder.js';
import { buildCrate, buildBarrel, buildJerseyBarrier } from '../assets/builders/PropBuilders.js';
import { audio } from '../audio/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = GameState.BOOT;
    this.timeScale = 1;
    this._slowmo = 0;
    this._deathTimer = 0;
    this._pendingDeathScreen = false;
    this.missionManager = new MissionManager();

    // renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance', stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    perf.applyUserPreference(saveManager.settings.quality, this.renderer);
    if (saveManager.settings.performanceMode) perf.setPerformanceMode(true, this.renderer);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.3, 4000);

    // game scene objects (created per mission)
    this.scene = null;
    this.map = null;
    this.drone = null;
    this.droneCam = null;
    this.targets = null;
    this.vfx = null;

    // menu showcase scene
    this.menuScene = null;
    this._menuTime = 0;

    this.input = new DroneInput(canvas);
    this.input.sensitivity = saveManager.settings.sensitivity;
    this.input.invertY = saveManager.settings.invertY;
    this.input.onPauseRequested = () => this.togglePause();

    this.ui = new UIManager(this);
    this.clock = new THREE.Clock();
    this._fpsAcc = 0; this._fpsFrames = 0;

    window.addEventListener('resize', () => this._resize());
    this._resize();

    // events
    bus.on(EV.EXPLOSION, ({ position, scale }) => {
      audio.explosion(clamp(scale, 0.5, 2));
    });
    bus.on(EV.RUSTLE, () => audio.rustle());

    window.__game = this; // debugging / automated checks
    window.__perf = perf;
  }

  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, perf.tier.pixelRatioCap));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.menuCamera) {
      this.menuCamera.aspect = w / h;
      this.menuCamera.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------------------
  // MENU SCENE
  // ---------------------------------------------------------------------------
  buildMenuScene() {
    if (this.menuScene) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f14);
    scene.fog = new THREE.Fog(0x0a0f14, 18, 60);

    // floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(40, 48),
      new THREE.MeshStandardMaterial({ color: 0x141b22, roughness: 0.55, metalness: 0.35 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    // floor ring marking
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.1, 3.22, 64),
      new THREE.MeshBasicMaterial({ color: 0x2b8fbd, transparent: true, opacity: 0.65 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);

    // hero drone on a stand
    const droneModel = buildDrone(true);
    droneModel.position.set(0, 1.55, 0);
    droneModel.rotation.z = 0.06;
    scene.add(droneModel);
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.3, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x1c242c, roughness: 0.5, metalness: 0.6 })
    );
    stand.position.y = 0.75;
    stand.castShadow = true;
    scene.add(stand);

    // props for context
    const crateA = buildCrate(3).parts[0];
    const crateMeshA = new THREE.Mesh(crateA.geometry, crateA.material);
    crateMeshA.position.set(-3.6, 0.4, -1.2);
    crateMeshA.rotation.y = 0.6;
    crateMeshA.castShadow = true;
    scene.add(crateMeshA);
    const crateB = new THREE.Mesh(crateA.geometry, crateA.material);
    crateB.position.set(-3.2, 1.25, -1.5);
    crateB.rotation.y = 1.1;
    crateB.scale.setScalar(0.8);
    crateB.castShadow = true;
    scene.add(crateB);
    const barrel = buildBarrel(9).parts[0];
    const barrelMesh = new THREE.Mesh(barrel.geometry, barrel.material);
    barrelMesh.position.set(3.4, 0.46, -1.8);
    barrelMesh.castShadow = true;
    scene.add(barrelMesh);
    const barrier = buildJerseyBarrier().parts[0];
    const barrierMesh = new THREE.Mesh(barrier.geometry, barrier.material);
    barrierMesh.position.set(4.2, 0, 1.6);
    barrierMesh.rotation.y = -0.5;
    barrierMesh.castShadow = true;
    scene.add(barrierMesh);

    // lighting — hangar mood
    const key = new THREE.DirectionalLight(0xffe8c8, 2.2);
    key.position.set(6, 9, 4);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(1024);
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x53c8f0, 1.6);
    rim.position.set(-7, 4, -6);
    scene.add(rim);
    const fill = new THREE.HemisphereLight(0x334455, 0x0c1014, 0.9);
    scene.add(fill);
    const warm = new THREE.PointLight(0xff9a50, 14, 18, 2);
    warm.position.set(-4.5, 2.4, 3.2);
    scene.add(warm);

    this.menuScene = scene;
    this.menuDrone = droneModel;
    this.menuCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.menuCamera.position.set(5.2, 2.1, 4.6);
    this.menuCamera.lookAt(0, 1.7, 0);
  }

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------
  setState(s) {
    this.state = s;
    bus.emit(EV.STATE_CHANGED, s);
    this.ui.showScreen(s);
    if (s !== GameState.PLAYING) {
      this.input.exitPointerLock();
    }
  }

  // ---------------------------------------------------------------------------
  // MISSION FLOW
  // ---------------------------------------------------------------------------
  async startMission(missionId) {
    this.setState(GameState.LOADING);
    // teardown previous mission
    this._teardownMission();

    this.missionManager.start(missionId);
    const mission = this.missionManager.mission;
    const mapDef = MAPS[mission.mapId];

    this.scene = new THREE.Scene();
    this.map = new GameMap(mapDef, this.scene, this.renderer);
    this.vfx = new VFXManager(this.scene);

    await this.map.build((label) => this.ui.setLoading(label));

    // targets
    this.targets = new TargetManager(this.scene, this.map, this.vfx);
    const spawner = new TargetSpawner(this.targets, this.map);
    const saved = this.missionManager.save;
    spawner.spawnAll(mission, saved.seed, new Set(saved.destroyedIds));

    // ambient smoke from chimneys
    for (const a of this.map.smokeAnchors) {
      this.vfx.addSmokeAnchor(a, { rate: 0.55, dark: true, scale: 1.2 });
    }

    // drone
    this.drone = new Drone(this.scene);
    this.droneCam = new DroneCamera(this.camera);
    this.droneCam.mode = saveManager.settings.cameraMode;
    this.droneCam.vibration = saveManager.settings.cameraShake ? 0.4 : 0;

    this._spawnDrone();
    this._missionCompleteFired = false;

    // audio
    audio.stopMusic();
    audio.startEngine();
    audio.startWind();

    this.ui.screens.briefing.setup(mission);
    this.setState(GameState.BRIEFING);
  }

  _spawnDrone() {
    const def = this.map.def;
    const sp = def.spawn;
    const x = sp.at[0], z = sp.at[1];
    const y = this.map.terrain.getHeight(x, z) + (sp.alt ?? 120);
    this.drone.spawn(new THREE.Vector3(x, y, z), sp.heading, 48);
    this.droneCam.time = 0;
    this.droneCam._smoothedQuat.copy(this.drone.quaternion);
    this.droneCam.shake = 0;
    this._pendingDeathScreen = false;
    this._deathTimer = 0;
    this.ui.hud.reset();
  }

  launchNewDrone() {
    this._spawnDrone();
    audio.startEngine();
    audio.startWind();
    this.setState(GameState.PLAYING);
    this.input.requestPointerLock();
  }

  returnToMenu() {
    this._teardownMission();
    audio.stopEngine();
    audio.stopWind();
    audio.startMusic();
    this.missionManager.reset();
    this.setState(GameState.MENU);
  }

  _teardownMission() {
    if (this.targets) { this.targets.dispose(); this.targets = null; }
    if (this.vfx) { this.vfx.reset(); this.vfx = null; }
    if (this.map) { this.map.dispose(); this.map = null; }
    if (this.drone) {
      this.scene.remove(this.drone.model);
      this.drone = null;
    }
    this.scene = null;
    this.timeScale = 1;
    this._slowmo = 0;
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
      audio.uiClick();
    } else if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
      this.input.requestPointerLock();
    }
  }

  // ---------------------------------------------------------------------------
  // DEATH
  // ---------------------------------------------------------------------------
  _droneDestroyed(hitTarget) {
    if (!this.drone.alive) return;
    this._lastDeathHitTarget = !!hitTarget;
    const pos = this.drone.position.clone();
    const groundY = this.map.terrain.getHeight(pos.x, pos.z);

    if (hitTarget) {
      hitTarget.damage(500);
      // splash damage to nearby targets (chain reactions)
      const splashR = 10 + 6 * (hitTarget.explosionScale || 1);
      this.targets.splashDamage(pos, splashR, 260, hitTarget.id);
      this.vfx.spawnExplosion(pos, 1.6);
    } else {
      this.vfx.spawnExplosion(new THREE.Vector3(pos.x, Math.max(pos.y, groundY + 0.5), pos.z), 1.2, { ground: true });
    }

    this.drone.destroy();
    this.droneCam.addShake(1.0);
    audio.stopEngine();
    this.missionManager.countDroneLost();
    this._slowmo = 0.9;
    this._deathTimer = 0;
    this._pendingDeathScreen = true;
    this._deathPoint = pos.clone();
    this._deathPoint.y = Math.max(pos.y, groundY + 1);
  }

  // ---------------------------------------------------------------------------
  // COLLISIONS
  // ---------------------------------------------------------------------------
  _checkCollisions(dt) {
    const drone = this.drone;
    if (!drone.alive) return;
    const pos = drone.position;
    const R = drone.params.collisionRadius;

    // 1. targets (mission objects)
    const hit = this.targets.checkDroneHit(pos, R + 0.6);
    if (hit) {
      this._droneDestroyed(hit);
      return;
    }

    // 2. static obstacles (buildings etc.)
    const boxes = this.map.colliders.query(pos.x, pos.z, R + 2);
    for (const box of boxes) {
      if (!box.isStatic) continue;
      if (pos.y < box.minY - 0.5 || pos.y > box.maxY + 0.8) continue;
      const cx = clamp(pos.x, box.minX, box.maxX);
      const cz = clamp(pos.z, box.minZ, box.maxZ);
      const dx = pos.x - cx, dz = pos.z - cz;
      const dy = Math.max(0, box.minY - pos.y, pos.y - box.maxY);
      if (dx * dx + dz * dz + dy * dy < R * R) {
        this._droneDestroyed(null);
        return;
      }
    }

    // 3. terrain
    const groundY = this.map.terrain.getHeight(pos.x, pos.z);
    if (pos.y < groundY + 0.45) {
      this._droneDestroyed(null);
      return;
    }

    // 4. tree canopy rustle (soft, non-lethal)
    this._rustleTimer = (this._rustleTimer ?? 0) - dt;
    if (drone.altitude < 14 && this._rustleTimer <= 0) {
      const [r, g, b] = this.map.terrain.sampleMacro(pos.x, pos.z);
      if (g > 0.22 && g > r * 1.15 && g > b * 1.25) {
        this.vfx.spawnLeaves(pos.clone().setY(groundY + 3 + Math.random() * 6));
        bus.emit(EV.RUSTLE);
        this.droneCam.addShake(0.12);
        this._rustleTimer = 0.4;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN LOOP
  // ---------------------------------------------------------------------------
  start() {
    this.buildMenuScene();
    this.setState(GameState.MENU);
    this.renderer.setAnimationLoop(() => this._frame());
  }

  _frame() {
    const rawDt = Math.min(this.clock.getDelta(), 0.05);

    // slow-mo on death
    if (this._slowmo > 0) {
      this._slowmo -= rawDt;
      this.timeScale = 0.32;
    } else {
      this.timeScale = 1;
    }
    const dt = rawDt * this.timeScale;

    perf.update(rawDt, this.renderer);
    this.ui.updateFps(perf.fps);

    switch (this.state) {
      case GameState.MENU:
      case GameState.MISSIONS:
      case GameState.SETTINGS:
        this._updateMenu(rawDt);
        break;
      case GameState.BRIEFING:
        this._updateBriefing(rawDt);
        break;
      case GameState.LOADING:
        // loading screen is DOM-only; keep menu scene rendering behind
        this._updateMenu(rawDt, true);
        break;
      case GameState.PLAYING:
        this._updateGame(dt, rawDt);
        break;
      case GameState.PAUSED:
        this.renderer.render(this.scene, this.camera);
        break;
      case GameState.DEATH:
        this._updateDeath(dt);
        break;
      case GameState.COMPLETE:
        this._updateAftermath(dt);
        break;
      default: break;
    }
  }

  _updateBriefing(dt) {
    // cinematic orbit above the spawn area while the briefing panel is up
    this._briefTime = (this._briefTime || 0) + dt;
    const sp = this.map.def.spawn;
    const cx = sp.at[0], cz = sp.at[1];
    const baseY = this.map.terrain.getHeight(cx, cz);
    const a = this._briefTime * 0.06 + 1.0;
    this.camera.position.set(cx + Math.cos(a) * 240, baseY + 170, cz + Math.sin(a) * 240);
    this.camera.lookAt(cx, baseY + 40, cz);
    this.camera.fov = 58;
    this.camera.updateProjectionMatrix();
    this.targets?.update(dt, null);
    this.vfx?.update(dt);
    this.map.sky?.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateMenu(dt, still = false) {
    this._menuTime += dt;
    const t = this._menuTime;
    if (this.menuDrone) {
      this.menuDrone.position.y = 1.55 + Math.sin(t * 0.9) * 0.05;
      this.menuDrone.rotation.y = t * 0.22;
      const parts = this.menuDrone.userData.parts;
      if (parts?.propeller) parts.propeller.rotation.z = t * 40;
    }
    if (!still) {
      const cam = this.menuCamera;
      const r = 5.6;
      const a = t * 0.08 + 0.8;
      cam.position.set(Math.cos(a) * r, 2.0 + Math.sin(t * 0.23) * 0.25, Math.sin(a) * r);
      cam.lookAt(0, 1.65, 0);
    }
    this.renderer.render(this.menuScene, this.menuCamera);
  }

  _updateGame(dt, rawDt) {
    // death slow-mo sequence: world keeps running, camera orbits the wreck
    if (this._pendingDeathScreen) {
      this._deathTimer += rawDt;
      this.targets.update(dt, null);
      this.vfx.update(dt);
      this.map.sky.update(dt);
      this.droneCam.updateDeathOrbit(rawDt, this._deathPoint);
      this.renderer.render(this.scene, this.camera);
      if (this._deathTimer > 2.4) {
        this._pendingDeathScreen = false;
        if (this.missionManager.completed) {
          // final target destroyed by this strike — mission complete
          audio.stopEngine();
          audio.stopWind();
          audio.missionComplete();
          this.setState(GameState.COMPLETE);
        } else {
          this.setState(GameState.DEATH);
        }
      }
      return;
    }

    const input = this.input;
    input.sensitivity = saveManager.settings.sensitivity;
    input.invertY = saveManager.settings.invertY;
    input.sample(dt);

    this.drone.update(dt, input, this.map.terrain);
    this.droneCam.update(dt, this.drone);
    this.droneCam.vibration = saveManager.settings.cameraShake ? 0.4 : 0;

    this.targets.update(dt, this.drone.alive ? this.drone.position : null);
    this.missionManager.update(dt);
    this.vfx.update(dt);
    this.map.sky.update(dt);
    this.map.sky.updateFocus(this.drone.position);

    audio.updateEngine(this.drone.speed, this.drone.boosting, this.drone.alive);
    audio.updateWind(this.drone.speed);
    audio.updateAmbience(rawDt, this.map.def.ambience);

    this._checkCollisions(dt);

    this.ui.hud.update(dt, {
      speed: this.drone.speed,
      altitude: this.drone.altitude,
      boosting: this.drone.boosting,
      drone: this.drone,
      camera: this.droneCam,
      targets: this.targets,
      mission: this.missionManager,
      map: this.map,
    });

    // mission complete transition
    if (this.missionManager.completed && this.drone.alive) {
      this._completeTimer = (this._completeTimer ?? 1.6) - rawDt;
      if (this._completeTimer <= 0) {
        this._completeTimer = null;
        audio.stopEngine();
        audio.stopWind();
        audio.missionComplete();
        this.setState(GameState.COMPLETE);
        return;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _updateDeath(dt) {
    // camera orbits the wreck while the death screen is up
    this.targets.update(dt, null);
    this.vfx.update(dt);
    this.map.sky.update(dt);
    this.droneCam.updateDeathOrbit(dt, this._deathPoint);
    this.renderer.render(this.scene, this.camera);
  }

  _updateAftermath(dt) {
    // mission complete: keep world alive behind the overlay
    this.targets.update(dt, null);
    this.vfx.update(dt);
    this.map?.sky?.update(dt);
    this.droneCam.updateDeathOrbit(dt, this.drone.position);
    this.renderer.render(this.scene, this.camera);
  }
}
