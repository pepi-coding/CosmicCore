import type { Kind } from '../systems/types';
export const dungeon = {
  id: 'silent-orbit', name: 'The Silent Orbit', subtitle: 'A three-room descent into the heart of the field',
  energyCost: 8, autoRepeat: false,
  difficulties: [ { id: 'normal', name: 'Normal', playable: true, massScale: 1 }, { id: 'hard', name: 'Hard', playable: false, massScale: 1.4 } ],
  roomHalfSize: 300, gateRadius: 55, bossVulnerable: 6,
  rooms: [
    { name: 'The Approach', instruction: 'Defeat both sentinels with your melee chain, then enter the gate.', center: { x: 500, y: 500 }, enemies: ['drifter', 'drifter'] as Kind[], masses: [35, 40], offsets: [{x: 170, y: -65}, {x: 230, y: 80}], gate: { x: 780, y: 500 }, obstacles: [{x: 480, y: 290, radius: 45}], hazard: null },
    { name: 'Bent Space', instruction: 'Clear the room. Pillars block channels; avoid the violet entropy pool.', center: { x: 1500, y: 500 }, enemies: ['orbiter', 'wisp', 'leech'] as Kind[], masses: [42, 35, 32], offsets: [{x: 140, y: -100}, {x: 230, y: 40}, {x: 100, y: 165}], gate: { x: 1780, y: 500 }, obstacles: [{x: 1450, y: 390, radius: 42}, {x: 1570, y: 660, radius: 38}], hazard: {x: 1610, y: 430, radius: 80} },
    { name: 'The Anchored Core', instruction: 'Hold Pull or Pulse near the boss to break its anchor. Then melee the exposed vessel.', center: { x: 1500, y: 1500 }, enemies: ['guardian'] as Kind[], masses: [110], offsets: [{x: 200, y: 0}], gate: { x: 1780, y: 1500 }, obstacles: [{x: 1470, y: 1280, radius: 40}, {x: 1540, y: 1720, radius: 40}], hazard: null },
  ],
  rewards: { mass: 35, massVariance: 8, materials: 12, materialVariance: 4, currency: 2, firstClear: { mass: 20, materials: 15, currency: 3 }, grades: { s: 120, a: 210, b: 330 } },
} as const;
