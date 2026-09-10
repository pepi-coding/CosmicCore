export const B = {
  step: 1 / 60, maxSteps: 6, arena: 2200, seed: 147,
  mass: { initial: 100, minimum: 20, coreMin: .28, coreMax: 1, transition: 1.25, cap: 1.3, stolenProgress: .05, debris: 2.5, fragmentLife: 18 },
  movement: { thrust: 650, inertia: .58, drag: 2.8, speed: 245, impulse: 440, overspeedDecay: 1, staggerMultiplier: .3, boundary: 30 },
  gravity: { g: 2200, minDistance: 38, maxForce: 1400, radiusMin: 100, radiusMax: 300, density: 2.4, entityScale: .17 },
  orbit: { minSlots: 2, maxSlots: 8, radius: .52, minDistance: 30, maxSpeed: 600, captureTime: .65, angularSpeed: 1.4, minTangent: 8 },
  combat: { projectileSpeed: 600, projectileLife: 2.2, shardMass: 1, shardDamage: 5, objectDamage: 4, velocityScale: 500, compressionBonus: .55, coreRadius: 18, fieldHitRadius: .6, ejectionResistance: .45, contactDamage: 8, contactCooldown: 1, stagger: .5, hitPadding: 7, glancingMultiplier: .4, minVelocityDamage: .5, impactRetention: .3, contactPadding: 4, contactPush: 30, launchOffset: 8, fragmentOffset: 48, fragmentSpeed: 190 },
  abilities: { cast: .32, impulse: 3.5, pulse: 6, surge: 9, pulseCost: 4, pulseForce: 350, pulseDamage: 3, surgeDuration: 1.3, surgeRate: 3, recoveryDuration: 2, recoveryRate: .4 },
  progression: { deathPercent: .01, deathCap: 10, bankShare: 1 },
  pve: { safeMass: .9, waveOneEnd: 65, waveTwoEnd: 140, hazardEnd: 220, extractionAfter: 300, deadline: 480, reward: 12, guardianReward: 50, maxEnemies: 7, leechDrain: .8, entropyDecay: 4, hazardDamage: 4, wellForce: 110, currentForce: 100, spawnDistance: 550, spawnPadding: 100, leechInner: .55, wispRelease: .35, entropyRelease: .5 },
  bot: { actionInterval: 1.1, aimError: .1, changeDistribution: 6, preferredDistance: 240, thrust: .75, rangeSlack: 25, lead: .2, aimFrequency: 2, castRange: 650, evadeDistance: 80, surgeRange: 200, pulseRange: .7, dense: .8, wide: .15, drifterDistribution: .85, leechDistribution: .1, leechRadius: .85, guardianNear: 100, guardianFar: 280, startDistance: 380 },
  enemy: { drifterMass: 32, orbiterMass: 44, leechMass: 30, wispMass: 36, guardianMass: 145, speed: .65, guardianCycle: 7 },
  pvp: { duration: 240, suddenDeathDrain: 3, suddenDeathTrauma: 2 },
  debris: { driftSpeed: 55, initialNearCount: 12, nearMin: 90, nearSpread: 180, farMin: 300, farSpread: 650, boundary: 5 },
  visuals: { stars: 200, debrisCount: 50, hudInterval: .1, zoomMin: .5, zoomMax: 1.45 },
} as const;

export function validateBalance(config: typeof B = B): void {
  const walk = (value: object): void => { for (const n of Object.values(value)) { if (typeof n === 'object') walk(n); else if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) throw new Error('Balance values must be finite and positive'); } };
  walk(config);
  if (config.mass.coreMin >= config.mass.coreMax || config.mass.coreMax > 1 || config.mass.cap < 1 || config.progression.deathPercent > 1 || config.progression.bankShare > 1) throw new Error('Invalid mass ratios');
}
