// ---------------------------------------------------------------------------
// MissionData — the 5 campaign missions.
// targetType: which destroyed target types count toward completion.
// ---------------------------------------------------------------------------

export const MISSIONS = [
  {
    id: 'm1',
    index: 1,
    name: 'FIRST SORTIE',
    description: 'Training op over Green Valley. Locate and strike soft-skinned vehicles near the village and farms. Get a feel for the airframe.',
    mapId: 'rural',
    targetLabel: 'VEHICLES',
    types: ['car', 'technical', 'truck', 'fueltruck', 'apc', 'tank'],
    required: 5,
    hint: 'WASD + MOUSE to fly. SPACE to boost. Ram targets to destroy them.',
  },
  {
    id: 'm2',
    index: 2,
    name: 'CONVOY INTERDICTION',
    description: 'A supply column is moving along Highway 9. Intercept and destroy the convoy vehicles before they clear the sector.',
    mapId: 'highway',
    targetLabel: 'CONVOY VEHICLES',
    types: ['car', 'technical', 'truck', 'fueltruck', 'apc', 'tank'],
    required: 10,
    hint: 'Moving targets — lead your dive and use BOOST to keep up.',
  },
  {
    id: 'm3',
    index: 3,
    name: 'IRON WORKS',
    description: 'Armored units are staging inside the Ironworks complex. Overcast cover will hide your approach. Destroy the armor.',
    mapId: 'industrial',
    targetLabel: 'ARMORED TARGETS',
    types: ['tank', 'apc'],
    required: 10,
    hint: 'Tanks and APCs only count. Watch for structures blocking your dive.',
  },
  {
    id: 'm4',
    index: 4,
    name: 'OAKRIDGE SWEEP',
    description: 'Dusk raid on the Oakridge residential district. Mixed targets: vehicles in the streets and infantry squads in the yards.',
    mapId: 'suburb',
    targetLabel: 'TARGETS',
    types: ['car', 'technical', 'truck', 'fueltruck', 'apc', 'tank', 'npc'],
    required: 15,
    hint: 'Street lights are on. Enemy squads will react when they spot you.',
  },
  {
    id: 'm5',
    index: 5,
    name: 'TOTAL SUPREMACY',
    description: 'Final operation across Sector 7: city blocks, farmland, industry and forest. Strike everything that moves. 20 confirmed kills required.',
    mapId: 'combined',
    targetLabel: 'TARGETS',
    types: ['car', 'technical', 'truck', 'fueltruck', 'apc', 'tank', 'npc'],
    required: 20,
    hint: 'The sector is huge. Use the target markers on your HUD to navigate.',
  },
];

export const getMission = (id) => MISSIONS.find(m => m.id === id);
export const isUnlocked = (mission, saveData) => {
  if (mission.index === 1) return true;
  const prev = MISSIONS.find(m => m.index === mission.index - 1);
  return !prev || !!saveData.missions[prev.id]?.completed;
};
