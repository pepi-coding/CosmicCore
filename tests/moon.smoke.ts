import { test, expect } from '@playwright/test';
test('20-Mite live browser performance sample',async({page},info)=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await page.locator('[data-mode="pve"]').click();await page.locator('#enter-moon').click();await expect(page.locator('#mission-note')).toContainText('Impact Nursery');
  const metrics=await page.evaluate(async()=>{const {game}=await import(/* @vite-ignore */ '/src/main.ts' as string);const scene=game.scene.getScene('PvEMissionScene');const intervals:number[]=[];let last=performance.now();for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();intervals.push(now-last);last=now;}intervals.sort((a,b)=>a-b);return {averageFPS:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),p95FrameMs:intervals[Math.floor(intervals.length*.95)],liveMites:scene.sim.actors.filter((a:any)=>a.alive&&a.kind==='meteor-mite').length,simulationSeconds:scene.sim.time};});
  console.log('MOON BROWSER PERFORMANCE',JSON.stringify(metrics));await info.attach('moon-performance.json',{body:JSON.stringify(metrics,null,2),contentType:'application/json'});expect(metrics.liveMites).toBe(20);expect(metrics.simulationSeconds).toBeGreaterThan(1);
});
for (const viewport of [{width:1440,height:900},{width:844,height:390}]) {
  test(`Shattered Moon five-room scene, results and persisted rewards ${viewport.width}`,async({page})=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize(viewport);await page.goto('/');
    await page.locator('[data-mode="pve"]').click();await page.locator('#enter-moon').click();await expect(page.locator('#mission-note')).toContainText('Impact Nursery');
    await page.screenshot({path:`test-results/moon-${viewport.width}-room1.png`});
    await page.evaluate(async()=>{const {game}=await import(/* @vite-ignore */ '/src/main.ts' as string);const {moonController}=await import(/* @vite-ignore */ '/tests/moon-controller.ts' as string);const scene=game.scene.getScene('PvEMissionScene');scene.paused=true;scene.playtestNext=moonController(scene.sim);});
    // Run the same fixed-tick action controller as the unit playthrough in the actual scene.
    // No enemy HP, parts, boss phase, player Integrity or reward values are edited.
    for(let room=0;room<5;room++) {
      await page.evaluate(async(room)=>{
        const {game}=await import(/* @vite-ignore */ '/src/main.ts' as string);
        const scene=game.scene.getScene('PvEMissionScene'),sim=scene.sim;
        if(sim.room!==room)throw new Error('Incorrect room '+sim.room);
        for(let tick=0;tick<60*1200&&!sim.roomCleared&&!sim.result;tick++)sim.step(scene.playtestNext());
        if(!sim.roomCleared||sim.result&&!sim.result.won)throw new Error('Playthrough failed '+JSON.stringify(sim.result));
        scene.updateHUD();scene.renderWorld();
      },room);
      await expect(page.locator('#mission-note')).toContainText(['Impact Nursery','The Broken Orbit','Gravity Lock','Entropy Crossing','Lunar Devourer'][room]);
      await page.screenshot({path:`test-results/moon-${viewport.width}-room${room+1}-clear.png`});
      await page.evaluate(async(room)=>{const {game}=await import(/* @vite-ignore */ '/src/main.ts' as string);const scene=game.scene.getScene('PvEMissionScene'),sim=scene.sim;for(let i=0;i<1800&&!sim.result&&sim.room===room;i++)sim.step(scene.playtestNext());scene.updateHUD();if(sim.result)scene.complete();},room);
    }
    await expect(page.getByRole('heading',{name:'Core intact.'})).toBeVisible();await expect(page.locator('.dungeon-rewards')).toContainText('Evolution Core +1');await expect(page.locator('.dungeon-rewards')).toContainText('Physics Execution bonuses');
    await page.screenshot({path:`test-results/moon-${viewport.width}-results.png`});await page.reload();
    const profile=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmic-core.profile.v1')!));expect(profile.schemaVersion).toBe(3);expect(profile.materials['Evolution Core']).toBe(1);expect(profile.firstClears).toContain('shattered-moon:normal');expect(errors).toEqual([]);
  });
}
