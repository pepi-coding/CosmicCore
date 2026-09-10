export const C = {
  flux: { max: 100, pullDrain: 10, pulseDrain: 13, gentle: .45, accelerationAfter: 2, acceleration: .55, regen: 22, regenDelay: .8, overload: 1.6, redistributionRate: .35, low: 25, meleeRestore: 6 },
  channel: { charge: .8, initial: .2, pullForce: 700, pulseForce: 1050, densityBonus: 1.4, movement: .5, releaseDecay: .22, interrupt: .65, resistanceMin: .2, resistanceMax: 1.4, maxAcceleration: 2400, bossBreakTime: .65, captureRadius: 75, captureDamping: 7, breakVelocityRetention: .15 },
  melee: {
    buffer: .23, chainTimeout: .55, reachExpanded: 100, reachCompressed: 74, arcExpansion: .18, densityDamage: .45,
    momentumSpeed: 440, momentumCap: .25, advance: 95, knockback: 140, stagger: .12, heavyStagger: .7, massReference: 100, massScaleMin: .35, massScaleMax: 1.4,
    hitStop: .045, heavyHitStop: .085, heavyShake: .004, heavyShakeMs: 100, missRecovery: .4, channelCancelAfter: .7,
    attacks: [
      { windup: .1, active: .1, recovery: .16, damage: 9, arc: 1.25, reach: 1, force: .65, cancel: .78 },
      { windup: .16, active: .12, recovery: .2, damage: 12, arc: 1.45, reach: 1.1, force: .9, cancel: .8 },
      { windup: .3, active: .14, recovery: .4, damage: 23, arc: 1.65, reach: 1.08, force: 2, cancel: 1 },
    ],
  },
  bot: { meleeRange: 85, pursuitDistance: 62, period: 5, pullDuration: 1.1, pulseDuration: .8, attackDuration: 1.7, bossMass: 110, enemyAttackPeriod: 1.9, enemyAttackDuration: .28 },
  orbitLaunchCooldown: 1.2,
  feedback: { hitDuration: .18, collapseDuration: .8, victoryDuration: 1, masterVolume: .13 },
} as const;
