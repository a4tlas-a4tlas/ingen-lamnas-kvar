# Handoff – *Ingen lämnas kvar*

This file is updated with every step (every PR). It is enough, together with `DESIGN.md`, to pick the work up without the chat history.

## Status (after step 7.6 – Milestone 7 done)

| | |
|---|---|
| **Live** | GitHub Pages: the repo's project site (normally https://a4tlas-a4tlas.github.io/ingen-lamnas-kvar/), deployed from `main` by the "Test & deploy" workflow in `.github/workflows/` |
| **Latest PR** | Milestone 7.6: Nya arter (branch `nya-arter`, open, awaiting review). Latest merged: #28, Vilka går? |
| **Save version** | 21 (`version` in `src/engine/setup.ts`, checked in `loadSave` in `src/ui/app.ts`; bump both when the state shape changes) |
| **Tests** | 232 Vitest (`npm test`), 4 Playwright (`npx playwright test`, 2 runs × desktop + phone) – all green |

## The game in brief
A Swedish roguelite card game about animals fleeing a glen that is being destroyed, inspired by *De vilda djurens flykt* (all names are original).
- **The player is Eden, the oath:** you swear one verse at the start.
- **Each animal has belief (0–10).** At 5 and up it follows. Below 5 it has its own will; below 3 the will is worse; at 0 it leaves.
- **The group shares hope (0–10).** Below 4 you draw fewer cards.

**The run:**
1. Vilka går? – choose one of four groups.
2. The oath.
3. The region map (the guide's sketch: 6 rows of dangers, meetings, finds and fires, then a boss).
4. The interlude (looking back, a promise, choosing the way).
5. The next region.
6. When the built regions run out: "fortsättning följer".

**Built so far:**

| Region | Dangers | Boss |
|---|---|---|
| **Dalen** | road, farm, river, country road; 10 story parts | Maskinerna |
| **Åkrarna** | the birds of prey (Rovfåglarna) + old dangers in new places | none yet (ends at "Bortom åkrarna") |

**Animals** are species, not characters: badger, toad, fox, owl, adder, mice, hare, and since 7.6 hedgehog, squirrel, mole, beaver and fawn (`SPECIES` in `src/data/animals.ts`, with Swedish grammar fields `en` / `den` / `definite`). Names are drawn per run. There are two roles: the eldest ("Gamla …") and the guide, whose memory the map is.

**The groups** (`CASTS` in `src/data/animals.ts`): *Dalens sista*, *Rovdjurens pakt*, *De små*, and *Slumpad* (random, `rollCast` in `src/engine/setup.ts`). `buildCast(seed, cast)` makes a group; `castOffers(seed)` all four. The action `chooseCast` is only valid before the oath. `createGame` starts with *Dalens sista*, so tests that never choose see the old six.

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

## Next step: Milestone 6 resumes – 6.3 Sprutan
Milestone 7 (the animals rethought) is done. Next is Åkrarna's second danger. From the approved design (Milestone 6 in `DESIGN.md` and the plan file):
- **The tractor** drives one telegraphed row per hour. **The mist** drifts one zone per hour, in a wind direction that is also telegraphed.
- **A new injury, *förgiftad* (sick):** the animal's own cards can't be played until a fire heals it *(proposal)*.
- **Shelter:** the stream and the tall weeds wash the mist off.
- **Build it like `raptor.ts`:** a definition, a telegraph each hour, hazards, then art, forecast, chips, a guide card, bot balance and screenshots.
- **Ask the user first,** in the interview style. With the new kinds, the beaver and toad (swimmers) and the mole (underground) are natural counters to the mist.

**After that:**
- **The rest of Milestone 6:**
  - Åkrarna: Diket och grinden, story parts, and the boss Skördetröskan (with the hedgehog, which is now a real species that can already be with us; its story must adapt if so)
  - Stadens utkant: four dangers, and the boss Fyrverkerinatten (the danger is fear itself)
  - finally, the choice between 2 random regions

## Open questions and known quirks
- **Hope** only affects the hand size (and waiting). It may deserve more weight; it isn't tied to traits yet.
- **The fields** are easier for the bot at night than by day: the eagle owl strikes only one of two marked zones.
- **Gamla vägar can be taught across kinds** (it's "insight"). A badger can then find the culvert but doesn't fit through it.
- **The adder starts hungry** (belief 4, hunger 2) and often hunts from hour 1. That's older behaviour, kept on purpose so far.
- **Bot balance after 7.6** (the same walker, all of Dalen, 300 seeds): share of the group still with us after Dalen. Dalens sista 8 %, Rovdjurens pakt 7 %, De små 23 %, Slumpad 17 %. Slumpad dropped a little, because it can now draw the fragile fawn.
- **Bot balance per group (7.5):** a crude walker (leads only, always lets go, takes the first reply) through all of Dalen, 300 seeds. The share of the group still with us after Dalen: Dalens sista 8 %, Rovdjurens pakt 6 %, De små 20 %, Slumpad 21 %. Through the machines boss alone: 43 / 44 / 71 / 57 %.
  - **De små is the easiest** for a player who never comforts, because it has no predators who can turn.
  - **Rovdjurens pakt is the hardest,** as intended.
  - De små's hardness (much to carry, only one large) doesn't bite a bot that just leads. It may need a lever, e.g. one less hope at the start. That's the user's call.
- **Bot balance after 7.4:** the machines boss is 3.53 of 6 safe (was 3.88). Random bad traits hurt a lead-only bot that never comforts or plays insight. It was measured just before Tvivlande was limited to animals starting at 5+, so the real number is the same or a little higher.
- **Old branches:** 25 merged branches (and `drag`) are still on GitHub. This session's GitHub proxy refuses branch deletion (both the API and `git push --delete`), so they have to be removed in GitHub's branch list.
- **Tests and random traits:** `createGame` rolls traits. A test that builds its own game and checks belief, injuries or hunting should call `plain(s)` from `tests/engine/helpers.ts`, as `raptor.test.ts` does.
