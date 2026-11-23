import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { initWorld, publishChronicle } from '../core/leap';
import { K, loadWorld } from '../core/store';
import { loadChronicle } from '../core/view';
import { redis } from '@devvit/web/server';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const w = await initWorld();
    const chron = await loadChronicle(w, null);
    if (chron && !(await redis.zCard(K.posts))) await publishChronicle(w, chron);
    return c.json<TriggerResponse>({ status: 'success', message: `World ready in Year ${w.year}` });
  } catch (error) {
    console.error(`Error creating world: ${error}`);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to create world' }, 400);
  }
});

triggers.post('/on-app-upgrade', async (c) => {
  try {
    if (!(await loadWorld())) await initWorld();
    return c.json<TriggerResponse>({ status: 'success', message: 'ok' });
  } catch (error) {
    console.error(`Upgrade error: ${error}`);
    return c.json<TriggerResponse>({ status: 'error', message: 'upgrade failed' }, 400);
  }
});
