import Phaser from 'phaser';
import metadata from '../../../public/assets/vessel/metadata.json';
import { C } from '../config/combatV4';
import { attackSpec } from '../systems/MeleeSystem';
import { manifestationFor } from '../content/manifestations';
import { coreExposed } from '../systems/IntegritySystem';
import type { Actor } from '../systems/types';
export type VesselState = 'idle' | 'move' | 'melee1' | 'melee2' | 'heavy' | 'pull' | 'pulse' | 'hit' | 'unstable' | 'collapse' | 'victory';
export function vesselState(a: Actor, victory = false): VesselState {
  if (!a.alive) return 'collapse'; if (victory) return 'victory'; if (a.hitTime > 0) return 'hit';
  if (coreExposed(a) || a.channel.overload > 0) return 'unstable';
  if (a.channel.mode) return a.channel.mode;
  if (a.melee.phase !== 'idle') return (['melee1', 'melee2', 'heavy'] as const)[a.melee.index];
  return Math.hypot(a.vx, a.vy) > 12 ? 'move' : 'idle';
}
export function facingFor(angle: number): string { return Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? Math.cos(angle) > 0 ? 'right' : 'left' : Math.sin(angle) > 0 ? 'down' : 'up'; }
export class VesselRig {
  sprites = new Map<number, Phaser.GameObjects.Sprite>();
  constructor(private scene: Phaser.Scene) {}
  static preload(scene: Phaser.Scene): void { for (const facing of metadata.facings) scene.load.spritesheet(`vessel-${facing}`, `/assets/vessel/${facing}.png`, { frameWidth: metadata.frameWidth, frameHeight: metadata.frameHeight }); }
  render(a: Actor, time: number, victory: boolean): void {
    let sprite = this.sprites.get(a.id);
    if (!sprite) { sprite = this.scene.add.sprite(a.x, a.y, 'vessel-down'); sprite.setOrigin(metadata.anchor.x, metadata.anchor.y).setScale(1.25); this.sprites.set(a.id, sprite); }
    const state = vesselState(a, victory), facing = facingFor(a.melee.phase === 'idle' ? a.angle : a.melee.angle);
    let frame = Math.floor(time * metadata.fps[state]) % metadata.frames;
    if (a.melee.phase !== 'idle' && state !== 'hit' && state !== 'unstable') { const spec = attackSpec(a); frame = Math.min(5, Math.floor(a.melee.elapsed / (spec.windup + spec.active + spec.recovery) * 6)); }
    if (state === 'collapse') frame = Math.min(5, Math.floor((time - a.deathTime) / C.feedback.collapseDuration * 6));
    sprite.setTexture(`vessel-${facing}`, metadata.states.indexOf(state) * metadata.frames + frame);
    sprite.setPosition(a.x, a.y).setDepth(10 + a.y / 10000);
    sprite.setTint(a.kind === 'player' ? manifestationFor(a.manifestationId).color : a.kind === 'guardian' ? 0xffca8a : 0xf59bac);
    const pull = a.channel.mode === 'pull', pulse = a.channel.mode === 'pulse';
    sprite.setScale(1.25 * (pull ? 1.05 : 1), 1.25 * (pull ? .9 : 1));
    if (a.hitTime > 0) sprite.setTintFill(0xffffff);
    if (a.channel.overload > 0) sprite.setAlpha(.45 + Math.sin(time * 35) * .25);
    else sprite.setAlpha(!a.alive && time - a.deathTime > C.feedback.collapseDuration ? 0 : pulse ? .8 : 1);
  }
  prune(ids: Set<number>): void { for (const [id, sprite] of this.sprites) if (!ids.has(id)) { sprite.destroy(); this.sprites.delete(id); } }
  destroy(): void { for (const sprite of this.sprites.values()) sprite.destroy(); this.sprites.clear(); }
}
