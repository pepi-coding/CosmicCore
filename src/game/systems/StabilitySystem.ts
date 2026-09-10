import { B } from '../config/balance';
import type { Actor } from './types';
export const protectedMass = (a: Actor) => Math.max(0, a.mass.coreMass - a.stability.trauma);
export function checkStability(a: Actor, directHit = false): void {
  if (a.stability.phase === 'collapsed') return;
  if (a.stability.phase === 'unstable' && directHit) { a.stability.phase = 'collapsed'; a.alive = false; return; }
  if (a.stability.phase === 'stable' && protectedMass(a) < B.stability.threshold) {
    a.stability.phase = 'unstable'; a.stability.instabilityCount++;
    a.stability.unstableRemainingMs = Math.max(B.stability.minExposure, B.stability.exposure / (1 + (a.stability.instabilityCount - 1) * B.stability.penalty)) * 1000;
  }
}
export function tickStability(a: Actor, dt: number): void {
  if (a.stability.phase === 'unstable') {
    a.stability.unstableRemainingMs -= dt * 1000;
    if (a.stability.unstableRemainingMs <= 0) {
      // Recovery reallocates existing mass; it never mints new combat mass.
      const desired = Math.min(B.stability.recovery, a.mass.combatMass - a.mass.orbitingStoredMass);
      a.mass.coreMass = Math.max(a.mass.coreMass, desired); a.mass.fieldMass = Math.max(0, a.mass.combatMass - a.mass.orbitingStoredMass - a.mass.coreMass);
      const available = a.mass.coreMass + a.mass.fieldMass;
      if (available > 0) a.mass.distribution = Math.min(1, Math.max(a.mass.distribution, (desired / available - B.mass.coreMin) / (B.mass.coreMax - B.mass.coreMin)));
      a.targetDistribution = Math.max(a.targetDistribution, a.mass.distribution);
      a.stability.trauma = 0; a.stability.phase = 'stable'; a.stability.unstableRemainingMs = 0;
    }
  } else { a.stability.trauma = Math.max(0, a.stability.trauma - B.stability.traumaDecay * dt); checkStability(a); }
}
export function timeout(a: Actor, b: Actor): number | null {
  const rank = (x: Actor) => x.stability.phase === 'collapsed' ? 0 : x.stability.phase === 'unstable' ? 1 : 2;
  if (rank(a) !== rank(b)) return rank(a) > rank(b) ? a.id : b.id;
  const diff = protectedMass(a) - protectedMass(b);
  if (Math.abs(diff) > .001) return diff > 0 ? a.id : b.id;
  const mass = a.mass.combatMass - b.mass.combatMass;
  return Math.abs(mass) > .001 ? mass > 0 ? a.id : b.id : null;
}
