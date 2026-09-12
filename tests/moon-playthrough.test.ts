import { expect,it } from 'vitest';
import { Simulation } from '../src/game/systems/Simulation';
import { moonController } from './moon-controller';
it('clears The Shattered Moon through player movement, melee and held forces',()=>{
  const sim=new Simulation('pve',100,147,{dungeonId:'shattered-moon'}),m=sim.moon!,next=moonController(sim);
  const arrivals:number[]=[0];let room=0;const phases:number[]=[];
  for(let tick=0;tick<60*1200&&!sim.result;tick++){sim.step(next());const phase=m.boss&&m.states.get(m.boss.id)!.phase;if(phase!==undefined&&phases[phase]===undefined)phases[phase]=sim.time;if(sim.room!==room){room=sim.room;arrivals.push(sim.time);}}
  console.log('ACTION CLEAR',JSON.stringify({seconds:sim.time,integrity:sim.player.integrity.current,physics:m.physics,parts:m.brokenParts,bossHP:m.boss?.integrity.current,overload:m.boss&&m.states.get(m.boss.id)?.overload,arrivals,phases,bossSeconds:sim.time-arrivals[4]}));
  expect(sim.result?.won,JSON.stringify({result:sim.result,room:sim.room,time:sim.time,player:sim.player.integrity.current})).toBe(true);
  expect(sim.room).toBe(4);expect(m.physics).toBeGreaterThan(0);expect(m.brokenParts).toBeGreaterThanOrEqual(6);
});
