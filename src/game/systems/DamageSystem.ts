import type { Actor } from './types';
export function damage(a: Actor, amount: number, direct: boolean): number {
  if (!a.alive) return 0;
  const vulnerability = (direct ? 1.15 : 1) * (a.guardBroken > 0 ? 1.2 : 1);
  const actual = Math.min(a.integrity.current, Math.max(0, amount) * vulnerability * 100 / (100 + a.mass.coreMass));
  a.integrity.current -= actual;
  if (a.integrity.current <= 0) a.alive = false;
  return actual;
}
