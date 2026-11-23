// The daily leap job and world creation (including the 2,000-year seeded history).
import { reddit, redis } from '@devvit/web/server';
import { EVIL_ONES, LEAPS } from '../../shared/sim/data';
import { headlines, personalLine } from '../../shared/sim/chronicle';
import { runLeap } from '../../shared/sim/engine';
import { generateWorld } from '../../shared/sim/map';
import { omenText, startSeason } from '../../shared/sim/season';
import { scaled } from '../../shared/sim/rules';
import { Rng } from '../../shared/sim/rng';
import type { ActionCard, Artifact, LeapResult, WorldEvent, WorldState } from '../../shared/sim/types';
import type { ChronicleView, ChroniclePostData } from '../../shared/api';
import { K, appendLog, getSalt, loadWorld, mutateWorld, numMap, pushInbox, saveArtifacts } from './store';

const SEED_LEAPS = 45;

/** Seeded history uses scores below LIVE_BASE; live leaps are ordered after it. */
const LIVE_BASE = 100_000_000;
const writeHistory = async (w: WorldState, events: WorldEvent[], base: number, header: string) => {
  await appendLog(K.annals, [header, ...events.filter((e) => e.weight >= 3).map((e) => e.text)], base);
  const byCiv = new Map<string, string[]>();
  for (const e of events) for (const civ of e.civs) byCiv.set(civ, [...(byCiv.get(civ) ?? []), `Year ${w.year.toLocaleString('en-US')}. ${e.text}`]);
  for (const [civ, lines] of byCiv) await appendLog(K.book(civ), lines, base);
};

/** Create the shared world and run the offline seeded history with Old Ones only. */
export const initWorld = async (force = false): Promise<WorldState> => {
  const existing = await loadWorld();
  if (existing && !force) return existing;
  const salt = await getSalt();
  let w = generateWorld('shared', salt);
  const trust: Record<string, number> = {};
  const rem: Record<string, number> = {};
  for (const id of Object.keys(w.ascendants)) trust[id] = 50;
  const allArts: Artifact[] = [];
  for (const civ of Object.values(w.civs)) await appendLog(K.book(civ.id), [`Year 0. ${civ.name[0]!.toUpperCase()}${civ.name.slice(1)} was founded.`], 0);
  for (let i = 0; i < SEED_LEAPS; i++) {
    const r = runLeap({ world: w, trust, remembrance: rem, actions: [], seed: `seed:${salt}:${i}`, quiet: true });
    for (const [k, v] of Object.entries(r.trustDelta)) trust[k] = (trust[k] ?? 0) + v;
    for (const [k, v] of Object.entries(r.remDelta)) rem[k] = (rem[k] ?? 0) + v;
    allArts.push(...r.newArtifacts);
    w = r.world;
    await writeHistory(w, r.events, w.leap * 1000, `— ${r.title} —`);
  }
  // History before the players arrived is "leap 0" of the live world.
  w.leap = 0;
  w.recentLeaps = [];
  await saveArtifacts(allArts);
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(trust)) t[k] = String(Math.round(v));
  await redis.hSet(K.trust, t);
  const rm: Record<string, string> = {};
  for (const [k, v] of Object.entries(rem)) rm[k] = String(Math.round(v));
  if (Object.keys(rm).length) await redis.hSet(K.rem, rm);
  await redis.set(K.world, JSON.stringify(w));
  await appendLog(K.annals, [`— The Age of Ascendants begins in Year ${w.year.toLocaleString('en-US')} —`], LIVE_BASE);
  const first: ChronicleView = {
    leap: 0, year: w.year, years: 0, leapName: 'A Season', title: `Year ${w.year.toLocaleString('en-US')}: The Old Ones Wait`,
    headlines: ['Two thousand years of history lie buried in the ruins.', 'The Old Ones rule the known world.', 'The Dark Continent sleeps in fog to the east.'],
    personal: null, scripture: null, omens: [],
  };
  await redis.set(K.chronicle(0), JSON.stringify(first));
  return w;
};

/** Next 14:00 UTC after `now`. */
export const nextLeapAt = (now = Date.now()) => {
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 14, 0, 0);
  return t > now ? t : t + 86_400_000;
};

export const topScripture = async (w: WorldState): Promise<{ text: string; by: string; ascId: string } | null> => {
  const top = await redis.zRange(K.scripture, 0, 0, { by: 'rank', reverse: true });
  const id = top[0]?.member;
  const asc = id ? w.ascendants[id] : undefined;
  if (!asc?.scripture) return null;
  return { text: asc.scripture, by: asc.name, ascId: asc.id };
};

export const runDailyLeap = async (opts: { post: boolean } = { post: true }): Promise<LeapResult | null> => {
  const before = await loadWorld();
  if (!before) return null;
  const n = before.leap + 1;
  const got = await redis.set(K.lock(n), String(Date.now()), { nx: true, expiration: new Date(Date.now() + 6 * 3600_000) });
  if (!got) {
    console.log(`leap ${n} already running or done`);
    return null;
  }
  await redis.set(K.leaping, '1', { expiration: new Date(Date.now() + 5 * 60_000) });
  try {
    const salt = await getSalt();
    const [trust, rem, rawActions, prophecies] = await Promise.all([
      numMap(K.trust), numMap(K.rem), redis.hGetAll(K.actions(n)), redis.hGetAll(K.prophecy(n)),
    ]);
    const actions: ActionCard[] = [];
    for (const v of Object.values(rawActions)) actions.push(...(JSON.parse(v) as ActionCard[]));
    const s = before.season;
    let pledged = 0;
    let contributors: [string, number][] = [];
    let slayer: string | null = null;
    if (s) {
      pledged = Number((await redis.get(K.pledge(s.id))) ?? 0);
      contributors = (await redis.zRange(K.contrib(s.id), 0, 4, { by: 'rank', reverse: true })).map((m) => [m.member, m.score]);
      slayer = (await redis.get(K.slayer(s.id))) ?? null;
    }
    const result = runLeap({
      world: before, trust, remembrance: rem, actions, seed: `${before.id}:${n}:${salt}`, pledged, slayer, contributors,
    });
    const w = result.world;
    // Headlines made by players between leaps (Great Relics, discoveries, Defilers, arrivals).
    const extra = await redis.zRange(K.extra(n), 0, 20, { by: 'rank', reverse: true });
    for (const e of extra) result.events.push({ kind: `extra${e.score}`, weight: e.score, text: e.member, ascs: [], civs: [] });

    // Prophecies resolve by the odds.
    const payout = LEAPS.find((l) => l.name === result.leapName)?.payout ?? 10;
    const prophecyOutcome: Record<string, boolean> = {};
    for (const [ascId, guess] of Object.entries(prophecies)) {
      const right = guess === result.leapName;
      prophecyOutcome[ascId] = right;
      if (right) {
        result.trustDelta[ascId] = (result.trustDelta[ascId] ?? 0) + scaled(w, ascId, payout);
        result.inbox.push({ asc: ascId, text: `Your prophecy came true: ${result.leapName}. +${scaled(w, ascId, payout)} Trust.` });
      } else {
        result.inbox.push({ asc: ascId, text: `Your prophecy (${guess}) did not come to pass. It was ${result.leapName}.` });
      }
    }

    const scripture = await topScripture(w);
    const heads = headlines(result.events);
    const omens = omenText(w, w.season?.day ?? 0);
    const chronicle: ChronicleView = {
      leap: n, year: w.year, years: result.years, leapName: result.leapName, title: result.title,
      headlines: heads.length ? heads : ['The world turned quietly.'], personal: null,
      scripture: scripture ? { text: scripture.text, by: scripture.by } : null, omens,
    };
    const personal: Record<string, string> = {};
    for (const asc of Object.values(w.ascendants)) if (!asc.isBot) personal[asc.id] = personalLine(result.events, asc.id, w);

    // Commit everything at once, guarded against a concurrent writer.
    const tx = await redis.watch(K.world);
    const cur = await loadWorld();
    if (!cur || cur.leap !== before.leap) throw new Error('world changed during leap');
    await tx.multi();
    await tx.set(K.world, JSON.stringify(w));
    for (const [k, v] of Object.entries(result.trustDelta)) if (Math.round(v)) await tx.hIncrBy(K.trust, k, Math.round(v));
    for (const [k, v] of Object.entries(result.remDelta)) if (Math.round(v)) await tx.hIncrBy(K.rem, k, Math.round(v));
    if (result.newArtifacts.length) {
      const map: Record<string, string> = {};
      for (const a of result.newArtifacts) map[a.id] = JSON.stringify(a);
      await tx.hSet(K.artifacts, map);
    }
    await tx.set(K.chronicle(n), JSON.stringify(chronicle));
    if (Object.keys(personal).length) await tx.hSet(K.personal(n), personal);
    if (pledged && s) await tx.incrBy(K.pledge(s.id), -pledged);
    const res = await tx.exec();
    if (res === null) throw new Error('leap commit conflict');

    // Non-critical follow-ups (logs, notifications, shards to reliquaries).
    await writeHistory(w, result.events, LIVE_BASE + n * 1000, `— ${result.title} —`);
    for (const m of result.inbox) await pushInbox(m.asc, m.text);
    for (const a of result.newArtifacts) if (a.foundBy) await redis.zAdd(K.reliquary(a.foundBy), { score: Date.now(), member: a.id });
    for (const [ascId, right] of Object.entries(prophecyOutcome)) {
      const userId = w.ascendants[ascId]?.userId;
      if (!userId) continue;
      const raw = await redis.get(K.player(userId));
      if (!raw) continue;
      const p = JSON.parse(raw) as { prophecyStreak: number };
      p.prophecyStreak = right ? p.prophecyStreak + 1 : 0;
      await redis.set(K.player(userId), JSON.stringify(p));
    }
    await redis.expire(K.actions(n), 7 * 86400);
    await redis.expire(K.prophecy(n), 7 * 86400);
    await redis.del(K.extra(n));
    if (opts.post) await publishChronicle(w, chronicle);
    return result;
  } finally {
    await redis.del(K.leaping);
  }
};

export const publishChronicle = async (w: WorldState, c: ChronicleView) => {
  const s = w.season;
  const evil = s && s.lairFound && !s.outcome ? EVIL_ONES[s.evilOne] : undefined;
  const postData: ChroniclePostData = {
    leap: c.leap, year: c.year, leapName: c.leapName, years: c.years,
    headlines: c.headlines.slice(0, 3).map((h) => (h.length > 140 ? h.slice(0, 137) + '…' : h)),
    evil: evil && s ? { name: evil.name, hp: Math.max(0, s.hp), maxHp: s.maxHp } : null,
    omen: c.omens.length ? c.omens[c.omens.length - 1]!.slice(0, 140) : null,
  };
  try {
    const post = await reddit.submitCustomPost({
      title: c.title.slice(0, 280),
      entry: 'default',
      postData,
      textFallback: { text: `${c.title}\n\n${c.headlines.map((h) => `- ${h}`).join('\n')}\n\nOpen this post on new Reddit or the app to play Faithfall.` },
    });
    await redis.zAdd(K.posts, { score: c.leap, member: post.id });
    return post;
  } catch (e) {
    console.error('failed to publish chronicle post', e);
    return null;
  }
};

export const beginSeason = async (): Promise<string> => {
  const salt = await getSalt();
  return mutateWorld((w) => {
    if (w.season && !w.season.outcome) return 'A season is already running.';
    const s = startSeason(w, new Rng(`season:${salt}:${w.leap}`));
    return `Season ${s.number} has begun. The Corruption has taken root in secret.`;
  });
};
