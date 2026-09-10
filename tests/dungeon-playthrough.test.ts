import { expect, it } from 'vitest';
import { Simulation } from '../src/game/systems/Simulation';
import { dungeon } from '../src/game/content/dungeon';
import { distance, unit } from '../src/game/systems/types';
import { B } from '../src/game/config/balance';
it('completes a manual-action dungeon using melee and boss channel counterplay', () => {
  const sim = new Simulation('pve',100);
  let channelTicks=0, totalHits=0;
  for(let i=0;i<60*600 && !sim.result;i++) {
    const p=sim.player,enemy=sim.actors.filter(a=>a!==p&&a.alive).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    const target=enemy ?? dungeon.rooms[sim.room].gate,delta={x:target.x-p.x,y:target.y-p.y},range=distance(p,target);
    const retreat=p.stability.phase==='unstable';
    const pull=!retreat&&!!enemy&&enemy.kind==='guardian'&&enemy.guardBroken<=0&&range<p.radius*.9&&p.channel.flux>12;
    if(pull)channelTicks++;
    const n=unit(delta), movement=retreat?{x:-n.x,y:-n.y}:range>55?n:{x:0,y:0};
    sim.step({move:movement,aim:retreat?movement:delta,distribution:retreat?1:pull?.2:.75,cast:!retreat&&!!enemy&&range<95&&!pull,impulse:retreat,pulse:retreat&&range<p.radius&&p.channel.flux>20,surge:pull});
    totalHits=p.meleeHits;
  }
  process.stdout.write(JSON.stringify({result:sim.result,room:sim.room,mass:sim.player.mass.combatMass,meleeHits:totalHits,channelSeconds:channelTicks*B.step})+'\n');
  expect(sim.result?.won).toBe(true);expect(sim.room).toBe(2);expect(totalHits).toBeGreaterThan(0);expect(channelTicks).toBeGreaterThan(0);
});
