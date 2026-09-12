import { emptyMaterials, materialIds, moonBalance, type Materials } from '../content/shatteredMoon';
import type { PlayerProfile } from '../persistence/Profile';
import type { MoonSystem } from './MoonSystem';
export function grantMoonRewards(profile: PlayerProfile, run: MoonSystem) {
  if (!run.sim.result?.won || run.state !== 'exit') return null;
  const w = moonBalance.grades;
  const score = w.completion + w.time * Math.max(0, 1 - run.sim.time / 900) + w.integrity * run.sim.player.integrity.current / 100 + w.physics * Math.min(1, run.physics / 8) + w.parts * Math.min(1, run.optionalParts / 2) + (run.cache ? w.cache : 0);
  const grade = score >= w.s ? 'S' : score >= w.a ? 'A' : score >= w.b ? 'B' : 'C';
  const firstClear = !profile.firstClears.includes('shattered-moon:normal');
  const base = { ...run.materials }, performance = emptyMaterials(), physics = emptyMaterials(), first = emptyMaterials();
  for (const id of materialIds) if (id !== 'Evolution Core') { performance[id] = { C: 0, B: 1, A: 3, S: 5 }[grade]; physics[id] = Math.min(10, Math.floor(run.physics / 2) + run.multikills); }
  first['Evolution Core'] = firstClear ? 1 : 0;
  const rewardBreakdown: Record<string, Materials> = { 'Base rewards': base, 'Performance bonuses': performance, 'Physics Execution bonuses': physics, 'First-clear rewards': first };
  for (const group of Object.values(rewardBreakdown)) for (const id of materialIds) profile.materials[id] += group[id];
  if (firstClear) profile.firstClears.push('shattered-moon:normal');
  // A run may only be settled once, including repeated scene callbacks.
  run.state = 'locked';
  return { grade, firstClear, dungeonId: 'shattered-moon', rewardBreakdown };
}
