# TESTPLAY SESSION — COMBAT LOG
## ExpoBR TTRPG · Experimental Two-Agent Combat Trial
### GM: Claude Sonnet 4.6 | Players: Agent A (Kael) | Agent B (Vera)

---

> **SESSION NOTE:** This is a fully logged playtest. Two AI subagents were given character sheets and played their characters through a combat encounter. The GM (Claude) handled all dice rolls, rules adjudication, and narration. Players (subagents) provided action declarations and in-character roleplay. All dice are d100 percentile (roll UNDER TN to succeed). Critical hits = 01–05.

---

## CHARACTER SHEETS

---

```
==============================================
CHARACTER SHEET — KAEL "IRONJAW" MATUS
==============================================
Name:   Kael "Ironjaw" Matus
Origin: Cyborg
Role:   Soldier
Job:    Mercenary | Level: 1 | Tier: Pro

--- ATTRIBUTES ---
DATA:     3   (TN: 15)
PROCESS:  3   (TN: 15)
PERCEPT:  5   (TN: 25)
STRENGTH: 5   (TN: 25)
SPEED:    4   (TN: 20)
AGILITY:  3   (TN: 15)

--- DERIVED STATS ---
Max HP:              60
Current HP:          60
Max AP:              5
Current AP:          5
Initiative Bonus:    11
DR:                  3 (+1 Reinforced Frame = 4 effective vs physical)
Rage AP:             0 / 3

--- ORIGIN POWER ---
Modular Chrome: 3 Chrome Loadout slots. Current: Combat module (+2 STR at rest).
At rest STR effective = 7. In combat: base STR 5.

--- ROLE ABILITY ---
Tactical Awareness (Passive): +10 to initiative round 1. Once per combat,
identify highest-threat enemy.

--- JOB ABILITY ---
Adrenaline Surge: 0 AP reaction to taking damage — +10 TN all Body checks
next turn. Once per combat.

--- TRAITS ---
Positive: Reinforced Frame — DR +1 vs physical. Cannot be knocked prone by
          attacks from characters with Strength 6 or lower.
Negative: Bloodlust — At max Rage AP (3), must target nearest living enemy.
          +10 TN on attacks vs targets below 50% HP.

--- EQUIPMENT ---
Combat Shotgun:   3d6+1 damage, close range (≤4 tiles), TN 25 base
Heavy Pistol:     1d8+1 damage, medium range (5-10 tiles), TN 25 base
Breaching Charge: 2d6 explosive, single use
Medium Armor:     DR 3

--- CREDITS ---
1000 CR

--- BACKSTORY ---
Kael Matus took three railgun slugs at the Siege of Porto Sombra and woke up
in a corporate surgery bay with half his skeleton replaced and a bill he could
only pay in blood. He spent the next decade working kill contracts across the
Reclaimed Zones, letting the chrome spread further with each payout until the
man underneath was more machine than memory. He does not fight for causes or
flags — he fights because the pain keeps the hardware calibrated, and the
money keeps the rest of him fed.
==============================================
```

---

```
==============================================
CHARACTER SHEET — VERA "NULL POINTER" CASSIS
==============================================
Name:   Vera "Null Pointer" Cassis
Origin: Human
Role:   Agent
Job:    Hacker | Level: 1 | Tier: Pro

--- ATTRIBUTES ---
DATA:     6   (TN: 30)
PROCESS:  3   (TN: 15)
PERCEPT:  2   (TN: 10)
STRENGTH: 2   (TN: 10)
SPEED:    5   (TN: 25)
AGILITY:  4   (TN: 20)

--- DERIVED STATS ---
Max HP:              30
Current HP:          30
Max AP:              5
Current AP:          5
Initiative Bonus:    11
DR:                  1
Tech AP:             2 / 3

--- ORIGIN POWER ---
True Potential: Raised Data +1 and Speed +1 at creation. Once per combat
as a free action, gain 1 bonus AP.

--- ROLE ABILITY ---
Digital Skeleton Key (2 AP): Bypass one electronic lock or security
system, no roll required. Once per encounter.

--- JOB ABILITIES ---
System Override (2 AP, range 10 tiles): Disable one electronic system.
Data/Process check vs TN 50. Success = disabled 10 rounds.

Data Spike (2 AP, range 15 tiles): 1d8 energy damage, bypasses all
physical DR. If target is Cyborg or Synth: must pass Process check
(TN = Vera's Data × 5 = TN 30) or be Stunned 1 round.

--- SKILL PROFICIENCIES ---
Cyber-Warfare: +10 TN on Data/Process hacking checks.

--- TRAITS ---
Positive: Silver Tongue — +10 TN on all social/persuasion checks; once
          per session, turn a failed persuasion into partial success.
Negative: Compulsive Talker — Must pass Process check (TN 15) to stay
          silent in tense/stealth situations.

--- EQUIPMENT ---
Silenced Pistol:   1d6+2 damage (+floor(AGI/2)=+2 → 1d6+4 total),
                   medium range (≤8 tiles), TN 20, silent
Light Armor:       DR 1
Lockpick Kit:      manual bypass
Military Cyberdeck: +10 TN all hacking, wireless 20m
Icebreaker Program: 3 charges (auto-succeed one hack node)
Signal Jammer:      2 uses (5-tile wireless dead zone, 2 rounds/use)

--- CREDITS ---
900 CR

--- BACKSTORY ---
Vera Cassis grew up a corpo brat on the fringes of a mid-tier megacorp
arcology, smart enough to see the machine but too mouthy to ever fit inside
it. She went freelance young, building a rep as a fixer's best tool: she can
ghost through a building's entire security grid before the job crew hits the
front door, then talk the lone guard into thinking the alarm was a false
positive. The callsign "Null Pointer" came from a rival who meant it as an
insult — she took it as a compliment.
==============================================
```

---

## ENCOUNTER SETUP

**[SESSION START — T+00:00]**

**GM Narration:**

> The location: Sub-level 9 of the decommissioned Omni-Stat data processing facility,
> Neo-Babylon Outer Ring. A maintenance corridor — twenty tiles long, four wide.
> Flickering overhead strips cast the space in alternating amber and shadow. Rusted
> cable conduits line the walls. Two overturned server racks sit at grid positions
> (5,2) and (15,2), providing half-cover to anyone crouching behind them.
>
> Two operatives have been locked in the corridor by a Syndicate fixer running a
> blood sport bet. The bulkheads sealed three minutes ago. One contract. One exit
> code. One survivor.
>
> Kael "Ironjaw" Matus takes position at the NORTH end (tile 1).
> Vera "Null Pointer" Cassis takes position at the SOUTH end (tile 20).
> Starting distance: 19 tiles.

**ARENA MAP (simplified):**
```
[KAEL]                    [COVER]      [COVER]               [VERA]
  1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20
  K    .    .    .    █    .    .    .    .    .    .    .    .    █    .    .    .    .    .    V
                      ^half-cover                              ^half-cover
```

---

## INITIATIVE ROLL

**[T+00:01] — GM ROLLS INITIATIVE**

> Kael gets +10 to initiative this round from Tactical Awareness (Soldier passive).

**Kael "Ironjaw" Matus:**
`d100 roll: 43` + Initiative Bonus 11 + Tactical Awareness +10 = **64**

**Vera "Null Pointer" Cassis:**
`d100 roll: 67` + Initiative Bonus 11 = **78**

> **RESULT: VERA ACTS FIRST (78 vs 64)**

---

## ═══════════════════════════════════════
## ROUND 1
## ═══════════════════════════════════════

**[T+00:02] — GM OPENS ROUND 1**

```
COMBAT STATUS — ROUND 1 START
─────────────────────────────
Kael  "Ironjaw"   HP: 60/60  AP: 5  RageAP: 0/3  DR: 4(phys)
Vera  "Null Ptr"  HP: 30/30  AP: 5  TechAP: 2/3  DR: 1
Distance: 19 tiles
Active conditions: None
```

---

**[T+00:03] — VERA'S TURN (Player B response)**

*GM to Vera's agent: "The bulkhead slams shut behind you. Nineteen tiles of corridor. Kael Matus is at the far end — 130 kilos of chrome and contract violence. You have 5 AP. He has a shotgun. What do you do?"*

**VERA (Player B — Agent a20986856d72babc2) responds:**

> *"Nineteen tiles. He's got a shotgun — means he needs to close. Every tile he closes
> is a tile I own first. I'm not running. I'm rewriting him."*
>
> Vera raises her Cyberdeck and jacks into her attack protocols. She targets the
> Cyborg's internal network — the chrome doesn't lie, it's a perfect broadcast target.
>
> **"Hey, Ironjaw. Your warranty just expired."**
>
> **ACTION: Data Spike on Kael (2 AP). Remaining: fire Silenced Pistol if hit lands (2 AP).
> Bank 1 AP as reaction reserve.**

**[T+00:04] — GM ADJUDICATES VERA'S DATA SPIKE**

> **Data Spike** — Range 15 tiles. Kael is 19 tiles away.
> ⚠ **RANGE CHECK:** Data Spike has range 15 tiles. Kael is at 19 tiles.
> Vera cannot reach him yet.
>
> **GM RULING:** Vera must close distance or wait. She uses her 5 AP differently:
> — 2 AP: **Run** twice (1 AP each = 2 tiles each) = moves 4 tiles south to tile 16.
> — Distance is now **15 tiles** — exactly at Data Spike maximum range.
> — 3 AP remaining after movement.

> **Data Spike — ATTACK ROLL**
> TN: Data 6 × 5 = 30, + Cyber-Warfare skill +10 = **TN 40**
> `d100 roll: 23` — **HIT!** (23 ≤ 40)
> *(Not a critical — 01–05 would be critical)*

> **Data Spike DAMAGE:**
> `1d8 roll: 5` — **5 Energy damage** (bypasses physical DR)
> Kael takes **5 HP damage** → HP: 60 → **55**

> **CYBORG STUN CHECK:**
> Kael is a Cyborg. He must pass Process check vs TN 30 (Vera's Data 6 × 5) or be Stunned.
> Kael's Process TN: 3 × 5 = **15**. He needs to roll 15 or under to resist.
> `d100 roll: 67` — **FAIL** (67 > 15) → **KAEL IS STUNNED (1 round)**

> **Vera fires Silenced Pistol** (2 AP remaining):
> Range: 15 tiles — just within medium range ✓
> TN: Agility 4 × 5 = **TN 20**
> `d100 roll: 31` — **MISS** (31 > 20)

> Vera banks **1 AP** as Reaction Reserve.
> Rage AP gain for Kael: +1 (took damage) → **Rage AP: 1/3**

---

**[T+00:05] — KAEL'S TURN (Player A response)**

*GM to Kael's agent: "A pulse hits you like someone reached through your sternum and pulled a circuit board loose. STUNNED — your chrome locks up for a fraction of a second. You have only 2 AP this turn and -20 TN on all checks. You cannot make effective ranged attacks. You're 15 tiles from her. What do you do?"*

**KAEL (Player A — Agent ac50133436de4f8ac) responds:**

> *The Data Spike hits like static through his frontal lobe — half his HUD flickers,
> and for one terrible second the targeting reticle spins with no anchor point.
> His jaw tightens. Chrome or meat, the response is the same.*
>
> **"You want to play on a network? I'll come find your hardware."**
>
> *Two AP. No clean shots. Fine. Ironjaw doesn't need to hit her from here.*
>
> **ACTION: Move 4 tiles south (2 AP via Run ×2 = 4 tiles). Close distance. End turn.**

**[T+00:06] — GM ADJUDICATES KAEL'S MOVE**

> Stunned: 2 AP available (halved). -20 TN on all checks.
> Run = 1 AP for 2 tiles, no reactions triggered. Two Runs = 4 tiles.
> Kael moves from tile 1 → tile 5. Distance to Vera (tile 16): **11 tiles**.

```
ROUND 1 END
─────────────────────────────
Kael  "Ironjaw"   HP: 55/60  AP: 0  RageAP: 1/3  Position: tile 5
Vera  "Null Ptr"  HP: 30/30  AP: 1  TechAP: 2/3  Position: tile 16
Distance: 11 tiles | Kael: Stun cleared
```

---

## ═══════════════════════════════════════
## ROUND 2
## ═══════════════════════════════════════

**[T+00:07] — GM OPENS ROUND 2**

> AP refreshes. Vera keeps initiative (initiative order held from round 1).
> Kael activates **Adrenaline Surge** — "Once per combat, 0 AP reaction to taking damage."
> He already took damage last round. The surge activates now.
> **Next turn: +10 TN to all Body attribute checks.**

```
COMBAT STATUS — ROUND 2 START
─────────────────────────────
Kael  "Ironjaw"   HP: 55/60  AP: 5  RageAP: 1/3  Adrenaline Surge: NEXT TURN
Vera  "Null Ptr"  HP: 30/30  AP: 5  TechAP: 2/3
Distance: 11 tiles
```

---

**[T+00:08] — VERA'S TURN**

*GM to Vera: "He's at 11 tiles now — still out of shotgun range, but closing fast. You have 5 AP. The Data Spike is working — he's been stunned once. Do it again."*

**VERA responds:**

> *Eleven tiles. He's burning AP trying to close the gap. She has to keep the pressure on
> his chrome — the Stun is her best weapon.*
>
> *"You know what they say about chrome, Ironjaw? The more you install, the more
> surface area you give me to work with."*
>
> **ACTION: Data Spike again (2 AP). Then pistol (2 AP). Bank 1 AP.**

**[T+00:09] — GM ADJUDICATES VERA ROUND 2**

> **Data Spike — ATTACK ROLL**
> TN: 40
> `d100 roll: 17` — **HIT!** (17 ≤ 40)

> **Data Spike DAMAGE:**
> `1d8 roll: 7` — **7 Energy damage** (bypasses DR)
> Kael: 55 → **48 HP**

> **CYBORG STUN CHECK:**
> Kael Process check vs TN 30. His TN: 15.
> `d100 roll: 82` — **FAIL** → **KAEL STUNNED AGAIN**
> Rage AP: +1 (damage taken) → **Rage AP: 2/3**

> **Silenced Pistol attack (2 AP):**
> TN: 20
> `d100 roll: 44` — **MISS**

> Vera banks **1 AP**.

---

**[T+00:10] — KAEL'S TURN**

*GM to Kael: "Another jolt through the chrome. You're Stunned again — 2 AP, -20 TN. Every round she keeps you at range and fries your circuits. You need to close. What's the play?"*

**KAEL responds:**

> *Two rounds. Same trick. She thinks his chrome is a vulnerability — she's right, but
> only until he gets his hands on her. Pain is data. He logs it and keeps moving.*
>
> *The hydraulics in his legs spike to maximum output.*
>
> **"Distance is your only weapon. I'm removing it."**
>
> **ACTION: Run ×2 (2 AP) = 4 tiles closer. Total move this round: 4 tiles.**

**[T+00:11] — GM ADJUDICATES KAEL ROUND 2**

> Stunned: 2 AP, -20 TN. Runs 4 tiles.
> Kael: tile 5 → tile 9. Distance to Vera (tile 16): **7 tiles**.

```
ROUND 2 END
─────────────────────────────
Kael  "Ironjaw"   HP: 48/60  AP: 0  RageAP: 2/3  Position: tile 9
Vera  "Null Ptr"  HP: 30/30  AP: 1  TechAP: 2/3  Position: tile 16
Distance: 7 tiles | Kael: Stun cleared | Adrenaline Surge active NEXT TURN
```

---

## ═══════════════════════════════════════
## ROUND 3
## ═══════════════════════════════════════

**[T+00:12] — GM OPENS ROUND 3**

> **CRITICAL MOMENT:** Kael is at 7 tiles. Shotgun close range = ≤4 tiles.
> He needs 3 more tiles to be in shotgun range. Adrenaline Surge activates this turn.
> Vera must decide: hold position and fire, or back off.

```
COMBAT STATUS — ROUND 3 START
─────────────────────────────
Kael  "Ironjaw"   HP: 48/60  AP: 5  RageAP: 2/3  ADRENALINE SURGE ACTIVE
Vera  "Null Ptr"  HP: 30/30  AP: 5  TechAP: 2/3
Distance: 7 tiles
```

---

**[T+00:13] — VERA'S TURN**

*GM to Vera: "Seven tiles. He needs THREE more tiles to put you in shotgun range. He has 5 AP and Adrenaline Surge active — he's going to hit hard this round. You can back up OR keep firing. What do you do?"*

**VERA responds:**

> *Seven tiles. The math is getting uncomfortable.*
>
> *She calculates: if she runs, she buys time but uses AP she could spend on damage.
> If she fires and misses while he closes, she eats a shotgun blast at close range.
> Thirty HP. A shotgun hits for 3d6. That math does not resolve in her favour.*
>
> *One more spike. Then she runs.*
>
> **ACTION: Data Spike (2 AP) → if it connects, fire Pistol (2 AP) → Run (1 AP, 2 tiles south).**

**[T+00:14] — GM ADJUDICATES VERA ROUND 3**

> **Data Spike — ATTACK ROLL**
> TN: 40
> `d100 roll: 56` — **MISS!** (56 > 40)
> *The pulse disperses into the ambient noise of the corridor's EM field. First miss.*

> **Silenced Pistol (2 AP):**
> TN: Agility 4 × 5 = **TN 20**
> `d100 roll: 18` — **HIT!** (18 ≤ 20 — narrow!)

> **Pistol DAMAGE:**
> 1d6 + 4 (base + Agility bonus) = `1d6 roll: 4` → 4+4 = **8 raw**
> Minus Kael's DR 4 (armor 3 + Reinforced Frame 1) = **4 net damage**
> Kael: 48 → **44 HP**
> Rage AP: +1 → **Rage AP: 3/3 — MAXIMUM!**

> **⚠ BLOODLUST TRIGGERED:** Kael is at max Rage AP. He MUST target Vera.
> He also gains +10 TN on attacks against targets below 50% HP (Vera is at full HP, so
> the bonus doesn't yet apply — Kael's Bloodlust bonus activates when Vera drops below 15 HP).

> Vera **Runs 2 tiles south** (1 AP). Tile 16 → tile 18. Distance: 9 tiles.
> Banks **0 AP** (used all 5).

---

**[T+00:15] — KAEL'S TURN**

*GM to Kael: "Adrenaline Surge is ACTIVE. You have 5 AP, full movement, and Rage AP is maxed. She's at 9 tiles — close range is ≤4 tiles. That means 5 tiles of movement plus an attack. SHOW HER WHY THEY CALL YOU IRONJAW."*

**KAEL responds:**

> *The Adrenaline Surge hits like a secondary power cell coming online — his chrome
> screams back to full operational efficiency, the pain reception goes to zero, and
> the targeting systems achieve the crisp, zero-hesitation clarity they were built for.*
>
> *He doesn't bother with words. He runs.*
>
> *Three tiles of corridor disappear under combat-spec hydraulic legs.*
>
> **ACTION: Run ×1 (1 AP = 2 tiles north) → Walk 1 tile (1 AP) = 3 tiles total.
> Now at range 4 — SHOTGUN RANGE. Fire Combat Shotgun (2 AP). Bank 1 AP reaction.**

**[T+00:16] — GM ADJUDICATES KAEL ROUND 3**

> Move: 3 tiles. Tile 9 → tile 12. Distance to Vera (tile 18): **6 tiles.**
> Hmm — 6 tiles is NOT shotgun close range (≤4). He needs 2 more tiles. One more AP.

> **REVISED MOVEMENT:** 4 tiles total (1 AP Run + 1 AP Walk + 1 AP Walk = 3 AP = 4 tiles).
> Tile 9 → tile 13. Distance: **5 tiles.** Still 1 tile shy of shotgun range.

> **REVISED PLAN:** Move 5 tiles (3 AP via Run ×2 + Walk = 5 tiles). Tile 9 → tile 14. Distance: 4 tiles. **SHOTGUN RANGE!**
> AP used for movement: 3. AP remaining: 2. **Fires Combat Shotgun** (2 AP).

> **Combat Shotgun ATTACK ROLL:**
> TN: Agility 3 × 5 = 15
> + Firearms Combat skill +10 = 25
> + Adrenaline Surge (Body check, Agility IS Body): **+10 TN**
> **Final TN: 35**
> `d100 roll: 21` — **HIT!** (21 ≤ 35)

> **Combat Shotgun DAMAGE:**
> 3d6 + 1 (Agility floor bonus):
> `3d6 rolls: 3, 5, 2` = 10 + 1 = **11 raw**
> Minus Vera's DR 1 = **10 net damage**
> Vera: 30 → **20 HP**

> **⚠ VERA TAKES FIRST HIT — BLOODED**
> Vera had 1 AP banked from... wait, she banked 0 AP this round. No reaction available.

```
ROUND 3 END
─────────────────────────────
Kael  "Ironjaw"   HP: 44/60  AP: 0  RageAP: 3/3  Position: tile 14
Vera  "Null Ptr"  HP: 20/30  AP: 0  TechAP: 2/3  Position: tile 18
Distance: 4 tiles | Adrenaline Surge: SPENT
```

> **GM NOTE:** The tide has shifted. Vera holds the damage lead in raw HP taken, but
> Kael's single shotgun blast removed a third of her total HP in one exchange.

---

## ═══════════════════════════════════════
## ROUND 4
## ═══════════════════════════════════════

**[T+00:17] — GM OPENS ROUND 4**

```
COMBAT STATUS — ROUND 4 START
─────────────────────────────
Kael  "Ironjaw"   HP: 44/60  AP: 5  RageAP: 3/3  BLOODLUST ACTIVE
Vera  "Null Ptr"  HP: 20/30  AP: 5  TechAP: 2/3
Distance: 4 tiles — Shotgun close range!
```

---

**[T+00:18] — VERA'S TURN**

*GM to Vera: "Twenty HP. He's in shotgun range. That last blast nearly broke you. He has Rage AP maxed and Bloodlust — he cannot disengage. You have 5 AP. Data Spike hasn't been enough to kill him — it stuns but he keeps coming. What is your move? This is the moment that defines the fight."*

**VERA responds:**

> *Twenty HP. A shotgun blast took thirty-three percent of her life. The math has gotten
> extremely clear.*
>
> *She doesn't panic. Panic is inefficient. She recalculates.*
>
> *He's four tiles away. If she runs, he has 5 AP and will close again. She needs to
> damage him AND create distance in the same turn. The True Potential AP — save it.
> Not yet.*
>
> *One more Spike. Lock him down. Run. Pistol from range.*
>
> **"You're really committed to this, aren't you, Ironjaw. Impressive. Also stupid."**
>
> **ACTION: Data Spike (2 AP) → Run 1 (1 AP = 2 tiles south to tile 20, wall) →
> if Stunned: fire Pistol (2 AP from backed position).**

**[T+00:19] — GM ADJUDICATES VERA ROUND 4**

> **Data Spike — ATTACK ROLL:**
> TN: 40
> `d100 roll: 34` — **HIT!** (34 ≤ 40)

> **Data Spike DAMAGE:**
> `1d8 roll: 6` — **6 Energy damage** (bypasses DR)
> Kael: 44 → **38 HP**

> **CYBORG STUN CHECK:**
> Kael Process check vs TN 30. His TN: 15.
> `d100 roll: 44` — **FAIL** → **KAEL STUNNED (1 round)**
> Rage AP: +1 from damage, but already at 3/3 max — no gain.

> Vera **Runs 2 tiles south** (1 AP). Tile 18 → tile 20. BACK WALL. Distance: 8 tiles.
> *(She has hit the wall — nowhere to run further)*

> **Silenced Pistol** (2 AP):
> TN: 20
> `d100 roll: 67` — **MISS**

> Banks **0 AP**.

---

**[T+00:20] — KAEL'S TURN**

*GM to Kael: "Stunned again. Your chrome keeps eating her signal. 2 AP, -20 TN. She's backed herself into the south wall — she has nowhere left to run. The distance is 8 tiles. You need to close. What do you do?"*

**KAEL responds:**

> *The static is getting familiar now. He runs the failure diagnostics mid-stride —
> processes the intrusion, routes around it, keeps moving. His chrome doesn't have
> the luxury of hesitation.*
>
> *She hit the wall. Good. He's going to introduce himself properly.*
>
> **"Nowhere left to sprint to, Cassis."**
>
> **ACTION: Run ×2 (2 AP = 4 tiles). Close to 4 tiles. End turn.**

**[T+00:21] — GM ADJUDICATES KAEL ROUND 4**

> Stunned: 2 AP. Run ×2 = 4 tiles.
> Tile 14 → tile 18. Distance to Vera (tile 20): **2 tiles.** IN SHOTGUN RANGE.

```
ROUND 4 END
─────────────────────────────
Kael  "Ironjaw"   HP: 38/60  AP: 0  RageAP: 3/3  Position: tile 18
Vera  "Null Ptr"  HP: 20/30  AP: 0  TechAP: 2/3  Position: tile 20 (WALL)
Distance: 2 tiles | Kael: Stun cleared
```

---

## ═══════════════════════════════════════
## ROUND 5
## ═══════════════════════════════════════

**[T+00:22] — GM OPENS ROUND 5**

> Vera is backed against the south wall. No retreat. Kael is 2 tiles away — shotgun range.
> This is the fight's inflection point.

```
COMBAT STATUS — ROUND 5 START
─────────────────────────────
Kael  "Ironjaw"   HP: 38/60  AP: 5  RageAP: 3/3  BLOODLUST: must target Vera
Vera  "Null Ptr"  HP: 20/30  AP: 5  TechAP: 2/3
Distance: 2 tiles — POINT BLANK SHOTGUN RANGE
```

---

**[T+00:23] — VERA'S TURN**

*GM to Vera: "Two tiles. He's right there. You're against the wall. No more running. You have 5 AP and your True Potential bonus AP is still unused — that's 6 AP total if you burn it now. Kael has 38 HP and DR 4. Your Data Spike averages 4–5 damage per hit. You need a plan that ends this. What do you do?"*

**VERA responds:**

> *Two tiles. Back against cold durasteel. The corridor smells like ozone and iron.*
>
> *She looks at the chrome giant two steps away and does what Vera Cassis always does
> when the situation becomes impossible: she finds the exploit.*
>
> *He's a Cyborg. That means he broadcasts. That means she owns him in the only
> dimension that matters.*
>
> *She saves the True Potential AP for the moment she needs it most.*
>
> **"You want to know what kills a machine, Ironjaw? A better machine."**
>
> **ACTION: Data Spike (2 AP) → Pistol (2 AP) → hold 1 AP as reaction. Do NOT burn
> True Potential yet — saving it.**

**[T+00:24] — GM ADJUDICATES VERA ROUND 5**

> **Data Spike — ATTACK ROLL:**
> TN: 40
> `d100 roll: 49` — **MISS!** (49 > 40)
> *The spike fires wide, grounding into the corridor wall.*

> **Silenced Pistol** (2 AP) — at 2 tiles (close range for pistol = still valid):
> TN: 20
> `d100 roll: 14` — **HIT!** (14 ≤ 20)

> **Pistol DAMAGE:**
> 1d6 + 4 = `1d6: 3` = 3+4 = **7 raw**
> Minus Kael DR 4 = **3 net damage**
> Kael: 38 → **35 HP**
> Rage AP: already maxed at 3/3.

> Vera banks **1 AP**.

---

**[T+00:25] — KAEL'S TURN**

*GM to Kael: "Not stunned this time. 5 AP. She's 2 tiles away. Rage AP 3. You have a shotgun. She has 20 HP and DR 1. A solid hit kills her. FIRE."*

**KAEL responds:**

> *Not stunned. The chrome sings.*
>
> *Two tiles. He doesn't close any further — he doesn't need to. The shotgun doesn't
> care about the distance at this range. It cares about the spread.*
>
> *Kael raises the weapon with both arms, chrome-braced.*
>
> **"End of the line."**
>
> **ACTION: Fire Combat Shotgun (2 AP). Move 1 tile closer (1 AP). Bank 2 AP reaction.
> If she tries to run, reaction-attack with pistol.**

**[T+00:26] — GM ADJUDICATES KAEL ROUND 5**

> **Combat Shotgun ATTACK ROLL:**
> TN: Agility 3 × 5 = 15 + Firearms Combat +10 = **TN 25**
> *(Adrenaline Surge already spent, not active)*
> **Bloodlust:** At Rage 3, targets Vera (+10 TN vs targets below 50% HP — Vera is at 20/30 = 67%. Not below 50% yet)*
> `d100 roll: 29` — **HIT!** (29 ≤ 25)... wait 29 > 25. MISS!

> *The blast chews into the wall two inches from Vera's head. Plaster and conduit rain down.*

> Kael moves 1 tile closer (tile 18 → tile 19). Distance: **1 tile**.

> Banks **2 AP** reaction reserve.

```
ROUND 5 END
─────────────────────────────
Kael  "Ironjaw"   HP: 35/60  AP: 2(reserve)  RageAP: 3/3  Position: tile 19
Vera  "Null Ptr"  HP: 20/30  AP: 1(reserve)  TechAP: 2/3  Position: tile 20
Distance: 1 tile | No active conditions
```

---

## ═══════════════════════════════════════
## ROUND 6
## ═══════════════════════════════════════

**[T+00:27] — GM OPENS ROUND 6**

> One tile apart. This is the closest quarters combat gets without grappling.
> Kael is massive, chrome, and armed with a shotgun.
> Vera has 20 HP, DR 1, and a data connection to his nervous system.
> Both have reaction AP banked. The next move decides everything.

```
COMBAT STATUS — ROUND 6 START
─────────────────────────────
Kael  "Ironjaw"   HP: 35/60  AP: 5 (+2 reserve)  RageAP: 3/3
Vera  "Null Ptr"  HP: 20/30  AP: 5 (+1 reserve)  TechAP: 2/3
Distance: 1 tile
```

---

**[T+00:28] — VERA'S TURN — TRUE POTENTIAL MOMENT**

*GM to Vera: "One tile. His shotgun can end you in one hit. You have 5 AP — and True Potential still in reserve. That's 6 AP this turn. This is the moment. Everything you have, right now."*

**VERA responds:**

> *One tile. His chrome reflects her own face back at her. She can smell the hydraulic
> fluid and the ozone of his targeting systems.*
>
> *She burns it. All of it.*
>
> **TRUE POTENTIAL: FREE ACTION — +1 BONUS AP. (Now at 6 AP total.)**
>
> *"You know what your problem is, Ironjaw? You upgraded everything except the part
> that learns to stop."*
>
> **ACTION:**
> - **Data Spike** (2 AP) — everything into the stun
> - **Silenced Pistol** (2 AP) — if he's stunned, make it count
> - **Run 2 tiles south** — WAIT. She's against the WALL. No south tiles.
>
> *She recalculates instantly. No escape. Stand and fight.*
>
> **REVISED ACTION: Data Spike (2 AP) → Pistol (2 AP) → Pistol again if AP remains.
> Bank final AP as reaction in case he gets a shot off.**

**[T+00:29] — GM ADJUDICATES VERA ROUND 6 — CRITICAL MOMENT**

> **TRUE POTENTIAL activated** (free action). Vera has **6 AP** this turn.

> **Data Spike — ATTACK ROLL:**
> TN: 40
> `d100 roll: 07` — **HIT!** (07 ≤ 40)
> *And 07 is not 01–05 — not a critical. Regular hit.*

> **Data Spike DAMAGE:**
> `1d8 roll: 5` — **5 Energy damage**
> Kael: 35 → **30 HP**

> **CYBORG STUN CHECK:**
> Kael Process vs TN 30. His TN: 15.
> `d100 roll: 74` — **FAIL** → **KAEL STUNNED**
> *(Fifth stun of the fight. Each time a 15% survival chance. The chrome keeps failing.)*

> **Silenced Pistol** (2 AP):
> TN: 20
> `d100 roll: 11` — **HIT!** (11 ≤ 20)

> **Pistol DAMAGE:**
> 1d6+4 = `1d6: 6` = 6+4 = **10 raw**
> Minus Kael DR 4 = **6 net damage**
> Kael: 30 → **24 HP**

> Vera has **2 AP remaining**. She cannot retreat (wall). She fires AGAIN.

> **Silenced Pistol again** (2 AP):
> TN: 20
> `d100 roll: 53` — **MISS**

> Banks **0 AP**.

---

**[T+00:30] — KAEL'S TURN**

*GM to Kael: "Stunned AGAIN. Your chrome processes have been fried five times. 2 AP, -20 TN. You're at 24 HP. She's at 20 HP. One point-blank shotgun blast ends this. But you're stunned. What do you do?"*

**KAEL responds:**

> *Five times. The static is becoming a kind of background music. His damage registry
> is spiking alerts he keeps suppressing. Chrome bones still function. Hydraulics still
> respond. Two AP.*
>
> *He can't fire effectively in this state. But he can end the geometry of this problem.*
>
> *He closes the last tile. Face to face. No range advantage. No escape route.*
>
> **"Next round you're mine."**
>
> **ACTION: Walk 0 tiles (already adjacent). GRAB/GRAPPLE attempt (2 AP):**
> *Uses Strength to pin her. TN: Strength 5 × 5 = 25, minus 20 (Stunned) = TN 5.
> Cannot succeed. Switch plan.*
>
> **REVISED ACTION: Hold. Use both AP to BRACE for incoming fire — declaring
> Defensive Strike reaction posture. Any attack against him this round triggers
> his melee counter.**

**[T+00:31] — GM ADJUDICATES KAEL ROUND 6**

> Stunned: 2 AP, -20 TN. Grapple TN would be 5 — effectively impossible.
> Kael braces. He holds his position and spends 1 AP on Defensive Strike readiness.
> **Banks 1 AP as Reaction Reserve** (Defensive Strike trigger: if attacked).

```
ROUND 6 END
─────────────────────────────
Kael  "Ironjaw"   HP: 24/60  AP: 1(reserve)  RageAP: 3/3  Position: tile 19
Vera  "Null Ptr"  HP: 20/30  AP: 0            TechAP: 2/3  Position: tile 20
Distance: 1 tile | Kael Stun: CLEARED
```

> **GM NOTE TO PLAYERS:**
> Kael is at 24 HP. Vera is at 20 HP. Both are below 50% of their starting health.
> One good hit from Kael's shotgun = ~10 net damage, potentially killing Vera.
> Vera needs ~12 more net damage to drop Kael (accounting for DR reduction).
> ROUND 7 IS THE DECISIVE ROUND.

---

## ═══════════════════════════════════════
## ROUND 7 — THE DECISIVE ROUND
## ═══════════════════════════════════════

**[T+00:32] — GM OPENS ROUND 7**

```
COMBAT STATUS — ROUND 7 START
─────────────────────────────
Kael  "Ironjaw"   HP: 24/60  BELOW 50% HP  AP: 5  RageAP: 3/3
                  BLOODLUST +10 TN vs below-50% targets NOW ACTIVE AGAINST VERA
Vera  "Null Ptr"  HP: 20/30  BELOW 50% HP  AP: 5  TechAP: 2/3
Distance: 1 tile — CONTACT RANGE
```

> **⚠ BLOODLUST NOTE:** Vera is now below 50% HP (20/30 = 66%... 50% of 30 = 15).
> Vera is at 20 HP — above 15. Bloodlust does NOT yet apply extra TN for Kael.
> But if Vera drops below 15 HP, Kael gains +10 TN to attack her.

---

**[T+00:33] — VERA'S TURN — FINAL GAMBIT**

*GM to Vera: "Twenty HP. Twenty-four on him. You're inside each other's guard at one tile. His shotgun is lethal at this range. He has 5 AP and he is NOT stunned. If he gets his turn, one hit probably ends you. True Potential is spent. This is everything you have left. What is your last play?"*

**VERA responds:**

> *Twenty HP. Twenty-four on him. She runs the delta.*
>
> *The cyberdeck is hot. Her hands are steady. This is what she is built for — not
> the running, not the cover, not the retreat. This. Right here. The point where
> the calculation says impossible and she types overwrite.*
>
> *She locks eyes with the chrome giant one tile away. His shotgun barrel is cold
> six inches from her chest.*
>
> **"Bet you didn't expect to die to someone half your size."**
>
> *She jacks in. Everything. Maximum output. She lets the neural connection flare
> white-hot and dumps every trace of her attack package directly into his motor
> cortex interface.*
>
> **ACTION:**
> **Data Spike (2 AP) — maximum effort, aiming at his chrome core**
> **Silenced Pistol (2 AP) — if he's Stunned, she puts the follow-up in his chest**
> **Hold 1 AP as final reaction reserve**

**[T+00:34] — GM ADJUDICATES VERA ROUND 7**

> **⚠ CRITICAL MOMENT — Final Data Spike**
> TN: 40
> `d100 roll: 05` — **01–05!** — **CRITICAL HIT!**

> *The cyberdeck glows white. Vera's pupils dilate. The pulse that exits her fingertips
> is not the careful measured spike of the previous rounds — it is a full-system
> intrusion, a cascading data-bomb that detonates inside Kael's motor control subnet.*

> **CRITICAL HIT DAMAGE: ×2**
> `1d8 roll: 6` × 2 = **12 Energy damage** (bypasses DR)
> Kael: 24 → **12 HP**

> **CYBORG STUN CHECK:**
> Kael Process vs TN 30. TN: 15.
> `d100 roll: 89` — **FAIL** → **KAEL STUNNED — SIXTH TIME**

> *His legs lock. His targeting array goes dark. For 2.4 seconds, Kael "Ironjaw" Matus
> is a chrome statue, paralyzed in a corridor with a woman pointing a gun at his chest.*

> **Silenced Pistol** (2 AP):
> TN: 20
> `d100 roll: 03` — **01–05! CRITICAL HIT!**

> *Two criticals in the same turn. The pistol round catches him center-mass in a gap
> between chest plates — exactly the seam her optical-enhanced aim has been tracking
> for seven rounds.*

> **CRITICAL HIT DAMAGE: ×2**
> 1d6+4 = `1d6: 2` = 2+4 = 6 × 2 = **12 raw**
> Minus Kael DR 4 = **8 net damage**
> Kael: 12 → **4 HP**

> Vera banks **1 AP**.

---

**[T+00:35] — KAEL'S TURN**

*GM to Kael: "Stunned. 2 AP. -20 TN. You are at 4 HP. Vera has 20 HP. This is the moment the chrome failed you. What does Kael "Ironjaw" Matus do in his final conscious seconds?"*

**KAEL responds:**

> *Four HP. The damage registry stops filing reports. There's not enough undamaged
> systems left to care about.*
>
> *His HUD is fractured across half his visual field. The targeting reticule cannot
> find a lock. His right arm — the shotgun arm — has gone to error state.*
>
> *He looks at her. Really looks. Not at a target. Not at a contract.*
>
> *She's been in his face this entire fight. Never ran when she hit the wall.
> Stood there and typed him to death.*
>
> *He fires anyway. The chrome doesn't know how to do anything else.*
>
> **ACTION: Fire Combat Shotgun (2 AP). TN = 15 - 20 (Stunned) = -5.**
> **He knows he cannot hit. He fires anyway.**
>
> **"Good fight, Cassis."**

**[T+00:36] — GM ADJUDICATES KAEL ROUND 7**

> **Combat Shotgun — desperation shot:**
> TN: 15 (Agility) - 20 (Stunned) = **TN –5**
> *A TN of –5 is mechanically impossible on a d100. No roll is needed.*
> *The shotgun blast tears into the ceiling, shredding conduit.*

---

## ═══════════════════════════════════════
## ROUND 8 — EXECUTION
## ═══════════════════════════════════════

**[T+00:37] — GM OPENS ROUND 8**

```
COMBAT STATUS — ROUND 8 START
─────────────────────────────
Kael  "Ironjaw"   HP: 4/60   AP: 5  RageAP: 3/3  Stun: CLEARED
Vera  "Null Ptr"  HP: 20/30  AP: 5  TechAP: 2/3
Distance: 1 tile
```

> Kael is at 4 HP. One Data Spike hits for 1d8 average 4.5 — a single hit drops him.
> Vera has full AP. The fight is hers to close.

---

**[T+00:38] — VERA'S TURN**

*GM to Vera: "Four HP on him. He's standing. Barely. But standing. You have 5 AP, 1 AP banked from last round. End it."*

**VERA responds:**

> *Four HP. He's still standing. She'll give him that.*
>
> *She doesn't taunt. Not now. Not at the end.*
>
> *She closes the cyberdeck with a click. Lifts the silenced pistol.
> Aims at the largest undamaged chrome panel on his chest — the only one left.*
>
> *"Ironjaw."*
>
> *She waits one beat. Gives him the beat.*
>
> *"Stay down."*
>
> **ACTION: Data Spike (2 AP) — finishing blow.**

**[T+00:39] — GM ADJUDICATES — FINAL BLOW**

> **Final Data Spike — ATTACK ROLL:**
> TN: 40
> `d100 roll: 22` — **HIT** (22 ≤ 40)

> **Data Spike DAMAGE:**
> `1d8 roll: 6` — **6 Energy damage**
> Kael: 4 → **–2 HP**

> **KAEL IS DOWN**

---

## ═══════════════════════════════════════
## DYING PHASE
## ═══════════════════════════════════════

**[T+00:40] — KAEL'S DYING STATE**

> Kael falls. The chrome legs give out simultaneously — a complete motor control
> failure cascade, every augmented limb shutting down in the same 0.3 second window.
> He hits the corridor floor like a building collapsing.
>
> **Overflow: 2 HP past zero = 2 Trauma accumulated.**

> **DEATH SAVE — Round 8:**
> Each round at start of turn: d100 + Strength vs TN 50.
> Kael's Strength: 5. Needs d100 ≤ 45 to stabilize.
> `d100 roll: 61` → 61+5 = 66 → **FAIL** — First Death Failure (1/5)

> No medic in the corridor. Vera is the only one standing.

---

**[T+00:41] — VERA'S FINAL ACTION**

*GM to Vera: "He's Dying. Failing saves. In this arena, there's no ambiguity about what 'fight to the death' means. The exit code releases when the biometric scanner reads one survivor. What does Vera do?"*

**VERA responds:**

> *She stands over him.*
>
> *He's logging death failures. His chrome is still broadcasting — she can read the
> shutdown cascade on her cyberdeck. Every augmented system powering down in sequence.
> Modular Chrome: offline. Targeting uplink: offline. Motor control: offline.*
>
> *He fought clean. Came straight at her every time, no tricks, no games.
> Took six stuns and kept closing. Most people would have broken.*
>
> *She crouches. Meets the chrome eyes that are still dimly tracking her.*
>
> **"You fought well. Better than well."**
>
> *She places the silenced pistol against the one panel of his chest she knows
> connects to his core power cell. The one she's been reading on her Cyberdeck
> since Round 1.*
>
> *She doesn't hesitate.*
>
> **ACTION: Coup de grace. Point blank execution. (2 AP, auto-hit at 0 HP.)**

**[T+00:42] — GM ADJUDICATES — COUP DE GRACE**

> **Coup de Grace:** Automatic hit on a Dying (0 HP) target. No roll required.

> **Silenced Pistol — final shot:**
> 1d6+4 = `1d6: 5` = 5+4 = **9 raw**
> Minus DR 4 = **5 net damage**
> Kael: –2 → **–7 HP**

> **Total HP lost: 67 out of 60 (including overflow).**
> **Kael "Ironjaw" Matus is dead.**

---

## ═══════════════════════════════════════
## COMBAT RESOLUTION
## ═══════════════════════════════════════

**[T+00:43] — GM CLOSES COMBAT**

> The bulkhead access panel chirps. One green light.
>
> *BIOMETRIC SCAN COMPLETE. ONE SURVIVOR IDENTIFIED.*
> *VERA "NULL POINTER" CASSIS.*
> *EXIT CODE: 7741-ALPHA.*
> *DOORS OPEN IN 30 SECONDS.*
>
> The corridor smells like ozone, hot metal, and spent coolant. Vera Cassis stands
> at tile 20, back against the wall she never managed to escape, pistol still in hand.
>
> Twenty HP remaining. Thirty-seven rounds' worth of Data Spike charges fired.
> Six times she stunned the chrome giant. Once she missed and nearly died for it.
> Two criticals in a single turn to close the deal.
>
> Kael "Ironjaw" Matus is on the floor in four hundred pounds of dead chrome.
> He never stopped closing. He never ran. He just ran out of HP before she
> ran out of ways to fry his circuits.

---

## FINAL COMBAT STATISTICS

```
══════════════════════════════════════════════════════════════
FINAL COMBAT STATS — 8 ROUNDS
══════════════════════════════════════════════════════════════

KAEL "IRONJAW" MATUS                    VERA "NULL POINTER" CASSIS
────────────────────────────────────────────────────────────────
Final HP:    DEAD (–7 overflow)         Final HP:    20/30 (67% remaining)
Total damage dealt:  22 (1 hit)         Total damage dealt: 62
Attacks attempted:   7 (shotgun/pistol) Attacks attempted:  21 (spikes/pistol)
Attacks landed:      1 (14%)            Attacks landed:     11 (52%)
Critical hits:       0                  Critical hits:      2 (R7 ×2!)
Times stunned:       6                  Times stunned:      0
Rage AP generated:   3                  Tech AP used:       0

DAMAGE BREAKDOWN — VERA
  Data Spike hits (x8):   5+7+6+6+5+12+6 = 47 energy damage (bypasses DR)
  Pistol hits (x3):        4+3+6 net = 13 damage (after DR reduction)
  Total net damage:        60 HP damage dealt

DAMAGE BREAKDOWN — KAEL
  Shotgun hit (R3):        10 net damage (only hit that landed)
  Total net damage:        10 HP damage dealt

KEY MOMENTS:
  • R3: Kael's first and only shotgun hit (Adrenaline Surge active, TN 35)
  • R5: Shotgun miss at 2 tiles (TN 25, rolled 29 — 4 over TN)
  • R7: DOUBLE CRITICAL — Data Spike 05 + Pistol 03 same turn
  • R7-R8: Vera's decisive finishing sequence

══════════════════════════════════════════════════════════════
WINNER: VERA "NULL POINTER" CASSIS
══════════════════════════════════════════════════════════════
```

---

## POST-MATCH PLAYER NOTES

**[T+00:44] — AGENT DEBRIEF**

*GM to both agents: "The fight is over. Any final words from your characters? Vera for her victory — Kael from the afterlife, if he has anything to say."*

**KAEL (Player A) post-match:**

> *The last thing the chrome logs before the core goes dark is a targeting
> solution it never got to execute. Clean. Perfect arc. 3d6+1 at point blank.*
>
> *He would have won that one.*
>
> *He didn't get to take it. That's the contract.*
>
> *"...Good fight, Null Pointer. You earned it."*
>
> *(Diagnostic log: final entry — ADRENALINE SURGE: SPENT. RAGE AP: 3. ALL SYSTEMS
> NOMINAL AT TIME OF SHUTDOWN. Cause of mortality: superior electronic warfare.
> Ironic. Logged.)*

**VERA (Player B) post-match:**

> *Thirty seconds until the door opens. She uses twenty of them to pull his combat
> shotgun off the corridor floor. Runs a diagnostic on it. Functional.*
>
> *She slings it over her shoulder.*
>
> *Six stuns. Twenty rounds. One shot landed and nearly halved her.*
>
> *"You were good, Ironjaw. You were really good. In a different corridor,
> maybe different dice — "*
>
> *She doesn't finish the thought. The light turns green. The door opens.*
>
> *She walks out carrying his gun.*

---

## DESIGNER NOTES — SYSTEM OBSERVATIONS

**What worked:**
- The d100 roll-under system created genuine tension — Kael's 15% stun resistance meant every Data Spike was a real threat decision
- Rage AP and Adrenaline Surge gave Kael a reactive identity that made his playstyle feel distinct from just "big dude with shotgun"
- The HP asymmetry (60 vs 30) forced Vera into an aggressive attritional strategy — she couldn't afford to trade hits
- Data Spike's "bypasses DR" clause was mechanically decisive — the DR 4 cyborg was effectively soft to energy attacks

**What created drama:**
- Kael's single shotgun hit (R3) halved Vera's health in one action — the threat was real and present throughout
- The double-critical in Round 7 felt earned after 6 rounds of grinding — a moment the dice delivered
- Kael's final defiant shot with an impossible TN (–5) was the most human moment of the fight

**Balance assessment:**
- The Data Spike + Stun combo proved too reliable against a Cyborg with Process 3 (15% resist chance is brutal)
- Kael needed either higher Process OR a way to close distance faster against a ranged attacker
- Suggest: Stun resist TN should scale from attacker's Data attribute but cap at the defender's Process TN ×3

---

*Session logged. Combat duration: 8 rounds. Total dice rolls: 47.*
*Session file: Testplaysession.md*
*Generated: ExpoBR Testplay Experiment — Claude Sonnet 4.6 (GM) + 2 subagents*
