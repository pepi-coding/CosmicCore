# Milestone 5 implementation and playtest report

Date: 2026-09-12. Release: 0.5.0.

The Shattered Moon is playable from Dungeon Select, alongside the unchanged Silent Orbit route. This report distinguishes automated functional verification from human acceptance and hardware performance validation.

## Initial system audit

- `Simulation.ts` already supplied a seeded 60 Hz model, actor/debris ownership, force application, melee resolution, collision handling and run settlement hooks.
- `MassSystem`, `GravitySystem`, `ChannelSystem`, `MeleeSystem`, `AbilitySystem`, `DamageSystem` and `IntegritySystem` supplied the existing player rules. Player mass partition formulas, channel force formulas, Flux and Integrity damage formulas were retained.
- `content/dungeon.ts` authored three spatially separate Silent Orbit rooms. Its transitions restored all Integrity, and its Guardian used a single timed channel break. Those legacy rules remain confined to that dungeon.
- `EconomySystem` granted generic upgrade material and test summon currency. `Profile.ts` persisted schema 2 under `cosmic-core.profile.v1`, including schema 1 migration. Moon materials required a separate wallet and first-clear identity.
- `Scenes.ts` and `VesselRig.ts` rendered all previous enemies as humanoids. Moon enemies now have geometric fauna/anomaly/Titan silhouettes without humanoid fields or vessel sprites.

## Implemented scope

- Five distinct room positions, colors, gates, encounter states, a safe arrival interval, persistent Integrity and replenished Flux. Only the active room retains enemies and encounter objects.
- Meteor Mite swarm, limited attachments, increased inertia, short Pull orbit, overholding Pull attachment risk, compressed melee removal and Pulse launching.
- Hound circling, committed telegraphed charge, Heavy charge state, directional force redirection, acceleration-slowing trails, frontal charge resistance and heavy melee interruption.
- Crab floor anchors and loose plates with independent hit regions, break state, ownership and drop opportunities. Anchors gate Heavy displacement; filling the meter exposes the underside for increased melee damage.
- Wisp intangibility, visible stabilization, temporary materialization, signaled teleport destinations, patch suppression, accelerated fragment decay, orbit disruption and Flux pressure/restoration.
- Devourer armor hit by launched boulders, Pull-exposed organs, mouth suction, fragment overload, shrinking safe bounds, protected melee windows and a delayed Collapse. Missed boulders expire and respawn so safe access cannot be exhausted.
- Wall, enemy and launched-object Physics Executions with cause labels. Dense and Unstable modifiers are authored only after tutorial introductions.
- Seeded drops, optional cache, C/B/A/S grade, itemized base/performance/physics/first-clear rewards and a once-only Evolution Core. Failed runs do not settle the material wallet.
- Schema 3 migration preserves existing mass, statistics, evolution, collection and economy fields. Materials are independent of Maximum Mass and summon currency.
- Typed enemy/part/attack/drop/modifier/room/boss definitions and encounter objective evaluators for all nine requested encounter categories. Only the five requested rooms are authored.

## Balance defaults

| Setting | Default |
|---|---:|
| Mite / Hound / Crab / Wisp / Devourer HP | 40 / 240 / 600 / 140 / 960 |
| Mite attachment cap | 3 |
| Enemy attack preparation | 0.65–1.5 seconds |
| Wisp and organ stabilization | 1.8 seconds |
| Materialization | 8 seconds |
| Displacement threshold | 100 |
| Displacement decay | 12/second after 1.5 seconds |
| Crab exposure | 9 seconds |
| Boss Core window / damage multiplier | 10 seconds / ×6 |
| Boss fragment overload | 34 per hit |
| Boss object respawn / lifetime | 4 seconds / 16 seconds |
| Transition safety | 1.2 seconds |
| Optional cache | +35 Integrity or +4 of each non-Core material |
| Grade weights: completion/time/Integrity/physics/optional parts/cache | 35/15/20/20/5/5 |

Configuration lives in `src/game/content/shatteredMoon.ts`. Successful runs have zero deaths because there are no revives.

## Verification and measurements

- Production build and TypeScript validation passed. The existing Phaser bundle-size warning remains.
- 54 unit/integration tests passed, including the 40 existing regression tests. The migration assertion now expects schema 3.
- Eight browser checks cover the five existing desktop/touch flows, a live 20-Mite performance sample, and full five-room action-driven clears at 1440×900 and 844×390, including results and a refresh of persisted materials.
- The shared test controller supplies ordinary movement, melee, Pull, Pulse and Impulse inputs and selects the optional cache. It does not edit enemy HP, parts, phases or player Integrity. Browser scene stepping is accelerated for the full-run checks; this is not a human playtest or a full touch gesture replay.
- Latest seed-147 model playthrough: **432.28 simulation seconds (7:12)**, **237.67 seconds of boss encounter (3:58)**, 30.21 remaining Integrity, two Physics Executions and eight broken parts.
- 20-Mite simulation sample: **0.102 ms/tick**, 121.9 ms over 1,200 ticks across two matching deterministic runs. This measures simulation CPU cost, not rendering or GPU frame time.
- Headless Chromium live sample at 1440×900: **24.33–25.34 average FPS**, **43–44.4 ms p95 frame interval**, with 20 living Mites. This does **not** establish the 60 FPS desktop / 30 FPS mobile budget. Representative GPU-backed desktop and physical mobile measurements remain required.
- Browser checks run sequentially to avoid graphics contention. The existing redistribution smoke now waits for the actual distribution endpoint before releasing the key instead of assuming a fixed wall-clock delay.

Screenshots and the browser performance JSON attachment are produced under `test-results/` by `npm run smoke`.

## Art and audio provenance

No generated raster assets, external artwork or new sprite sheets were introduced. `MoonRenderer.ts` is the source for procedural placeholder silhouettes, telegraphs, parts, HP/displacement feedback and defeat rings. Collision sizes come from content definitions, independently of drawing edges. Existing humanoid sprite assets remain unchanged. There is no image prompt or atlas slicing metadata because no image generation was used.

Audio events expose aggro, telegraph, impact/break, interaction and defeat hooks. The scene maps these to the existing synthesized tone system; final enemy audio is not included.

## Findings and remaining acceptance work

- Fixed an exposed boss attacking during its intended melee window and moved late phases into the safe region.
- Added object recycling after missed shots could leave all available ammunition outside reachable safe space.
- Removed noisy humanoid field rings from fauna, pruned old room labels, and made short-screen results scrollable.
- The automated controller demonstrates a complete normal run in the target time range for one seed and starting profile. Broader seeds, human comprehension, upgraded builds and touch-only balance still need playtesting.
- Geometry is intentionally placeholder quality. Crab parts currently use world-aligned local offsets; final articulated animation and bespoke sprites/audio remain polish work.
- The other encounter categories have typed definitions and tested completion predicates, not additional authored missions or escort NPC content. No backlog enemies, paid systems, auto-repeat, revives or multiplayer changes were added.
- Acceptance remains open for human playability review and the measured rendering performance gap. The implementation is not labeled as fully performance-certified.

## Changed files

New: `content/shatteredMoon.ts`, `systems/MoonSystem.ts`, `systems/MoonRewards.ts`, `render/MoonRenderer.ts`, the Milestone 5 tests/controller/browser checks, and this report.

Updated: `Simulation.ts`, `types.ts`, `Profile.ts`, `Scenes.ts`, `MetaScenes.ts`, `main.ts`, `style.css`, package version/lock, Playwright configuration, existing schema/smoke assertions, README and the milestone contract status. All game paths above are under `src/game/` unless otherwise indicated.
