import type Phaser from 'phaser';
import { enemies, bossPhases } from '../content/shatteredMoon';
import type { MoonSystem } from '../systems/MoonSystem';
export function renderMoon(g: Phaser.GameObjects.Graphics, moon: MoonSystem) {
  const sim = moon.sim;
  for (const trail of moon.trails) { g.fillStyle(0x8edbff, trail.life*.15);g.fillCircle(trail.x,trail.y,24); }
  if (moon.boss && moon.states.get(moon.boss.id)!.phase === 2) { const half=Math.max(160,300-(sim.time-moon.roomStart)*.35),c=moon.room.center;g.lineStyle(6,0xff668e,.8);g.strokeRect(c.x-half,c.y-half,half*2,half*2); }
  for (const patch of moon.patches) if (sim.actors.find(a => a.id === patch.owner)?.alive) { g.fillStyle(0xa254de, .2); g.fillCircle(patch.x, patch.y, patch.suppressed > 0 ? patch.radius / 2 : patch.radius); g.lineStyle(2, 0xdb9aff, .7); g.strokeCircle(patch.x, patch.y, patch.radius); }
  for (const o of moon.objects) { g.fillStyle(o.kind === 'pillar' ? 0x728192 : 0xc9d9e8); g.fillRoundedRect(o.x - o.radius, o.y - o.radius, o.radius * 2, o.radius * 2, 8); if (o.launched) { g.lineStyle(3, 0xffcc83); g.lineBetween(o.x,o.y,o.x-o.vx*.08,o.y-o.vy*.08); } }
  for (const e of moon.explosions) { g.lineStyle(4, 0xff727b, .8); g.strokeCircle(e.x, e.y, 90); g.fillStyle(0xff727b,.15);g.fillCircle(e.x,e.y,90*(1-e.timer/1.4)); }
  for (const a of sim.actors) {
    const s = moon.states.get(a.id); if (!s) continue; const def = enemies[s.id];
    if (!a.alive) {const t=(sim.time-a.deathTime)/.8;if(t<1){g.lineStyle(4,def.color,1-t);g.strokeCircle(a.x,a.y,def.radius+t*60);}continue;}
    if (s.id !== 'lunar-devourer') {const small=s.id==='meteor-mite',w=small?30:88,y=small?-27:-51;g.fillStyle(0x090e1b,.9);g.fillRect(a.x-w/2,a.y+y,w,6);g.fillStyle(0x9af3c8);g.fillRect(a.x-w/2,a.y+y,w*a.integrity.current/a.integrity.maximum,4);}
    if (s.elite) {g.lineStyle(3,s.elite==='Dense'?0xffd27f:0xff7cad);g.strokeCircle(a.x,a.y,enemies[s.id].radius+7);}
    const pulse = 1 + Math.sin(sim.time * 5 + a.id) * .06;
    g.fillStyle(a.hitTime > 0 ? 0xffffff : def.color, s.id === 'entropy-wisp' && s.materialized <= 0 ? .3 : 1);
    if (s.id === 'meteor-mite') g.fillTriangle(a.x-15,a.y+10,a.x+15,a.y+10,a.x,a.y-18*pulse);
    if (s.id === 'comet-hound') { g.fillEllipse(a.x,a.y,52,26); g.lineStyle(5,def.color,.7);g.lineBetween(a.x,a.y,a.x-a.vx*.15,a.y-a.vy*.15); for (const x of [-18,18]) for (const y of [-18,18]) g.fillCircle(a.x+x,a.y+y,6); }
    if (s.id === 'graviton-crab') {g.fillEllipse(a.x,a.y,85,60);g.fillCircle(a.x-55,a.y-25,17);g.fillCircle(a.x+55,a.y-25,17);if(s.state!=='stagger'){g.fillStyle(0xc6a6ff,.14);g.fillTriangle(a.x,a.y,a.x+Math.cos(a.angle-.2)*230,a.y+Math.sin(a.angle-.2)*230,a.x+Math.cos(a.angle+.2)*230,a.y+Math.sin(a.angle+.2)*230);}}
    if (s.id === 'entropy-wisp') {g.fillCircle(a.x,a.y,22*pulse);g.lineStyle(3,def.color,.8);g.strokeCircle(a.x,a.y,32);}
    if (s.id === 'lunar-devourer') { for(let i=4;i>=0;i--){g.fillStyle(def.color,.4+i*.1);g.fillCircle(a.x-i*18,a.y+Math.sin(sim.time+i)*12,55-i*5);}g.fillStyle(s.exposure>0?0xffa8ad:0x110c23);g.fillCircle(a.x+15,a.y,25); }
    if (s.state === 'attached') {g.lineStyle(2,0xff8d9c);g.lineBetween(a.x,a.y,sim.player.x,sim.player.y);}
    if (s.state === 'telegraph') {g.lineStyle(5,0xff727b,.8);g.lineBetween(a.x,a.y,a.x+s.direction.x*260,a.y+s.direction.y*260);g.strokeCircle(a.x+s.direction.x*80,a.y+s.direction.y*80,s.id==='graviton-crab'?65:25);}
    if (s.state === 'collapse') {g.lineStyle(8,0xffffff,.8);g.strokeCircle(a.x,a.y,65+(2.5-s.timer)*40);}
    for (const part of s.parts) {
      if (s.id === 'lunar-devourer' && (s.phase===0?!part.id.includes('armor'):s.phase===1?!part.id.includes('organ'):true)) continue;
      const at=moon.partPosition(a,part);g.lineStyle(2,part.broken?0x5a5263:part.exposed>0?0xff99ee:0xffd59b);g.strokeCircle(at.x,at.y,part.radius);if(!part.broken){g.fillStyle(part.loosened?0x9fffff:0xc6a977,.7);g.fillCircle(at.x,at.y,part.radius*.65);g.fillStyle(0xffffff);g.fillRect(at.x-20,at.y-29,40*part.current/part.hp,3);}
      if(part.id.includes('organ')&&!part.broken){g.fillStyle(0xc395ff);g.fillRect(at.x-20,at.y+27,40*Math.min(1,part.exposed>0?part.exposed/8:part.stabilization/1.8),4);}
    }
    if (s.massClass === 'Heavy' || s.massClass === 'Anchored' || s.id === 'entropy-wisp') {g.fillStyle(0x172439);g.fillRect(a.x-44,a.y-74,88,5);g.fillStyle(0xb695ff);g.fillRect(a.x-44,a.y-74,88*(s.id==='entropy-wisp'?s.materialized>0?s.materialized/8:s.stabilization:s.displacement/100),5);}
  }
}
export function moonBossLabel(moon: MoonSystem): string {
  const a=moon.boss;if(!a)return '';const s=moon.states.get(a.id)!;
  return `LUNAR DEVOURER · ${Math.ceil(a.integrity.current)}/${a.integrity.maximum} HP · ${bossPhases[s.phase].name} · ${s.phase<2?s.parts.filter(p=>p.broken).length+' parts broken':s.exposure>0?'CORE EXPOSED '+s.exposure.toFixed(1)+'s':'Overload '+Math.floor(s.overload)+'%'} `;
}
