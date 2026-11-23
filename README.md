# Faithfall

Every Redditor is an Ascendant. Each day history leaps forward by years or centuries for the whole world at once. You guide your people, leave relics behind, and when your civilization falls, you hope someone digs you back up.

A persistent, shared-world daily game for Reddit's Game of the Day 2026 hackathon, built on **Devvit Web** (React client, Hono server, Devvit Redis and scheduler). The design spec is in [Plan](Plan).

## Running it

```bash
npm install
npm run login        # devvit login
npm run dev          # devvit playtest on your test subreddit
npm run test:e2e     # local end-to-end run of the server logic against an in-memory Redis
npm run deploy       # type-check, lint, devvit upload (keep the app private until judging ends)
npm run art          # rebuild the SVG art kit into art/ (open art/gallery.html to review it)
```

After installing on a subreddit, the install trigger creates the world, runs ~2,000 years of seeded history with the Old Ones, and posts the first Chronicle. Moderators get four subreddit menu items:

| Menu item | What it does |
| --- | --- |
| Faithfall: create game post | Creates the world if needed and posts the current Chronicle |
| Faithfall: leap now | Runs today's leap immediately (testing, or catching up a missed day) |
| Faithfall: begin Corruption season | Starts Season 1 in secret (plan: start it on Dec 5). Later seasons start automatically 3 leaps after one ends |
| Faithfall: reset world | Asks for `RESET`, then erases the world and seeds new history |

The daily leap runs from the scheduler at **14:00 UTC** (`devvit.json` → `scheduler.tasks.daily-leap`) and is retry-safe: each leap number takes a Redis `NX` lock and commits in one transaction.

## Layout

```
src/shared/sim/    the simulation, pure and deterministic (used by the server and the e2e harness)
  types.ts         data model         map.ts      88-region hex world, Old One placement, new rings
  data.ts          species, cards, domains, leaps, 12 Old Ones, 4 Evil Ones, name parts, profanity filter
  rules.ts         Weight, costs, Trust income, hands, leap roll
  engine.ts        the leap: actions → 5-year ticks → collapses/returns → income → season → Chronicle
  season.ts        hidden Corruption: omens, spread, Hollowing, Evil One, aftermath
  bots.ts          Old One personalities and grudges      chronicle.ts  hand-written Chronicle templates
  cradle.ts        Starry Draw and the Cradle tutorial world
src/server/core/   store.ts (Redis keys, transactions), leap.ts (daily job, seeding, posts),
                   game.ts (player actions), view.ts (what a player may see)
src/server/routes/ api.ts, menu.ts, forms.ts, triggers.ts, cron.ts
src/client/        game.tsx (expanded view), splash.tsx (inline Chronicle preview), ui/*
tools/e2e/         in-memory Devvit stand-in and a full-loop test script
```

## What is built (P0 from the spec, plus several P1 items)

- **Onboarding:** the Starry Draw (7 cards, rarity roll, prefers species no player has yet, one free redraw), species, domain and name choice, then the **Cradle**: Bless, Dig (always a relic of a fallen Old One), Whisper (25-year leap converts the village), Ward (the darkness stops), Ascend to one of 2–3 landing regions suited to the species and rarity. The Cradle becomes your first ruin in the shared world, holding your Cradle-Stone for a later Homecoming.
- **Shared world:** 64 known regions plus the 24-region fogged Dark Continent, 4 civilization stats, belief split, the spec's tick rules (grow, starve, expand, raid, schism), aging faith decline, calamities, Great Age burial, and a new ring of 12 regions when landings run low.
- **10 species** (6 Common, Stonebound, Mirefolk, Sylvan, Ashborne) with their specialities and weaknesses; 5 domains with passives.
- **Cards:** all 12 except Raise Chosen, with Weight-scaled costs, domain-weighted hands and the day-by-day reveal (Day 1: Bless, Whisper, Ward, Explore; Day 2: Smite, Sign, Envoy; Day 3+: Teach, Inspire, Commission, Reveal Spring).
- **Digging:** 3 digs a day with Dust, Fragment, Artifact and Great Relic, brush-to-reveal; finders and creators both gain; notifications to the creator; **Claim, Destroy or Leave**; **Homecoming**, including an on-the-spot Return while fading.
- **Fading and return:** collapse turns cities into ruin layers with a sealed Book buried as a Great Relic; fading Ascendants draw one Whisper or Sign; return at 5 Remembrance.
- **12 Old Ones** with five personalities, grudges, twilight when players land nearby, and returns from legend to keep at least 12 Ascendants active.
- **Corruption season:** the secret source (fog or ruin) stays on the server; omens sharpen by season day; private clues (Death domain gets them early); discovery by digging, Explore, Cleanse or Whispering to the Hollowed; the Seeker title; the lair as a second discovery; a day-9 safety net; one-tap pledging in base Trust; the community bar and top contributors; Shards for the winners, or Wasteland on a loss.
- **Reddit:** a new Chronicle post after every leap (title like *Year 2,130: The Fall of Ostra (A Generation, 25 years)*, with headlines, omen and Evil One bar in `postData` for the inline preview); the share card posts a comment **as the user** only after they tap the button and `canRunAsUser` confirms consent.
- **Library:** the Annals of the World, a Book for every civilization (sealed when it falls), shelves by species, leaderboards (Old Ones greyed out, never #1), and scripture upvoting (the top line is quoted in the Chronicle).
- Also included from P1: prophecy with odds-based payouts and a streak, play streaks (stored in Redis rather than Journeys), and the leap ink-wash animation.

### Not built yet

- Bloodlines (heroes, saints, traits, orders), Raise Chosen
- Seek the Lost, the other 11 species, the Legendary Old Ones
- Realm-based dig restrictions: realms are recorded and shown, but any visible ruin can be dug
- Devvit Journeys analytics

## Art kit

`art/` holds 85 code-drawn SVGs in the illuminated-manuscript style: 9 terrain tiles, 12 overlays, a card frame with 13 illustrations, 5 domain sigils, 10 species medallions, the Starry Draw back and 4 rarity frames, 14 icons, 4 dig results, Vashtar (hidden, revealed, health bar), page frames, the share card, the logo and 2 animations. Also `tokens.css` (palette and `@font-face`), self-hosted IM Fell English and Alegreya (SIL OFL, Latin subset WOFF2) and `gallery.html`.

The game uses them throughout: `npm run art` also copies the kit into `public/art/`, which ships with the post (paths in `src/client/art.ts`). They are generated by `tools/art/*.mjs` from seeded hand-drawing primitives, so they redraw identically. Every colour is a class that resolves to a palette variable, with the hex as a fallback, so changing `tokens.css` recolours inlined SVGs. Ids are prefixed with the file name, and each file is under about 12 KB.

## Devvit Rules notes

- Posts are created by the app account. Comments are posted as the user only on an explicit tap, with the text shown first and consent checked through `canRunAsUser`.
- **User data deletion:** players can delete their data from the Ascendant sheet. The daily job also checks a rotating batch of players with `reddit.getUserById` and purges the data of deleted accounts. Their Ascendant stays in history without a username.
- No external HTTP, no payments, and no real-money mechanics. Seek the Lost (when built) costs Trust only.
- Player text (names, scripture, envoys, region names) is length-limited and profanity-filtered, and React escapes it on render.
- Notifications are in-game messages only; nothing is sent to Reddit inboxes.
- The Corruption's secret location and levels never leave the server. The client gets omen text and discovered facts only.
