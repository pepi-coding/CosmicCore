# Cosmic Core — Combat contract 1.2

This revision supersedes the combat, survival, distribution controls, and related presentation rules in 1.0 and 1.1. Collection, progression, local persistence, and offline scope remain as described in 1.1.

## Resource model

Total Mass is combat power, partitioned into Core Mass and External Mass. Redistribution conserves their sum. New collectibles may increase Total Mass up to the combat cap. Damage does not remove mass. Independent captured debris is ammunition, tracked separately from this partition.

The minimum Core share is 28%; the maximum is 100%. At 125 Total Mass, maximum Pulse gives 35 Core / 90 External, and maximum Pull gives 125 Core / 0 External. A 75 / 50 intermediate split is valid. Releasing a channel retains the distribution. Gravity persists at zero External Mass.

Core Integrity is HP, separate from Mass and Flux. Player/rival vessels have 100 Integrity; ordinary dungeon enemies have 40; the Guardian has 130. Below 20%, display CORE EXPOSED. At zero, Collapse occurs. There is no separate Stability/trauma survival system or exposure countdown. Cleared dungeon gates restore Integrity before the next room.

## Channels and damage

Hold Pull to transfer mass inward and continuously attract. Hold Pulse to transfer it outward and continuously repel. The shared Flux meter limits sustained use. Overload and interruption stop channels and require button release. Shift, Control, and the wheel no longer redistribute mass.

Melee damage equals attack power multiplied by compression, capped momentum, manifestation/mass scaling, and target vulnerability, then `100 / (100 + target Core Mass)`. Direct Core contact has 1.15 vulnerability; an open Guardian anchor adds 1.2. Melee is the main damage source; Pulse controls space and can cause collision damage. Expanded actors move more freely, have wider control/melee reach, and lower protection.

The existing three attack timings remain, including heavy anticipation, hit/miss recovery, directional recoil, compression/momentum knockback, and 60–85 ms hit-stop. Deliberate melee input provides a short forward assist within reach plus 38 world units, limited to the facing cone. Mobile uses a wider cone. No target acquisition starts attacks on its own.

## Presentation and controls

- Field radius smoothly changes from 200 world units at midpoint to 100 at maximum Pull and 300 at maximum Pulse. Rings and particles flow in the channel direction; overlapping field boundaries distort and active lines brighten.
- Humanoid rendering is enlarged from 0.8 to 1.25 scale, with a closer combat-distance camera. Duels use a compact bounded arena, midpoint framing, and bounded zoom so separated fighters fit landscape viewports.
- Every actor shows its name, smoothly updated Mass, and an Integrity bar overhead. Direct Core hits show orange damage numbers; other hits show white. Contact flashes, Core cracks, sparks, and an expanding fragmentation effect communicate damage and Collapse.
- Pull uses a braced compressed stance and dense Core light. Pulse uses an open stance, translucent body, and outward limb trails. Overload uses a flickering recovery state.
- The left HUD shows Total/Core/External Mass and Integrity. Pull and Pulse flank a central Flux meter and three connected-hit markers. Only Impulse and Orbit Cast show cooldowns.
- The nearest enemy within Pull/melee range receives an outline and a HUD comparison: LIGHTER / PULL ADVANTAGE, BALANCED, or HEAVIER / PULL RESISTED. Guardian anchor feedback takes precedence.

## Environment and outcomes

Pillars block movement, melee, and channel line of sight. Destructible crystals release mass. Gravity wells pull bodies and debris; entropy zones damage Integrity and decay debris. Fast forced wall/pillar collisions inflict damage with a short eligibility window to avoid repeated resting-contact damage. Orbitable debris remains available.

Dungeon rooms use a 300-unit half-size, smaller than the exploration arena. Duels use a 760 × 340 unit bounded arena. PvP timeout compares remaining Integrity percentage, then Total Mass; an exact tie begins Integrity-draining sudden death.

Acceptance combines automated model/browser tests and visual inspection. Physical mobile-device performance, competitive balance, and subjective combat feel require further playtesting; this revision does not claim those are settled.
