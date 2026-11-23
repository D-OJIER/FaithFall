import { context, posts, comments, redis } from './fake-devvit';
import { initWorld, runDailyLeap, beginSeason } from '../../src/server/core/leap';
import * as G from '../../src/server/core/game';
import { loadWorld, K } from '../../src/server/core/store';
import { meView, seasonView, loadChronicle, rollDay } from '../../src/server/core/view';
import { cradleView } from '../../src/server/core/game';
import type { CardId } from '../../src/shared/sim/types';

const ok = (c: boolean, m: string) => { if (!c) { console.error('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
const t0 = Date.now();
let w = await initWorld();
ok(w.year > 1000, `seeded history to Year ${w.year} in ${Date.now() - t0}ms`);
ok((await redis.zCard(K.annals)) > 50, `annals has ${await redis.zCard(K.annals)} lines`);

const users = ['t2_a', 't2_b', 't2_c'];
for (const u of users) {
  context.userId = u; context.username = 'user_' + u.slice(3);
  const s = await G.requireUser();
  const p = await G.draw(s, false);
  ok(p.draw!.length === 7, 'starry draw gives 7 cards');
  await G.draw(s, true);
  let threw = false; try { await G.draw(s, true); } catch { threw = true; }
  ok(threw, 'second redraw refused');
  await G.choose(s, { card: 0, domain: u === 't2_a' ? 'death' : 'war', name: 'Vae' + u, epithet: 'Keeper of the Test' });
  for (const beat of ['bless', 'dig', 'whisper', 'ward']) await G.cradleStep(s, beat);
  const cv = (await cradleView(s))!;
  ok(cv.regions.filter((r) => r.owner === `p:${u}`).length === 2, 'whisper converted the wild village in the Cradle');
  ok(cv.regions[0]!.corruption === 0, 'ward kept corruption out of home');
  ok(cv.landings.length > 0, `${cv.landings.length} landing options`);
  await G.ascend(s, cv.landings[0]!.id, 'We remember the drowned bell.');
}
w = (await loadWorld())!;
ok(Object.values(w.ascendants).filter((a) => !a.isBot).length === 3, '3 players ascended');

const playAll = async (u: string) => {
  context.userId = u; context.username = 'user_' + u.slice(3);
  const s = await G.requireUser();
  const world = (await loadWorld())!;
  let p = (await (await import('../../src/server/core/store')).loadPlayer(u))!;
  p = await rollDay(world, p);
  const me = (await meView(world, p))!;
  const asc = world.ascendants[me.asc.id]!;
  const home = world.regions.find((r) => r.owner === asc.id);
  for (const h of me.hand) {
    const t = ({ bless: home?.id, spring: home?.id, teach: home?.id, commission: home?.id, ward: home?.id } as Record<string, number | undefined>)[h.id];
    try {
      if (h.id === 'envoy') await G.playCard(s, { card: h.id, target: null, to: 'old:0', text: 'Peace, neighbour.' });
      else if (h.id === 'explore') { const f = world.regions.find((r) => r.fog && (world.regions.some((x) => !x.fog))); await G.playCard(s, { card: h.id as CardId, target: f?.id ?? null }); }
      else await G.playCard(s, { card: h.id as CardId, target: t ?? null });
    } catch (e) { /* invalid targets are expected sometimes */ }
  }
  const ruins = world.regions.filter((r) => (r.owner === 'ruin' || r.owner === 'waste') && !r.fog);
  for (let i = 0; i < 3 && ruins.length; i++) {
    try {
      const r = await G.dig(s, ruins[i % ruins.length]!.id);
      if (r.artifact) await G.resolveDiscovery(s, i === 0 ? 'claim' : 'leave');
      digs.push(r.outcome);
    } catch (e) { console.log('   dig:', (e as Error).message); }
  }
  try { await G.prophesy(s, 'A Generation'); } catch { /* once a day */ }
};
const digs: string[] = [];
for (let day = 1; day <= 6; day++) {
  for (const u of users) await playAll(u);
  if (day === 2) console.log('     ', await beginSeason());
  const r = await runDailyLeap({ post: true });
  ok(!!r, `leap ${day}: ${r?.years}y → ${r?.title}`);
}
ok(digs.length >= 10, `dig outcomes: ${digs.join(',')}`);
ok((await runDailyLeap()) !== null, 'leap 7 runs');
// idempotency: lock prevents rerun of same number
w = (await loadWorld())!;
await redis.set(K.lock(w.leap + 1), 'x');
ok((await runDailyLeap()) === null, 'locked leap is skipped (retry-safe)');
await redis.del(K.lock(w.leap + 1));

// Season to emergence
for (let i = 0; i < 8; i++) await runDailyLeap();
w = (await loadWorld())!;
const sv = await seasonView(w, 'p:t2_a');
console.log('      season', JSON.stringify({ phase: sv?.phase, day: sv?.day, awake: sv?.awake, lair: sv?.lairFound, omens: sv?.omens, hp: sv?.hp }));
ok(!JSON.stringify(sv).includes('"source":') , 'season view has no raw secret fields');
if (sv?.lairFound && !sv.outcome) {
  context.userId = 't2_a'; context.username = 'user_a';
  const s = await G.requireUser();
  const r = await G.pledge(s, 20);
  ok(r.damage > 0, `pledge dealt ${r.damage}`);
}
context.userId = 't2_a'; context.username = 'user_a';
const s = await G.requireUser();
await G.shareMyth(s);
ok(comments.length === 1 && JSON.stringify(comments[0]).includes('"runAs":"USER"'), 'myth shared as user comment');
const ch = await loadChronicle(w, 'p:t2_a');
ok(!!ch?.headlines.length, `chronicle: ${ch?.headlines[0]}`);
ok(posts.length >= 14, `${posts.length} chronicle posts published`);
console.log('      last post', JSON.stringify(posts[posts.length - 1]).slice(0, 300));
await G.forgetMe(s);
w = (await loadWorld())!;
ok(w.ascendants['p:t2_a']!.userId === null, 'forget-me anonymised the Ascendant');
console.log('      world KB', (JSON.stringify(w).length / 1024) | 0, 'regions', w.regions.length);
for (const a of Object.values(w.ascendants).filter((x) => !x.isBot)) {
  const regs = w.regions.filter((r) => r.owner === a.id);
  console.log('     ', a.name, a.species, a.status, 'regions', regs.length, 'people', regs.reduce((x, r) => x + r.people, 0).toFixed(1), 'trust', await redis.hGet(K.trust, a.id), 'doubt', regs.map((r) => r.belief.doubtful.toFixed(2)).join('/'));
}
console.log('      fading bots', Object.values(w.ascendants).filter((a) => a.isBot && a.status === 'fading').length);
