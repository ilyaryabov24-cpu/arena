// ---------------------------------------------------------------------------
// ScatterSystem — collects instance transforms per prop kind and builds one
// InstancedMesh per (kind × part). Gives thousands of trees / bushes / rocks /
// grass at a handful of draw calls, with per-instance color variation.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

export class ScatterSystem {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.kinds = new Map(); // kind -> { prop, matrices: [], colors: [] }
    this.built = [];
  }

  add(kind, prop, matrix, color = null) {
    if (!this.kinds.has(kind)) {
      this.kinds.set(kind, { prop, matrices: [], colors: [] });
    }
    const k = this.kinds.get(kind);
    k.matrices.push(matrix.clone());
    if (color) k.colors.push(color.clone());
    else k.colors.push(null);
  }

  addAt(kind, prop, x, z, { y = null, rotY = null, scale = 1, color = null, snap = true } = {}) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY ?? Math.random() * Math.PI * 2, 0));
    const s = new THREE.Vector3(scale * (0.85 + Math.random() * 0.3), scale * (0.9 + Math.random() * 0.25), scale * (0.85 + Math.random() * 0.3));
    const yy = snap && this.terrain ? this.terrain.getHeight(x, z) : (y ?? 0);
    m.compose(new THREE.Vector3(x, yy, z), q, s);
    this.add(kind, prop, m, color);
    return m;
  }

  count(kind) { return this.kinds.get(kind)?.matrices.length ?? 0; }

  /** Build all InstancedMeshes. */
  finalize({ shadow = true, frustumCulled = true } = {}) {
    for (const [kind, k] of this.kinds) {
      const count = k.matrices.length;
      if (!count) continue;
      for (const part of k.prop.parts) {
        const inst = new THREE.InstancedMesh(part.geometry, part.material, count);
        inst.castShadow = shadow;
        inst.receiveShadow = true;
        inst.frustumCulled = frustumCulled;
        const useColor = k.colors.some(c => c) && !part.material.userData.noTint;
        for (let i = 0; i < count; i++) {
          inst.setMatrixAt(i, k.matrices[i]);
          if (useColor) {
            inst.setColorAt(i, k.colors[i] ?? new THREE.Color(1, 1, 1));
          }
        }
        if (useColor) inst.instanceColor.needsUpdate = true;
        inst.instanceMatrix.needsUpdate = true;
        inst.userData.kind = kind;
        this.scene.add(inst);
        this.built.push(inst);
      }
    }
    this.kinds.clear();
    return this.built;
  }

  dispose() {
    for (const m of this.built) {
      this.scene.remove(m);
      m.dispose();
    }
    this.built = [];
  }
}
