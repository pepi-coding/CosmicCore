import type { Modifiers } from '../systems/types';
export type Manifestation = { id: string; name: string; rarity: 'Common' | 'Rare' | 'Epic'; affinity: string; color: number; description: string; abilities: string[]; passive: string; baseStats: Modifiers; duplicateShards: number; upgrade: { maxLevel: number; materialCost: number; meleePerLevel: number } };
const base: Modifiers = { melee: 1, reach: 1, pull: 1, pulse: 1, fluxEfficiency: 1, fluxOnHit: 1 };
export const manifestations: Manifestation[] = [
  { id: 'vessel', name: 'Stillwater', rarity: 'Common', affinity: 'Gravity', color: 0x83efd0, description: 'A steady center in a restless field.', abilities: ['Gravitational Charge · +12% pull', 'Outward Discharge · standard'], passive: 'Steady breath · 5% more efficient Flux', baseStats: { ...base, pull: 1.12, fluxEfficiency: 1.05 }, duplicateShards: 10, upgrade: { maxLevel: 5, materialCost: 8, meleePerLevel: .02 } },
  { id: 'stride', name: 'Vector', rarity: 'Rare', affinity: 'Momentum', color: 0x91b4ff, description: 'Reach further. Return with momentum.', abilities: ['Energy limbs · +8% melee reach', 'Outward Discharge · +10% displacement'], passive: 'Contact resonance · +15% Flux restored on hit', baseStats: { ...base, reach: 1.08, pulse: 1.1, fluxOnHit: 1.15, pull: .92 }, duplicateShards: 15, upgrade: { maxLevel: 5, materialCost: 8, meleePerLevel: .02 } },
  { id: 'hollow', name: 'Quietus', rarity: 'Epic', affinity: 'Entropy', color: 0xd8a2ff, description: 'Release pressure. Leave space behind.', abilities: ['Outward Discharge · +15% displacement', 'Gravitational Charge · −10% pull'], passive: 'Patient release · 12% more efficient Flux', baseStats: { ...base, pulse: 1.15, pull: .9, fluxEfficiency: 1.12, melee: .95 }, duplicateShards: 20, upgrade: { maxLevel: 5, materialCost: 8, meleePerLevel: .02 } },
];
export const manifestationFor = (id: string) => manifestations.find(m => m.id === id) ?? manifestations[0];
export function modifiersFor(id: string, level = 1, pvp = false): Modifiers {
  const m = manifestationFor(id), result = { ...m.baseStats };
  result.melee += (Math.max(1, Math.min(level, m.upgrade.maxLevel)) - 1) * m.upgrade.meleePerLevel;
  if (pvp) { result.melee = m.baseStats.melee; for (const key of Object.keys(result) as (keyof Modifiers)[]) result[key] = Math.min(1.15, Math.max(.85, result[key])); }
  return result;
}
