// ---------------------------------------------------------------------------
// Terrain — heightfield terrain with a painted macro texture.
// The height grid is shared so roads/buildings/gameplay can query exact
// heights. The macro canvas is also used for grass placement and the
// mission-select minimap preview.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { fbm } from '../assets/Noise.js';
import { makeRNG, clamp } from '../core/Utils.js';

export class Terrain {
  /**
   * @param {object} def { size, segments, seed, amp, freq, macro(ctx, size, rng) }
   */
  constructor(def) {
    this.def = def;
    this.size = def.size;
    this.segments = def.segments ?? 150;
    this.seed = def.seed ?? 7;
    this.amp = def.amp ?? 10;
    this.freq = def.freq ?? 3;
    this.grid = null;
    this.macroCanvas = null;
    this._buildHeightGrid();
  }

  _buildHeightGrid() {
    const n = this.segments + 1;
    const grid = new Float32Array(n * n);
    const step = this.size / this.segments;
    const half = this.size / 2;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = (i * step - half) / this.size;
        const z = (j * step - half) / this.size;
        const wx = i * step - half;
        const wz = j * step - half;
        let h = fbm(x * this.freq + 0.5, z * this.freq + 0.5, this.freq * 3, this.seed, 4) - 0.5;
        // gentle ridges for large-scale shape
        const ridge = fbm(x * this.freq * 0.4 + 3.7, z * this.freq * 0.4 + 9.1, Math.max(2, Math.round(this.freq * 1.2)), this.seed + 51, 3) - 0.5;
        h = h * 0.65 + ridge * 0.9;
        // flatten the center a bit (play area)
        const cx = Math.max(0, 1 - Math.hypot(wx, wz) / (this.size * 0.42));
        h *= 1 - cx * 0.35;
        grid[j * n + i] = h * this.amp * 2;
      }
    }
    this.grid = grid;
    this.gridN = n;
    this.gridStep = this.size / this.segments;
  }

  /** Bilinear height query matching the render mesh exactly. */
  getHeight(x, z) {
    const half = this.size / 2;
    const fx = (x + half) / this.gridStep;
    const fz = (z + half) / this.gridStep;
    const i = clamp(Math.floor(fx), 0, this.gridN - 2);
    const j = clamp(Math.floor(fz), 0, this.gridN - 2);
    const tx = clamp(fx - i, 0, 1);
    const tz = clamp(fz - j, 0, 1);
    const n = this.gridN;
    const grid = this.grid;
    const h00 = grid[j * n + i], h10 = grid[(j) * n + i + 1], h01 = grid[(j + 1) * n + i], h11 = grid[(j + 1) * n + i + 1];
    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    return h0 * (1 - tz) + h1 * tz;
  }

  /** Build the terrain mesh with a painted macro texture. */
  buildMesh(macroPainter) {
    const size = this.size;
    const geo = new THREE.PlaneGeometry(size, size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const half = size / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      pos.setY(i, this.getHeight(x, z));
    }
    geo.computeVertexNormals();

    // macro texture
    const res = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = res;
    const ctx = canvas.getContext('2d');
    const rng = makeRNG(this.seed * 31 + 5);
    macroPainter(ctx, res, rng, (x, z) => this.getHeight(x, z));
    this.macroCanvas = canvas;
    this.macroRes = res;

    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.95,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.userData.isTerrain = true;
    return mesh;
  }

  /** Sample painted macro color at world pos (for grass placement etc.). */
  sampleMacro(x, z) {
    if (!this.macroCanvas) return [0.5, 0.5, 0.5];
    const res = this.macroRes;
    const half = this.size / 2;
    const u = clamp(Math.floor((x + half) / this.size * res), 0, res - 1);
    const v = clamp(Math.floor((z + half) / this.size * res), 0, res - 1);
    const d = this.macroCanvas.getContext('2d').getImageData(u, v, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  /** World -> macro canvas coords helper for painters. */
  worldToCanvas(x, z, res) {
    const half = this.size / 2;
    return [(x + half) / this.size * res, (z + half) / this.size * res];
  }
}
