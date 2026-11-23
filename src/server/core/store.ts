// Redis storage for the shared world. Only the daily leap advances history;
// player sessions read state and write their own records, using optimistic transactions
// for the few actions that must touch the world (Ascension, Claim, Homecoming).
import { redis } from '@devvit/web/server';
import type { Artifact, WorldState } from '../../shared/sim/types';
import type { PlayerRecord } from '../../shared/api';

export const K = {
  world: 'ff:world',
  salt: 'ff:salt',
  leaping: 'ff:leaping',
  trust: 'ff:trust',
  rem: 'ff:rem',
  artifacts: 'ff:artifacts',
  player: (userId: string) => `ff:player:${userId}`,
  cradle: (userId: string) => `ff:cradle:${userId}`,
  actions: (leap: number) => `ff:actions:${leap}`,
  prophecy: (leap: number) => `ff:prophecy:${leap}`,
  lock: (leap: number) => `ff:lock:leap:${leap}`,
  chronicle: (leap: number) => `ff:chronicle:${leap}`,
  personal: (leap: number) => `ff:personal:${leap}`,
  annals: 'ff:annals',
  book: (civId: string) => `ff:book:${civId}`,
  inbox: (ascId: string) => `ff:inbox:${ascId}`,
  reliquary: (ascId: string) => `ff:reliquary:${ascId}`,
  scripture: 'ff:scripture',
  votes: (leap: number) => `ff:votes:${leap}`,
  pledge: (seasonId: string) => `ff:pledge:${seasonId}`,
  contrib: (seasonId: string) => `ff:contrib:${seasonId}`,
  slayer: (seasonId: string) => `ff:slayer:${seasonId}`,
  posts: 'ff:posts',
  extra: (leap: number) => `ff:extra:${leap}`, // headlines from digs/discoveries for the next Chronicle
  players: 'ff:players', // zset of userIds by join time
  purgeCursor: 'ff:purge-cursor',
};

export const loadWorld = async (): Promise<WorldState | null> => {
  const raw = await redis.get(K.world);
  return raw ? (JSON.parse(raw) as WorldState) : null;
};

export const getSalt = async (): Promise<string> => {
  const s = await redis.get(K.salt);
  if (s) return s;
  const fresh = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  await redis.set(K.salt, fresh, { nx: true });
  return (await redis.get(K.salt)) ?? fresh;
};

export const numMap = async (key: string): Promise<Record<string, number>> => {
  const raw = await redis.hGetAll(key);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Number(v) || 0;
  return out;
};

export const getNum = async (key: string, field: string) => Number((await redis.hGet(key, field)) ?? 0) || 0;

/** Spend Trust atomically; returns false (and refunds) if the balance would go negative. */
export const spendTrust = async (ascId: string, amount: number): Promise<boolean> => {
  const amt = Math.round(amount);
  if (amt <= 0) return true;
  const after = await redis.hIncrBy(K.trust, ascId, -amt);
  if (after < 0) {
    await redis.hIncrBy(K.trust, ascId, amt);
    return false;
  }
  return true;
};

export class GameError extends Error {}

export const assertNotLeaping = async () => {
  if (await redis.exists(K.leaping)) throw new GameError('History is leaping forward. Try again in a minute.');
};

type TxOps = Awaited<ReturnType<typeof redis.watch>>;

/** Optimistic read-modify-write of the world blob. `fn` may queue extra ops on the transaction. */
export const mutateWorld = async <T>(fn: (w: WorldState) => T | { result: T; ops?: (tx: TxOps) => Promise<void> }): Promise<T> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    await assertNotLeaping();
    const tx = await redis.watch(K.world);
    const raw = await redis.get(K.world);
    if (!raw) throw new GameError('The world has not been created yet.');
    const w = JSON.parse(raw) as WorldState;
    const out = fn(w);
    const wrapped = out && typeof out === 'object' && 'result' in (out as object)
      ? (out as { result: T; ops?: (tx: TxOps) => Promise<void> })
      : { result: out as T };
    await tx.multi();
    await tx.set(K.world, JSON.stringify(w));
    if (wrapped.ops) await wrapped.ops(tx);
    try {
      const res = await tx.exec();
      if (res !== null && res !== undefined) return wrapped.result;
    } catch (e) {
      console.warn('world transaction conflict, retrying', e);
    }
  }
  throw new GameError('The world is busy. Please try again.');
};

export const saveArtifacts = async (arts: Artifact[]) => {
  if (!arts.length) return;
  const map: Record<string, string> = {};
  for (const a of arts) map[a.id] = JSON.stringify(a);
  await redis.hSet(K.artifacts, map);
};

export const getArtifacts = async (ids: string[]): Promise<Artifact[]> => {
  if (!ids.length) return [];
  const raw = await redis.hMGet(K.artifacts, ids);
  return raw.filter((r): r is string => !!r).map((r) => JSON.parse(r) as Artifact);
};

export const loadPlayer = async (userId: string): Promise<PlayerRecord | null> => {
  const raw = await redis.get(K.player(userId));
  return raw ? (JSON.parse(raw) as PlayerRecord) : null;
};

export const savePlayer = async (userId: string, p: PlayerRecord) => {
  await redis.set(K.player(userId), JSON.stringify(p));
};

let seqCounter = 0;
/** Append lines to an append-only log (sorted set with an increasing score). */
export const appendLog = async (key: string, lines: string[], base: number) => {
  if (!lines.length) return;
  await redis.zAdd(key, ...lines.map((text, i) => ({ score: base + i / 1000, member: `${base + i / 1000 + (seqCounter++ % 1000) / 1e7}|${text}` })));
};

export const readLog = async (key: string, page: number, size = 20, newestFirst = true) => {
  const total = await redis.zCard(key);
  const start = page * size;
  const rows = await redis.zRange(key, start, start + size - 1, { by: 'rank', ...(newestFirst ? { reverse: true } : {}) });
  return { total, lines: rows.map((r) => ({ score: r.score, text: r.member.slice(r.member.indexOf('|') + 1) })) };
};

export const pushInbox = async (ascId: string, text: string) => {
  if (!ascId.startsWith('p:')) return;
  const now = Date.now();
  await redis.zAdd(K.inbox(ascId), { score: now, member: `${now}${Math.random().toString(36).slice(2, 6)}|${text}` });
  const n = await redis.zCard(K.inbox(ascId));
  if (n > 40) await redis.zRemRangeByRank(K.inbox(ascId), 0, n - 41);
};
