# Cosmic Core

A local first playable built from `cosmic_core_game_product_contract.md`. Phaser 3, strict TypeScript, Vite, vector art, and a seeded 60 Hz simulation. No backend or online multiplayer.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. A phone on the same network can use the host computer's LAN address with port 5173. Mobile gameplay requires landscape orientation.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run smoke
```

## Play

- **Training:** expand to gather orbiting debris, then aim and cast at the bot. The rival activates when you first cast or pulse, so you can practice movement/distribution first. Reset training restarts without changing progression.
- **Frontier:** survive or bypass the first patrol (0–65 seconds), then the Leech/Wisp patrol (65–140 seconds). After 140 seconds, follow the directional marker to the purple challenge beacon. The Guardian arrives after 220 seconds once the beacon is reached. Defeat it, then enter the green extraction circle after 300 seconds. Extraction closes at 480 seconds.
- **Orbital duel:** a deterministic bot at your effective division mass. Collapse wins. At four minutes, stability phase, protected Core mass, then controlled mass decide the result; an exact tie enters sudden death.

WASD moves; mouse aims; left click casts. Space applies a directional impulse, Q emits a mass pulse, E starts compression surge. Hold Shift to compress, Control to expand; the wheel adjusts distribution. Mobile uses independent thrust/aim sticks, redistribution controls, and three ability buttons. Releasing the aim stick stops firing. Pause also activates when the window loses focus.

Mint debris is yours; pink debris belongs to a hostile Core; amber fragments are ejected mass; capture rings indicate a contested/capturing object. An exposed Core has flashing white/red rings and can collapse from the next direct hit. Compression surge has a gold ring and can be interrupted by Mass Pulse.

Extraction banks the configured share of unbanked mass. Failure/abandonment loses run mass and 1% of permanent mass, capped at 10 and protected by the evolution floor. Training never updates the profile; PvP gains do not become permanent. Profiles use versioned localStorage and are specific to browser and origin. Storage failures are reported on the results screen.

## Structure and tuning

- `src/game/config/balance.ts`: physics, distributions, thresholds, abilities, timing, bots, and rewards; validated at boot.
- `src/game/content/arena.ts`: hazard and objective positions shared by simulation and rendering.
- `src/game/content/content.ts`: divisions and the locked evolution placeholder.
- `src/game/systems/`: pure simulation, mass, gravity, orbit, damage, stability, and ability systems.
- `src/game/input/ActionInput.ts`: centralized bindings and shared abstract actions for keyboard, pointer, and touch.
- `src/game/scenes/Scenes.ts`: boot, menu, training, mission, duel, results, vector rendering, and responsive HUD.
- `src/game/persistence/Profile.ts`: versioned profile store, reward settlement, and protected loss.

Owned orbit mass is included in combat mass. Launch/release subtracts it; capture adds it. Damage produces collectible fragments. Redistribution only partitions available non-orbit mass. Stability recovery reallocates existing mass rather than creating mass.

## Contract implementation and verification

Milestones 0–3 are implemented in sequence: scaffold/forces/orbits; combat sandbox; mission/progression; local bot duel. No staged approval was requested. Section 16 remains the scope boundary; future evolutions and online systems remain excluded.

Automated coverage includes mass conservation during seeded combat, smooth redistribution, natural capture of at least five debris objects, orbit release accounting, gravity overlap, caps, two-hit collapse, recovery, protected loss, reward settlement, deterministic timeout, mission gates/Guardian/extraction, and config validation. Browser smoke tests cover desktop redistribution, pause/reset, result settlement and reload persistence, plus mobile landscape controls and portrait protection. Screenshots are written to `test-results/`.

Implementation choices and remaining acceptance work:

- Physics authority is the pure fixed-step model. Phaser Arcade bodies mirror actor collision shapes; force integration and collision response are custom for deterministic tests. This is a deliberate refinement of the contract's Arcade-plus-custom-physics approach.
- Recovery uses protected Core mass minus recent damage trauma. With insufficient total mass to meet the protection threshold, exposure can recur; recovery never manufactures mass.
- First evolution remains locked pending base combat approval. No choice is offered prematurely.
- Automated mission tests verify objective gating and settlement, not a human-playtested 5–8 minute victory. Enemy pressure, extraction pacing, compression/expansion balance, and touch comfort still require playtest evidence.
- Desktop Chromium and a mobile-emulated Chromium landscape viewport were smoke tested. No physical Android/iOS device has been measured. A desktop headless capture reported approximately 30 FPS; it is not representative mobile performance evidence or a 60 FPS claim. The simulation limits catch-up steps to avoid runaway work after slow frames, and the camera fits expanded Fields within the viewport using bounded zoom.
- The production bundle includes Phaser (approximately 353 KB gzip in the initial build); Vite reports a large-chunk warning. Final art/audio and production loading optimization are not part of this slice.

The first playable is ready for hands-on review, not a claim that the contract's subjective playtest and representative-device acceptance criteria have already been met.
