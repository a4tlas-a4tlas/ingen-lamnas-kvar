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
