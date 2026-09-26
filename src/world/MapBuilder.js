// ---------------------------------------------------------------------------
// MapBuilder — turns a MapRegistry definition into a living 3D level:
// terrain, roads, zones (villages / farms / industry / suburbs / city / ruins),
// instanced scatter, power lines, road furniture, collision data.
// Static structures are merged by material at the end for few draw calls.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { Terrain } from './Terrain.js';
import { RoadNetwork } from './RoadNetwork.js';
import { ScatterSystem } from './ScatterSystem.js';
import { CollisionGrid } from './CollisionGrid.js';
import { SkySystem } from './SkySystem.js';
import { makeRNG, hashSeed, clamp, TAU } from '../core/Utils.js';
import { noisePass, stains } from '../assets/CanvasKit.js';
import {
  buildHouse, buildBarn, buildWarehouse, buildHangar, buildShop, buildApartment,
  buildShed, buildRuin, buildSilo, buildChimney, buildContainers, buildCheckpoint,
  buildWaterTower, buildRadioMast,
} from '../assets/builders/BuildingBuilders.js';
import {
  buildOak, buildPine, buildBirch, buildBush, buildRock, buildFenceSegment,
  buildPowerPylon, buildLamp, buildSign, buildHayBale, buildCrate, buildBarrel,
  buildSandbagWall, buildGuardRail, buildJerseyBarrier, grassCardGeometry,
} from '../assets/builders/PropBuilders.js';
import { mergeGroupByMaterial } from '../assets/GeometryKit.js';
import { getTextureSet } from '../assets/TextureFactory.js';
import { perf } from '../core/PerformanceManager.js';

const CROP_COLORS = { wheat: [196, 168, 92], soil: [110, 88, 62], crop: [128, 142, 72] };

export class GameMap {
  constructor(def, scene, renderer) {
    this.def = def;
    this.scene = scene;
    this.renderer = renderer;
    this.terrain = null;
    this.roads = null;
    this.scatter = null;
    this.sky = null;
    this.colliders = new CollisionGrid(def.size, 40);
    this.staticRoot = new THREE.Group();
    this.smokeAnchors = [];
    this.roadMask = null;
    this._built = false;
  }

  async build(onProgress = () => {}) {
    const def = this.def;
    const step = async (name, fn) => {
      onProgress(name);
      await new Promise(r => setTimeout(r, 0));
      fn();
    };

    await step('Surveying terrain', () => {
      this.terrain = new Terrain({ ...def.terrain, size: def.size, segments: def.segments });
      this.scatter = new ScatterSystem(this.scene, this.terrain);
    });

    await step('Paving roads', () => {
      this.roads = new RoadNetwork(this.terrain, this.scene);
      for (const r of def.roads) this.roads.addRoad(r.type, r.pts, r.width);
      this._buildRoadMask();
    });

    await step('Shaping landscape', () => {
      const mesh = this.terrain.buildMesh((ctx, res, rng, h) => this._paintMacro(ctx, res, rng));
      this.scene.add(mesh);
      this.terrainMesh = mesh;
    });

    await step('Raising structures', () => {
      for (const zone of def.zones) this._genZone(zone);
    });

    await step('Planting forests', () => {
      this._scatterNature();
    });

    await step('Stringing power lines', () => {
      this._buildPowerLines();
      this._roadFurniture();
    });

    await step('Growing grass', () => {
      this._scatterGrass();
    });

    await step('Merging geometry', () => {
      this._finalizeStatic();
    });

    await step('Calibrating atmosphere', () => {
      this.sky = new SkySystem(this.scene, this.renderer, def.sky);
      this.scatter.finalize({});
    });

    this._built = true;
    onProgress('done');
  }

  // ---------------------------------------------------------------------------
  // MACRO TEXTURE PAINTING
  // ---------------------------------------------------------------------------
  _paintMacro(ctx, res, rng) {
    const half = this.def.size / 2;
    const toC = (x, z) => [(x + half) / this.def.size * res, (z + half) / this.def.size * res];

    // base grass
    ctx.fillStyle = '#57713c';
    ctx.fillRect(0, 0, res, res);
    // large tonal variation
    for (let i = 0; i < 46; i++) {
      const x = rng() * res, y = rng() * res, r = res * (0.06 + rng() * 0.16);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dark = rng() < 0.5;
      grd.addColorStop(0, dark ? 'rgba(60,82,44,0.5)' : 'rgba(110,132,72,0.4)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (const m of this.def.macro || []) {
      if (m.kind === 'field') {
        const [cx, cy] = toC(m.rect[0] + m.rect[2] / 2, m.rect[1] + m.rect[3] / 2);
        const w = m.rect[2] / this.def.size * res, h = m.rect[3] / this.def.size * res;
        const col = CROP_COLORS[m.crop] || CROP_COLORS.soil;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((rng() - 0.5) * 0.1);
        ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        // furrow stripes
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#000';
        const stripe = 6;
        for (let y = -h / 2; y < h / 2; y += stripe * 2) ctx.fillRect(-w / 2, y, w, stripe);
        ctx.restore();
      } else if (m.kind === 'forest') {
        const [cx, cy] = toC(m.at[0], m.at[1]);
        const r = m.r / this.def.size * res;
        for (let i = 0; i < 6; i++) {
          const x = cx + (rng() - 0.5) * r, y = cy + (rng() - 0.5) * r;
          const rr = r * (0.4 + rng() * 0.5);
          const grd = ctx.createRadialGradient(x, y, 0, x, y, rr);
          grd.addColorStop(0, 'rgba(38,58,32,0.95)');
          grd.addColorStop(0.8, 'rgba(44,66,36,0.8)');
          grd.addColorStop(1, 'rgba(44,66,36,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
        }
      } else if (m.kind === 'concrete' || m.kind === 'cityConcrete') {
        const [cx, cy] = toC(m.at[0], m.at[1]);
        const r = m.r / this.def.size * res;
        const grd = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
        grd.addColorStop(0, m.kind === 'cityConcrete' ? 'rgba(120,120,116,0.95)' : 'rgba(128,126,120,0.95)');
        grd.addColorStop(0.85, 'rgba(128,126,120,0.85)');
        grd.addColorStop(1, 'rgba(128,126,120,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        if (m.kind === 'cityConcrete') {
          // darker street grid inside city
          ctx.strokeStyle = 'rgba(84,86,88,0.9)';
          ctx.lineWidth = res * 0.012;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath(); ctx.moveTo(cx - r, cy + i * r * 0.4); ctx.lineTo(cx + r, cy + i * r * 0.4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + i * r * 0.4, cy - r); ctx.lineTo(cx + i * r * 0.4, cy + r); ctx.stroke();
          }
        }
      } else if (m.kind === 'dirtPatch') {
        const [cx, cy] = toC(m.at[0], m.at[1]);
        const r = m.r / this.def.size * res;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, 'rgba(122,104,76,0.9)');
        grd.addColorStop(1, 'rgba(122,104,76,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }

    // roads on top
    this.roads.paintOnMacro(ctx, res);

    // organic noise
    noisePass(ctx, res, { seed: this.def.terrain.seed, period: 7, octaves: 3, mono: 0.05, colorAmp: 0.015 });
  }

  // ---------------------------------------------------------------------------
  // ZONE GENERATION
  // ---------------------------------------------------------------------------
  _genZone(zone) {
    const rng = makeRNG(hashSeed(`${this.def.id}:${zone.kind}:${zone.at ? zone.at.join(',') : (zone.alongRoad ?? 0)}`));
    switch (zone.kind) {
      case 'village': this._genVillage(rng, zone); break;
      case 'farm': this._genFarm(rng, zone); break;
      case 'industrial': this._genIndustrial(rng, zone); break;
      case 'suburbGrid': this._genSuburb(rng, zone); break;
      case 'cityBlock': this._genCity(rng, zone); break;
      case 'ruins': this._genRuins(rng, zone); break;
      case 'restStop': this._genRestStop(rng, zone); break;
      case 'park': this._genPark(rng, zone); break;
      case 'checkpoint': this._genCheckpoint(rng, zone); break;
      case 'forestFill': this._genForestFill(rng, zone); break;
      case 'powerLine': break; // handled separately
      default: break;
    }
  }

  _addBuilding(build, x, z, rotY = 0) {
    const y = this.terrain.getHeight(x, z) - 0.15;
    build.position.set(x, y, z);
    build.rotation.y = rotY;
    this.staticRoot.add(build);
    // collision AABB (approx rotated)
    const size = build.userData.size || { w: 6, d: 6, h: 4 };
    const ext = Math.abs(Math.cos(rotY)) * size.w / 2 + Math.abs(Math.sin(rotY)) * size.d / 2;
    const ext2 = Math.abs(Math.sin(rotY)) * size.w / 2 + Math.abs(Math.cos(rotY)) * size.d / 2;
    this.colliders.insertStatic({
      minX: x - ext, maxX: x + ext, minZ: z - ext2, maxZ: z + ext2,
      minY: y, maxY: y + (size.h || 4), target: null, isStatic: true,
    });
    if (build.userData.smokeAnchor) {
      this.smokeAnchors.push(build.userData.smokeAnchor.clone().add(new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)).setX(x + build.userData.smokeAnchor.x).setZ(z + build.userData.smokeAnchor.z));
    }
    return build;
  }

  _genVillage(rng, zone) {
    const [cx, cz] = zone.at;
    const placed = [];
    const count = zone.houses ?? 9;
    let attempts = 0;
    while (placed.length < count && attempts++ < 80) {
      const a = rng() * TAU;
      const r = 25 + rng() * (zone.r - 30);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r * 0.8;
      if (this._nearRoad(x, z, 9)) continue;
      if (placed.some(p => Math.hypot(p.x - x, p.z - z) < 17)) continue;
      placed.push({ x, z });
      this._addBuilding(buildHouse(rng, { floors: rng() < 0.3 ? 2 : 1 }), x, z, rng() * TAU);
    }
    // sheds
    for (let i = 0; i < 4; i++) {
      const a = rng() * TAU, r = 20 + rng() * zone.r * 0.8;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8;
      if (!this._nearRoad(x, z, 8) && !placed.some(p => Math.hypot(p.x - x, p.z - z) < 12)) {
        this._addBuilding(buildShed(rng), x, z, rng() * TAU);
      }
    }
    // fences around some houses
    for (let i = 0; i < 16; i++) {
      const a = rng() * TAU, r = 30 + rng() * zone.r * 0.7;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * 0.8;
      this._addFenceRun(rng, x, z, rng() * TAU, 3 + (rng() * 3 | 0));
    }
    // trees in village
    this._scatterTreesAround(rng, cx, cz, zone.r, 14, 8);
  }

  _genFarm(rng, zone) {
    const [cx, cz] = zone.at;
    this._addBuilding(buildBarn(rng), cx, cz, rng() * TAU);
    this._addBuilding(buildHouse(rng, { w: 7, d: 8 }), cx + 22 + rng() * 8, cz + (rng() - 0.5) * 16, rng() * TAU);
    this._addBuilding(buildSilo(rng), cx - 18, cz + 10, rng() * TAU);
    this._addBuilding(buildShed(rng), cx - 14, cz - 14, rng() * TAU);
    // hay bales scattered
    for (let i = 0; i < 9; i++) {
      const a = rng() * TAU, r = 14 + rng() * zone.r * 0.9;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      if (this._nearRoad(x, z, 6)) continue;
      this.scatter.addAt('hay', buildHayBale((rng() * 999) | 0), x, z);
    }
    // crates + barrels near barn
    for (let i = 0; i < 5; i++) {
      this.scatter.addAt('crate', buildCrate((rng() * 999) | 0), cx + (rng() - 0.5) * 20, cz + (rng() - 0.5) * 20);
    }
    for (let i = 0; i < 4; i++) {
      this.scatter.addAt('barrel', buildBarrel((rng() * 999) | 0), cx + (rng() - 0.5) * 16, cz + (rng() - 0.5) * 16);
    }
    this._addFenceRun(rng, cx, cz, 0, 12);
    this._scatterTreesAround(rng, cx, cz, zone.r + 20, 10, 10);
  }

  _genIndustrial(rng, zone) {
    const [cx, cz] = zone.at;
    const scale = zone.scale ?? 1;
    const R = zone.r;
    const major = R > 300, mid = R > 200;
    // warehouses row
    const nWare = major ? 3 : mid ? 1 : 0;
    for (let i = 0; i < nWare; i++) {
      const x = cx - R * 0.55 + i * R * 0.55;
      const z = cz - R * 0.55;
      this._addBuilding(buildWarehouse(rng, { w: 24 * scale, d: 34 * scale, h: 9 }), x, z, 0);
    }
    // hangars
    if (mid) {
      this._addBuilding(buildHangar(rng), cx + R * 0.55, cz + R * 0.15, Math.PI / 2);
      if (major) this._addBuilding(buildHangar(rng), cx + R * 0.55, cz - R * 0.45, Math.PI / 2);
    }
    // silos
    if (mid) {
      this._addBuilding(buildSilo(rng), cx - R * 0.7, cz + R * 0.3, 0);
      this._addBuilding(buildSilo(rng), cx - R * 0.52, cz + R * 0.42, 0);
    }
    // chimneys with smoke
    const chim1 = major ? this._addBuilding(buildChimney(rng), cx - R * 0.15, cz + R * 0.55, 0) : null;
    const chim2 = major ? this._addBuilding(buildChimney(rng), cx + R * 0.05, cz + R * 0.62, 0) : null;
    // container yard
    for (let i = 0; i < 10; i++) {
      const x = cx + (rng() - 0.5) * R * 1.1;
      const z = cz + (rng() - 0.5) * R * 0.6 - R * 0.1;
      if (this._nearRoad(x, z, 10)) continue;
      this._addBuilding(buildContainers(rng, 1 + (rng() * 3 | 0)), x, z, rng() < 0.8 ? 0 : Math.PI / 2);
    }
    // pipes on stands
    for (let i = 0; i < 2; i++) {
      const pipeLen = 26 + rng() * 20;
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, pipeLen, 10),
        this._pipeMat());
      pipe.rotation.z = Math.PI / 2;
      const px = cx + (rng() - 0.5) * R;
      const pz = cz + (rng() - 0.5) * R * 0.8;
      pipe.position.set(px, this.terrain.getHeight(px, pz) + 0.8, pz);
      pipe.rotation.y = rng() < 0.5 ? 0 : Math.PI / 2;
      this.staticRoot.add(pipe);
    }
    // barrels / crates clusters
    for (let i = 0; i < 16; i++) {
      const x = cx + (rng() - 0.5) * R * 1.4;
      const z = cz + (rng() - 0.5) * R * 1.2;
      if (this._nearRoad(x, z, 8)) continue;
      this.scatter.addAt(rng() < 0.5 ? 'barrel' : 'crate',
        rng() < 0.5 ? buildBarrel((rng() * 999) | 0) : buildCrate((rng() * 999) | 0), x, z);
    }
    // jersey barriers
    for (let i = 0; i < 8; i++) {
      const x = cx + (rng() - 0.5) * R * 1.3;
      const z = cz + (rng() - 0.5) * R * 1.3;
      if (this._nearRoad(x, z, 7)) continue;
      this.scatter.addAt('jersey', buildJerseyBarrier(), x, z, { rotY: rng() < 0.5 ? 0 : Math.PI / 2 });
    }
    // sandbag posts
    for (let i = 0; i < 3; i++) {
      const a = rng() * TAU, r = R * (0.3 + rng() * 0.5);
      this.scatter.addAt('sandbags', buildSandbagWall(3 + rng() * 2), cx + Math.cos(a) * r, cz + Math.sin(a) * r, { rotY: rng() * TAU });
    }
    // signature silhouettes: water tower + radio mast
    this._addBuilding(buildWaterTower(rng), cx + R * 0.32, cz - R * 0.68, 0);
    this._addBuilding(buildRadioMast(rng), cx - R * 0.82, cz - R * 0.5, 0);
    if (major) this._addBuilding(buildRadioMast(rng), cx + R * 0.85, cz + R * 0.7, 0);
    // long container rows (yard feel)
    if (mid) {
      const rowZ = cz + R * 0.55;
      const rows = major ? 3 : 2;
      for (let row = 0; row < rows; row++) {
        for (let i = 0; i < 6; i++) {
          const x = cx - R * 0.55 + i * R * 0.2;
          const z = rowZ - row * 7;
          if (this._nearRoad(x, z, 9)) continue;
          this._addBuilding(buildContainers(rng, 1 + ((row + i) % 3)), x, z, 0);
        }
      }
    }
    // perimeter fence
    this._addFenceRun(rng, cx - R * 0.95, cz - R * 0.95, 0, Math.ceil(R * 1.9 / 4));
    this._addFenceRun(rng, cx - R * 0.95, cz + R * 0.95, Math.PI / 2, Math.ceil(R * 1.9 / 4));
    // lamps along the central road
    this._lampsAlongRoad(4, 34, 8);
  }

  _genSuburb(rng, zone) {
    const lit = !!zone.lit;
    // street grid coords (must match map def roads)
    const vStreets = [-540, -180, 180, 540];
    const hStreets = [-260, 0, 260];
    const blocks = [];
    const xs = [-720, ...vStreets, 720];
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < hStreets.length; j++) {
        blocks.push({
          x0: xs[i] + 24, x1: xs[i + 1] - 24,
          z0: (hStreets[j] ?? -420) + 22, z1: (hStreets[j + 1] ?? 420) - 22,
        });
      }
    }
    // correct block z ranges
    const zEdges = [-420, ...hStreets, 420];
    const blocks2 = [];
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < zEdges.length - 1; j++) {
        blocks2.push({ x0: xs[i] + 26, x1: xs[i + 1] - 26, z0: zEdges[j] + 26, z1: zEdges[j + 1] - 26 });
      }
    }
    for (const b of blocks2) {
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      if (w < 40 || d < 40) continue;
      const cols = Math.max(1, Math.floor(w / 60));
      const rows = Math.max(1, Math.floor(d / 55));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const hx = b.x0 + (i + 0.5) * (w / cols) + (rng() - 0.5) * 10;
          const hz = b.z0 + (j + 0.5) * (d / rows) + (rng() - 0.5) * 8;
          // face nearest street
          let rotY = (i + 0.5) / cols < 0.5 ? Math.PI / 2 : -Math.PI / 2;
          if (rng() < 0.5) rotY = (j + 0.5) / rows < 0.5 ? 0 : Math.PI;
          this._addBuilding(buildHouse(rng, { floors: rng() < 0.35 ? 2 : 1, lit }), hx, hz, rotY + (rng() - 0.5) * 0.2);
          // yard fence
          if (rng() < 0.5) this._addFenceRun(rng, hx + (rng() - 0.5) * 8, hz + (rng() - 0.5) * 8, rotY, 4 + (rng() * 3 | 0));
        }
      }
      // yard trees
      this._scatterTreesAround(rng, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, Math.max(w, d) * 0.45, 8, 12);
    }
    // shops on main street
    for (let i = 0; i < 4; i++) {
      const x = -450 + i * 260 + (rng() - 0.5) * 60;
      this._addBuilding(buildShop(rng, { lit }), x, -34, 0);
    }
    for (let i = 0; i < 3; i++) {
      const x = -300 + i * 300 + (rng() - 0.5) * 60;
      this._addBuilding(buildShop(rng, { lit }), x, 36, Math.PI);
    }
    // lamps along main street
    this._lampsAlongRoad(0, 42, 10);
    // signs at intersections
    for (const vx of vStreets) {
      this.scatter.addAt('signSpeed', buildSign('speed'), vx + 7, 8, { rotY: 0 });
      this.scatter.addAt('signStop', buildSign('stop'), vx - 7, -252, { rotY: Math.PI / 2 });
    }
  }

  _genCity(rng, zone) {
    const [cx, cz] = zone.at;
    const R = zone.r;
    // apartments in blocks
    const spots = [
      [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, -0.15], [-0.15, 0.55],
    ];
    for (const [sx, sz] of spots) {
      const x = cx + sx * R * 0.8, z = cz + sz * R * 0.8;
      this._addBuilding(buildApartment(rng, { floors: 4 + (rng() * 3 | 0), lit: zone.lit }), x, z, rng() * TAU * 0);
    }
    // shops row along the west edge
    for (let i = 0; i < 3; i++) {
      this._addBuilding(buildShop(rng, { lit: zone.lit }), cx - R * 0.75, cz - R * 0.4 + i * 62, Math.PI / 2);
    }
    this._lampsAlongRoad(1, 46, 8);
  }

  _genRuins(rng, zone) {
    const [cx, cz] = zone.at;
    this._addBuilding(buildRuin(rng), cx, cz, rng() * TAU);
    this._addBuilding(buildRuin(rng), cx + 40, cz + 20, rng() * TAU);
    this._addBuilding(buildRuin(rng), cx - 30, cz + 45, rng() * TAU);
    // debris barrels
    for (let i = 0; i < 6; i++) {
      this.scatter.addAt('barrel', buildBarrel((rng() * 999) | 0), cx + (rng() - 0.5) * 90, cz + (rng() - 0.5) * 90);
    }
  }

  _genRestStop(rng, zone) {
    const [cx, cz] = zone.at;
    this._addBuilding(buildWarehouse(rng, { w: 14, d: 10, h: 5 }), cx - 20, cz, 0);
    this._addBuilding(buildShed(rng), cx + 24, cz - 12, 0.4);
    this._addBuilding(buildContainers(rng, 2), cx + 26, cz + 14, 0.1);
    for (let i = 0; i < 5; i++) {
      this.scatter.addAt('barrel', buildBarrel((rng() * 999) | 0), cx + (rng() - 0.5) * 30, cz + (rng() - 0.5) * 40);
    }
    this._addFenceRun(rng, cx, cz - 30, 0, 8);
  }

  _genPark(rng, zone) {
    const [cx, cz] = zone.at;
    this._scatterTreesAround(rng, cx, cz, zone.r, 26, 10);
    for (let i = 0; i < 8; i++) {
      const a = rng() * TAU, r = rng() * zone.r;
      this.scatter.addAt('bush', buildBush((rng() * 999) | 0), cx + Math.cos(a) * r, cz + Math.sin(a) * r);
    }
  }

  _genCheckpoint(rng, zone) {
    const [cx, cz] = zone.at;
    this._addBuilding(buildCheckpoint(rng), cx, cz, rng() * TAU);
    this.scatter.addAt('sandbags', buildSandbagWall(3), cx + 6, cz + 4, { rotY: rng() * TAU });
    this.scatter.addAt('barrel', buildBarrel(11), cx - 5, cz + 3);
  }

  _genForestFill(rng, zone) {
    const [cx, cz] = zone.at;
    const count = Math.floor(zone.r * zone.r * 0.0016 * perf.tier.treeDensity * (this.def.scatter?.trees ?? 1));
    this._scatterTreesAround(rng, cx, cz, zone.r, count, 6);
  }

  _addFenceRun(rng, x, z, rotY, segments) {
    const dir = new THREE.Vector2(Math.cos(rotY), Math.sin(rotY));
    for (let i = 0; i < segments; i++) {
      const fx = x + dir.x * (i - segments / 2) * 4.1;
      const fz = z + dir.y * (i - segments / 2) * 4.1;
      this.scatter.addAt('fence', buildFenceSegment(), fx, fz, { rotY: -rotY });
    }
  }

  _scatterTreesAround(rng, cx, cz, r, count, minGap = 6) {
    const prop = this._treeProp(rng);
    const placed = [];
    let attempts = 0;
    let done = 0;
    while (done < count && attempts++ < count * 4) {
      const a = rng() * TAU;
      const rr = Math.sqrt(rng()) * r;
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      if (this._nearRoad(x, z, 8)) continue;
      if (placed.some(p => Math.hypot(p.x - x, p.z - z) < minGap)) continue;
      placed.push({ x, z });
      const which = this._treeProp(rng);
      this._addTree(which, x, z, rng());
      done++;
    }
  }

  _treeProp(rng) {
    const r = rng();
    if (r < 0.45) return { kind: 'oak', build: () => buildOak((rng() * 9999) | 0) };
    if (r < 0.75) return { kind: 'pine', build: () => buildPine((rng() * 9999) | 0) };
    return { kind: 'birch', build: () => buildBirch((rng() * 9999) | 0) };
  }

  _addTree(which, x, z, rng) {
    const prop = which.build();
    const color = new THREE.Color().setHSL(0.26 + rng * 0.06, 0.42 + rng * 0.2, 0.32 + rng * 0.14);
    this.scatter.addAt(which.kind, prop, x, z, { color });
  }

  // ---------------------------------------------------------------------------
  // SCATTER
  // ---------------------------------------------------------------------------
  _scatterNature() {
    const rng = makeRNG(hashSeed(`${this.def.id}:nature`));
    const half = this.def.size / 2;
    const treeCount = Math.floor(420 * perf.tier.treeDensity * (this.def.scatter?.trees ?? 1));
    const bushCount = Math.floor(240 * perf.tier.treeDensity * (this.def.scatter?.bushes ?? 1));
    const rockCount = Math.floor(150 * perf.tier.treeDensity * (this.def.scatter?.rocks ?? 1));

    // trees where macro is green (outside forests already filled)
    let placed = 0, attempts = 0;
    while (placed < treeCount && attempts++ < treeCount * 5) {
      const x = (rng() * 2 - 1) * half * 0.95;
      const z = (rng() * 2 - 1) * half * 0.95;
      const [r, g, b] = this.terrain.sampleMacro(x, z);
      const isGreen = g > r * 1.05 && g > b * 1.1 && g > 0.28;
      if (!isGreen) continue;
      if (this._nearRoad(x, z, 10)) continue;
      const which = this._treeProp(rng);
      this._addTree(which, x, z, rng());
      placed++;
    }
    // bushes
    for (let i = 0; i < bushCount; i++) {
      const x = (rng() * 2 - 1) * half * 0.95;
      const z = (rng() * 2 - 1) * half * 0.95;
      const [r, g, b] = this.terrain.sampleMacro(x, z);
      if (!(g > r && g > b && g > 0.25)) continue;
      if (this._nearRoad(x, z, 7)) continue;
      const color = new THREE.Color().setHSL(0.25 + rng() * 0.08, 0.4, 0.3 + rng() * 0.12);
      this.scatter.addAt('bush', buildBush((rng() * 9999) | 0), x, z, { color });
    }
    // rocks
    for (let i = 0; i < rockCount; i++) {
      const x = (rng() * 2 - 1) * half * 0.95;
      const z = (rng() * 2 - 1) * half * 0.95;
      if (this._nearRoad(x, z, 7)) continue;
      this.scatter.addAt('rock', buildRock((rng() * 9999) | 0, 0.4 + rng() * 1.4), x, z);
    }
  }

  _scatterGrass() {
    const rng = makeRNG(hashSeed(`${this.def.id}:grass`));
    const card = grassCardGeometry();
    const mat = new THREE.MeshStandardMaterial({
      map: card.map,
      alphaTest: 0.42,
      transparent: false,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      color: 0xffffff,
    });
    const count = Math.floor(6500 * perf.tier.grassDensity * (this.def.scatter?.grass ?? 1));
    const half = this.def.size / 2;
    const geo = card.geometry;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    inst.frustumCulled = false;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    let placed = 0, attempts = 0;
    while (placed < count && attempts++ < count * 3) {
      const x = (rng() * 2 - 1) * half * 0.97;
      const z = (rng() * 2 - 1) * half * 0.97;
      const [r, g, b] = this.terrain.sampleMacro(x, z);
      if (!(g > r * 1.02 && g > b * 1.05 && g > 0.3)) continue;
      if (this._nearRoad(x, z, 6)) continue;
      p.set(x, this.terrain.getHeight(x, z) - 0.03, z);
      q.setFromEuler(new THREE.Euler(0, rng() * TAU, 0));
      const sc = 0.8 + rng() * 1.5;
      s.set(sc, sc * (0.8 + rng() * 0.6), sc);
      m.compose(p, q, s);
      inst.setMatrixAt(placed, m);
      color.setHSL(0.24 + rng() * 0.06, 0.45 + rng() * 0.15, 0.35 + rng() * 0.16);
      inst.setColorAt(placed, color);
      placed++;
    }
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.scene.add(inst);
    this.grassMesh = inst;
  }

  // ---------------------------------------------------------------------------
  // POWER LINES & ROAD FURNITURE
  // ---------------------------------------------------------------------------
  _buildPowerLines() {
    for (const zone of this.def.zones) {
      if (zone.kind !== 'powerLine') continue;
      const road = this.roads.polylines[zone.alongRoad ?? 0];
      if (!road) continue;
      const pylon = buildPowerPylon();
      const positions = [];
      const step = zone.step ?? 130;
      // walk the road
      let distAcc = 0;
      const pts = road.pts;
      const spans = [];
      let prevPos = null;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        while (distAcc <= segLen) {
          const t = distAcc / segLen;
          const px = a.x + (b.x - a.x) * t;
          const pz = a.y + (b.y - a.y) * t;
          const tan = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
          const nor = new THREE.Vector2(-tan.y, tan.x);
          const side = 1;
          const x = px + nor.x * (road.width / 2 + 7) * side;
          const z = pz + nor.y * (road.width / 2 + 7) * side;
          const y = this.terrain.getHeight(x, z);
          positions.push(new THREE.Vector3(x, y, z));
          distAcc += step;
        }
        distAcc -= segLen;
      }
      // pylons + wires
      const wirePts = [];
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        const m = new THREE.Matrix4().compose(
          p, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        this.scatter.add('pylon', pylon, m);
        if (i > 0) {
          const prev = positions[i - 1];
          for (const armY of pylon.wireY) {
            for (const off of pylon.wireOffsets) {
              // catenary
              for (let s = 0; s < 10; s++) {
                const t0 = s / 10, t1 = (s + 1) / 10;
                const sag = (t) => Math.sin(t * Math.PI) * -3.2;
                wirePts.push(
                  new THREE.Vector3().lerpVectors(prev, p, t0).add(new THREE.Vector3(off, armY + sag(t0), 0)),
                  new THREE.Vector3().lerpVectors(prev, p, t1).add(new THREE.Vector3(off, armY + sag(t1), 0)),
                );
              }
            }
          }
        }
      }
      const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePts);
      const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1c1e, transparent: true, opacity: 0.8 });
      const wires = new THREE.LineSegments(wireGeo, wireMat);
      this.scene.add(wires);
    }
  }

  _roadFurniture() {
    const rng = makeRNG(hashSeed(`${this.def.id}:furniture`));
    // guardrails along highway map main road
    if (this.def.id === 'highway') {
      const road = this.roads.polylines[0];
      let distAcc = 0;
      for (let i = 1; i < road.pts.length; i++) {
        const a = road.pts[i - 1], b = road.pts[i];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        while (distAcc <= segLen) {
          const t = distAcc / segLen;
          const px = a.x + (b.x - a.x) * t;
          const pz = a.y + (b.y - a.y) * t;
          const tan = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
          const ang = Math.atan2(tan.y, tan.x);
          for (const side of [1, -1]) {
            const nor = new THREE.Vector2(-tan.y, tan.x);
            const x = px + nor.x * (road.width / 2 + 1.5) * side;
            const z = pz + nor.y * (road.width / 2 + 1.5) * side;
            this.scatter.addAt('rail', buildGuardRail(4), x, z, { rotY: -ang });
          }
          distAcc += 8.2;
        }
        distAcc -= segLen;
      }
      // speed signs
      for (let i = 0; i < 8; i++) {
        const s = this.roads.sample(0, i / 8);
        if (!s) continue;
        const nor = new THREE.Vector2(-s.tangent.y, s.tangent.x);
        const x = s.pos.x + nor.x * 11;
        const z = s.pos.y + nor.y * 11;
        this.scatter.addAt('signSpeed', buildSign('speed'), x, z, { rotY: Math.atan2(s.tangent.y, s.tangent.x) + Math.PI / 2 });
      }
    }
    if (this.def.id === 'rural' || this.def.id === 'combined') {
      // occasional signs
      for (let i = 0; i < 5; i++) {
        const s = this.roads.sample(0, 0.15 + i * 0.16);
        if (!s) continue;
        const nor = new THREE.Vector2(-s.tangent.y, s.tangent.x);
        this.scatter.addAt(i % 2 ? 'signArrow' : 'signSpeed', buildSign(i % 2 ? 'arrow' : 'speed'),
          s.pos.x + nor.x * 6.5, s.pos.y + nor.y * 6.5, { rotY: Math.atan2(s.tangent.y, s.tangent.x) + Math.PI / 2 });
      }
    }
  }

  _lampsAlongRoad(roadIdx, spacing, offset) {
    const road = this.roads.polylines[roadIdx];
    if (!road) return;
    let distAcc = spacing * 0.5;
    const lamp = buildLamp();
    for (let i = 1; i < road.pts.length; i++) {
      const a = road.pts[i - 1], b = road.pts[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      while (distAcc <= segLen) {
        const t = distAcc / segLen;
        const px = a.x + (b.x - a.x) * t;
        const pz = a.y + (b.y - a.y) * t;
        const tan = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
        const nor = new THREE.Vector2(-tan.y, tan.x);
        const side = ((distAcc / spacing) | 0) % 2 === 0 ? 1 : -1;
        const x = px + nor.x * offset * side;
        const z = pz + nor.y * offset * side;
        const rotY = Math.atan2(tan.x, tan.y) + (side > 0 ? Math.PI : 0);
        this.scatter.addAt('lamp', lamp, x, z, { rotY });
        // glow sprite for evening
        if (this.def.sky === 'evening' && perf.tier.particles > 0.5) {
          this._addGlow(x, this.terrain.getHeight(x, z) + 6.6, z);
        }
        distAcc += spacing;
      }
      distAcc -= segLen;
    }
  }

  _addGlow(x, y, z) {
    if (!this.glowMat) {
      const tex = getSpriteTexture('spark');
      this.glowMat = new THREE.SpriteMaterial({
        map: tex, color: 0xffdf9e, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this.glowGroup = new THREE.Group();
      this.scene.add(this.glowGroup);
    }
    const s = new THREE.Sprite(this.glowMat);
    s.scale.set(4.5, 4.5, 1);
    s.position.set(x, y, z);
    this.glowGroup.add(s);
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  _buildRoadMask() {
    // coarse grid marking road proximity
    const n = 72;
    this.roadMaskN = n;
    this.roadMask = new Float32Array(n * n);
    const half = this.def.size / 2;
    for (const road of this.roads.polylines) {
      const pts = road.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        // mark cells along segment
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (this.def.size / n)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = a.x + (b.x - a.x) * t;
          const z = a.y + (b.y - a.y) * t;
          const ci = clamp(Math.floor((x + half) / this.def.size * n), 0, n - 1);
          const cj = clamp(Math.floor((z + half) / this.def.size * n), 0, n - 1);
          const w = (road.width / 2 + 3) / (this.def.size / n);
          const wi = Math.ceil(w);
          for (let dj = -wi; dj <= wi; dj++) {
            for (let di = -wi; di <= wi; di++) {
              const ii = clamp(ci + di, 0, n - 1), jj = clamp(cj + dj, 0, n - 1);
              this.roadMask[jj * n + ii] = 1;
            }
          }
        }
      }
    }
  }

  _nearRoad(x, z, margin) {
    if (!this.roadMask) return false;
    const n = this.roadMaskN;
    const half = this.def.size / 2;
    const ci = clamp(Math.floor((x + half) / this.def.size * n), 0, n - 1);
    const cj = clamp(Math.floor((z + half) / this.def.size * n), 0, n - 1);
    const cells = Math.ceil(margin / (this.def.size / n));
    for (let dj = -cells; dj <= cells; dj++) {
      for (let di = -cells; di <= cells; di++) {
        const ii = clamp(ci + di, 0, n - 1), jj = clamp(cj + dj, 0, n - 1);
        if (this.roadMask[jj * n + ii]) return true;
      }
    }
    return false;
  }

  _pipeMat() {
    if (!this._pm) {
      this._pm = new THREE.MeshStandardMaterial({ color: 0x8a8e92, roughness: 0.5, metalness: 0.7 });
    }
    return this._pm;
  }

  _finalizeStatic() {
    // merge static buildings by material -> few draw calls
    this.scene.add(this.staticRoot);
    const merged = mergeGroupByMaterial(this.staticRoot);
    this.scene.remove(this.staticRoot);
    this.mergedMeshes = [];
    for (const [material, geometry] of merged) {
      const geoms = Array.isArray(geometry) ? geometry : [geometry];
      for (const g of geoms) {
        if (!g || !g.attributes?.position) continue;
        const mesh = new THREE.Mesh(g, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.isStaticBuilding = true;
        this.scene.add(mesh);
        this.mergedMeshes.push(mesh);
      }
    }
  }

  dispose() {
    const disposeObj = (root) => {
      root.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose?.();
        }
      });
    };
    if (this.terrainMesh) { this.scene.remove(this.terrainMesh); disposeObj(this.terrainMesh); this.terrainMesh.material.map.dispose(); this.terrainMesh.material.dispose(); }
    if (this.roads) this.roads.dispose();
    if (this.scatter) this.scatter.dispose();
    if (this.sky) this.sky.dispose();
    for (const m of this.mergedMeshes || []) { this.scene.remove(m); disposeObj(m); }
    if (this.grassMesh) { this.scene.remove(this.grassMesh); this.grassMesh.dispose(); }
    if (this.glowGroup) this.scene.remove(this.glowGroup);
    disposeObj(this.staticRoot);
  }
}

