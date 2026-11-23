import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { redis } from '@devvit/web/server';
import { initWorld } from '../core/leap';
import { K } from '../core/store';

export const forms = new Hono();

forms.post('/reset-confirm', async (c) => {
  const { confirm } = await c.req.json<{ confirm?: string }>();
  if (confirm?.trim() !== 'RESET') return c.json<UiResponse>({ showToast: 'Reset cancelled.' });
  // Remove world-level data. Player records are reset to onboarding on their next visit.
  const players = await redis.zRange(K.players, 0, -1, { by: 'rank' });
  for (const p of players) await redis.del(K.player(p.member), K.reliquary(`p:${p.member}`), K.inbox(`p:${p.member}`));
  await redis.del(K.world, K.trust, K.rem, K.artifacts, K.annals, K.scripture, K.players);
  await initWorld(true);
  return c.json<UiResponse>({ showToast: 'A new world has been made, with 2,000 years of history.' });
});
