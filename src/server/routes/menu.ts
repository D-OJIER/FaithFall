import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { beginSeason, initWorld, publishChronicle, runDailyLeap } from '../core/leap';
import { loadWorld } from '../core/store';
import { loadChronicle } from '../core/view';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const w = await initWorld();
    const chron = await loadChronicle(w, null);
    const post = chron ? await publishChronicle(w, chron) : null;
    if (!post) return c.json<UiResponse>({ showToast: 'Failed to create the post' }, 400);
    return c.json<UiResponse>({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/leap-now', async (c) => {
  try {
    const r = await runDailyLeap({ post: true });
    return c.json<UiResponse>({ showToast: r ? `History leapt ${r.years} years (${r.leapName}).` : 'A leap is already running.' });
  } catch (e) {
    console.error('leap failed', e);
    return c.json<UiResponse>({ showToast: 'The leap failed. Check the logs.' });
  }
});

menu.post('/start-season', async (c) => {
  try {
    return c.json<UiResponse>({ showToast: await beginSeason() });
  } catch (e) {
    console.error(e);
    return c.json<UiResponse>({ showToast: 'Could not start a season.' });
  }
});

menu.post('/reset-world', async (c) => {
  const w = await loadWorld();
  return c.json<UiResponse>({
    showForm: {
      name: 'resetForm',
      form: {
        title: 'Reset the Faithfall world',
        description: `This erases the world (now Year ${w?.year ?? 0}) and seeds 2,000 new years of history. Players keep their accounts but must ascend again.`,
        acceptLabel: 'Reset',
        fields: [{ name: 'confirm', label: 'Type RESET to confirm', type: 'string', required: true }],
      },
    },
  });
});
