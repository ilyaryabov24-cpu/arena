// ---------------------------------------------------------------------------
// RoadNetwork — builds road ribbons along polylines that conform to terrain.
// Supports asphalt (with markings) and dirt roads. Roads are also painted
// onto the terrain macro texture for distance blending.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { mat } from '../assets/MaterialLibrary.js';
import { scaleUV } from '../assets/GeometryKit.js';

export class RoadNetwork {
  constructor(terrain, scene) {
    this.terrain = terrain;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.polylines = []; // { type, pts: Vector2[], width }
  }

  /** Resample a polyline into evenly spaced points. */
  static resample(pts, step = 6) {
    const out = [];
    let prev = pts[0];
    out.push(prev.clone());
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const segLen = a.distanceTo(b);
      let d = step - carry;
      while (d <= segLen) {
        const t = d / segLen;
        out.push(new THREE.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
        d += step;
      }
      carry = (segLen - (d - step)) % step;
    }
    out.push(pts[pts.length - 1].clone());
    return out;
  }

  addRoad(type, points, width = null) {
    const pts = points.map(p => new THREE.Vector2(p[0], p[1]));
    const w = width ?? (type === 'asphalt' ? 8 : 5.5);
    const resampled = RoadNetwork.resample(pts, 7);
    this.polylines.push({ type, pts: resampled, width: w });

    const material = type === 'asphalt' ? mats_road() : mats_dirt();
    const geo = this._ribbon(resampled, w, type === 'asphalt' ? 0.14 : 0.1);
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.userData.isRoad = true;
    this.group.add(mesh);
    return mesh;
  }

  _ribbon(pts, width, yOffset) {
    const positions = [], uvs = [], normals = [], indices = [];
    const up = new THREE.Vector3(0, 1, 0);
    const n = pts.length;
    let vDist = 0;
    const prevPt = new THREE.Vector2(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      // tangent
      const pPrev = pts[Math.max(0, i - 1)];
      const pNext = pts[Math.min(n - 1, i + 1)];
      const tan = new THREE.Vector2(pNext.x - pPrev.x, pNext.y - pPrev.y).normalize();
      const nor = new THREE.Vector2(-tan.y, tan.x);
      if (i > 0) vDist += p.distanceTo(prevPt);
      prevPt.set(p.x, p.y);
      const yC = this.terrain.getHeight(p.x, p.y) + yOffset;
      const yL = this.terrain.getHeight(p.x + nor.x * width / 2, p.y + nor.y * width / 2) + yOffset * 0.8;
      const yR = this.terrain.getHeight(p.x - nor.x * width / 2, p.y - nor.y * width / 2) + yOffset * 0.8;
      positions.push(
        p.x + nor.x * width / 2, yL, p.y + nor.y * width / 2,
        p.x - nor.x * width / 2, yR, p.y - nor.y * width / 2,
      );
      normals.push(0, 1, 0, 0, 1, 0);
      const v = vDist / 12; // texture repeats every 12m
      uvs.push(0.02, v, 0.98, v);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  /** Paint roads onto the macro canvas (called during terrain painting). */
  paintOnMacro(ctx, res) {
    const half = this.terrain.size / 2;
    const toC = (x) => (x + half) / this.terrain.size * res;
    for (const road of this.polylines) {
      ctx.strokeStyle = road.type === 'asphalt' ? '#565a5e' : '#7d6c50';
      ctx.lineWidth = Math.max(2, road.width / this.terrain.size * res * 1.35);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      road.pts.forEach((p, i) => {
        const cx = toC(p.x), cy = toC(p.y);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      // shoulder
      ctx.strokeStyle = road.type === 'asphalt' ? '#6e7160' : '#8a7a5c';
      ctx.lineWidth = Math.max(4, road.width / this.terrain.size * res * 1.8);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Point on road network for spawning/traffic: returns {pos, tangent} at t along polyline idx. */
  sample(idx, t) {
    const road = this.polylines[idx];
    if (!road) return null;
    const pts = road.pts;
    const total = road.pts.reduce((acc, p, i) => i ? acc + p.distanceTo(pts[i - 1]) : 0, 0);
    let d = t * total;
    for (let i = 1; i < pts.length; i++) {
      const seg = pts[i].distanceTo(pts[i - 1]);
      if (d <= seg || i === pts.length - 1) {
        const tt = seg > 0 ? clamp01(d / seg) : 0;
        const p = new THREE.Vector2().lerpVectors(pts[i - 1], pts[i], tt);
        const tan = new THREE.Vector2(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y).normalize();
        return { pos: p, tangent: tan, road };
      }
      d -= seg;
    }
  }

  get length() { return this.polylines.length; }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => o.isMesh && o.geometry.dispose());
  }
}

const clamp01 = v => Math.max(0, Math.min(1, v));
const mats_road = () => mat('rn_road', { texture: 'road' }, { roughness: 0.92, metalness: 0.02 });
const mats_dirt = () => mat('rn_dirt', { texture: 'dirtRoad' }, { roughness: 1, metalness: 0 });
