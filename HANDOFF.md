# Handoff – *Ingen lämnas kvar*

This file is updated with every step (every PR). It is enough, together with `DESIGN.md`, to pick the work up without the chat history.

## Status (after step 7.4)

| | |
|---|---|
| **Live** | GitHub Pages: the repo's project site (normally https://a4tlas-a4tlas.github.io/ingen-lamnas-kvar/), deployed from `main` by the "Test & deploy" workflow in `.github/workflows/` |
| **Latest PR** | Milestone 7.4: Egenskaper som modifierare (branch `egenskaper`, open, awaiting review). Latest merged: #25, this handoff file. The older #24 (branch `drag`) is an earlier, different take on 7.4 that this one replaces. |
| **Save version** | 19 (`version` in `src/engine/setup.ts`, checked in `loadSave` in `src/ui/app.ts`; bump both when the state shape changes) |
| **Tests** | 206 Vitest (`npm test`), 4 Playwright (`npx playwright test`, 2 runs × desktop + phone) – all green |

## The game in brief
A Swedish roguelite card game about animals fleeing a glen that is being destroyed, inspired by *De vilda djurens flykt* (all names are original).
- **The player is Eden, the oath:** you swear one verse at the start.
- **Each animal has belief (0–10).** At 5 and up it follows. Below 5 it has its own will; below 3 the will is worse; at 0 it leaves.
- **The group shares hope (0–10).** Below 4 you draw fewer cards.

**The run:**
1. The oath.
2. The region map (Kvarn's sketch: 6 rows of dangers, meetings, finds and fires, then a boss).
3. The interlude (looking back, a promise, choosing the way).
4. The next region.
5. When the built regions run out: "fortsättning följer".

**Built so far:**

| Region | Dangers | Boss |
|---|---|---|
| **Dalen** | road, farm, river, country road; 10 story parts | Maskinerna |
| **Åkrarna** | the birds of prey (Rovfåglarna) + old dangers in new places | none yet (ends at "Bortom åkrarna") |

**Animals** are species, not characters (badger, toad, fox, owl, adder, mice, hare). Names are drawn per run. There are two roles: the eldest ("Gamla …") and the guide, whose memory the map is.

**Skills:**
- 6 per species (4 basic + 2 learned on the way), 3 carried at a time: those are the animal's cards.
- Chosen under *Förmågor* on the map and at the fire.
- Learned after 3 dangers survived, from story parts, or from each other at the fire.

**Traits** (`src/data/traits.ts`) are pure modifiers, never cards:
- Each animal rolls 1 good + 1 bad at the start. *Hungrig* only goes to predators, *Tvivlande* only to animals starting at belief 5+.
- Four are earned on the way: *Härdad*, *Trogen*, *Sörjande*, *Ärrad*.
- Fading bad traits (*Hetsig*, *Tvivlande*, *Sörjande*) go away after 2 nights in a row by the embers.
- The full table is in `DESIGN.md`, Milestone 7, step 4.

## Where things live
| Path | What |
|---|---|
| `src/engine/` | The pure, deterministic rules. `step(state, action) → { state, events }` (`step.ts`). Seeded RNG in `s.rng`. Also `rules.ts`, `campfire.ts`, `regions.ts` (map generator), `roles.ts`, `will.ts`, `promises.ts`, `voices.ts`. |
| `src/engine/encounters/` | One file per danger (`road`, `farm`, `river`, `machines`, `raptor`): zones, edges, plans. |
| `src/data/` | Content as data: `animals.ts` (species, names, start group), `skills.ts`, `cards.ts`, `traits.ts`, `verses.ts`, `guides.sv.ts`, `promises.sv.ts`, `voices.sv.ts`, `regions/`, `meetings/` (frames for every meeting). All Swedish text lives here. |
| `src/ui/` | Plain DOM + SVG, no framework: `app.ts` (screens and input), `screens.ts` (map, fire, meetings, guide), `scene.ts` (backdrops), `status.ts` (chips and forecast). |
| `DESIGN.md` | The living design document, one section per milestone/step. |

## How we work
- **Design** happens by interview: ask the user in every part, push toward originality, and mark your own fill-ins *(my proposal)*. The plan is kept in `/root/.claude/plans/lets-create-a-game-spicy-eich.md` (the session's plan file).
- **One PR per step.** The user reviews and says **"merge"** (merge only) or **"go"** (start the next step).
  - Merge: `gh api -X PUT repos/a4tlas-a4tlas/ingen-lamnas-kvar/pulls/N/merge -f merge_method=merge`
  - Open a PR: `gh api repos/a4tlas-a4tlas/ingen-lamnas-kvar/pulls -f title=… -f head=<branch> -f base=main -F body=@file` (GraphQL is blocked)
  - Check the deploy: `gh api "repos/a4tlas-a4tlas/ingen-lamnas-kvar/actions/runs?head_sha=<sha>"`
- **Commits** end with these trailers:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WB9uVrKsiTtNjkGajixQAL
  ```
  PR bodies end with "🤖 Generated with [Claude Code](https://claude.com/claude-code)" and the session link.
- **Before each PR:**
  - `npx tsc --noEmit`, `npx vitest run`, and `npx playwright test --repeat-each=2 --workers=4` (Chromium is at `/opt/pw-browsers`).
  - **Bot balance:** a temporary `tests/engine/bot.tmp.test.ts`, a lead-only bot that is deleted afterwards. Reference: the machines boss 3.5 of 6 safe (since 7.4; 3.9 before traits); the fields 4.5 by day, 5.1 by night.
  - **Screenshots:**
    1. A temporary vitest test (`tests/engine/shots.tmp.test.ts`, `// @ts-ignore` on the `node:fs` import) writes state JSON to the scratchpad.
    2. `npm run build` and `npx vite preview --port <new port> --strictPort` in the background.
    3. A temporary `shots.tmp.mjs` Playwright script puts the state in `localStorage['ingen-lamnas-kvar/save-v1']` and clicks "continue".
    4. Delete the temporary files afterwards.
- **Tests** use ids by species (`get(s, 'badger')`). `classicGame`/`calmGame` in `tests/engine/helpers.ts` give the old names (Gamla Ljung, Kvarn …) and a fixed little map.

## Next step: 7.5 – choosing the group
Approved design (Milestone 7 in `DESIGN.md` and the plan file): before the oath, **3 rolled groups** are shown side by side, *This War of Mine*-style. You pick one.
- **Each group** has species, names, traits and skills rolled with the run seed. Each has a theme:
  - *Dalens sista*: balanced, like today's start group
  - *Rovdjurens pakt*: many predators, a brittle truce
  - *De små*: many small ones and a single large one
- **Every group still needs an eldest and a guide.** The roles come from `START_GROUP` in `src/data/animals.ts`. The guide's memory is the map, so a group without a toad needs another guide kind (*my proposal: the eldest non-predator remembers the way*).
- **Where the code is:**
  - `createGame` / `makeAnimal` in `src/engine/setup.ts`
  - the oath screen's cast in `src/ui/app.ts`, which already shows trait tags
  - a new action, e.g. `{ type: 'chooseGroup', index }`, before `swear`
- **Tests:** `classicGame` / `named` / `plain` in `tests/engine/helpers.ts` pin the group, so most tests shouldn't move.
- Ask the user first: how different the three should be, whether a reroll exists, and whether the hare can be in a start group.

**After that:**
- **7.6:** new species (hedgehog, squirrel), and random rescues of a species not already in the group.
- **Then Milestone 6 resumes:**
  - Åkrarna: Sprutan, Diket och grinden, story parts, and the boss Skördetröskan (with the hedgehog; an earlier meeting decides whether it trusts us)
  - Stadens utkant: four dangers, and the boss Fyrverkerinatten (the danger is fear itself)
  - finally, the choice between 2 random regions

## Open questions and known quirks
- **Hope** only affects the hand size (and waiting). It may deserve more weight; it isn't tied to traits yet.
- **The fields** are easier for the bot at night than by day: the eagle owl strikes only one of two marked zones.
- **Gamla vägar can be taught across kinds** (it's "insight"). A badger can then find the culvert but doesn't fit through it.
- **The adder starts hungry** (belief 4, hunger 2) and often hunts from hour 1. That's older behaviour, kept on purpose so far.
- **Bot balance after 7.4:** the machines boss is 3.53 of 6 safe (was 3.88). Random bad traits hurt a lead-only bot that never comforts or plays insight. It was measured just before Tvivlande was limited to animals starting at 5+, so the real number is the same or a little higher.
- **Tests and random traits:** `createGame` rolls traits. A test that builds its own game and checks belief, injuries or hunting should call `plain(s)` from `tests/engine/helpers.ts`, as `raptor.test.ts` does.
- **The old trait cards** (`hallaSigNara`, `rusa`, `bitaIhop`) are still defined in `CARDS` but no longer in any species set. Only one engine test still uses them (`bitaIhop`, for a Kraft cost check), so they were left in 7.4. They can be removed together with that test.
