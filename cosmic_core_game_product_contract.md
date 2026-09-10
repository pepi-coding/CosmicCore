# Cosmic Core — Product and Build Contract

**Document status:** Build-ready contract for prototype and MVP  
**Version:** 1.0  
**Date:** 2026-09-09  
**Working title:** Cosmic Core (replaceable)  
**Primary engine:** Phaser 3 + TypeScript  

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

### Milestone 4 — Productization decision

Use playtest evidence to choose whether to proceed with:

- Online authoritative PvP.
- More PvE content.
- First evolution branches.
- Shared-world prototype.

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
3. Implement milestone by milestone, beginning with Milestone 0.
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
