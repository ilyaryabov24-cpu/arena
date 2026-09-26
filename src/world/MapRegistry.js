// ---------------------------------------------------------------------------
// MapRegistry — data-driven definitions for the 5 maps.
// Adding a new map = adding an entry here (no core code changes needed).
// Zone kinds are interpreted by MapBuilder; target clusters by TargetSpawner.
// ---------------------------------------------------------------------------

export const MAPS = {
  // =========================================================================
  // MAP 1 — rural countryside
  // =========================================================================
  rural: {
    id: 'rural',
    name: 'GREEN VALLEY',
    subtitle: 'RURAL COUNTRYSIDE',
    size: 1500,
    segments: 150,
    terrain: { seed: 11, amp: 11, freq: 3.2 },
    sky: 'day',
    ambience: 'birds',
    spawn: { at: [-620, -320], heading: 0.6, alt: 120 },
    roads: [
      { type: 'asphalt', width: 8, pts: [[-750, -260], [-520, -190], [-260, -60], [0, 60], [260, 130], [520, 90], [750, -80]] },
      { type: 'dirt', width: 5.5, pts: [[-60, 60], [-120, 220], [-90, 420], [-40, 560]] },
      { type: 'dirt', width: 5.5, pts: [[230, 120], [330, 300], [290, 500], [210, 640]] },
    ],
    macro: [
      { kind: 'field', rect: [-640, -80, 260, 200], crop: 'wheat' },
      { kind: 'field', rect: [-480, 340, 200, 180], crop: 'soil' },
      { kind: 'field', rect: [420, 220, 260, 200], crop: 'crop' },
      { kind: 'field', rect: [460, -420, 240, 180], crop: 'wheat' },
      { kind: 'forest', at: [-520, -460], r: 150 },
      { kind: 'forest', at: [620, 480], r: 160 },
      { kind: 'forest', at: [-620, 600], r: 120 },
      { kind: 'dirtPatch', at: [80, 380], r: 90 },
    ],
    zones: [
      { kind: 'village', at: [80, 380], r: 140, houses: 9 },
      { kind: 'farm', at: [-140, 560], r: 90 },
      { kind: 'farm', at: [260, 520], r: 90 },
      { kind: 'forestFill', at: [-520, -460], r: 150 },
      { kind: 'forestFill', at: [620, 480], r: 160 },
      { kind: 'forestFill', at: [-620, 600], r: 120 },
    ],
    targets: [
      { kind: 'cluster', at: [80, 380], r: 110, types: ['car', 'technical', 'truck', 'car'], count: 6 },
      { kind: 'cluster', at: [-140, 560], r: 70, types: ['fueltruck', 'technical', 'car'], count: 3 },
      { kind: 'cluster', at: [260, 520], r: 70, types: ['car', 'truck'], count: 3 },
      { kind: 'npcPatrol', at: [80, 380], r: 90, count: 5 },
      { kind: 'npcPatrol', at: [-140, 560], r: 60, count: 3 },
    ],
    scatter: { trees: 1.0, bushes: 0.9, rocks: 0.8, grass: 1.0 },
  },

  // =========================================================================
  // MAP 2 — highway convoy interdiction
  // =========================================================================
  highway: {
    id: 'highway',
    name: 'HIGHWAY 9',
    subtitle: 'CONVOY ROUTE — STEPPE',
    size: 2200,
    segments: 170,
    terrain: { seed: 23, amp: 7, freq: 2.4 },
    sky: 'haze',
    ambience: 'wind',
    spawn: { at: [-980, -260], heading: 0.15, alt: 140 },
    roads: [
      { type: 'asphalt', width: 16, pts: [[-1060, -70], [-700, -40], [-350, -10], [0, 0], [350, -10], [700, -40], [1060, -70]] },
      { type: 'asphalt', width: 7, pts: [[-320, 0], [-320, 380], [-180, 560]] },
      { type: 'asphalt', width: 7, pts: [[380, 0], [380, -420], [240, -600]] },
      { type: 'dirt', width: 5, pts: [[-700, -40], [-760, 240], [-640, 460]] },
      { type: 'dirt', width: 5, pts: [[700, -40], [780, 260], [660, 520]] },
    ],
    macro: [
      { kind: 'forest', at: [-500, 420], r: 190 },
      { kind: 'forest', at: [520, 380], r: 170 },
      { kind: 'forest', at: [-820, -360], r: 150 },
      { kind: 'forest', at: [840, -340], r: 160 },
      { kind: 'field', rect: [-200, 420, 300, 240], crop: 'crop' },
      { kind: 'field', rect: [520, -600, 320, 240], crop: 'wheat' },
      { kind: 'dirtPatch', at: [620, 140], r: 80 },
    ],
    zones: [
      { kind: 'restStop', at: [620, 140], r: 90 },
      { kind: 'forestFill', at: [-500, 420], r: 190 },
      { kind: 'forestFill', at: [520, 380], r: 170 },
      { kind: 'forestFill', at: [-820, -360], r: 150 },
      { kind: 'forestFill', at: [840, -340], r: 160 },
      { kind: 'powerLine', alongRoad: 0, step: 130 },
    ],
    targets: [
      { kind: 'convoy', road: 0, t0: 0.12, count: 8, types: ['truck', 'truck', 'apc', 'truck', 'technical', 'truck', 'apc', 'truck'], speed: 9, spacing: 34 },
      { kind: 'cluster', at: [620, 140], r: 60, types: ['car', 'technical', 'car', 'truck'], count: 4 },
      { kind: 'traffic', road: 0, count: 5, speed: 14 },
      { kind: 'npcPatrol', at: [620, 140], r: 50, count: 3 },
    ],
    scatter: { trees: 0.9, bushes: 0.7, rocks: 1.0, grass: 0.9 },
  },

  // =========================================================================
  // MAP 3 — industrial zone
  // =========================================================================
  industrial: {
    id: 'industrial',
    name: 'IRONWORKS',
    subtitle: 'INDUSTRIAL COMPLEX',
    size: 1300,
    segments: 120,
    terrain: { seed: 37, amp: 5, freq: 2.8 },
    sky: 'overcast',
    ambience: 'industry',
    spawn: { at: [-540, 420], heading: -0.5, alt: 120 },
    roads: [
      { type: 'asphalt', width: 9, pts: [[-460, -320], [0, -340], [460, -320]] },
      { type: 'asphalt', width: 9, pts: [[-460, 320], [0, 340], [460, 320]] },
      { type: 'asphalt', width: 8, pts: [[-460, -320], [-480, 0], [-460, 320]] },
      { type: 'asphalt', width: 8, pts: [[460, -320], [480, 0], [460, 320]] },
      { type: 'asphalt', width: 8, pts: [[0, -340], [0, 340]] },
      { type: 'dirt', width: 5, pts: [[0, -340], [40, -520], [-30, -580]] },
    ],
    macro: [
      { kind: 'concrete', at: [0, 0], r: 430 },
      { kind: 'dirtPatch', at: [-320, -140], r: 80 },
      { kind: 'dirtPatch', at: [330, 160], r: 90 },
    ],
    zones: [
      { kind: 'industrial', at: [0, 0], r: 430, seed: 5 },
      // satellite yards: storage depot (SW) and fuel/rail depot (NE)
      { kind: 'industrial', at: [-360, -300], r: 190, seed: 51 },
      { kind: 'industrial', at: [370, -230], r: 165, seed: 52 },
      // ruined workshop row on the east access road
      { kind: 'ruins', at: [420, 60], r: 40 },
      { kind: 'ruins', at: [300, 520], r: 40 },
      { kind: 'checkpoint', at: [-455, -320], r: 30 },
      { kind: 'checkpoint', at: [455, 320], r: 30 },
      { kind: 'powerLine', alongRoad: 0, step: 150 },
    ],
    targets: [
      { kind: 'cluster', at: [-220, -60], r: 130, types: ['tank', 'apc', 'tank'], count: 5 },
      { kind: 'cluster', at: [250, 90], r: 130, types: ['apc', 'tank', 'tank'], count: 5 },
      { kind: 'cluster', at: [0, -220], r: 100, types: ['tank', 'apc'], count: 3 },
      { kind: 'npcPatrol', at: [-220, -60], r: 90, count: 4 },
      { kind: 'npcPatrol', at: [250, 90], r: 90, count: 4 },
      { kind: 'traffic', road: 4, count: 3, speed: 10 },
    ],
    scatter: { trees: 0.5, bushes: 0.55, rocks: 0.5, grass: 0.45 },
  },

  // =========================================================================
  // MAP 4 — suburb at sunset
  // =========================================================================
  suburb: {
    id: 'suburb',
    name: 'OAKRIDGE',
    subtitle: 'RESIDENTIAL DISTRICT — EVENING',
    size: 1500,
    segments: 140,
    terrain: { seed: 53, amp: 6, freq: 2.6 },
    sky: 'evening',
    ambience: 'birds',
    spawn: { at: [-640, 420], heading: -0.4, alt: 110 },
    roads: [
      { type: 'asphalt', width: 9, pts: [[-720, 0], [-360, 10], [0, 0], [360, -10], [720, 0]] },
      { type: 'asphalt', width: 6.5, pts: [[-540, -420], [-540, 420]] },
      { type: 'asphalt', width: 6.5, pts: [[-180, -420], [-180, 420]] },
      { type: 'asphalt', width: 6.5, pts: [[180, -420], [180, 420]] },
      { type: 'asphalt', width: 6.5, pts: [[540, -420], [540, 420]] },
      { type: 'asphalt', width: 6.5, pts: [[-720, -260], [720, -260]] },
      { type: 'asphalt', width: 6.5, pts: [[-720, 260], [720, 260]] },
    ],
    macro: [
      { kind: 'grassBase', tint: '#5d7245' },
      { kind: 'dirtPatch', at: [-300, -400], r: 70 },
    ],
    zones: [
      { kind: 'suburbGrid', at: [0, 0], lit: true },
      { kind: 'park', at: [0, 0], r: 120 },
    ],
    targets: [
      { kind: 'cluster', at: [-360, -140], r: 90, types: ['car', 'car', 'technical'], count: 4 },
      { kind: 'cluster', at: [360, 140], r: 90, types: ['car', 'car', 'truck'], count: 4 },
      { kind: 'cluster', at: [0, -330], r: 90, types: ['car', 'technical', 'car'], count: 4 },
      { kind: 'cluster', at: [-360, 330], r: 90, types: ['car', 'car', 'fueltruck'], count: 4 },
      { kind: 'traffic', road: 0, count: 5, speed: 11 },
      { kind: 'traffic', road: 3, count: 3, speed: 9 },
      { kind: 'npcPatrol', at: [0, 0], r: 150, count: 6 },
      { kind: 'npcPatrol', at: [-360, -140], r: 60, count: 3 },
      { kind: 'npcPatrol', at: [360, 140], r: 60, count: 3 },
    ],
    scatter: { trees: 1.1, bushes: 1.1, rocks: 0.3, grass: 0.9 },
  },

  // =========================================================================
  // MAP 5 — large combined sector
  // =========================================================================
  combined: {
    id: 'combined',
    name: 'SECTOR 7',
    subtitle: 'COMBINED OPERATIONS AREA',
    size: 2200,
    segments: 170,
    terrain: { seed: 71, amp: 10, freq: 2.6 },
    sky: 'day',
    ambience: 'wind',
    spawn: { at: [-950, -550], heading: 0.5, alt: 150 },
    roads: [
      { type: 'asphalt', width: 10, pts: [[-1080, -40], [-700, -20], [-350, 10], [0, 30], [350, 50], [700, 30], [1080, 60]] },
      { type: 'asphalt', width: 8, pts: [[0, -1080], [10, -600], [30, 30], [50, 600], [60, 1080]] },
      { type: 'asphalt', width: 7, pts: [[-350, 10], [-380, 300], [-320, 560]] },
      { type: 'dirt', width: 5.5, pts: [[-700, -20], [-780, 220], [-700, 460], [-560, 560]] },
      { type: 'dirt', width: 5.5, pts: [[700, 30], [790, -220], [720, -460]] },
    ],
    macro: [
      { kind: 'cityConcrete', at: [620, -620], r: 300 },
      { kind: 'concrete', at: [520, 540], r: 240 },
      { kind: 'field', rect: [-900, -350, 380, 280], crop: 'wheat' },
      { kind: 'field', rect: [-560, -320, 260, 200], crop: 'crop' },
      { kind: 'field', rect: [-880, 300, 320, 240], crop: 'soil' },
      { kind: 'forest', at: [-620, 700], r: 210 },
      { kind: 'forest', at: [900, 200], r: 170 },
      { kind: 'forest', at: [-1000, -800], r: 160 },
    ],
    zones: [
      { kind: 'cityBlock', at: [620, -620], r: 300, lit: false },
      { kind: 'industrial', at: [520, 540], r: 240, seed: 9, scale: 0.8 },
      { kind: 'farm', at: [-760, 420], r: 90 },
      { kind: 'farm', at: [-420, -220], r: 80 },
      { kind: 'ruins', at: [-240, 620], r: 90 },
      { kind: 'forestFill', at: [-620, 700], r: 210 },
      { kind: 'forestFill', at: [900, 200], r: 170 },
      { kind: 'forestFill', at: [-1000, -800], r: 160 },
      { kind: 'powerLine', alongRoad: 1, step: 150 },
    ],
    targets: [
      { kind: 'cluster', at: [620, -620], r: 200, types: ['car', 'technical', 'apc', 'car'], count: 7 },
      { kind: 'cluster', at: [520, 540], r: 160, types: ['tank', 'apc', 'truck'], count: 6 },
      { kind: 'cluster', at: [-760, 420], r: 70, types: ['truck', 'technical', 'fueltruck'], count: 4 },
      { kind: 'cluster', at: [-240, 620], r: 80, types: ['apc', 'technical'], count: 3 },
      { kind: 'convoy', road: 0, t0: 0.3, count: 5, types: ['truck', 'apc', 'truck', 'technical', 'truck'], speed: 9, spacing: 32 },
      { kind: 'traffic', road: 1, count: 4, speed: 12 },
      { kind: 'npcPatrol', at: [620, -620], r: 160, count: 6 },
      { kind: 'npcPatrol', at: [-240, 620], r: 70, count: 4 },
      { kind: 'npcPatrol', at: [520, 540], r: 120, count: 4 },
    ],
    scatter: { trees: 1.0, bushes: 0.9, rocks: 0.8, grass: 0.9 },
  },
};

export const getMapDef = (id) => MAPS[id];
export const mapIds = Object.keys(MAPS);
