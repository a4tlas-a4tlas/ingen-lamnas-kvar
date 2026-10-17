# Ingen lämnas kvar – design

A melancholic, poetic roguelite card game in Swedish. It's inspired by the TV show *De vilda djurens flykt*, but all names and places are original.
A group of animals flees a glen that is being destroyed, heading for a forest where they can live free.

This is the living design document. It came out of a 7-part design interview and is updated as the game grows.

## 1. Design pillars (from the interview)

**The player is Eden (the Oath).** You have no body. You're the promise holding the group together.
- **The Oath's health is each animal's belief (Tro, 0–10).** An animal at 0 leaves the group, and the run ends when no one believes anymore.
- **Hope** is the slow clock of the run. It drains with hardship and cold, and quiet moments restore it.
- **The truce:** predators (fox, owl, adder…) don't hunt the prey animals *only because of the Oath*. If a predator's belief drops, its own intents turn hungry.
- **The emotions get jobs:** triage happens in encounters, the truce is the threat from inside, grief is a resource, and hope is the clock. There is no hunger system.

**The cards work in two layers:**
1. **The poem (Eden's verses):** run-wide rules and powers.
   - **Sources:** 3 opening verses chosen at the swearing ceremony, verses animals propose (accept = belief up but you're bound, reject = belief down), newcomers' verses, places that speak, and deaths.
   - **Breaking a verse rewrites the story.** It turns into its inverse: "Ingen lämnas kvar" (no one is left behind) becomes "Någon lämnades kvar" (someone was left behind). The flipped verse carries new, darker effects (less hope, a weaker truce…).
2. **The bonds:** every pair of animals has a bond that strengthens or weakens. Strong bonds give combos, and broken bonds give trauma.

**The deck** = 3 cards per living animal. Animals are **not locked to an archetype.** Each one is built from:
- 1 species card
- 2 cards from a personality pool, so you can get a cowardly fox or a brave mouse

The cast **mixes** echoes of the show (fox, badger, toad, owl, adder, a mouse family) with surprising Nordic species. There are **at most 10 members** per run, and some are **swarms** (a mouse family, a flock of birds) whose count shrinks instead of dying all at once.

**Animal will:** every animal shows an intent each turn.
- Calm animals with high belief mostly follow you.
- Frightened or doubting animals show their own intents ("Haren tänker fly", the hare is going to flee; "Räven betraktar sorkarna", the fox is eyeing the voles). You spend cards to change them.

**Encounters:**
- The board is a **papercut scene split into zones**, such as the ditch, a lane, the median, a culvert, or tall grass.
- Hazards sweep zones with **telegraphed intents**.
- There is **no fighting back, ever.** You only hide, distract, carry, endure and sacrifice.
- **Goals vary by hazard:** the road = get across, the hunter = hide, the fire = outrun it, the dogs = mislead them.

**Death is layered:**
- **Wounds** are the default. They change the animal's cards, and the third wound is lethal.
- A lethal hit usually triggers the **last moment**: another animal throws itself in the way, a verse is broken, or you let them go.
- Rare **sudden** deaths happen at signature moments.
- **The dead leave all of these behind:**
  - a verse named after them
  - 1 memory card fused from their 3 cards (strong, but it reopens the wound)
  - grief in the animals bonded to them
  - a landmark in the forest

**Recruiting:** rescues mid-encounter, swearing in newcomers at the campfire, young born on the way, and strangers with agendas.

**The journey:**
- The map is the **guide's hand-drawn, foggy memory** of the way: free movement, uncertain or wrong parts, and birds or the owl reveal the truth.
- You choose **day or night** for each leg.
- **Seasons** run late summer → autumn rain → frost → snow.
- **The campfire:** choose who sits with whom (bonds and dialogue), mourn and bury, rest and tend wounds.
- A run lasts **1.5–2 hours**, with save and continue.

**Meta-progression:**
- **The forest is built from what arrives.** It's a living diorama that grows between runs, with landmarks for the dead.
- **The forest gives back:** unlocks of species, verse fragments and map knowledge.
- **The poem of all runs:** one long epic whose old verses can be invoked again.

**Presentation:**
- Papercut folk art in layered SVG.
- The Oath narrates in **"vi" (we)**, plus the animals' own short lines.
- Sound is generated in the browser: a nyckelharpa-like folk drone plus wind, rain and night sounds.

---

## 2. First playable slice: "Vägen om natten" (the road at night)
This is the goal of milestone 1. It's about 10 minutes of play and tests zones + intents + belief + flipping a verse.

- **The opening oath:** pick 3 of 6 verses, for example:
  - *Ingen lämnas kvar* (no one is left behind)
  - *Vi jagar inte varandra* (we do not hunt each other): this is the truce verse
  - *Den starke bär den svage* (the strong carry the weak)
  - *Vi lyssnar på den äldste* (we listen to the eldest)
  - *Vi går när månen gömmer sig* (we walk when the moon hides)
  - *Ingen går ensam* (no one walks alone)
- **The cast (5 members, placeholder names):** Sotfot the fox, Gamla Ljung the badger, Kvarn the toad, Skymning the owl, and Fröna, a mouse family swarm (×6).
- **The scene's zones:** the ditch (start, cover) → lane 1 → the median → lane 2 → the far ditch (goal). There's also the **culvert**, a hidden, slow, safe route that the toad can reveal.
- **The car:** headlights in the distance telegraph which lane gets hit next turn. One car without lights can cause a sudden death.
- **Each turn:** 3 Kraft (energy), draw 5 cards, intents shown above every animal and hazard, and play cards to move, hide, carry, comfort or change intents.
- **What the slice shows:**
  - the last moment choice
  - wounds
  - a broken verse flipping, with consequences for belief and the truce
  - an end screen with the poem so far and a memorial for the fallen

---

## 3. Tech architecture
- **Vite + TypeScript**, plain DOM + SVG with no framework (add Preact only if the UI gets heavy).
- **A pure, deterministic engine:** `step(state, action) → { state, events }` with a seeded RNG. The UI only renders state and plays back the events, which carry the narration text, animations and sound.
- **Data-driven content** in TS files, with all Swedish text in `text.sv.ts`.
- **Saving** to localStorage, wrapped in try/catch.
- **Tests** with Vitest for the engine and a Playwright smoke test (Chromium is preinstalled).
- **CI:** GitHub Actions runs test → build → GitHub Pages.

```
src/engine/   rng.ts state.ts step.ts zones.ts intents.ts belief.ts poem.ts bonds.ts death.ts
src/data/     animals.ts traits.ts cards.ts verses.ts hazards/road-night.ts text.sv.ts
src/ui/       render/ (scene svg, hand, intents, poem), screens/ (oath, encounter, end)
src/audio/    drone.ts ambience.ts (WebAudio)
tests/        engine/*.test.ts  e2e/smoke.spec.ts
DESIGN.md     (this design, kept living)
.github/workflows/deploy.yml
```

---

## 4. Milestones (one PR per milestone)
0. **Setup:** create the repo, scaffold Vite/TS/Vitest, deploy to Pages, and commit DESIGN.md.
1. **The slice, "Vägen om natten":** see section 2. ← *you play it and give feedback before we go on*
2. **Death & legacy:** memory cards, grief in the bonded, the memorial, and a campfire (who sits with whom, mourning, rest).
3. **The journey:** the foggy map, day and night, seasons, save and continue.
4. **Recruiting & proposed verses:** rescues, swearing in, births, strangers, places that speak.
5. **Content for a full run:** 5 regions, about 10 hazards, the cast, and a final boss (for example the forest fire).
6. **Meta:** the forest diorama, the forest giving back, and the poem of all runs.
7. **Feel & balance:** the folk drone, ambience, animations, and tuning.

---

---

## 5. Status
- **Milestone 0 (setup)** – done: Vite + TypeScript, Vitest, Playwright, GitHub Actions → Pages.
- **Milestone 1 (the slice "Vägen om natten")** – first playable version is done. Waiting for play feedback.

### Balance notes (slice)
- A naive bot that only uses *Led* (no cards) and perfectly dodges telegraphed lanes saves on average 3.2 of 5 animals over 300 seeds. About 19% of its nights save everyone.
- Cards, verses and the culvert should lift a thoughtful player above that. Deaths should still be common.

### Playtest round 1 → changes
Feedback: it was unclear which animals could move, and the cards weren't clear enough. The scenario itself worked.
- **Animal-first control:** tap an animal to select it. Animals that can move have a light ring and a dot. Frozen animals are greyed out. Animals in the culvert or already safe show a badge. A selected animal lights up its zones and its own cards, and an info panel says why it can't move, if it can't.
- **Cards:** each card shows the owner's silhouette and name, a type (Rörelse / Skydd / Tröst / Insikt / Minne) with a colour stripe, and shorter text. Unplayable cards say why ("Sotfot fryser", "Behöver ◆1"). Hovering a card lights up its owner on the board.
- **Size:** animals are small, medium or large. Only small animals (the toad, the mice) fit through the culvert.
- **Flight:** fliers (the owl) take off whenever they move. They can be led up to 2 steps and can't be hit while airborne, but a flier sitting still on the road has landed and can be hit. Flying doesn't break "Vi går när månen gömmer sig". The owl's card is now *Spana från ovan* (scout from above): it reveals dark cars and the next hour's traffic.

### Playtest round 2 → changes
Feedback: the cards themselves were fine, but it was still hard to see who a card belongs to.
- **Colour identity per animal:** each animal's paper colour (fox red-brown, badger grey, toad olive, owl brown, mice beige) is its identity. Every card's top is a band in the owner's colour, with the owner's silhouette in ink and their name. The animal's name tag on the board is the same colour.
- **The hand is grouped by animal:** each animal's cards sit together (display only).
- The card type is now a small coloured word (● Rörelse, ● Skydd …) instead of a competing colour stripe.

### Layout: one screen
Feedback: the UI should fit on one screen. On desktop the road now fills the screen height on the left. Everything else sits in a panel to its right, with no page scrolling at 1280×720 and up:
- the actions and hint
- the hand, as a grid
- the info panel for the selected animal
- the poem and the night's log, side by side, each scrolling on its own

On phones and narrow windows the layout stays stacked, and the hand scrolls sideways.

### Playtest round 3 → changes
Feedback: the night didn't end by getting everyone across, and the states (fryser and so on) need to be clearer.
- **The night ends when the last animal is across.** There's no need to let the hour pass.
- **Status chips:** every state has one name, symbol and colour, used the same way everywhere:
  - red = danger: ❄ fryser, ✕ lämnar oss, ⚠ jagar, ⁄ deep wounds
  - gold = warning: ↩ vill tillbaka, » tänker rusa, ✶ tvivlar
  - green = protection: ⇡ flyger, ⛨ skyddas av, ◈ biter ihop, ✓ över
  - blue = ◌ kryper (in the culvert)

  Own-will states show their name on the board. The info panel lists every state with what it means and how to break it.
- **"När timmen går" (forecast):** before you let the hour pass, it shows what will happen: who backs off or rushes out, who attacks, which car hits whom and how hard, whether a hit is deadly, and when dawn is near. Dark cars stay hidden until the owl has scouted.
- **Symbols, then a hover explanation:** on the board the states are clear symbols only, and the danger states are larger. Hovering a symbol shows a tooltip with its name, what it does and how to break it. On touch screens, tap the animal to see the same text in the info panel.
- **A new predator: Sicksack the huggorm (adder).** Sicksack is small (fits through the culvert alongside the mice) and *hungry*: `hunger` 2 means it turns to hunting at 2 more belief than the others, so even while "Vi jagar inte varandra" holds. Its card *Gift i reserv* (venom in reserve) is a promise not to bite: Sicksack +2 belief, prey in the same zone −1 belief.
- **Predators only hunt their own size or smaller**, so nobody hunts the badger.
- Balance with 6 animals: a lead-only bot saves on average 4.0 of 6 animals, and a hunt happens about 1.5 times per night.
- **Hopp and Kraft live in the play area:** two large paper tags in the sky of the scene (Hopp to the left, Kraft to the right, the moon between them). They scale with the screen. Low hope (under 4) turns the tag red, with "Lågt hopp – vi drar 4 kort". Hovering a tag explains it.
- **Speech bubbles when hope sinks:** the engine reports *why* hope moved (`hope` event with a reason: death, flip, hunt, leave, dawn, memory, laugh). The UI lets the animal most affected speak about it: the one closest to the dead, a prey animal when a predator hunts, and so on. The bubble carries a "−1 hopp" tag, and the Hopp tag shakes. A laugh gives a gentle bubble with "+1 hopp". When kraft runs out, an animal says so ("Vi orkar inte mer den här timmen").

### Playtest round 5 → changes
- **One oath, not three.** In the glen we swear a single verse, chosen from the six. The rest of the poem is meant to grow during the journey: verses the animals propose, newcomers' verses, places that speak (milestones 2–4). The engine's `OATH_VERSES` is 1.
  - Balance, lead-only bot over 300 nights: 3.4–4.0 of 6 animals saved, depending on the verse. "Vi jagar inte varandra" protects the most, and "Vi går när månen gömmer sig" the least, because the bot ignores the moon.
- **Deck checker ("Leken"):** buttons under the hand open three views:
  - the draw pile, sorted per animal so the order stays secret
  - the discard pile, most recent first
  - the whole deck grouped by animal, with where each card is (in hand, draw pile or discard), and what became of the dead (only the memory remains) and of those who left

## Milestone 2 – death, legacy and the campfire (in progress)
Design from the milestone 2 interview, part 1. The run becomes: oath → map → Vägen om natten → map → campfire → map → Gårdshundarna → end.

### Step 1: injuries and generalised encounters (done)
- **The danger decides, telegraphed in advance:**
  - car = *skadar* (injures)
  - truck = *dödar* (kills)
  - dark car = kills suddenly, with no last moment
- **A killing hit gives the last moment:**
  - *Kasta sig emellan*: the shielder pushes the victim away and takes an injury instead of dying.
  - *Låt gå*: the victim dies.
- **Verses can't be spent to save a life.** They are lasting modifiers and storytelling. They still flip by themselves when something happens (someone is left behind, a predator hunts, the elder dies).
- **Injuries are lasting states, not counters.** They don't kill by themselves:
  - ≀ **haltar** (limping): 1 step at a time, and leading costs ◆2. Never heals.
  - ⌁ **bruten vinge/tass** (broken wing/paw): no flying, and the species card is blocked. Never heals.
  - ❢ **blöder** (bleeding): −1 belief every hour. Heals at the campfire.
  - ≋ **chock** (shock): doubts and freezes much more easily. Heals at the campfire.
- **Where injuries come from:**
  - vehicles → halt or broken
  - bites → bleeding
  - seeing someone die in your own zone → shock
- **Swarms** lose 1 member to an injuring hit and 3 to a killing one.
- **Predators:** a first bite causes bleeding, and an attack on an already injured animal kills.
- **Encounters are data** (`src/engine/encounters/`): zones with layout rectangles and flags (`start`, `goal`, `road`, `exposed`, `hidden`, `smallOnly`, `slow`), plus paths toward the goal. Movement, bolting and fleeing, distances, the culvert rule and the board layout all come from this data, so a new encounter is mostly a new definition.
- Balance (lead-only bot, 300 nights): 3.2–4.0 of 6 saved depending on the verse, and about 0.9 survivors per night carry an injury onward.
