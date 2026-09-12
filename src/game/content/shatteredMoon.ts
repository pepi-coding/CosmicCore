export type MassClass = 'Light' | 'Heavy' | 'Anchored' | 'Titanic';
export type Taxonomy = 'Core-bearers' | 'Cosmic Fauna' | 'Anomalies' | 'Constructs' | 'Titans';
export type EnemyId = 'meteor-mite' | 'comet-hound' | 'graviton-crab' | 'entropy-wisp' | 'lunar-devourer';
export const materialIds = ['Dense Matter', 'Frozen Momentum', 'Graviton Shell', 'Decay Fragment', 'Evolution Core'] as const;
export type Material = typeof materialIds[number];
export type Materials = Record<Material, number>;
export const emptyMaterials = (): Materials => Object.fromEntries(materialIds.map(id => [id, 0])) as Materials;
export type Drop = { material: Material; min: number; max: number; chance: number };
export type PartDef = { id: string; x: number; y: number; radius: number; hp: number; armor: number; drops: Drop[] };
export type EnemyDef = { name: string; taxonomy: Taxonomy; massClass: MassClass; mass: number; hp: number; radius: number; color: number; speed: number; attack: { tell: number; recovery: number; duration: number; damage: number; cue: string }; displacement: number; drops: Drop[]; parts: PartDef[] };
const drop = (material: Material, min = 1, max = 3, chance = 1): Drop[] => [{ material, min, max, chance }];
const part = (id: string, x: number, y: number, hp: number, material: Material): PartDef => ({ id, x, y, hp, radius: 22, armor: 1, drops: drop(material, 0, 1, .65) });
export const enemies: Record<EnemyId, EnemyDef> = {
  'meteor-mite': { name: 'Meteor Mite', taxonomy: 'Cosmic Fauna', massClass: 'Light', mass: 12, hp: 40, radius: 13, color: 0xaab6ce, speed: 140, attack: { tell: .65, recovery: 2, duration: .7, damage: 2, cue: 'mite-rush' }, displacement: 100, drops: drop('Dense Matter'), parts: [] },
  'comet-hound': { name: 'Comet Hound', taxonomy: 'Cosmic Fauna', massClass: 'Light', mass: 48, hp: 240, radius: 24, color: 0x86ddff, speed: 195, attack: { tell: 1, recovery: 2.5, duration: 1.1, damage: 12, cue: 'hound-charge' }, displacement: 100, drops: drop('Frozen Momentum', 3, 5), parts: [] },
  'graviton-crab': { name: 'Graviton Crab', taxonomy: 'Cosmic Fauna', massClass: 'Anchored', mass: 150, hp: 600, radius: 38, color: 0xe1b273, speed: 35, attack: { tell: 1.2, recovery: 2.2, duration: .3, damage: 14, cue: 'claw-slam' }, displacement: 100, drops: drop('Graviton Shell', 4, 7), parts: [part('left-anchor', -70, 25, 55, 'Graviton Shell'), part('right-anchor', 70, 25, 55, 'Graviton Shell'), part('left-plate', -28, -35, 45, 'Graviton Shell'), part('right-plate', 28, -35, 45, 'Graviton Shell')] },
  'entropy-wisp': { name: 'Entropy Wisp', taxonomy: 'Anomalies', massClass: 'Light', mass: 18, hp: 140, radius: 22, color: 0xd38bff, speed: 0, attack: { tell: 1.1, recovery: 3, duration: .3, damage: 7, cue: 'entropy-teleport' }, displacement: 100, drops: drop('Decay Fragment', 3, 5), parts: [] },
  'lunar-devourer': { name: 'Lunar Devourer', taxonomy: 'Titans', massClass: 'Titanic', mass: 1500, hp: 960, radius: 65, color: 0xe5cb94, speed: 120, attack: { tell: 1.5, recovery: 3, duration: 1.2, damage: 16, cue: 'devourer-lane' }, displacement: 100, drops: [...drop('Dense Matter', 6, 10), ...drop('Frozen Momentum', 4, 7), ...drop('Graviton Shell', 4, 7), ...drop('Decay Fragment', 4, 7)], parts: [part('armor-left', -65, 0, 100, 'Graviton Shell'), part('armor-right', 65, 0, 100, 'Graviton Shell'), part('organ-left', -60, 45, 100, 'Decay Fragment'), part('organ-right', 60, 45, 100, 'Decay Fragment')] },
};
export type Elite = 'Dense' | 'Unstable';
export const elites = { Dense: { resistance: 1.6, collision: 1.5, explosion: 0, tell: 1.4 }, Unstable: { resistance: 1, collision: 1, explosion: 12, tell: 1.4 } } satisfies Record<Elite, object>;
export type EncounterType = 'elimination' | 'demolition' | 'hunt' | 'survival' | 'physics-puzzle' | 'protection' | 'elite' | 'reward' | 'boss';
export type EncounterState = 'locked' | 'intro' | 'active' | 'success' | 'failure' | 'reward' | 'exit';
export type EncounterObjective = { type: EncounterType; required?: number; seconds?: number };
export function objectiveComplete(def: EncounterObjective, progress: { enemies: number; destroyed: number; revealed: number; elapsed: number; physics: number; protectedHP: number; choice: boolean; bossDefeated: boolean }): boolean {
  switch (def.type) {
    case 'elimination': case 'elite': return progress.enemies === 0;
    case 'demolition': return progress.destroyed >= (def.required ?? 1);
    case 'hunt': return progress.revealed >= (def.required ?? 1) && progress.enemies === 0;
    case 'survival': return progress.elapsed >= (def.seconds ?? 60);
    case 'physics-puzzle': return progress.physics >= (def.required ?? 1);
    case 'protection': return progress.protectedHP > 0 && progress.elapsed >= (def.seconds ?? 60);
    case 'reward': return progress.choice;
    case 'boss': return progress.bossDefeated;
  }
}
export const moonBalance = { attachmentCap: 3, attachmentInertia: .22, stabilizationSeconds: 1.8, materializedSeconds: 8, displacementRate: .06, displacementDecay: 12, displacementDelay: 1.5, exposureSeconds: 9, cacheRecovery: 35, transitionSeconds: 1.2, overloadPerFragment: 34, bossCoreDamage: 6, bossCoreWindow: 10, objectLifetime: 16, objectRespawn: 4, hintDelay: 18, grades: { completion: 35, time: 15, integrity: 20, physics: 20, parts: 5, cache: 5, death: 30, s: 82, a: 65, b: 45 } };
export const bossPhases = [
  { name: 'Armored Emergence', objective: 'Pulse boulders into both armor sections.', parts: ['armor-left', 'armor-right'] },
  { name: 'Gravity Organs', objective: 'Hold Pull near an organ, then melee it. Pulse or Impulse away from the mouth.', parts: ['organ-left', 'organ-right'] },
  { name: 'Core Consumption', objective: 'Pulse fragments into the mouth to overload it, then melee the exposed Core.', parts: [] },
] as const;
export type MoonRoom = { name: string; instruction: string; center: { x: number; y: number }; gate: { x: number; y: number }; color: number; objective: EncounterObjective; spawns: { id: EnemyId; count: number; elite?: Elite }[] };
export const shatteredMoon = {
  id: 'shattered-moon', name: 'The Shattered Moon', roomHalfSize: 300, gateRadius: 55,
  rooms: [
    { name: 'Impact Nursery', instruction: 'Pull to gather; Pulse to launch. Compressed melee removes attached Mites.', center: { x: 420, y: 420 }, gate: { x: 700, y: 420 }, color: 0x203044, objective: { type: 'elimination' }, spawns: [{ id: 'meteor-mite', count: 20 }] },
    { name: 'The Broken Orbit', instruction: 'Bend a charging Hound into moving debris or a wall.', center: { x: 1450, y: 420 }, gate: { x: 1730, y: 420 }, color: 0x163946, objective: { type: 'elimination' }, spawns: [{ id: 'comet-hound', count: 3 }] },
    { name: 'Gravity Lock', instruction: 'Break both floor anchors. Pull loose plates; fill Displacement, then melee the underside.', center: { x: 1450, y: 1450 }, gate: { x: 1730, y: 1450 }, color: 0x3a302b, objective: { type: 'elite' }, spawns: [{ id: 'graviton-crab', count: 1 }, { id: 'meteor-mite', count: 4, elite: 'Dense' }] },
    { name: 'Entropy Crossing', instruction: 'Hold Pull to materialize Wisps. Pulse suppresses patch edges. Clear for an optional cache.', center: { x: 420, y: 1450 }, gate: { x: 700, y: 1450 }, color: 0x332044, objective: { type: 'hunt', required: 3 }, spawns: [{ id: 'entropy-wisp', count: 3 }, { id: 'meteor-mite', count: 2, elite: 'Unstable' }] },
    { name: 'Lunar Devourer', instruction: 'Use lunar objects to break armor, expose organs, then overload the mouth.', center: { x: 1080, y: 1080 }, gate: { x: 1360, y: 1080 }, color: 0x362938, objective: { type: 'boss' }, spawns: [{ id: 'lunar-devourer', count: 1 }] },
  ] satisfies MoonRoom[],
};
export function validateMoon(): void {
  for (const [id, e] of Object.entries(enemies)) {
    if (e.hp <= 0 || e.mass <= 0 || e.radius <= 0 || e.attack.tell < .5 || e.attack.recovery <= 0) throw new Error(`Invalid enemy ${id}`);
    if (new Set(e.parts.map(p => p.id)).size !== e.parts.length) throw new Error(`Duplicate parts ${id}`);
    for (const d of [...e.drops, ...e.parts.flatMap(p => p.drops)]) if (!materialIds.includes(d.material) || d.min < 0 || d.max < d.min || d.chance < 0 || d.chance > 1) throw new Error(`Invalid drops ${id}`);
  }
  if (shatteredMoon.rooms.length !== 5) throw new Error('Moon requires five rooms');
  for (const r of shatteredMoon.rooms) for (const s of r.spawns) if (!enemies[s.id] || s.count < 1) throw new Error('Invalid spawn');
}
