# Cosmic Core — Milestone 5 PvE Expansion Contract

**Version:** 1.1  
**Date:** 2026-09-12  
**Status:** Implemented in v0.5.0; automated verification complete; hardware performance and human acceptance pending  
**Depends on:** `cosmic_core_game_product_contract.md` v1.1 and completed Milestones 0–4  
**Engine:** Existing Phaser 3 + TypeScript project  

---

## 1. Purpose

Expand Cosmic Core from combat primarily against humanoid Core-users into a replayable PvE dungeon game containing cosmic fauna, anomalies, constructs, and bosses with mechanics built specifically around Pull, Pulse, mass distribution, melee, momentum, and environmental destruction.

This milestone must prove that fighting non-humanoid enemies is enjoyable and mechanically different from PvP. It must not create a large quantity of enemies that differ only in health, damage, or appearance.

---

## 2. Canonical world taxonomy

Use these working categories in code and content data:

- **Core-bearers:** intelligent humanoid characters capable of consciously redistributing mass. Final species/faction name is pending.
- **Cosmic Fauna:** living space creatures whose physical behavior is instinctive rather than controlled like a Core-bearer.
- **Anomalies:** hostile physical phenomena such as entropy, dark matter, antimatter, or unstable gravity.
- **Constructs:** artificial guardians produced by a lost or unknown civilization.
- **Titans:** boss-scale creatures or entities requiring multi-stage mechanics.

Cosmic Fauna are enemies and resource sources. They are not gacha units. The collectible roster continues to consist of humanoid Manifestations.

---

## 3. PvE design rules

Every enemy must answer all of the following:

1. What happens when the player holds Pull against it?
2. What happens when the player holds Pulse against it?
3. How does mass class affect displacement?
4. When and why should the player use melee?
5. What readable tell precedes its dangerous action?
6. What material or tactical reward does it provide?

At least one enemy in every completed dungeon must punish blindly holding Pull. At least one must reward using another enemy or the environment as a weapon.

Enemies must not all share the humanoid Core-user combat model. They may have HP, armor, breakable parts, stagger, attachments, phase states, or special defeat requirements.

---

## 4. Shared enemy systems

### 4.1 Mass classes

Every enemy has one displacement class:

| Class | Pull/Pulse behavior |
|---|---|
| Light | Directly accelerated and displaced by sustained forces |
| Heavy | Moves slowly; force primarily fills Displacement |
| Anchored | Cannot be displaced until an anchor, armor part, or mechanic is broken |
| Titanic | Never directly displaced; Pull/Pulse acts on body parts, attacks, adds, or encounter objects |

Mass class must be visible through silhouette, movement, VFX, or an icon. It must not be discoverable only through failed inputs.

### 4.2 Displacement meter

Heavy and temporarily Anchored enemies use a **Displacement** meter.

- Pull and Pulse fill the meter according to force, duration, direction, and mass difference.
- Melee finishers may add a configured amount.
- The meter decays after a delay.
- At full meter, the enemy becomes Staggered, movable, or exposes a weak point according to its definition.
- The player must receive visible progress feedback while applying force.
- Titanic bosses do not use one global Displacement meter unless the encounter explicitly calls for it; their parts may have separate meters.

### 4.3 Breakable parts

The enemy framework must support independently targetable parts with:

- Local HP or Break value.
- Their own hitbox and visual state.
- Optional armor/resistance.
- Behavior changes when broken.
- Separate drop tables.
- A parent-enemy ownership relationship.

Examples include armor plates, claws, tails, gravity organs, anchors, shells, and protective satellites.

### 4.4 Environmental damage

Enemies can receive configured damage, stagger, or execution effects from:

- Wall impact.
- Collision with another enemy.
- Collision with launched debris.
- Gravity wells.
- Plasma or stellar hazards.
- Falling or being expelled outside a safe boundary.
- Boss attacks redirected into them.

Environmental kills must report their cause and may grant a bonus score/reward labeled **Physics Execution**.

### 4.5 PvE health presentation

- Every damageable enemy shows a readable HP bar when engaged or damaged.
- Elite/boss enemies also show armor, part, phase, or Displacement state when relevant.
- Floating damage numbers distinguish melee, environmental, critical/Core, and part damage by style or color.
- Do not show more than two persistent bars above a normal enemy.
- Boss health and phase information belong in a dedicated boss HUD.

### 4.6 Telegraph standard

Every high-damage attack must have:

- A preparation animation.
- A readable direction or affected area.
- Minimum reaction time defined in configuration.
- A distinct audio cue hook.
- Recovery or vulnerability unless explicitly categorized as ambient pressure.

---

## 5. Milestone content scope

Implement exactly one full dungeon and the following enemies:

1. Meteor Mite.
2. Comet Hound.
3. Graviton Crab.
4. Entropy Wisp.
5. Lunar Devourer boss.

The following are design backlog only and must not be fully implemented in this milestone:

- Nebula Jelly.
- Void Leech.
- Solar Scarab.
- Dark-Matter Stalker.
- Binary Orbs.
- Antimatter Shade.
- Stellar Broodmother.
- The Last Moment.
- Null Warden.

Data schemas may support them, but Codex must not build unused speculative systems solely for backlog enemies.

---

## 6. Dungeon 1 — The Shattered Moon

### 6.1 Theme

A fractured moon whose pieces remain bound by unstable gravity. Rocky fauna occupy the ruins while a Titan consumes the remaining lunar mass from within.

### 6.2 Target experience

- Normal clear time: 7–10 minutes.
- Five rooms.
- One optional reward interaction.
- Normal difficulty only.
- Manual play only; no auto-repeat.
- Solo only for this milestone.

### 6.3 Room sequence

#### Room 1 — Impact Nursery

Purpose: teach direct displacement and environmental kills.

- Meteor Mite swarm.
- Two destructible lunar pillars.
- Tutorial prompt: Pull to gather; Pulse to launch.
- At least one reward bonus for destroying multiple Mites with one collision.

#### Room 2 — The Broken Orbit

Purpose: teach momentum redirection.

- Comet Hounds circle the room and charge.
- Moving debris crosses predictable paths.
- Redirecting a Hound into debris or another Hound causes large stagger/damage.
- The player can win through melee, but redirection is faster and produces a Physics Execution bonus.

#### Room 3 — Gravity Lock

Purpose: teach heavy/anchored interactions and breakable parts.

- One Graviton Crab plus a small number of Mites.
- The Crab has frontal armor plates and two floor anchors.
- Pull removes loosened armor after sufficient force.
- Breaking both anchors makes the Crab Heavy instead of Anchored.
- Filling Displacement flips/staggers it and exposes its underside for melee.

#### Room 4 — Entropy Crossing

Purpose: teach Pull-to-materialize and resource pressure.

- Entropy Wisps teleport between entropy patches.
- Wisps are intangible and immune to normal melee until stabilized by Pull.
- Loose mass fragments decay faster inside entropy patches.
- Pulse moves a patch or suppresses its edge temporarily but must not permanently erase every hazard.
- Clearing the room opens an optional lunar cache.

#### Room 5 — Lunar Devourer

Purpose: combine environmental weapons, force control, melee windows, and a multi-phase boss.

See Section 11.

### 6.4 Room transitions

- Each room is spatially and visually distinct.
- Completion opens a gate, fissure, gravitational bridge, or portal.
- Do not spawn every encounter sequentially in one unchanged arena.
- Player state persists between rooms according to explicit dungeon rules.
- Provide a brief safe transition in which combat inputs cannot accidentally trigger the next room.

### 6.5 Recovery rules

- Core Integrity does not automatically refill completely after each room.
- Room 4's optional cache offers a choice between Integrity recovery and increased material reward.
- Flux refills between rooms by default.
- Collapse ends the run unless a future revive system is added; revives are out of scope here.

---

## 7. Enemy specification — Meteor Mite

### Identity

Small rocky creatures found in swarms. Light displacement class.

### Behavior

- Select the player and rush in readable straight or gently curved paths.
- On contact, attach to the player's External Field rather than immediately disappearing.
- Attached Mites increase inertia and reduce acceleration by a configured amount.
- Limit simultaneous attachments to avoid control loss and visual clutter.

### Player interactions

- Pull gathers unattached Mites and can establish a short orbit.
- Pulse launches or violently separates gathered Mites.
- Compressed melee destroys attached Mites.
- Launched Mites damage other enemies and can trigger Physics Execution.

### Readability

- Attached state has a visible tether/contact point.
- Attachment slowdown appears as an icon or short status label.
- A Mite about to rush briefly aligns and flashes.

### Drops

- Dense Matter.
- Small chance of additional unbanked mass.

---

## 8. Enemy specification — Comet Hound

### Identity

Fast quadrupedal ice-and-dust predator. Light while moving normally; Heavy during full charge.

### Behavior

- Circles the player to build momentum.
- Telegraphs, then dashes along a committed trajectory.
- Leaves a short-lived trail that slows acceleration.
- Takes reduced frontal damage while charging.

### Player interactions

- Pull bends the trajectory continuously but does not stop it instantly.
- Pulse produces a stronger directional deviation when timed near impact.
- Compressed heavy melee can interrupt the charge during its final approach.
- Redirecting the Hound into a wall, debris, or enemy produces bonus damage and Stagger.

### Readability

- Its comet tail length communicates stored momentum.
- A projected path appears briefly before the committed dash.
- Successful redirection has a distinct impact effect and label.

### Drops

- Frozen Momentum.
- Bonus drop chance after environmental redirection.

---

## 9. Enemy specification — Graviton Crab

### Identity

Armored lunar crustacean that locks itself to terrain. Anchored displacement class initially.

### Parts

- Two frontal armor plates.
- Left anchor.
- Right anchor.
- Exposed underside after Stagger.

### Behavior

- Faces the player and attempts to keep armor between attacks and its body.
- Generates a slowing gravity lane in front.
- Uses alternating claw slams with clear ground telegraphs.
- Reanchors after recovering unless both anchors have been broken.

### Player interactions

- Direct Pull/Pulse does not translate its body while Anchored.
- Sustained Pull can tear away an armor plate after its Break value is depleted.
- Melee and launched debris damage anchors.
- With anchors broken, Pull/Pulse fills Displacement.
- Full Displacement flips or staggers the Crab and exposes the underside.
- Melee deals increased damage during the exposure window.

### Drops

- Graviton Shell.
- Broken plates/anchors may roll separate material drops.

---

## 10. Enemy specification — Entropy Wisp

### Identity

An unstable Anomaly that accelerates decay. Light displacement class when materialized.

### Behavior

- Teleports between marked entropy patches.
- Accelerates loose-fragment decay inside its influence.
- Disrupts controlled orbits.
- Reduces local Flux regeneration.

### Player interactions

- Intangible state ignores normal melee and most collision damage.
- Sustained Pull fills a Stabilization meter.
- Full Stabilization materializes the Wisp for a configured window.
- Melee damages the materialized Wisp normally.
- Pulse pushes the Wisp and temporarily suppresses the outer portion of an entropy patch.
- Killing the Wisp restores Flux and stops its active decay aura.

### Readability

- Intangible and materialized states must have clearly different silhouettes.
- Stabilization progress is visible near the enemy.
- Teleport destination is signaled before disappearance.

### Drops

- Decay Fragment.
- Flux restoration on defeat is an encounter effect, not an inventory item.

---

## 11. Boss specification — Lunar Devourer

### Identity

A Titanic worm living inside the fractured moon and consuming its remaining mass.

### Boss-wide requirements

- Dedicated boss HUD with HP, phase label, and relevant part/objective state.
- Three mechanically distinct phases.
- Normal target duration: 3–4 minutes within the dungeon.
- No attack may require knowledge that was not introduced earlier in the dungeon.
- The boss cannot be moved directly by Pull or Pulse.

### Phase 1 — Armored Emergence

- The Devourer crosses the arena in telegraphed lanes.
- Direct body damage is heavily reduced by armor.
- Lunar boulders fall or become available around the arena.
- Player must Pulse boulders into armor sections or redirect the boss into weakened structures.
- Breaking the required armor sections enters Phase 2.

### Phase 2 — Gravity Organs

- Exposed gravity organs appear along the body.
- The boss periodically pulls the player and debris toward its mouth.
- Player can counter through Pulse, positioning, Impulse, or breaking the active gravity organ.
- Sustained Pull stabilizes/exposes an organ for melee, reusing the Wisp lesson.
- Destroying the required organs enters Phase 3.

### Phase 3 — Core Consumption

- The boss begins consuming arena fragments and shrinking safe space.
- The player redirects smaller lunar fragments into its mouth.
- Excess consumed mass fills an Overload meter.
- At full Overload, the Devourer's internal Core becomes exposed.
- A melee damage window opens.
- The final Core Integrity threshold triggers a deliberate Collapse/defeat sequence, not an instant disappearance.

### Failure prevention

- Required encounter objects respawn or cycle; the player cannot permanently lose the ability to complete a phase.
- If the player does not understand the objective, contextual hints appear after configurable failed attempts/time.
- Boss attacks cannot overlap into unavoidable damage combinations.

### Drops

- Evolution Core as guaranteed first-clear reward.
- Dense Matter, Frozen Momentum, Graviton Shell, and Decay Fragment according to configured table.
- Cosmetic or rare drop slots may exist in data but need no final asset.

---

## 12. Dungeon encounter framework

The implementation must support these encounter types even if only the listed Shattered Moon rooms are authored:

- Combat elimination.
- Demolition/objective destruction.
- Hunt/reveal.
- Survival timer.
- Physics puzzle.
- Escort/protection.
- Elite encounter.
- Reward/recovery choice.
- Multi-phase boss.

Encounter definitions must be content data rather than scene-specific condition chains where practical.

Minimum encounter state machine:

```text
locked -> intro -> active -> success|failure -> reward -> exit
```

---

## 13. Elite modifier framework

Implement the data model and at most two functioning modifiers in Milestone 5:

- **Dense:** increased displacement resistance and collision force.
- **Unstable:** releases a telegraphed explosion or fragments on defeat.

Future data values may include Binary, Entropic, Radiant, Hollow, Devouring, and Anchored.

Rules:

- A normal enemy may have only one modifier in this milestone.
- Modifier icon and behavior must be readable.
- Modifiers cannot remove the enemy's intended Pull/Pulse counterplay.
- Do not apply random modifiers to the first tutorial appearance of an enemy.

---

## 14. Rewards and materials

### Materials

| Source | Material | Initial use |
|---|---|---|
| Meteor Mite | Dense Matter | Defensive/mass upgrade recipes |
| Comet Hound | Frozen Momentum | Mobility/Impulse upgrade recipes |
| Graviton Crab | Graviton Shell | Pull resistance/control upgrades |
| Entropy Wisp | Decay Fragment | Entropy/Flux upgrade recipes |
| Lunar Devourer | Evolution Core | Major Core/evolution progression gate |

### Requirements

- Keep Maximum Mass separate from materials and summon currency.
- Rewards are calculated from configurable tables.
- First-clear rewards are tracked separately.
- A seeded RNG path must exist for deterministic tests.
- Results screen shows base rewards, performance bonuses, first-clear rewards, and Physics Execution bonuses separately.
- No paid currency or monetization work is included.

---

## 15. Scoring and grades

At dungeon completion, calculate a grade using configuration-driven weights:

- Completion.
- Clear time.
- Remaining Core Integrity.
- Physics Executions.
- Broken optional parts.
- Optional cache choice/completion.
- Collapse/death count, currently always zero on success because revives are excluded.

Suggested grades: C, B, A, S. Grade affects bonus materials but not the guaranteed first-clear Evolution Core.

Avoid rewarding only clear speed; doing so would discourage experimentation with physics mechanics.

---

## 16. Art and audio requirements

Placeholder/generated assets are acceptable, including Astra-generated sprites, if they meet the following:

- Transparent-background sprite sheets or atlases.
- Stable scale and anchors across animation frames.
- Distinct silhouettes for Light, Heavy, Anchored, and Titanic enemies.
- Source prompt and slicing/atlas metadata stored with the asset.
- Collision shapes remain data-driven and independent of image edges.
- VFX direction clearly distinguishes inward Pull from outward Pulse.
- Every enemy includes idle/move, telegraph, attack, hit, and defeat presentation where applicable.
- Breakable parts have intact and broken visual states.
- Audio hooks exist for aggro, telegraph, impact, stagger/break, special interaction, and defeat even if final audio is unavailable.

Do not block mechanics on final art. Use clear geometric/debug representations first, validate, then integrate generated sprites.

---

## 17. Technical requirements

### Content definitions

Create typed, validated definitions for:

- Enemy archetype.
- Mass/displacement class.
- Behavior parameters.
- Attacks and telegraphs.
- Breakable parts.
- Drop tables.
- Elite modifiers.
- Encounter definition.
- Dungeon/room graph.
- Boss phase definition.

### Architecture

- Reuse existing Mass, Gravity, Pull, Pulse, melee, Flux, damage, and Core Integrity systems.
- Do not duplicate player-force formulas inside enemy classes.
- Separate AI decisions from locomotion/physics execution.
- Use finite-state machines or equivalent explicit states for enemies and boss phases.
- Pool frequently spawned enemies, projectiles, particles, and mass fragments where useful.
- Use fixed simulation ticks for force and collision outcomes.
- Support seeded test runs.
- Preserve current save schema through migration/versioning.

### Performance budget

- Target 60 FPS desktop and graceful 30 FPS minimum on representative mobile hardware.
- Room 1 must support at least 20 active Meteor Mites without gameplay simulation failure.
- Limit expensive particles, lights, and per-frame allocations.
- Inactive rooms must not continue full AI/physics simulation.

---

## 18. Acceptance criteria

Milestone 5 is accepted only when:

1. The Shattered Moon appears in Dungeon Select and launches successfully.
2. The dungeon contains five distinct rooms with explicit transitions.
3. A normal clear takes approximately 7–10 minutes after learning the mechanics.
4. Meteor Mites can swarm, attach, be removed by melee, orbit, and be launched into other targets.
5. Comet Hounds circle, telegraph, charge, and can be redirected into scenery or enemies.
6. The Graviton Crab begins Anchored, has functional parts/anchors, and becomes vulnerable through the required sequence.
7. Entropy Wisps begin intangible, become materialized through sustained Pull, and affect fragments/Flux as specified.
8. Pull and Pulse interactions differ meaningfully for every implemented enemy.
9. Light, Heavy, Anchored, and Titanic behavior is mechanically distinguishable.
10. Heavy/Anchored Displacement progress is visible and deterministic.
11. At least one breakable part alters enemy behavior and produces an independent drop opportunity.
12. At least three environmental/Physics Execution causes function and are labeled correctly.
13. Enemy HP and damage feedback clearly show progress toward defeat.
14. The Lunar Devourer has three functioning phases and cannot be defeated efficiently by basic damage alone.
15. Each boss phase reuses a mechanic taught earlier in the dungeon.
16. Required boss objects cannot be exhausted permanently.
17. Dungeon failure loses the run according to existing rules and does not corrupt progression.
18. Successful completion produces a results grade and itemized reward breakdown.
19. First clear grants an Evolution Core exactly once.
20. Materials persist after browser refresh.
21. The system supports seeded deterministic drops in tests.
22. Two elite modifiers are data-driven and function without duplicating base enemy content.
23. Existing humanoid combat, Pull/Pulse, mass conservation, Core Integrity, and Manifestation tests remain passing.
24. Automated tests cover enemy state transitions, displacement thresholds, part breaking, drops, room progression, boss phases, first-clear rewards, and failure handling.
25. Desktop and mobile-sized smoke tests complete the full dungeon.

---

## 19. Implementation order

1. Audit existing enemy, physics, dungeon, reward, and persistence systems.
2. Add typed enemy, mass-class, encounter, drop, modifier, and dungeon definitions.
3. Implement displacement, breakable parts, environmental damage attribution, and Physics Execution scoring.
4. Build Meteor Mite and Room 1 as the first vertical slice.
5. Build Comet Hound and Room 2.
6. Build Graviton Crab, anchors/plates, and Room 3.
7. Build Entropy Wisp, stabilization, entropy patches, and Room 4.
8. Build the Lunar Devourer phase state machine and Room 5.
9. Add rewards, materials, first-clear tracking, grade, and result presentation.
10. Add two elite modifiers after base encounters work.
11. Integrate placeholder/generated art and audio hooks after mechanics are validated.
12. Run unit, regression, production-build, desktop, mobile, and performance tests.
13. Produce a playtest report identifying unclear mechanics and balance risks.

Codex must not begin backlog dungeons or production gacha/monetization during this milestone.

---

## 20. Non-goals

- Implementing all proposed cosmic creatures.
- Cooperative multiplayer.
- Production online PvP changes.
- Shared world or PvPvE.
- Paid gacha, shops, advertisements, or payment processing.
- Auto-repeat or offline farming.
- Final lore/species names.
- Final costumes or large Manifestation roster.
- Native desktop/mobile packaging.
- Multiple dungeon difficulties beyond a data placeholder.
- Revive monetization or consumable continues.

---

## 21. Future bestiary backlog

These designs are retained for later contracts:

### Nebula Jelly

Support creature whose healing cloud can be compressed by Pull or dispersed by Pulse. Excessive compression may create an explosion.

### Void Leech

Attaches to expanded Fields and drains External Mass/Flux. Pulse removes it safely; pulling it inward creates Core danger.

### Solar Scarab

Carries unstable plasma. Pull accelerates detonation; Pulse vents it. Can be redirected into enemies.

### Dark-Matter Stalker

Revealed by expanded Field, materialized by Pull, damaged through melee. Pulse interrupts ambush but may return it to concealment.

### Binary Orbs

Two linked enemies whose bond can be compressed, broken, or weaponized through collision.

### Antimatter Shade

Dangerous to Pull toward the Core. Best redirected with Pulse into mass-heavy enemies.

### Future dungeons

- Nebula Nursery — support clouds, plasma, Stellar Broodmother.
- Entropy Scar — decaying arenas, hidden enemies, The Last Moment.
- Antimatter Vault — constructs, containment puzzles, Null Warden.

---

## 22. Codex handoff prompt

> Implement Milestone 5 from `cosmic_core_milestone_5_pve_expansion.md` in the existing Cosmic Core Phaser 3 + TypeScript repository. Treat the master product contract and Milestones 0–4 as existing behavior that must remain functional. First inspect and document the current enemy, dungeon, mass, Pull/Pulse, melee, Core Integrity, reward, and persistence implementations. Then follow the milestone implementation order. Build only The Shattered Moon, Meteor Mite, Comet Hound, Graviton Crab, Entropy Wisp, Lunar Devourer, two elite modifiers, the material rewards, and required shared systems. Implement mechanics with readable debug art before integrating generated sprites. Keep content and balance data-driven, force calculations fixed-tick, drops seedable, and save changes schema-versioned. Do not implement paid gacha, auto-repeat, multiplayer expansion, or backlog enemies. Run all existing and new tests, the production build, desktop and mobile-sized full-dungeon smoke tests, and a 20-Meteor-Mite performance test. Report changed files, balance defaults, generated asset provenance, measured performance, playtest findings, deviations, and remaining risks.
