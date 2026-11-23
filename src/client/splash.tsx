import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ChroniclePostData } from '../shared/api';

const readPostData = (): ChroniclePostData | null => {
  const d = context.postData;
  if (!d || typeof d !== 'object' || !('headlines' in d) || !Array.isArray(d.headlines)) return null;
  const pick = (k: string) => (d as Record<string, unknown>)[k];
  const evil = pick('evil');
  return {
    leap: Number(pick('leap') ?? 0),
    year: Number(pick('year') ?? 0),
    leapName: String(pick('leapName') ?? ''),
    years: Number(pick('years') ?? 0),
    headlines: d.headlines.map(String).slice(0, 3),
    evil: evil && typeof evil === 'object' && 'hp' in evil && 'maxHp' in evil && 'name' in evil
      ? { name: String(evil.name), hp: Number(evil.hp), maxHp: Number(evil.maxHp) } : null,
    omen: typeof pick('omen') === 'string' ? String(pick('omen')) : null,
  };
};

export const Splash = () => {
  const c = readPostData();
  return (
    <div className="parchment-bg" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 16, gap: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <img src="/art/logo/wordmark.svg" alt="Faithfall" style={{ height: 34 }} />
        <span className="muted smallcaps" style={{ fontSize: 13 }}>the daily Chronicle</span>
      </div>
      {c ? (
        <>
          <div className="display" style={{ fontSize: 18 }}>
            Year {c.year.toLocaleString('en-US')}{c.years > 0 && <> · <span className="gold">{c.leapName}</span> ({c.years} years)</>}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {c.headlines.map((h) => <div key={h} className="headline" style={{ fontSize: 14 }}>{h}</div>)}
            {c.omen && <div className="omen" style={{ marginTop: 4 }}>“{c.omen}”</div>}
          </div>
          {c.evil && (
            <div className="evil-panel" style={{ padding: 8 }}>
              <div className="violet display" style={{ fontSize: 14 }}>{c.evil.name}: {c.evil.hp} / {c.evil.maxHp}</div>
              <div className="bar"><div style={{ width: `${(c.evil.hp / Math.max(1, c.evil.maxHp)) * 100}%`, background: 'var(--violet)' }} /></div>
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, fontSize: 15 }}>
          Every Redditor is an Ascendant. Each day history leaps forward by years or centuries. Guide your people, leave relics behind, and hope someone digs you back up.
        </div>
      )}
      <button className="btn btn-gold" style={{ alignSelf: 'center', minWidth: 200 }} onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}>
        {context.username ? 'Enter the world' : 'Open Faithfall'}
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
