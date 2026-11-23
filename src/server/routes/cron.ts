import { Hono } from 'hono';
import { runDailyLeap } from '../core/leap';
import { purgeDeletedUsers } from '../core/game';

export const cron = new Hono();

// Scheduled once a day at 14:00 UTC (devvit.json). Safe to retry: the leap is locked per number.
cron.post('/daily-leap', async (c) => {
  try {
    const r = await runDailyLeap({ post: true });
    console.log(r ? `leap ${r.world.leap}: ${r.years} years` : 'leap skipped');
  } catch (e) {
    console.error('daily leap failed', e);
  }
  try {
    const n = await purgeDeletedUsers();
    if (n) console.log(`purged data of ${n} deleted accounts`);
  } catch (e) {
    console.error('purge failed', e);
  }
  return c.json({});
});
