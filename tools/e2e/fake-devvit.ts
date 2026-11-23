// In-memory stand-in for @devvit/web/server used only by the local e2e harness.
type Z = Map<string, number>;
const kv = new Map<string, unknown>();
const str = (k: string) => kv.get(k) as string | undefined;
const hash = (k: string) => { let h = kv.get(k) as Map<string, string> | undefined; if (!h) { h = new Map(); kv.set(k, h); } return h; };
const zset = (k: string) => { let z = kv.get(k) as Z | undefined; if (!z) { z = new Map(); kv.set(k, z); } return z; };
export const context: Record<string, string | undefined> = { subredditName: 'faithfall_dev', postId: 't3_main' };
export const posts: unknown[] = []; export const comments: unknown[] = [];
const base = {
  async get(k: string) { return str(k); },
  async set(k: string, v: string, o?: { nx?: boolean }) { if (o?.nx && kv.has(k)) return null; kv.set(k, v); return 'OK'; },
  async exists(...ks: string[]) { return ks.filter((k) => kv.has(k)).length; },
  async del(...ks: string[]) { ks.forEach((k) => kv.delete(k)); },
  async incrBy(k: string, n: number) { const v = Number(str(k) ?? 0) + n; kv.set(k, String(v)); return v; },
  async expire() {},
  async hGetAll(k: string) { return Object.fromEntries(hash(k)); },
  async hGet(k: string, f: string) { return hash(k).get(f); },
  async hMGet(k: string, fs: string[]) { return fs.map((f) => hash(k).get(f) ?? null); },
  async hSet(k: string, m: Record<string, string>) { for (const [a, b] of Object.entries(m)) hash(k).set(a, b); return 1; },
  async hSetNX(k: string, f: string, v: string) { if (hash(k).has(f)) return 0; hash(k).set(f, v); return 1; },
  async hIncrBy(k: string, f: string, n: number) { if (!Number.isInteger(n)) throw new Error('hIncrBy non-integer ' + n); const v = Number(hash(k).get(f) ?? 0) + n; hash(k).set(f, String(v)); return v; },
  async zAdd(k: string, ...ms: { score: number; member: string }[]) { ms.forEach((m) => zset(k).set(m.member, m.score)); return ms.length; },
  async zIncrBy(k: string, m: string, n: number) { const v = (zset(k).get(m) ?? 0) + n; zset(k).set(m, v); return v; },
  async zCard(k: string) { return zset(k).size; },
  async zRem(k: string, ms: string[]) { ms.forEach((m) => zset(k).delete(m)); return 1; },
  async zRange(k: string, a: number, b: number, o?: { reverse?: boolean }) {
    let arr = [...zset(k)].map(([member, score]) => ({ member, score })).sort((x, y) => x.score - y.score || (x.member < y.member ? -1 : 1));
    if (o?.reverse) arr.reverse();
    return arr.slice(a, b < 0 ? arr.length + b + 1 : b + 1);
  },
  async zRemRangeByRank(k: string, a: number, b: number) { const arr = await base.zRange(k, a, b); arr.forEach((m) => zset(k).delete(m.member)); return arr.length; },
};
export const redis = {
  ...base,
  async watch() {
    const ops: (() => Promise<unknown>)[] = [];
    const tx = {
      async multi() {},
      async set(k: string, v: string) { ops.push(() => base.set(k, v)); },
      async hIncrBy(k: string, f: string, n: number) { ops.push(() => base.hIncrBy(k, f, n)); },
      async hSet(k: string, m: Record<string, string>) { ops.push(() => base.hSet(k, m)); },
      async incrBy(k: string, n: number) { ops.push(() => base.incrBy(k, n)); },
      async exec() { const out = []; for (const o of ops) out.push(await o()); return out; },
    };
    return tx;
  },
};
export const reddit = {
  async getCurrentUsername() { return context.username; },
  async submitCustomPost(o: { title: string; postData?: unknown }) { if (JSON.stringify(o.postData).length > 2000) throw new Error('postData too big'); posts.push(o); return { id: 't3_' + posts.length }; },
  async submitComment(o: unknown) { comments.push(o); return { id: 't1_x' }; },
};
