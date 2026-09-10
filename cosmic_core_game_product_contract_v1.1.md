# Cosmic Core — Product and Build Contract

**Document status:** Living build contract; Milestones 0–3 completed, Milestone 4 approved for implementation  
**Version:** 1.1  
**Date:** 2026-09-09  
**Working title:** Cosmic Core (replaceable)  
**Primary engine:** Phaser 3 + TypeScript  

**v1.1 precedence clarification:** Milestones 0–3 are the preserved baseline. Section 18, Milestone 4 explicitly supersedes the earlier one-press Surge/Pulse, projectile-primary, and single timed-mission requirements wherever they conflict. The Section 16 scope now includes the approved Milestone 4 additions (neutral humanoid, sustained channels/Flux, melee, three-room dungeon, and free test collection/economy). Earlier evolution exclusions still apply: sample Manifestations are not completed evolution branches. E holds Gravitational Charge, Q holds Outward Discharge, primary performs melee, and R is the dedicated orbit launch; Space and redistribution bindings remain unchanged. No payments, production networking, or automated farming are authorized.

---

## 1. Contract purpose

This document is the authoritative product specification for the first playable version of the game. Codex must implement confirmed requirements as written, use the stated defaults where the product owner has not yet chosen a value, and avoid silently expanding the scope.

The game is a top-down cosmic action grinder in which mass is simultaneously progression, health, defense, offensive potential, and spatial influence. Players earn permanent maximum mass in PvE and redistribute their available combat mass continuously between a dense Core and a wide gravitational Field.

The signature decision is:

> Expand to control and catch; compress to resist and destroy.

---

## 2. Product vision

Create a skill-based action game where physics concepts produce understandable combat decisions rather than acting only as visual decoration. Players should feel increasingly cosmic as they grow from a basic Core into planet-, stellar-, galaxy-, and black-hole-scale evolutions.

The long-term game supports:

- Instanced PvE grinding.
- Instanced PvP organized by mass divisions.
- Shared-world PvE.
- PvPvE regions with meaningful risk.
- Branching manifestations and evolutions.

The first build must prove that continuous mass redistribution, gravitational influence, orbiting objects, and Core destabilization are fun before large content systems are built.

---

## 3. Design pillars

1. **Mass has many uses.** One coherent resource drives growth, survival, damage, resistance, and influence.
2. **Density versus reach.** Compression and expansion must both be useful and neither may be universally optimal.
3. **Readable physics.** Players can predict pulls, orbits, impulses, collisions, and danger zones.
4. **Skill matters.** A higher-mass player has an advantage within their division but can lose through positioning, timing, aim, and resource management.
5. **Grinding has stakes without erasing progress.** Unbanked gains are vulnerable; permanent losses are small and protected.
6. **Cosmic escalation.** Progression changes appearance, scale fantasy, mechanics, and identity—not only numbers.

---

## 4. Target platforms and presentation

### 4.1 Initial platform

- Responsive browser game.
- Desktop: keyboard and mouse.
- Mobile browser: landscape orientation with touch controls.
- Native desktop/mobile packaging is explicitly out of scope for the first build, but architecture must not depend on desktop-only APIs.

### 4.2 Camera and arena

- Top-down 2D camera.
- The complete circular Field should normally be visible.
- Camera zoom may adjust within safe limits as Field radius changes.
- Critical objects, hostile fields, and Core exposure must remain visually readable.

### 4.3 Art direction default

Until replaced by an approved art guide:

- Stylized cosmic energy rather than scientific photorealism.
- Dark space backgrounds with high-contrast colored fields.
- Clean silhouettes and restrained particles for mobile performance.
- The player is a visible central Core surrounded by a customizable energy Manifestation.

---

## 5. Player model

Each player entity contains:

- **Core:** central body and vulnerable survival point.
- **Manifestation:** class/evolution-specific visual body and ability identity.
- **Maximum Mass:** persistent mass earned through progression.
- **Combat Mass:** mass available in the current encounter.
- **Core Mass:** combat mass currently concentrated in the Core.
- **Field Mass:** combat mass currently distributed into the Field.
- **Field Radius:** area of gravitational influence.
- **Core Stability:** state derived from protected Core Mass and recent Core damage.
- **Momentum:** current velocity used by movement and physics interactions.

Invariant:

```text
Core Mass + Field Mass + Orbiting Stored Mass <= Combat Mass
```

Mass temporarily ejected from the player is no longer controlled combat mass until recovered.

---

## 6. Continuous mass redistribution

The player continuously chooses a distribution value `d` from `0.0` to `1.0`:

- `d = 0.0`: maximum safe expansion.
- `d = 0.5`: balanced distribution.
- `d = 1.0`: maximum safe compression.

Distribution changes gradually, never instantaneously. The default full transition time is 1.25 seconds and must be configuration-driven.

### 6.1 Compression increases

- Short-range gravitational pull.
- Direct Core/impact damage.
- Resistance to displacement.
- Resistance to mass ejection.
- Core protection.

Compression decreases:

- Field radius.
- Number of objects efficiently controlled.
- Long-range influence.
- Acceleration and turning responsiveness through higher effective inertia.

### 6.2 Expansion increases

- Field radius.
- Detection and collection reach.
- Number of objects that can be influenced.
- Ability to establish orbits and control space.
- Mobility options created through wide-field interactions.

Expansion decreases:

- Local pull intensity.
- Direct concentrated damage.
- Core protection.
- Resistance to mass ejection.

### 6.3 Balance rule

Not every attack receives the same compression scaling. Direct and concentrated effects scale with compression; area, capture, and control effects scale with expansion.

---

## 7. Combat system

### 7.1 Core combat loop

1. Position using movement and directional impulse.
2. Expand to acquire resources, debris, or the opponent.
3. Influence objects until they enter a stable or unstable orbit.
4. Use orbiting objects as ammunition, protection, fuel, or ability cost.
5. Compress to intensify a pull, resist displacement, or deliver direct damage.
6. Eject mass from the target through successful attacks.
7. Contest the displaced fragments.
8. Destabilize the hostile Core.
9. Land a finishing hit during Core exposure.

### 7.2 Movement

- Movement is responsive arcade physics inspired by momentum, not a scientific simulation.
- Standard movement applies thrust toward an intended direction.
- Velocity, acceleration, drag, and maximum speed are configuration-driven.
- Larger effective Core density increases inertia and reduces acceleration.
- Players must retain enough control to avoid feeling like they are constantly sliding on ice.

### 7.3 Gravitational Field

- Every mass-bearing entity has a physics mass, position, and velocity.
- Player Fields apply attraction inside their radius.
- Influence strength grows toward the Core and scales with Core/Field distribution.
- Force must be clamped to prevent numerical instability near the center.
- The rendering system displays Field boundary, relative strength, and hostile overlap.
- Overlapping Fields resolve from the combined forces rather than choosing only one owner.

An arcade approximation is acceptable:

```text
force = clamp(GAME_G * sourceInfluenceMass * targetMass / max(distance², minDistance²), 0, maxForce)
```

All constants must live in balancing configuration, not inside scene code.

### 7.4 Orbiting

- Debris entering a Field is pulled toward the Core.
- Tangential velocity can cause an orbit instead of immediate absorption.
- An object becomes controlled after meeting configurable distance, velocity, and duration requirements.
- Controlled objects occupy orbit slots.
- Expansion permits more orbit slots; compression permits fewer.
- When capacity shrinks, excess objects are released predictably rather than deleted.

### 7.5 Damage and mass ejection

- The game does not use a conventional health bar as its primary survival system.
- Damage ejects combat mass from Field or Core.
- Field hits normally remove Field Mass first.
- Precise Core hits affect Core Mass and Core Stability.
- Ejected fragments remain collectible for a limited duration.
- The owner and attacker may both influence fragments.
- Stolen fragments grant temporary combat mass; only a small configured fraction may become unbanked progression mass.
- Combat mass gained during a PvP round must be capped to prevent unstoppable snowballing.

### 7.6 Core destabilization and elimination

Elimination has two stages:

1. When protected Core Mass falls below the configured threshold, the Core becomes **Unstable** and visibly exposed.
2. A valid direct Core hit during the exposure window causes **Collapse** and ends the fight.

If the exposure window expires without a finishing hit, the player stabilizes with a minimum protected Core Mass. Repeated instability may apply a stacking recovery penalty.

### 7.7 Timeout resolution

If a PvP timer expires:

1. Higher Core Stability wins.
2. If tied, higher controlled Combat Mass wins.
3. If still tied, sudden death begins and both players gradually lose Field stability until a Collapse occurs.

---

## 8. Base Core ability kit

All players begin as the same basic Core before choosing an evolution branch.

### 8.1 Primary — Orbital Cast

- Aim and launch one controlled orbiting object.
- Damage depends on object mass, relative velocity, accuracy, and a limited compression multiplier.
- If no object is available, emit a weak mass shard with a short cooldown.

### 8.2 Ability 1 — Impulse

- Apply a strong directional force to the player.
- Used to dodge, escape a Field, begin a slingshot, or convert position into momentum.
- Preserves existing velocity instead of acting as a teleport.

### 8.3 Ability 2 — Mass Pulse

- Expel a small amount of controlled Field Mass as a radial force.
- Expanded state: wider, weaker push.
- Compressed state: narrower, stronger push and stagger.
- Cannot reduce the caster below protected minimum mass.

### 8.4 Ability 3 — Compression Surge

- Accelerate compression for a brief window.
- Temporarily increases concentrated power.
- Creates a recovery period with reduced redistribution speed.
- Telegraph must be visible and interruptible through appropriate control effects.

### 8.5 Ability design requirement

Abilities must manipulate mass, force, momentum, orbit, space, or entropy. Ordinary elemental projectiles with only cosmic visual effects do not satisfy the design contract.

---

## 9. PvE

### 9.1 MVP PvE format

- Instanced solo mission.
- Target duration: 5–8 minutes.
- One arena/map with sequential encounters.
- Cosmic enemies plus environmental hazards.
- Player gathers unbanked mass and reaches an extraction/banking point.

### 9.2 Default mission structure

1. Spawn with a safe portion of Combat Mass.
2. Defeat or bypass two enemy waves.
3. Navigate one gravity/entropy environmental challenge.
4. Defeat a Core Guardian miniboss.
5. Choose to extract and bank gains.

### 9.3 Initial enemy families

- **Drifter:** low-mass enemy using direct pursuit and collision.
- **Orbiter:** maintains distance and launches captured debris.
- **Leech:** attaches to the outer Field and drains unbanked mass unless displaced.
- **Entropy Wisp:** weakens controlled orbits and accelerates fragment decay.
- **Core Guardian:** alternates wide capture phases and dangerous compression phases.

### 9.4 Initial hazards

- Moving asteroid field.
- Neutral gravity well.
- Entropy zone that decays loose fragments and destabilizes orbits.
- Momentum current that changes trajectories.

### 9.5 Banking and failure

- Mass earned inside the mission is unbanked.
- Successful extraction converts the configured share into persistent Maximum Mass/progression.
- On failure, all unbanked mass from that run is lost.
- Failure also removes a small fraction of persistent Maximum Mass.
- Default persistent penalty: 1%, capped per death and unable to reduce the player below the minimum of their current evolution tier.

Cooperative PvE, shared-world PvE, and PvPvE are not part of the first playable.

---

## 10. PvP

### 10.1 MVP PvP format

- One top-down 1v1 arena.
- One round per match for the vertical slice.
- Default maximum duration: 4 minutes.
- Collapse wins immediately.
- Arena contains a small number of neutral debris objects and no random instant-kill hazards.

### 10.2 Mass divisions

- Players use their persistent Maximum Mass rather than normalized stats.
- Matchmaking groups players into configured mass ranges.
- Exact division names and thresholds are content configuration.
- A player's encounter mass may be softly capped near the division ceiling while preserving earned progression outside the match.
- The UI must show the active division and effective match mass.

### 10.3 Fairness constraints

- Matchmaking must not pair players across nonadjacent divisions.
- Combat must expose meaningful disadvantages of high density, especially inertia and limited reach.
- Permanent Maximum Mass stolen from another player is never transferred directly in full.
- PvP loss uses the same small persistent-loss protection as PvE failure.
- Ranked leagues, teams, free-for-all, spectators, and tournaments are post-MVP.

### 10.4 Prototype networking rule

The first playable may use a local second player or a deterministic bot to validate combat. This is not presented as production multiplayer.

Production online PvP must use a server-authoritative simulation. The client must never be authoritative for mass, damage, position, rewards, or match results.

---

## 11. Progression and evolution

### 11.1 Progression structure

- Players begin as a basic, unnamed Core.
- PvE increases persistent Maximum Mass.
- Reaching mass and achievement requirements unlocks an evolution choice.
- The first evolution choice is permanent for the MVP profile.
- Later versions may support multiple profiles or manifestations.

### 11.2 Long-term scale fantasy

Candidate scale tiers, pending final naming:

1. Core tier.
2. Planetary tier.
3. Stellar tier.
4. Galactic tier.
5. Singularity/black-hole tier.

These tiers are thematic progression bands, not claims of literal real-world mass scale. Arena dimensions and time remain playable abstractions.

### 11.3 First playable limit

- Implement only the basic Core.
- Provide a data-driven placeholder for one locked first evolution.
- Do not implement planet, galaxy, or black-hole gameplay until the base combat prototype is approved.

---

## 12. Controls

### 12.1 Desktop defaults

- WASD: thrust/movement.
- Mouse position: aim.
- Left click: Orbital Cast.
- Space: Impulse.
- Q: Mass Pulse.
- E: Compression Surge.
- Hold Shift or mouse wheel toward center: compress.
- Hold Control or mouse wheel away from center: expand.

Bindings must be centralized and remappable later.

### 12.2 Mobile defaults

- Left virtual stick: thrust/movement.
- Right aim region/stick: aim and primary attack.
- Two large redistribution controls: compress and expand.
- Three reachable ability buttons.
- Landscape-only gameplay for MVP.
- Touch controls must not cover the Core or critical near-field action.

### 12.3 Input requirement

Keyboard, pointer, and touch inputs feed the same abstract action layer. Game systems must not directly depend on specific keys or DOM pointer events.

---

## 13. User interface

The combat HUD must include:

- Current controlled Combat Mass.
- Core/Field distribution meter.
- Core Stability state.
- Unbanked Mass in PvE.
- Ability icons and cooldowns.
- PvP timer and opponent stability.
- Clear Unstable and Collapse telegraphs.

World visualization must include:

- Player Field radius.
- Compression strength feedback.
- Orbit slots/controlled debris.
- Collectible mass ownership/contestation state.
- Hostile Field boundaries.
- Directional warning for dangerous impulses or launches.

The HUD must not require precise small text to understand combat state on mobile.

---

## 14. Technical architecture

### 14.1 Client stack

- Phaser 3.
- TypeScript with strict mode.
- Vite.
- Responsive HTML/CSS shell.
- Phaser Arcade Physics for the first prototype, supplemented with custom force/orbit calculations.
- Data-driven JSON or typed configuration for balance values and content.
- Vitest for pure-system tests.
- Playwright for smoke tests if supported by the environment.

### 14.2 Recommended client structure

```text
src/
  main.ts
  game/
    config/
    scenes/
    entities/
    systems/
      MassSystem.ts
      GravitySystem.ts
      OrbitSystem.ts
      DamageSystem.ts
      StabilitySystem.ts
      AbilitySystem.ts
    input/
    ui/
    content/
    persistence/
  shared/
```

Scenes should include:

- BootScene.
- MainMenuScene.
- TrainingScene.
- PvEMissionScene.
- PvPArenaScene.
- ResultsScene.

### 14.3 State rules

- Simulation state is separate from rendering.
- Game balance values are configuration-driven.
- Physics updates use a fixed timestep where practical.
- Random events accept a seed for reproducible tests.
- Persistent profile data has an explicit schema and version.
- The first prototype may save locally using `localStorage` behind a persistence interface.

### 14.4 Future online architecture

Not required for the first playable, but the intended production direction is:

- Authoritative Node.js/TypeScript game server.
- WebSocket transport.
- Server-controlled physics, mass, damage, rewards, and results.
- Client prediction/interpolation where necessary.
- Persistent account/profile database.
- Server-side matchmaking by region and mass division.

No backend should be created until the local vertical slice validates the combat model, unless the product owner explicitly changes this sequence.

---

## 15. Core data model

Minimum conceptual types:

```ts
type MassState = {
  maximumMass: number;
  combatMass: number;
  coreMass: number;
  fieldMass: number;
  orbitingStoredMass: number;
  unbankedMass: number;
  distribution: number;
};

type StabilityState = {
  phase: 'stable' | 'unstable' | 'collapsed';
  unstableRemainingMs: number;
  instabilityCount: number;
};

type PlayerProfile = {
  schemaVersion: number;
  id: string;
  displayName: string;
  maximumMass: number;
  evolutionId: string;
  unlockedEvolutionIds: string[];
  statistics: Record<string, number>;
};
```

The implementation may refine these types but must preserve the distinction between persistent, encounter, distributed, orbiting, and unbanked mass.

---

## 16. First playable scope

### 16.1 Included

- Responsive boot and menu.
- Desktop and mobile input abstraction.
- One controllable basic Core.
- Continuous compression/expansion with visible radius changes.
- Gravity influence and overlapping forces.
- Debris capture, orbit, recovery, and launch.
- Four base actions: primary plus three abilities.
- Mass-as-health damage and collectible ejected fragments.
- Core instability, recovery, and Collapse.
- One training sandbox.
- One 5–8 minute PvE mission.
- Four simple enemies plus one miniboss.
- One local/bot 1v1 PvP arena.
- Local profile and progression save.
- Results screen showing gained, banked, and lost mass.
- Data-driven balance configuration.

### 16.2 Excluded

- Production online multiplayer.
- Accounts, authentication, cloud saves, or payments.
- Shared open world.
- PvPvE.
- Cooperative play.
- Ranked seasons.
- Multiple completed evolution branches.
- Native app stores.
- Final art, narrative campaign, voice acting, or extensive cosmetics.

---

## 17. Acceptance criteria

The first playable is accepted only when all of the following are true:

1. It runs in current desktop Chrome and a modern mobile browser in landscape.
2. The player can continuously compress and expand without discontinuous teleporting or radius popping.
3. Compression visibly and mechanically strengthens local pull/direct effects while reducing reach and responsiveness.
4. Expansion visibly and mechanically increases reach/control while weakening local intensity and Core protection.
5. At least five debris objects can be influenced, can enter orbit, and can be launched.
6. Overlapping player Fields produce understandable combined movement.
7. Attacks eject collectible mass rather than merely reducing a generic HP bar.
8. Either combatant can contest loose mass, subject to configured caps.
9. A Core can become Unstable, visibly expose itself, recover, or Collapse from a valid finishing hit.
10. The PvE mission can be completed and banks earned mass.
11. PvE failure loses run mass plus a protected, capped persistent percentage.
12. The PvP arena can produce a winner by Collapse or timeout rules.
13. Refreshing the browser preserves the local profile.
14. Core formulas and thresholds can be changed from configuration without editing scene logic.
15. Automated tests cover conservation/distribution constraints, penalty floors, destabilization, and timeout resolution.
16. The game maintains a playable target frame rate on a representative mid-range mobile device; default target is 60 FPS with a 30 FPS graceful minimum.

---

## 18. Implementation milestones

### Milestone 0 — Technical spike

- Phaser/Vite/TypeScript scaffold.
- One Core, debris, fixed timestep experiment.
- Compression/expansion and Field visualization.
- Orbit feasibility test.

Exit condition: redistribution and orbiting feel controllable with mouse/keyboard and touch.

### Milestone 1 — Combat sandbox

- Input abstraction.
- Full Mass, Gravity, Orbit, Damage, and Stability systems.
- Base ability kit.
- Debug panels and configurable tuning.
- Bot target and combat reset.

Exit condition: a complete destabilize-and-Collapse loop is fun in repeated tests.

### Milestone 2 — PvE vertical slice

- Enemy behaviors.
- Hazards.
- Guardian encounter.
- Extraction, rewards, failure, and persistence.

Exit condition: a complete 5–8 minute run can be won, lost, and replayed.

### Milestone 3 — Local PvP proof

- 1v1 arena.
- Bot or local second-player support.
- Timeout and sudden death.
- Division/effective-mass simulation.

Exit condition: different compression strategies remain viable and matches do not consistently devolve into permanent maximum compression.

### Milestone 4 — Combat identity and dungeon meta-loop

This milestone replaces the earlier generic productization checkpoint. Milestones 0–3 have produced a working proof, but playtesting identified that one-shot radial powers and projectile-like basic attacks feel too similar to agar-style or shooter combat. Milestone 4 must establish the intended humanoid cosmic-brawler identity before online networking or large-scale content.

#### 4A. Humanoid combat presentation

- Replace circle-only player presentation with a neutral humanoid cosmic vessel.
- The visible Core remains centered in the torso and remains the authoritative physics/damage origin.
- The gravitational Field remains circular and readable around the humanoid.
- The placeholder design must be intentionally neutral: athletic human proportions, simple fitted training suit or energy body, no faction symbols, armor theme, lore-specific costume, gender-defining detail, or elaborate silhouette.
- Support four-direction locomotion and attacks in the top-down view.
- The base sprite set must include idle, move, melee 1, melee 2, heavy melee, pull-channel, pulse-channel, hit, unstable, collapse, and victory states.
- Generated raster sprites are allowed. Keep prompts, source sheets, slicing metadata, and final optimized PNGs under a documented asset pipeline so art can later be replaced by costumes without changing gameplay code.
- Never couple collision bounds or Core position to opaque pixels. Store anchors, body bounds, Core socket, facing, and animation frames as data.

#### 4B. Held gravitational pull

Replace the one-press Surge behavior with a held **Gravitational Charge** action.

- `keydown`/button press begins channeling.
- While held, inward force is applied every fixed simulation tick.
- Pull strength ramps from a low initial value to maximum over a configurable charge time; default 0.8 seconds.
- The effect continues at maximum strength while held, subject to resource and heat limits.
- Releasing the input ends the pull with a short visual/audio decay; it must not apply a second hidden burst.
- The humanoid braces and visibly powers up: feet planted, torso tension, arms drawing inward, Core brightness increasing, concentric inward particles, and a rising sound layer.
- Pull direction and range remain affected by mass distribution. Compression produces a stronger short-range pull; expansion produces a wider but weaker pull.
- The action reduces movement speed while channeling but does not fully root the player.
- The effect must not behave as repeated discrete pulses. Force and presentation should feel continuous.

#### 4C. Held mass pulse

Replace the one-press Mass Pulse with a held **Outward Discharge** action.

- `keydown`/button press begins continuous outward force and energy emission.
- While held, outward force is applied every fixed simulation tick.
- The humanoid opens its stance and visibly releases stored energy: arms driven outward, Core/limbs venting light, continuous wave distortion, outward particles, and a sustained discharge sound.
- Expanded state produces a broad control field; compressed state produces a narrower, harder close-range displacement effect.
- Pulse is defensive/control-focused and must not become the highest sustained damage option.
- Releasing the input ends emission with a short falloff and no additional automatic explosion.
- Pull and Pulse are mutually exclusive and share the same channel resource.

#### 4D. Channel resource and counterplay

Add a temporary **Flux** meter to prevent indefinite held powers while preserving the desired continuous feel.

- Flux begins full at encounter start.
- Pull and Pulse drain Flux continuously.
- Drain starts gently and accelerates after a configurable uninterrupted-channel threshold.
- Flux regenerates after a short delay when neither channel is active.
- Reaching zero causes a brief Overload state that interrupts the channel and slows redistribution; it does not directly damage permanent mass.
- Successful melee hits may restore a small amount of Flux, encouraging interaction rather than passive field holding.
- Channel startup, maximum intensity, low Flux, and Overload require distinct visual and audio feedback.
- Opponents can counter a channel through line-of-sight breaks, impulses, well-timed heavy melee, sufficient mass advantage, or forcing Overload.

#### 4E. Melee basic combat

Remove the shooter-like fallback mass bullet as the default primary attack.

- Primary input performs a short-range, facing-directed melee chain.
- Default chain: three attacks with distinct timing—quick strike, advancing strike, heavy finisher.
- Attacks use arcs/hitboxes attached to the humanoid, not free-flying bullet sprites.
- The second hit may step the player forward slightly; the finisher produces concentrated knockback/mass ejection.
- Input buffering and cancel windows must be configuration-driven.
- Missing the heavy finisher creates a punishable recovery window.
- Compression increases impact, stagger, and mass ejection but shortens practical reach.
- Expansion increases energy-limb reach or attack arc modestly but reduces direct damage.
- Momentum contributes to impact within a strict cap so movement skill matters without enabling accidental one-hit kills.
- Orbiting debris remains usable by a dedicated ability or later Manifestation; it is no longer the universal primary attack.

#### 4F. Combat feel requirements

- Pull should feel like **powering up and dominating nearby space**.
- Pulse should feel like **venting/releasing accumulated energy**.
- Melee should feel physical: anticipation, contact pause/hit-stop, directional knockback, mass fragments, animation follow-through, and strong sound layering.
- Add subtle camera shake only for local heavy impacts; do not shake continuously during channels.
- Add controller-independent input buffering so keyboard and touch receive equivalent combat responsiveness.
- All sustained effects must use fixed-tick calculations and produce the same outcome regardless of frame rate.

#### 4G. Dungeon-based PvE shell

Replace the single mission presentation with a small dungeon progression shell inspired by collection RPGs while retaining real-time action combat.

- Add a Dungeon Select screen with a node/map structure.
- Implement one repeatable three-room dungeon for this milestone.
- Room 1 teaches melee against basic enemies.
- Room 2 mixes enemies with a gravity or entropy hazard.
- Room 3 contains a boss that tests Pull, Pulse, and Core exposure.
- Each room ends only when its objective is complete; transition through a gate/portal rather than instantly spawning the next wave in the same empty arena.
- The dungeon has difficulty levels backed by configuration, but only Normal must be playable now.
- Results show completion time, grade, mass gained, materials gained, and first-clear rewards.
- Auto-repeat may be represented in the UI/data model but must not be implemented until manual runs are fun.

#### 4H. Collection/gacha foundation

The game borrows the collection/progression loop of games such as Summoners War, not monster-based fiction or turn-based combat.

- Gacha units are called **Manifestations** as a working term.
- A Manifestation is a humanoid combat expression of the player's Core, not a separate summoned monster.
- Equipping a Manifestation changes ability properties, passive behavior, visual effects, and later costumes while preserving universal mass rules.
- Define rarity, affinity/physics concept, base statistics, abilities, passive, duplicate conversion, and upgrade path as data.
- Candidate affinities include Gravity, Entropy, Momentum, Fusion, Void, and Radiation; final taxonomy remains pending.
- Create three data-only/sample Manifestations using the same neutral placeholder humanoid. They may vary through color/VFX and ability modifiers, not final character design.
- Implement one free developer summon flow using earned test currency and deterministic pity-friendly test data.
- Duplicates convert to universal **Resonance Shards** by default; duplicates must not be required to make a character viable.
- Do not implement real-money purchases, paid currency, commercial rates, or production banners in this milestone.
- PvP matchmaking continues to use mass divisions. Collection rarity must not create uncapped stat superiority within a division.

#### 4I. Dungeon economy foundation

- Add configuration and profile fields for Energy/Stamina, summon currency, upgrade material, Resonance Shards, dungeon keys if later needed, and first-clear state.
- For Milestone 4, Energy may be disabled by configuration so testing is never time-gated.
- Reward tables must be deterministic under a supplied test seed and configurable by dungeon/difficulty.
- Separate persistent Maximum Mass from Manifestation upgrade resources.
- Maximum Mass remains earned primarily through play, not direct summoning.
- No economy value may be hard-coded in a scene.

#### 4J. Milestone 4 acceptance criteria

Milestone 4 is accepted only when:

1. Holding Pull applies uninterrupted inward force for the entire valid hold duration.
2. Pull visibly ramps for approximately the configured charge time and communicates maximum intensity.
3. Holding Pulse applies uninterrupted outward force and visually reads as continuous energy release.
4. Releasing either channel stops it cleanly without delayed or hidden force spikes.
5. Flux drain, regeneration, low-resource warning, and Overload work deterministically.
6. Pull and Pulse cannot be active simultaneously.
7. The default primary attack is a three-hit humanoid melee chain with no shooter-style fallback bullet.
8. Melee hitboxes follow facing and animation timing and do not damage outside their configured arcs.
9. Compression and expansion create measurably different melee and channel behavior.
10. A neutral humanoid placeholder is animated in all required states and the Core remains aligned to its configured torso socket.
11. The game remains playable with keyboard/mouse and mobile touch controls.
12. One three-room dungeon can be selected, completed, graded, rewarded, and replayed.
13. One dungeon boss requires meaningful use of melee plus at least one of Pull or Pulse.
14. Three sample Manifestations load from content data and can be inspected/equipped without separate hard-coded scenes.
15. A free test summon produces a configured Manifestation or duplicate conversion result deterministically under a test seed.
16. No payments or production monetization are present.
17. Unit tests cover held-input lifecycle, tick-rate independence, Flux, mutual exclusion, melee windows, duplicate conversion, and dungeon reward calculation.
18. Existing mass conservation, Core Stability, Collapse, and persistence tests remain passing.
19. Desktop and representative mobile-sized smoke tests pass.
20. Playtest notes explicitly compare the new combat feel against the completed Milestone 3 build.

#### 4K. Milestone 4 implementation order

1. Refactor input actions to expose `pressed`, `held`, and `released` states.
2. Implement shared channel state machine and Flux without presentation.
3. Replace Surge/Pulse with sustained Pull/Discharge and tests.
4. Implement humanoid render rig, sockets, placeholder sprites, and animation state machine.
5. Replace the projectile primary with the melee chain and hitbox timeline.
6. Add hit feedback, channel VFX, audio hooks, and mobile control revisions.
7. Build the three-room dungeon shell and boss.
8. Add data-driven Manifestation/economy schemas and free test summon.
9. Run regression, browser, mobile viewport, and frame-rate-independence tests.
10. Produce side-by-side playtest findings before requesting Milestone 5.

#### 4L. Explicit non-goals

- Production-quality costumes or final character identities.
- A large roster.
- Automated dungeon farming.
- Real-money gacha or store integration.
- Production online multiplayer.
- Shared world or PvPvE.
- Native application packaging.
- Full campaign, guilds, social systems, or live operations.

#### 4M. Codex handoff prompt

> Implement Milestone 4 from `cosmic_core_game_product_contract.md` in the existing Phaser project. Treat Milestones 0–3 as completed and preserve their passing systems/tests unless Milestone 4 explicitly replaces behavior. First inspect the current repository and map existing Surge, Mass Pulse, primary attack, input, physics, UI, and persistence code to the new requirements. Then implement the work in the specified order. Pull and Pulse must be held continuous actions driven by fixed simulation ticks; Pull must ramp like a power-up and Pulse must read as sustained energy release. Replace the shooter-like primary projectile with a humanoid three-hit melee chain. Add a neutral replaceable humanoid sprite/animation pipeline, one three-room dungeon, and the data-driven free/test Manifestation summon foundation. Do not add payments or production networking. Run all existing and new tests, production build, desktop smoke test, and mobile-viewport smoke test. Report code changes, balance defaults, generated asset sources, performance, playtest differences from Milestone 3, and any deviations from the contract.

---

## 19. Testing requirements

Unit tests must verify:

- Distributed mass never exceeds available Combat Mass.
- Redistribution respects speed and bounds.
- Ejection conserves mass subject only to explicit decay rules.
- Recovery and stealing respect caps.
- Persistent death loss respects percentage, cap, and evolution floor.
- Unstable/Collapse transitions are valid.
- Timeout tie-breakers are deterministic.
- Balance configuration loads and validates.

Playtests must specifically evaluate:

- Whether expansion is useful enough to prevent compression-only play.
- Whether high mass feels powerful without eliminating skill.
- Whether players understand orbit ownership and loose-mass contests.
- Whether mobile players can redistribute, aim, move, and activate abilities comfortably.
- Whether Core exposure is obvious without requiring HUD reading.

---

## 20. Build instructions for Codex

When instructed to build from this contract, Codex must:

1. Inspect the target repository and its existing instructions before editing.
2. Treat Section 16 as the scope boundary.
3. Implement milestone by milestone, beginning with the next approved unfinished milestone (Milestone 4 for v1.1); do not restart completed work.
4. Keep balance values outside scene and entity logic.
5. Use placeholder vector/particle art rather than waiting for final assets.
6. Add tests with each pure gameplay system.
7. Run type-checking, tests, production build, and a browser smoke test.
8. Report deviations, unresolved ambiguities, and measured performance.
9. Never claim online multiplayer when only local simulation exists.
10. Stop after each milestone when the product owner requests staged approval.

Suggested initial Codex instruction:

> Build Milestone 0 from `cosmic_core_game_product_contract.md`. Use Phaser 3, TypeScript, and Vite. Implement only the technical spike, validate it in desktop and mobile-sized browser viewports, run all checks, and report tuning observations before proceeding to Milestone 1.

---

## 21. Product defaults requiring later confirmation

The following are deliberate defaults, not final creative decisions:

- Working title: Cosmic Core.
- Basic Core and division names.
- Stylized cosmic visual direction.
- 1.25-second full redistribution transition.
- 5–8 minute PvE mission.
- 4-minute PvP match.
- 1% persistent mass loss on failure.
- One basic Core and one locked evolution placeholder.
- Permanent first evolution choice.
- Landscape-only mobile gameplay.
- Arcade rather than realistic physics.
- Local progression before account/backend development.

Changing these defaults does not invalidate the architecture, but material changes must update this contract before implementation.

---

## 22. Post-contract discovery backlog

These questions should be answered after the combat spike, when playtest evidence exists:

- Final game name and terminology.
- Exact evolution branches and class identities.
- Narrative premise and world factions.
- Monetization model.
- Cooperative party size.
- Shared-world population and map structure.
- PvPvE extraction rules.
- Online server hosting and regional deployment.
- Ranked division names and thresholds.
- Accessibility suite and localization languages.
- Final art, animation, audio, and UX guide.

They must not block Milestone 0.
