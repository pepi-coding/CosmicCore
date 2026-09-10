import { B } from '../config/balance';
import { clamp, type MassState } from './types';
export function createMass(maximumMass: number, combatMass = maximumMass): MassState { const m = { maximumMass, combatMass, coreMass: 0, fieldMass: 0, orbitingStoredMass: 0, unbankedMass: 0, distribution: .5 }; distribute(m); return m; }
export function distribute(m: MassState): void {
  // Captured objects are independent ammunition; they do not become a third mass partition.
  m.orbitingStoredMass = Math.max(0, m.orbitingStoredMass);
  const available = Math.max(0, m.combatMass);
  m.coreMass = available * (B.mass.coreMin + (B.mass.coreMax - B.mass.coreMin) * m.distribution);
  m.fieldMass = available - m.coreMass;
}
export function redistribute(m: MassState, target: number, dt: number, rate = 1): void {
  m.distribution = clamp(m.distribution + clamp(target - m.distribution, -dt * rate / B.mass.transition, dt * rate / B.mass.transition), 0, 1);
  distribute(m);
}
export function eject(m: MassState, amount: number, core: boolean): number {
  const available = core ? m.coreMass : m.fieldMass;
  const taken = clamp(amount, 0, available);
  m.combatMass -= taken;
  if (core) m.coreMass -= taken; else m.fieldMass -= taken;
  return taken;
}
export function recover(m: MassState, amount: number, cap: number, stolen: boolean, fresh: boolean): number {
  const accepted = clamp(amount, 0, Math.max(0, cap - m.combatMass));
  m.combatMass += accepted;
  if (fresh || stolen) m.unbankedMass += accepted * (stolen ? B.mass.stolenProgress : 1);
  distribute(m); return accepted;
}
