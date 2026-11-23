import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import { context, redis } from '@devvit/web/server';
import { SPECIES_IDS } from '../../shared/sim/data';
import type { CardId, Domain, LeapName, SpeciesId } from '../../shared/sim/types';
import type { ErrorResponse, Leaderboards, LibraryShelf, LogPage, StateResponse } from '../../shared/api';
import {
  ascend, choose, cradleStep, cradleView, dig, draw, forgetMe, getOrCreatePlayer, myth, nameRegion, playCard, pledge,
  prophesy, requireUser, resolveDiscovery, shareMyth, vote, writeScripture,
} from '../core/game';
import { nextLeapAt } from '../core/leap';
import { GameError, K, getArtifacts, loadWorld, numMap, readLog } from '../core/store';
import { loadChronicle, meView, publicAsc, publicRegion, rollDay, seasonView } from '../core/view';
import { civStats } from '../../shared/sim/rules';

export const api = new Hono();

const fail = (c: HonoContext, e: unknown) => {
  if (e instanceof GameError) return c.json<ErrorResponse>({ status: 'error', message: e.message }, 400);
  console.error('api error', e);
  return c.json<ErrorResponse>({ status: 'error', message: 'Something went wrong. Please try again.' }, 500);
};

type Body = Record<string, unknown>;
const body = async (c: HonoContext): Promise<Body> => {
  try {
    return (await c.req.json()) as Body;
  } catch {
    return {};
  }
};
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

api.get('/state', async (c) => {
  try {
    const w = await loadWorld();
    if (!w) return c.json<ErrorResponse>({ status: 'error', message: 'The world is still being made. Ask a moderator to open the Faithfall menu and create the world.' }, 503);
    const loggedIn = !!context.userId;
    let stage: StateResponse['stage'] = 'new';
    let me = null;
    let onboarding = null;
    let cradle = null;
    let viewer: string | null = null;
    let username = context.username ?? '';
    if (loggedIn) {
      const s = await requireUser();
      username = s.username;
      let p = await getOrCreatePlayer(s);
      stage = p.stage;
      if (p.stage === 'joined' && p.ascId && w.ascendants[p.ascId]) {
        p = await rollDay(w, p);
        viewer = p.ascId;
        me = await meView(w, p);
      } else if (p.stage === 'cradle') {
        cradle = await cradleView(s);
      } else {
        onboarding = { draw: p.draw, redrawUsed: p.redrawUsed };
      }
    }
    const res: StateResponse = {
      status: 'ok', stage, username, loggedIn,
      world: {
        leap: w.leap, year: w.year, nextLeapAt: nextLeapAt(),
        regions: w.regions.map((r) => publicRegion(w, r, viewer)),
        ascendants: Object.values(w.ascendants).map((a) => publicAsc(w, a)),
        leaping: !!(await redis.exists(K.leaping)),
      },
      me, chronicle: await loadChronicle(w, viewer), season: await seasonView(w, viewer), onboarding, cradle,
    };
    return c.json(res);
  } catch (e) {
    return fail(c, e);
  }
});

const action = (path: string, fn: (b: Body) => Promise<unknown>) => {
  api.post(path, async (c) => {
    try {
      const b = await body(c);
      const result = await fn(b);
      return c.json({ status: 'ok', result: result ?? null });
    } catch (e) {
      return fail(c, e);
    }
  });
};

action('/onboard/draw', async (b) => draw(await requireUser(), b.redraw === true));
action('/onboard/choose', async (b) =>
  choose(await requireUser(), { card: num(b.card) ?? -1, domain: str(b.domain) as Domain, name: str(b.name), epithet: str(b.epithet) }));
action('/cradle/step', async (b) => cradleStep(await requireUser(), str(b.beat)));
action('/ascend', async (b) => ascend(await requireUser(), num(b.region) ?? -1, str(b.scripture)));
action('/play', async (b) => {
  const t = num(b.target);
  return playCard(await requireUser(), { card: str(b.card) as CardId, target: t, text: str(b.text), to: str(b.to) });
});
action('/dig', async (b) => dig(await requireUser(), num(b.region) ?? -1));
action('/discovery', async (b) => {
  const choice = str(b.choice);
  if (choice !== 'claim' && choice !== 'destroy' && choice !== 'leave') throw new GameError('Choose Claim, Destroy or Leave.');
  return resolveDiscovery(await requireUser(), choice);
});
action('/prophecy', async (b) => prophesy(await requireUser(), str(b.guess) as LeapName));
action('/scripture', async (b) => writeScripture(await requireUser(), str(b.text)));
action('/vote', async (b) => vote(await requireUser(), str(b.ascId)));
action('/pledge', async (b) => pledge(await requireUser(), num(b.amount) ?? 0));
action('/name-region', async (b) => nameRegion(await requireUser(), num(b.region) ?? -1, str(b.name)));
action('/share', async () => shareMyth(await requireUser()));
action('/myth', async () => myth(await requireUser()));
action('/forget-me', async () => forgetMe(await requireUser()));

api.get('/reliquary', async (c) => {
  try {
    const s = await requireUser();
    const ids = await redis.zRange(K.reliquary(`p:${s.userId}`), 0, 49, { by: 'rank', reverse: true });
    return c.json(await getArtifacts(ids.map((i) => i.member)));
  } catch (e) {
    return fail(c, e);
  }
});

// ---------- The Library (readable by anyone, even without joining) ----------

api.get('/library/shelves', async (c) => {
  try {
    const w = await loadWorld();
    if (!w) return c.json([]);
    const shelves: LibraryShelf[] = SPECIES_IDS.map((species: SpeciesId) => ({
      species,
      civs: Object.values(w.civs).filter((v) => v.species === species).sort((a, b) => b.foundedYear - a.foundedYear).map((v) => ({
        id: v.id, name: v.name, ascendant: w.ascendants[v.ascendantId]?.name ?? '?', founded: v.foundedYear, fell: v.fellYear,
        isBot: !!w.ascendants[v.ascendantId]?.isBot,
      })),
    })).filter((s) => s.civs.length);
    return c.json(shelves);
  } catch (e) {
    return fail(c, e);
  }
});

api.get('/library/book', async (c) => {
  try {
    const w = await loadWorld();
    const id = c.req.query('id') ?? '';
    const page = Math.max(0, Number(c.req.query('page') ?? 0) || 0);
    const civ = w?.civs[id];
    if (!civ) throw new GameError('That book is not on the shelves.');
    const log = await readLog(K.book(id), page, 25, false);
    const res: LogPage = { ...log, title: `The Book of ${civ.name.replace(/^the /, '')}${civ.fellYear !== null ? ' (sealed)' : ''}` };
    return c.json(res);
  } catch (e) {
    return fail(c, e);
  }
});

api.get('/library/annals', async (c) => {
  try {
    const page = Math.max(0, Number(c.req.query('page') ?? 0) || 0);
    const log = await readLog(K.annals, page, 30, true);
    const res: LogPage = { ...log, title: 'The Annals of the World' };
    return c.json(res);
  } catch (e) {
    return fail(c, e);
  }
});

api.get('/leaderboards', async (c) => {
  try {
    const w = await loadWorld();
    if (!w) throw new GameError('No world yet.');
    const rem = await numMap(K.rem);
    const all = Object.values(w.ascendants);
    // Old Ones appear greyed out and can never be ranked #1.
    const rank = <T extends { isBot: boolean }>(rows: T[]) => {
      const first = rows.findIndex((r) => !r.isBot);
      if (first > 0) rows.unshift(...rows.splice(first, 1));
      return rows.slice(0, 10);
    };
    const votes = await redis.zRange(K.scripture, 0, 9, { by: 'rank', reverse: true });
    const res: Leaderboards = {
      remembered: rank(all.map((a) => ({ name: a.name, value: rem[a.id] ?? 0, isBot: a.isBot })).sort((a, b) => b.value - a.value)),
      devoted: rank(all.filter((a) => a.status !== 'fading').map((a) => ({ name: a.name, value: Math.round(civStats(w, a.id).belief.devoted * 100), isBot: a.isBot })).sort((a, b) => b.value - a.value)),
      people: rank(all.filter((a) => a.status !== 'fading').map((a) => ({ name: a.name, value: Math.round(civStats(w, a.id).people), isBot: a.isBot })).sort((a, b) => b.value - a.value)),
      slayers: all.filter((a) => a.titles.some((t) => t.startsWith('Slayer'))).map((a) => ({ name: a.name, value: a.titles.filter((t) => t.startsWith('Slayer')).join(', '), isBot: a.isBot })),
      scripture: votes.map((v) => {
        const a = w.ascendants[v.member];
        return { ascId: v.member, name: a?.name ?? '?', text: a?.scripture ?? '', votes: v.score, isBot: !!a?.isBot };
      }).filter((r) => r.text),
    };
    // Old Ones' scripture can be upvoted too
    for (const a of all) if (a.isBot && a.scripture && !res.scripture.some((r) => r.ascId === a.id) && res.scripture.length < 12)
      res.scripture.push({ ascId: a.id, name: a.name, text: a.scripture, votes: 0, isBot: true });
    return c.json(res);
  } catch (e) {
    return fail(c, e);
  }
});
