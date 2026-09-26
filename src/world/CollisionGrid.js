// ---------------------------------------------------------------------------
// CollisionGrid — coarse spatial hash for drone-vs-world collisions.
// Static obstacles (buildings, containers) are inserted once; dynamic targets
// update their entries every frame (cheap: dozens of objects).
// ---------------------------------------------------------------------------

export class CollisionGrid {
  constructor(size = 2200, cell = 40) {
    this.cell = cell;
    this.half = size / 2;
    this.n = Math.ceil(size / cell);
    this.cells = new Array(this.n * this.n);
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = [];
    this.dynamic = new Map(); // id -> box
  }

  _cellsFor(box) {
    const toC = (x, z) => [
      Math.min(this.n - 1, Math.max(0, Math.floor((x + this.half) / this.cell))),
      Math.min(this.n - 1, Math.max(0, Math.floor((z + this.half) / this.cell))),
    ];
    const [cx0, cz0] = toC(box.minX, box.minZ);
    const [cx1, cz1] = toC(box.maxX, box.maxZ);
    const keys = [];
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        keys.push(cz * this.n + cx);
      }
    }
    return keys;
  }

  insertStatic(box) {
    for (const k of this._cellsFor(box)) this.cells[k].push(box);
  }

  insertDynamic(id, box) {
    box.cells = this._cellsFor(box);
    for (const k of box.cells) this.cells[k].push(box);
    this.dynamic.set(id, box);
  }

  updateDynamic(id, box) {
    this.removeDynamic(id);
    this.insertDynamic(id, box);
  }

  removeDynamic(id) {
    const box = this.dynamic.get(id);
    if (!box) return;
    for (const k of (box.cells || [])) {
      const arr = this.cells[k];
      if (!arr) continue;
      const idx = arr.indexOf(box);
      if (idx >= 0) arr.splice(idx, 1);
    }
    this.dynamic.delete(id);
  }

  /** All boxes potentially overlapping the query sphere (may contain dups). */
  query(x, z, radius) {
    const out = [];
    const seen = new Set();
    const probe = { minX: x - radius, maxX: x + radius, minZ: z - radius, maxZ: z + radius };
    for (const k of this._cellsFor(probe)) {
      for (const box of this.cells[k]) {
        if (!seen.has(box)) { seen.add(box); out.push(box); }
      }
    }
    return out;
  }
}
