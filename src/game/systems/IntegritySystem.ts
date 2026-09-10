import type { Actor } from './types';

export const integrityRatio = (a: Actor): number => a.integrity.current / a.integrity.maximum;
export const coreExposed = (a: Actor): boolean => a.alive && integrityRatio(a) < .2;
export function timeout(a: Actor, b: Actor): number | null {
  const health = integrityRatio(a) - integrityRatio(b);
  if (Math.abs(health) > .00001) return health > 0 ? a.id : b.id;
  const mass = a.mass.combatMass - b.mass.combatMass;
  return Math.abs(mass) > .001 ? mass > 0 ? a.id : b.id : null;
}
