import { B } from '../config/balance';
import { C } from '../config/combatV4';
import { release } from './OrbitSystem';
import { stopChannel, tickChannel } from './ChannelSystem';
import { tickMelee, attackSpec } from './MeleeSystem';
import { unit, type Actions, type Actor, type Debris } from './types';
import type { Buttons } from '../input/ActionState';
export interface AbilityWorld { debris: Debris[] }
export function abilities(a: Actor, input: Actions, buttons: Buttons, world: AbilityWorld, dt: number): void {
  const direction = unit(input.aim);
  if (a.melee.phase === 'idle') a.angle = Math.atan2(direction.y, direction.x);
  const m = a.melee;
  const canChannel = m.phase === 'idle' || m.phase === 'recovery' && m.index < 2 && m.hits.length > 0 && m.elapsed >= attackSpec(a).windup + attackSpec(a).active + attackSpec(a).recovery * C.melee.channelCancelAfter;
  if (canChannel && (buttons.pull.pressed || buttons.pulse.pressed)) m.phase = 'idle';
  tickChannel(a.channel, buttons, dt, a.stagger > 0 || !canChannel, a.modifiers.fluxEfficiency);
  tickMelee(a, buttons.primary, dt, !!a.channel.mode || a.stagger > 0 || a.channel.overload > 0);
  if (buttons.impulse.pressed && a.cooldown.impulse <= 0 && (m.phase === 'idle' || (m.index < 2 && m.phase === 'recovery'))) {
    stopChannel(a.channel); a.vx += direction.x * B.movement.impulse; a.vy += direction.y * B.movement.impulse; a.cooldown.impulse = B.abilities.impulse;
  }
  // Explicit orbit ammunition only: there is no fallback bullet.
  if (buttons.orbit.pressed && a.cooldown.orbit <= 0 && !a.channel.mode && m.phase === 'idle') {
    const d = world.debris.find(d => d.owner === a.id);
    if (d) {
      release(a, d); d.damage = d.mass * B.combat.objectDamage * (1 + a.mass.distribution * B.combat.compressionBonus);
      d.x = a.x + direction.x * (B.combat.coreRadius + B.combat.launchOffset); d.y = a.y + direction.y * (B.combat.coreRadius + B.combat.launchOffset);
      d.vx = a.vx + direction.x * B.combat.projectileSpeed; d.vy = a.vy + direction.y * B.combat.projectileSpeed;
      d.projectile = true; d.launchOwner = a.id; d.life = B.combat.projectileLife; a.cooldown.orbit = C.orbitLaunchCooldown;
    }
  }
}
