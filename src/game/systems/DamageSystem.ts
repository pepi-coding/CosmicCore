import { B } from '../config/balance';
import { eject } from './MassSystem';
import { checkStability } from './StabilitySystem';
import type { Actor } from './types';
export function damage(a: Actor, amount: number, direct: boolean): number {
  if (!a.alive) return 0;
  const actual = amount * (1 - a.mass.distribution * B.combat.ejectionResistance);
  const removed = eject(a.mass, actual, direct);
  if (direct) a.stability.trauma += actual;
  checkStability(a, direct); return removed;
}
