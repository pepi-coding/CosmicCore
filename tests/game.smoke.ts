import { test, expect } from '@playwright/test';
test('desktop menu, live redistribution, pause, reset, results and local save', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 }); await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Make space. Become mass.' })).toBeVisible();
  await page.screenshot({ path: 'test-results/menu.png' });
  await page.locator('[data-mode="training"]').click(); await expect(page.locator('#integrity')).toContainText('CORE INTEGRITY 100 / 100');
  await page.getByRole('button', { name: 'Telemetry' }).click();
  await page.keyboard.down('e'); await page.waitForTimeout(1600); await page.keyboard.up('e');
  await expect(page.locator('#debug-panel')).toContainText('distribution 1.000');
  await page.keyboard.down('q'); await page.waitForTimeout(1600); await page.keyboard.up('q');
  await expect(page.locator('#debug-panel')).toContainText('distribution 0.000');
  await page.screenshot({ path: 'test-results/training-desktop.png' });
  await page.getByRole('button', { name: 'Pause', exact: false }).click(); await expect(page.getByRole('heading', { name: 'Orbit paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: false }).click(); await page.getByRole('button', { name: 'Reset training' }).click();
  await page.locator('#exit').click(); await page.locator('[data-mode="pvp"]').click(); await page.locator('#exit').click();
  await expect(page.getByRole('heading', { name: 'Into the dust.' })).toBeVisible();
  await page.locator('#menu').click(); await page.reload(); await expect(page.locator('.profile strong')).toContainText('99.0');
  expect(errors).toEqual([]);
});
test('mobile landscape touch controls and portrait guard', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); await page.goto('/'); await page.locator('[data-mode="training"]').tap();
  await expect(page.locator('[data-stick="move"]')).toBeVisible(); await expect(page.locator('[data-action="pull"]')).toBeVisible();
  const button = page.locator('[data-action="pull"]'), box = await button.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2); await page.mouse.down(); await page.waitForTimeout(1400); await page.mouse.up();
  await page.screenshot({ path: 'test-results/training-mobile.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('#rotate')).toBeVisible(); await context.close();
});
test('held channels, humanoid animation, dungeon selection and free collection flow', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('cosmic-core.profile.v1', JSON.stringify({schemaVersion:2, maximumMass:100, summonCurrency:3, ownedManifestations:['vessel']})));
  await page.setViewportSize({width:1440,height:900}); await page.goto('/');
  await page.locator('[data-mode="training"]').click();
  await page.keyboard.down('e'); await expect(page.locator('#channel-state')).toContainText('MAXIMUM');
  await page.screenshot({path:'test-results/m4-pull-desktop.png'});
  await page.keyboard.up('e'); await expect(page.locator('#channel-state')).toContainText('FLUX READY');
  await page.keyboard.down('q'); await expect(page.locator('#channel-state')).toContainText('PULSE'); await page.waitForTimeout(250);
  await page.screenshot({path:'test-results/m4-pulse-desktop.png'});
  await page.keyboard.up('q'); await page.locator('#exit').click();
  await page.locator('[data-mode="pve"]').click(); await expect(page.locator('.dungeon-node')).toHaveCount(3); await page.screenshot({path:'test-results/m4-dungeon-map.png'});
  await page.locator('#enter-dungeon').click(); await expect(page.locator('#mission-note')).toContainText('The Approach');
  await page.screenshot({path:'test-results/m4-dungeon-room.png'}); await page.locator('#exit').click(); await page.locator('#menu').click();
  await page.locator('#collection').click(); await expect(page.locator('.manifestation')).toHaveCount(3);
  for(let i=0;i<3;i++) {await page.locator('#summon').click();await expect(page.locator('#summon-result')).toContainText(/Manifestation unlocked|Duplicate converted/);}
  await expect(page.locator('#summon')).toBeDisabled(); await page.locator('[data-equip]:enabled').first().click(); await expect(page.locator('#summon-result')).toContainText('equipped');
  await page.screenshot({path:'test-results/m4-collection.png'});expect(errors).toEqual([]);
});
test('mobile holds a channel while moving and releases independently', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.locator('[data-mode="training"]').tap();const cdp=await context.newCDPSession(page);
  const move=(await page.locator('[data-stick="move"]').boundingBox())!,pull=(await page.locator('[data-action="pull"]').boundingBox())!;
  const touches=[{id:1,x:move.x+move.width/2,y:move.y+move.height/2},{id:2,x:pull.x+pull.width/2,y:pull.y+pull.height/2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});touches[0].x+=28;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touches});
  await expect(page.locator('#channel-state')).toContainText('MAXIMUM');await page.screenshot({path:'test-results/m4-pull-mobile.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[touches[1]]});await expect(page.locator('#channel-state')).toContainText('FLUX READY');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(errors).toEqual([]);await context.close();
});

test('melee visibly lowers rival integrity and keeps the new HUD available', async ({ page }) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  await page.locator('[data-mode="training"]').click();
  await expect(page.locator('[data-action="compress"]')).toHaveCount(0);
  await expect(page.locator('#melee-chain i')).toHaveCount(3);
  await page.mouse.move(1100,450);await page.keyboard.down('d');await page.mouse.down();
  await page.waitForTimeout(900);await page.keyboard.up('d');
  await expect(page.locator('#rival')).toContainText(/BOT \/ [1-9][0-9]? HP/,{timeout:10000});
  await page.keyboard.up('d');await page.screenshot({path:'test-results/core-integrity-combat.png'});
  await page.mouse.up();expect(errors).toEqual([]);
});
