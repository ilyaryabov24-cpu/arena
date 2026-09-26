// ---------------------------------------------------------------------------
// GeometryKit — geometry construction helpers for the procedural models
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Rescale BoxGeometry UVs so the texture keeps a constant world-space density.
 * Each face's UVs are scaled by that face's dimensions / texSize.
 */
export function boxUV(geom, texSize = 4) {
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  const size = new THREE.Vector3();
  // BoxGeometry vertex order: 6 faces x 4 verts: +x,-x,+y,-y,+z,-z
  for (let i = 0; i < pos.count; i++) {
    const face = Math.floor(i / 4);
    let su, sv;
    const p = new THREE.Vector3().fromBufferAttribute(pos, i);
    switch (face) {
      case 0: case 1: su = p.z; sv = p.y; break;      // +/- x faces
      case 2: case 3: su = p.x; sv = p.z; break;      // +/- y faces
      default: su = p.x; sv = p.y; break;             // +/- z faces
    }
    uv.setXY(i, uv.getX(i), uv.getY(i));
  }
  // compute dimensions from bounding box
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  size.copy(bb.max).sub(bb.min);
  const dim = [size.z, size.y, size.x, size.z, size.y, size.x, size.x, size.y, size.x, size.y, size.x, size.z];
  for (let i = 0; i < pos.count; i++) {
    const face = Math.floor(i / 4);
    const su = Math.max(0.05, dim[face * 2]);
    const sv = Math.max(0.05, dim[face * 2 + 1]);
    uv.setXY(i, uv.getX(i) * su / texSize, uv.getY(i) * sv / texSize);
  }
  uv.needsUpdate = true;
  return geom;
}

/** Generic UV scale (for cylinders/planes). */
export function scaleUV(geom, su, sv) {
  const uv = geom.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;
  return geom;
}

/**
 * Wing / stabilizer geometry: tapered, swept, slight dihedral & airfoil camber.
 * Span along X, chord along Z, thickness along Y. Root at x=0, extends to +X
 * (mirror with scale.x = -1 for the other side).
 */
export function wingGeometry({ span = 1.4, rootChord = 0.5, tipChord = 0.3, sweep = 0.35, thickness = 0.06, dihedral = 0.06, camber = 0.35 }) {
  const g = new THREE.BufferGeometry();
  const rt = thickness / 2;
  const tt = (thickness * 0.6) / 2;
  const rc = rootChord / 2, tc = tipChord / 2;
  // vertices: root LE, root TE, root top-mid, root bot-mid, tip LE, tip TE, tip top-mid, tip bot-mid
  const v = [
    [0, 0, rc],          // 0 root leading edge
    [0, 0, -rc],         // 1 root trailing edge
    [0, rt * camber, rc * 0.3],   // 2 root top
    [0, -rt * (1 - camber), -rc * 0.2], // 3 root bottom
    [span, span * dihedral, sweep + tc],  // 4 tip LE
    [span, span * dihedral, sweep - tc],  // 5 tip TE
    [span, span * dihedral + tt * camber, sweep + tc * 0.3],  // 6 tip top
    [span, span * dihedral - tt * (1 - camber), sweep - tc * 0.2], // 7 tip bottom
  ];
  const quads = [
    [0, 4, 6, 2], // top
    [3, 7, 5, 1], // bottom
    [0, 2, 3, 0], // root cap (triangle)
    [4, 5, 7, 6], // tip cap
    [0, 1, 5, 4], // leading edge
    [2, 6, 7, 3], // trailing edge
  ];
  const positions = [];
  const uvs = [];
  const pushTri = (a, b, c, uvA, uvB, uvC) => {
    positions.push(...v[a], ...v[b], ...v[c]);
    uvs.push(...uvA, ...uvB, ...uvC);
  };
  for (const q of quads) {
    if (q[0] === q[3]) {
      pushTri(q[0], q[1], q[2], [0, 0], [0, 1], [1, 0]);
    } else {
      pushTri(q[0], q[1], q[3], [0, 0], [0, 1], [1, 1]);
      pushTri(q[0], q[3], q[2], [0, 0], [1, 1], [1, 0]);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Triangular prism (wedge) — sloped armor, ramps, roofs. Ramp faces -Z. */
export function wedgeGeometry(w, h, l) {
  const g = new THREE.BufferGeometry();
  const hw = w / 2;
  const v = [
    [-hw, 0, 0], [hw, 0, 0], [hw, 0, -l], [-hw, 0, -l], // bottom 0-3
    [-hw, h, -l], [hw, h, -l], // top back 4-5
  ];
  const positions = [], uvs = [];
  const pushTri = (a, b, c) => {
    positions.push(...v[a], ...v[b], ...v[c]);
    uvs.push(0, 0, 0, 1, 1, 0);
  };
  // slope (front): 0,1,5,4
  pushTri(0, 1, 5); pushTri(0, 5, 4);
  // back: 3,2? back face is 2,3,4,5? vertical back at z=-l: verts 2(hw,0,-l),3(-hw,0,-l),4(-hw,h,-l),5(hw,h,-l)
  pushTri(2, 3, 4); pushTri(2, 4, 5);
  // bottom: 0,3,2,1 -> facing down
  pushTri(3, 0, 1); pushTri(3, 1, 2);
  // left side: 0,4,3
  pushTri(0, 4, 3);
  // right side: 1,2,5
  pushTri(1, 2, 5);
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

/** Jitter vertices of a geometry (organic rocks / foliage blobs). */
export function jitterGeometry(geom, amount, seed = 1) {
  const pos = geom.attributes.position;
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i,
      pos.getX(i) + (rnd() - 0.5) * amount,
      pos.getY(i) + (rnd() - 0.5) * amount,
      pos.getZ(i) + (rnd() - 0.5) * amount);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/** Clone a geometry and bake a transform into it. */
export function geomAt(geom, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const g = geom.clone();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
  g.applyMatrix4(m);
  return g;
}

/** Merge an array of geometries (all must share attribute layout). */
export function mergeGeoms(geoms) {
  return BufferGeometryUtils.mergeGeometries(geoms, false);
}

/**
 * Merge all meshes of a (static) group by material — massive draw-call
 * reduction for buildings & structures. Returns Map<Material, BufferGeometry>.
 */
export function mergeGroupByMaterial(root) {
  const buckets = new Map();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.userData.noMerge) return;
    if (!o.geometry || !o.geometry.attributes.position) return; // skip broken meshes
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = new Map(); // Material -> BufferGeometry | BufferGeometry[]
  for (const [material, geoms] of buckets) {
    normalizeForMerge(geoms);
    const merged = mergeGeoms(geoms);
    out.set(material, merged || geoms); // fallback: keep unmerged geometries
  }
  return out;
}

/**
 * Make a set of geometries mutually compatible for mergeGeometries():
 * - ensure normal + uv attributes exist everywhere
 * - drop attributes not shared by every geometry (except position)
 * - unify indexed / non-indexed
 */
function normalizeForMerge(geoms) {
  let shared = null;
  for (const g of geoms) {
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    g.morphAttributes = {};
    const names = new Set(Object.keys(g.attributes));
    if (shared === null) shared = names;
    else shared = new Set([...shared].filter(n => names.has(n)));
  }
  for (const g of geoms) {
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && !shared.has(name)) g.deleteAttribute(name);
    }
  }
  const allIndexed = geoms.every(g => g.index);
  if (!allIndexed) {
    for (let i = 0; i < geoms.length; i++) {
      if (geoms[i].index) geoms[i] = geoms[i].toNonIndexed();
    }
  }
}

/** Quick mesh helper. */
export function mesh(geom, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geom, material);
  m.position.set(x, y, z);
  return m;
}

/** Rounded box (bevel look) via BoxGeometry with many segments + clamp — cheap approx. */
export function roundedBox(w, h, d, r = 0.05) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const pos = g.attributes.position;
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    const x = Math.sign(pos.getX(i)) * Math.min(Math.abs(pos.getX(i)), hw + r * 0.0);
    pos.setXYZ(i,
      Math.sign(pos.getX(i)) * (Math.min(Math.abs(pos.getX(i)), hw) + r),
      Math.sign(pos.getY(i)) * (Math.min(Math.abs(pos.getY(i)), hh) + r),
      Math.sign(pos.getZ(i)) * (Math.min(Math.abs(pos.getZ(i)), hd) + r));
  }
  g.computeVertexNormals();
  return g;
}

/** Ensure geometry has normals & uvs (so merging never breaks). */
export function ensureUV(geom) {
  if (!geom.attributes.uv) {
    const count = geom.attributes.position.count;
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  return geom;
}

/** Dispose helper for groups of meshes. */
export function disposeObject(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose?.();
    }
  });
}
