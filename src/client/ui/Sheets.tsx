import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as RMouseEvent } from 'react';
import { canRunAsUser } from '@devvit/web/client';
import type {
  ChronicleView, DigResult, Leaderboards, LibraryShelf, LogPage, MeView, PublicAsc, PublicRegion, SeasonView, StateResponse,
} from '../../shared/api';
import { CARDS, DOMAINS, LEAPS, SPECIES } from '../../shared/sim/data';
import { realmLabel } from '../../shared/sim/rules';
import type { Artifact, LeapName } from '../../shared/sim/types';
import { getJson, post, toast } from '../api';
import { TERRAIN_STYLE, fmt, fmtPeople } from './hex';
import { art } from '../art';
import { Icon } from './Icon';
import { BeliefBar, Sheet } from './Sheet';

const ownerLabel = (r: PublicRegion, asc: PublicAsc | undefined) => {
  if (r.fog) return 'Unknown, lost in fog';
  if (asc) return `${asc.civName} (${asc.name}${asc.isBot ? ', an Old One' : asc.username ? `, u/${asc.username}` : ''})`;
  if (r.owner === 'ruin') return 'Ruins';
  if (r.owner === 'waste') return 'Wasteland';
  if (r.owner === 'hollow') return 'Hollowed: its people kneel to something else';
  if (r.landing) return 'Reserved landing for new Ascendants';
  return r.people > 0 ? `Wild ${SPECIES[r.species].name}, no Ascendant` : 'Empty land';
};

// ---------- Season ----------

export const SeasonPanel = ({ season, me, onPledged }: { season: SeasonView; me: MeView | null; onPledged: () => void }) => {
  const [amount, setAmount] = useState(10);
  const pledge = async () => {
    try {
      const r = await post<{ damage: number; hp: number }>('/api/pledge', { amount });
      toast(`You dealt ${r.damage} damage. ${r.hp} health remains.`);
      onPledged();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <div className="evil-panel">
      {!season.outcome && (season.awake || season.discovered) && (
        <img src={art.evil(season.lairFound ? 'vashtar-revealed' : 'vashtar-hidden')} alt={season.lairFound ? 'The Evil One revealed' : 'A sealed, unknown evil'}
          style={{ display: 'block', margin: '0 auto 6px', height: season.lairFound ? 120 : 80 }} />
      )}
      <div className="display violet" style={{ fontSize: 16 }}>
        {season.outcome === 'won' ? 'The Evil One is shattered' : season.outcome === 'lost' ? 'The Corruption triumphed' : season.lairFound && season.evil ? `${season.evil.name}, ${season.evil.epithet}` : season.awake ? 'Something has awoken' : season.discovered ? `The source is found${season.evil ? `: ${season.evil.blight}` : ''}` : 'Omens'}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>Season {season.number} · day {season.day} · {season.phase}</div>
      {season.omens.map((o) => <div key={o} className="omen">“{o}”</div>)}
      {season.clue && <div style={{ fontSize: 13, marginTop: 4 }}><b>Only you know:</b> {season.clue}</div>}
      {season.discoveredBy && <div style={{ fontSize: 13 }}>Found by <b>{season.discoveredBy}</b>, Seeker.</div>}
      {season.lairFound && season.evil && season.maxHp > 0 && !season.outcome && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 13 }}><i>{season.evil.form}</i></div>
          <div className="hp-bar" role="meter" aria-valuenow={season.hp} aria-valuemax={season.maxHp} aria-label="Evil One health">
            <img src={art.evil('health-bar')} alt="" />
            <div className="hp-lost" style={{ width: `${(1 - Math.max(0, Math.min(1, season.hp / Math.max(1, season.maxHp)))) * 81.25}%` }} />
          </div>
          <div style={{ fontSize: 12 }}>{season.hp} / {season.maxHp} health</div>
          {season.top.length > 0 && <div style={{ fontSize: 12 }}>Top: {season.top.map((t) => `${t.name} ${t.amount}`).join(' · ')}</div>}
          {me && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
              <input className="text" type="number" min={1} max={me.trust} value={amount} style={{ width: 90 }} onChange={(e) => setAmount(Number(e.target.value))} />
              <button className="btn btn-violet btn-small" onClick={pledge}>Pledge Trust</button>
            </div>
          )}
          <div className="muted" style={{ fontSize: 11 }}>Pledges count in base Trust (Trust ÷ your Weight), so every people hits as hard.</div>
        </div>
      )}
      {!season.discovered && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>To find it: dig ruins, Explore the fog, or Whisper to the Hollowed.</div>}
    </div>
  );
};

// ---------- Chronicle ----------

export const ChronicleSheet = ({ c, season, me, onClose, openAnnals, onPledged }: {
  c: ChronicleView; season: SeasonView | null; me: MeView | null; onClose: () => void; openAnnals: () => void; onPledged: () => void;
}) => (
  <Sheet onClose={onClose}>
    <div className="smallcaps muted" style={{ textAlign: 'center' }}>The Chronicle</div>
    {c.years > 0 ? (
      <div className="leap-banner"><b>{c.leapName}</b> passes: {c.years} years</div>
    ) : (
      <div className="leap-banner">The world waits</div>
    )}
    <div className="display" style={{ textAlign: 'center', fontSize: 15 }}>{c.title}</div>
    <hr className="rule" />
    {c.headlines.map((h) => <div key={h} className="headline">{h}</div>)}
    {c.personal && (
      <div style={{ marginTop: 10, padding: 10, border: '1.5px solid var(--gold)', borderRadius: 6, background: 'rgba(240,207,116,0.18)' }}>
        <div className="smallcaps gold" style={{ fontSize: 12 }}>Your people</div>
        {c.personal}
      </div>
    )}
    {c.scripture && (
      <div style={{ marginTop: 10, textAlign: 'center' }}>
        <div className="display" style={{ fontSize: 16 }}>“{c.scripture.text}”</div>
        <div className="muted" style={{ fontSize: 12 }}>The most upvoted scripture, by {c.scripture.by}</div>
      </div>
    )}
    {season && <div style={{ marginTop: 10 }}><SeasonPanel season={season} me={me} onPledged={onPledged} /></div>}
    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
      <button className="btn btn-small" onClick={openAnnals}>Read the full Annals</button>
      <button className="btn btn-gold btn-small" onClick={onClose}>To the map</button>
    </div>
  </Sheet>
);

// ---------- Region ----------

export const RegionSheet = ({ r, state, onClose, onDig, canPlay, onPlay, reload }: {
  r: PublicRegion; state: StateResponse; onClose: () => void; onDig: () => void;
  canPlay: { name: string; cost: number } | null; onPlay: () => void; reload: () => Promise<void>;
}) => {
  const asc = state.world.ascendants.find((a) => a.id === r.owner);
  const me = state.me;
  const day = me?.day ?? 1;
  const [newName, setNewName] = useState('');
  const isDiggable = !r.fog && (r.owner === 'ruin' || r.owner === 'waste');
  const terr = r.terrain ? TERRAIN_STYLE[r.terrain] : null;
  const name = async () => {
    try {
      await post('/api/name-region', { region: r.id, name: newName });
      toast('The land bears your name for it now.');
      await reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <Sheet onClose={onClose} title={r.name}>
      <div className="muted" style={{ fontSize: 13 }}>
        {terr ? terr.label : 'Fog'}{r.dark ? ' · the Dark Continent' : ''}{r.protected ? ' · protected newcomer' : ''}
      </div>
      <div style={{ marginTop: 4 }}>{ownerLabel(r, asc)}</div>
      {!r.fog && r.people > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          <span className="stat">People {fmtPeople(r.people)}</span>
          {asc && <span className="stat">Food {r.food}</span>}
          {asc && day >= 3 && <span className="stat">Might {r.might}</span>}
          {(asc || r.owner === 'wild') && <span className="stat"><img src={art.species(r.species)} width={22} height={22} alt="" /> {SPECIES[r.species].name}</span>}
        </div>
      )}
      {asc && day >= 2 && r.people > 0 && <div style={{ marginTop: 6 }}><BeliefBar devoted={r.devoted} faithful={Math.max(0, 100 - r.devoted - r.doubtful)} doubtful={r.doubtful} /></div>}
      {r.corruption === -1 && <div className="violet" style={{ marginTop: 6 }}>A sickness with no name afflicts this land.</div>}
      {r.corruption > 0 && <div className="violet" style={{ marginTop: 6 }}>Corruption {r.corruption}/100</div>}
      {r.ruin && (
        <div style={{ marginTop: 6, fontSize: 14 }}>
          {r.ruin.layers} layer{r.ruin.layers === 1 ? '' : 's'} of buried history{r.ruin.realm ? `: ${realmLabel[r.ruin.realm]}` : ''}{r.ruin.buried ? `, sunk ${r.ruin.buried} ages deep` : ''}.
          {r.ruin.glow && <div className="gold">A light glows here. Someone wants to be found.</div>}
        </div>
      )}
      {asc?.scripture && <div style={{ marginTop: 6, fontStyle: 'italic' }}>“{asc.scripture}”</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        {canPlay && <button className="btn btn-gold" onClick={onPlay}>Play {canPlay.name} here ({canPlay.cost} Trust)</button>}
        {isDiggable && me && <button className="btn" disabled={me.digsLeft <= 0} onClick={onDig}>Dig ({me.digsLeft} left)</button>}
      </div>
      {r.canName && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13 }}>You revealed this land first. Name it for everyone (24 characters):</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="text" maxLength={24} value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn btn-small" onClick={name}>Name</button>
          </div>
        </div>
      )}
    </Sheet>
  );
};

// ---------- Dig ----------

export const DigSheet = ({ region, me, onClose, reload }: { region: PublicRegion; me: MeView; onClose: () => void; reload: () => Promise<void> }) => {
  const [brushed, setBrushed] = useState(0);
  const [result, setResult] = useState<DigResult | null>(null);
  const [pending, setPending] = useState(false);
  const started = useRef(false);
  const begin = () => {
    if (started.current) return;
    started.current = true;
    setPending(true);
    post<DigResult>('/api/dig', { region: region.id })
      .then((r) => setResult(r))
      .catch((e: Error) => { toast(e.message); onClose(); })
      .finally(() => setPending(false));
  };
  const brush = (amt: number) => {
    begin();
    setBrushed((b) => Math.min(100, b + amt));
  };
  const revealed = brushed >= 100 && result;
  const choose = async (choice: 'claim' | 'destroy' | 'leave') => {
    try {
      toast(await post<string>('/api/discovery', { choice }));
      await reload();
      onClose();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const close = () => {
    void reload();
    onClose();
  };
  return (
    <Sheet onClose={close} title={`Digging at ${region.name}`}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{revealed ? '' : 'Brush the dust away (tap or swipe).'}</div>
      <div className={`dig-pit ${revealed && result.outcome === 'great' ? 'great-glow' : ''}`}
        onClick={() => brush(34)} onPointerMove={(e) => e.buttons && brush(3)}>
        {revealed && (
          <div className="dig-reveal fade-in">
            <div>
              <img src={art.dig(result.outcome)} alt="" />
              <div style={{ fontSize: 17 }}>{result.outcome === 'great' ? 'A Great Relic!' : result.outcome === 'artifact' ? 'An artifact!' : result.outcome === 'fragment' ? 'Fragments' : 'Dust'}</div>
            </div>
          </div>
        )}
        <div className="dig-dust" style={{ opacity: 1 - brushed / 100 }} />
      </div>
      {brushed >= 100 && pending && <div className="muted">The earth gives way…</div>}
      {revealed && (
        <div className="fade-in" style={{ marginTop: 10 }}>
          <div>{result.text}</div>
          {result.trust > 0 && <div className="gold">+{result.trust} Trust</div>}
          {result.artifact?.inscription && <div style={{ fontStyle: 'italic', marginTop: 4 }}>Inscribed: “{result.artifact.inscription}”</div>}
          {result.homecoming && <div className="gold display">Homecoming: +3 Remembrance.</div>}
          {result.discovery && <div className="violet display" style={{ fontSize: 16 }}>{result.discovery}</div>}
          {result.artifact && (me.day >= 2 ? (
            <div style={{ marginTop: 10 }}>
              <div className="smallcaps muted">You have discovered this ruin. Choose:</div>
              <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
                <button className="btn btn-gold" onClick={() => choose('claim')}>Claim: make it your Shrine (+Trust daily; its builder is remembered)</button>
                <button className="btn" onClick={() => choose('leave')}>Leave: keep the artifact, leave the ruin open</button>
                <button className="btn btn-violet" onClick={() => choose('destroy')}>Destroy: +Trust now, but you’ll be called the Defiler</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-gold" style={{ marginTop: 8 }} onClick={() => choose('leave')}>Add it to your Reliquary</button>
          ))}
          {!result.artifact && <button className="btn" style={{ marginTop: 8 }} onClick={close}>Done</button>}
        </div>
      )}
    </Sheet>
  );
};

// ---------- Prophecy ----------

export const ProphecySheet = ({ me, onClose, reload }: { me: MeView; onClose: () => void; reload: () => Promise<void> }) => {
  const make = async (guess: LeapName) => {
    try {
      await post('/api/prophecy', { guess });
      toast(`You foresee ${guess}. It resolves in the next Chronicle.`);
      await reload();
      onClose();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <Sheet onClose={onClose} title="Make a prophecy">
      <div style={{ fontSize: 14, marginBottom: 8 }}>How far will history leap tomorrow? Rarer leaps pay more.</div>
      {me.prophecy && <div className="gold" style={{ marginBottom: 8 }}>You foresaw: <b>{me.prophecy}</b></div>}
      <div style={{ display: 'grid', gap: 6 }}>
        {LEAPS.map((l) => (
          <button key={l.name} className="btn" disabled={!!me.prophecy} onClick={() => make(l.name)} style={{ justifyContent: 'space-between' }}>
            <span>{l.name} <span className="muted">({l.years} years)</span></span>
            <span className="gold">{Math.round(l.payout * me.weight)} Trust</span>
          </button>
        ))}
      </div>
      {me.prophecyStreak > 0 && <div className="muted" style={{ marginTop: 6 }}>Prophecy streak: {me.prophecyStreak}</div>}
    </Sheet>
  );
};

// ---------- Ascendant ----------

export const AscendantSheet = ({ me, onClose, reload, openLibrary }: { me: MeView; onClose: () => void; reload: () => Promise<void>; openLibrary: () => void }) => {
  const [relics, setRelics] = useState<Artifact[] | null>(null);
  const [scripture, setScripture] = useState(me.asc.scripture);
  const [confirmForget, setConfirmForget] = useState(false);
  useEffect(() => {
    getJson<Artifact[]>('/api/reliquary').then(setRelics).catch(() => setRelics([]));
  }, []);
  const a = me.asc;
  const save = async () => {
    try {
      await post('/api/scripture', { text: scripture });
      toast('Your scripture is carved.');
      await reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  const forget = async () => {
    try {
      await post('/api/forget-me');
      toast('Your personal data has been deleted.');
      await reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <img src={art.sigil(a.domain)} width={56} height={56} alt={`${DOMAINS[a.domain].name} sigil`} />
        <img src={art.species(a.species)} width={44} height={44} alt={SPECIES[a.species].name} />
        <div>
          <div className="display" style={{ fontSize: 20 }}>{a.name}</div>
          <div className="gold display">{a.epithet}</div>
          <div className="muted" style={{ fontSize: 12 }}>{DOMAINS[a.domain].glyph} {DOMAINS[a.domain].name} · {SPECIES[a.species].name} · {a.status}{a.defiler ? ' · the Defiler' : ''}</div>
        </div>
      </div>
      {a.titles.length > 0 && <div style={{ marginTop: 6 }}>{a.titles.map((t) => <span key={t} className="chip">{t}</span>)}</div>}
      <hr className="rule" />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span className="stat"><Icon name="trust" /><b>{me.trust}</b>&nbsp;Trust</span>
        <span className="stat"><Icon name="remembrance" /><b>{me.remembrance}</b>&nbsp;Remembrance</span>
        <span className="stat">Weight ×{me.weight}</span>
        <span className="stat">Day {me.day}</span>
      </div>
      {a.status !== 'fading' ? (
        <>
          <div style={{ marginTop: 6 }}>{a.civName}: {fmtPeople(me.stats.people)} People in {me.stats.regions} region{me.stats.regions === 1 ? '' : 's'}, Food {me.stats.food}{me.day >= 3 ? `, Might ${me.stats.might}` : ''}</div>
          {me.day >= 2 && <div style={{ marginTop: 6 }}><BeliefBar devoted={me.stats.devoted} faithful={me.stats.faithful} doubtful={me.stats.doubtful} /></div>}
        </>
      ) : (
        <div style={{ marginTop: 6 }} className="violet">
          You are fading. You keep your Trust, draw one card a day, and can still dig, prophesy and write scripture.
          {me.canReturn ? ' You have enough Remembrance to return: Whisper to a wild people or an untended ruin.' : ` Reach 5 Remembrance (you have ${me.remembrance}) or find your own ruins to return.`}
        </div>
      )}
      <h3>Scripture</h3>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="text" maxLength={80} value={scripture} placeholder="One holy line, up to 80 characters" onChange={(e) => setScripture(e.target.value)} />
        <button className="btn btn-small" onClick={save}>Carve</button>
      </div>
      <h3>Reliquary ({me.reliquary})</h3>
      {relics === null && <div className="muted">Opening…</div>}
      {relics?.length === 0 && <div className="muted">Nothing yet. Dig ruins to find artifacts.</div>}
      {relics?.map((r) => (
        <div key={r.id} className="list-row" style={{ fontSize: 13 }}>
          <img src={art.dig(r.great ? 'great' : 'artifact')} width={30} height={30} alt="" />
          <span><b>{r.name}</b>{r.destroyed ? ' (dust)' : ''}<br /><span className="muted">{r.civName}, Year {fmt(r.yearMade)}{r.inscription ? ` · “${r.inscription}”` : ''}</span></span>
        </div>
      ))}
      {me.inbox.length > 0 && (
        <>
          <h3>Messages</h3>
          {me.inbox.map((m, i) => <div key={i} className="list-row" style={{ fontSize: 13 }}>{m}</div>)}
        </>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-small" onClick={openLibrary}>Library and leaderboards</button>
        {!confirmForget ? (
          <button className="btn btn-ghost btn-small" onClick={() => setConfirmForget(true)}>Delete my data</button>
        ) : (
          <button className="btn btn-violet btn-small" onClick={forget}>Confirm: delete my data</button>
        )}
      </div>
      {confirmForget && <div className="muted" style={{ fontSize: 12 }}>Your account link, messages and progress are deleted. Your Ascendant stays in the world’s history without your username.</div>}
    </Sheet>
  );
};

// ---------- Envoy ----------

export const EnvoySheet = ({ state, onClose, onSend }: { state: StateResponse; onClose: () => void; onSend: (to: string, text: string) => void }) => {
  const [to, setTo] = useState<string>('');
  const [text, setText] = useState('');
  const others = state.world.ascendants.filter((a) => a.id !== state.me?.asc.id);
  return (
    <Sheet onClose={onClose} title="Send an Envoy">
      <div style={{ fontSize: 13 }}>Your message arrives at the next leap and is written into both Books.</div>
      <select className="text" value={to} onChange={(e) => setTo(e.target.value)} style={{ marginTop: 6 }}>
        <option value="">Choose an Ascendant…</option>
        {others.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isBot ? ' (Old One)' : ''}, {a.civName || 'fading'}</option>)}
      </select>
      <textarea className="text" rows={3} maxLength={140} value={text} placeholder="Up to 140 characters" onChange={(e) => setText(e.target.value)} style={{ marginTop: 6 }} />
      <button className="btn btn-gold" style={{ marginTop: 6 }} disabled={!to || !text.trim()} onClick={() => onSend(to, text)}>Send ({CARDS.envoy.name})</button>
    </Sheet>
  );
};

// ---------- End card ----------

const countdown = (t: number) => {
  const ms = Math.max(0, t - Date.now());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

export const EndCard = ({ state, onClose }: { state: StateResponse; onClose: () => void }) => {
  const me = state.me!;
  const [myth, setMyth] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    post<string>('/api/myth').then(setMyth).catch(() => setMyth(''));
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const share = async (e: RMouseEvent) => {
    try {
      const ok = await canRunAsUser(e.nativeEvent);
      if (!ok) {
        toast('Posting needs your permission to comment as you.');
        return;
      }
      await post('/api/share');
      setPosted(true);
      toast('Your myth was posted as a comment.');
    } catch (err) {
      toast((err as Error).message);
    }
  };
  const a = me.asc;
  const slayer = a.titles.find((t) => t.startsWith('Slayer'));
  return (
    <Sheet onClose={onClose}>
      <div className="share-card">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <img src={art.species(a.species)} width={52} height={52} alt="" />
          <img src={art.sigil(a.domain)} width={72} height={72} alt={`${DOMAINS[a.domain].name} sigil`} />
          <img src={art.logo('app-icon')} width={40} height={40} alt="Faithfall" />
        </div>
        <div className="display" style={{ fontSize: 20 }}>{a.name}</div>
        <div className="gold display" style={{ fontSize: 14 }}>{a.epithet}</div>
        {slayer && <div className="chip" style={{ marginTop: 4 }}>{slayer}</div>}
        <hr className="rule" />
        <div className="display" style={{ fontSize: 16 }}>{myth ?? '…'}</div>
        <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>Return tomorrow to see what history remembers.</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <div className="muted" style={{ fontSize: 13 }}>The next leap comes in {countdown(state.world.nextLeapAt)} (14:00 UTC)</div>
        <button className="btn btn-gold" style={{ marginTop: 8 }} disabled={posted || !myth} onClick={share}>
          {posted ? 'Posted' : 'Post as a comment from your account'}
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>This posts the myth above to this thread under your username.</div>
      </div>
    </Sheet>
  );
};

// ---------- Library ----------

const Board = ({ title, rows }: { title: string; rows: { name: string; value: number | string; isBot: boolean }[] }) => (
  <>
    <h3>{title}</h3>
    {rows.length === 0 && <div className="muted">No one yet.</div>}
    {rows.map((r, i) => (
      <div key={i} className={`list-row ${r.isBot ? 'bot' : ''}`} style={{ fontSize: 13 }}>
        <span style={{ width: 22 }} className="muted">{r.isBot ? '·' : `#${rows.slice(0, i + 1).filter((x) => !x.isBot).length}`}</span>
        <span style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{r.isBot && <Icon name="old-one" size={14} label="Old One" />}{r.name}</span>
        <b>{r.value}</b>
      </div>
    ))}
  </>
);

type LibTab = 'annals' | 'shelves' | 'boards' | 'scripture';

export const LibrarySheet = ({ onClose, start, me, reload }: { onClose: () => void; start: LibTab; me: MeView | null; reload: () => Promise<void> }) => {
  const [tab, setTab] = useState<LibTab>(start);
  const [page, setPage] = useState(0);
  const [log, setLog] = useState<LogPage | null>(null);
  const [book, setBook] = useState<string | null>(null);
  const [shelves, setShelves] = useState<LibraryShelf[] | null>(null);
  const [boards, setBoards] = useState<Leaderboards | null>(null);

  useEffect(() => {
    if (tab === 'annals' && !book) getJson<LogPage>(`/api/library/annals?page=${page}`).then(setLog).catch((e: Error) => toast(e.message));
    if (book) getJson<LogPage>(`/api/library/book?id=${encodeURIComponent(book)}&page=${page}`).then(setLog).catch((e: Error) => toast(e.message));
    if (tab === 'shelves' && !shelves) getJson<LibraryShelf[]>('/api/library/shelves').then(setShelves).catch(() => setShelves([]));
    if ((tab === 'boards' || tab === 'scripture') && !boards) getJson<Leaderboards>('/api/leaderboards').then(setBoards).catch(() => undefined);
  }, [tab, page, book, shelves, boards]);

  const vote = async (ascId: string) => {
    try {
      await post('/api/vote', { ascId });
      toast('Upvoted. The top line is quoted in the next Chronicle.');
      setBoards(null);
      await reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };


  return (
    <Sheet onClose={onClose} title="The Library">
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {(['annals', 'shelves', 'scripture', 'boards'] as const).map((t) => (
          <button key={t} className={`btn btn-small ${tab === t && !book ? 'btn-gold' : ''}`} onClick={() => { setTab(t); setBook(null); setPage(0); setLog(null); }}>
            {t === 'annals' ? 'Annals' : t === 'shelves' ? 'Shelves' : t === 'scripture' ? 'Scripture' : 'Leaderboards'}
          </button>
        ))}
      </div>
      {(tab === 'annals' || book) && (
        <>
          {log ? (
            <>
              <div className="display" style={{ fontSize: 17 }}>{log.title}</div>
              {log.lines.map((l, i) => (
                <div key={i} className={l.text.startsWith('—') ? 'display gold' : 'headline'} style={{ fontSize: 13, padding: '4px 0' }}>{l.text}</div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-small" disabled={page === 0} onClick={() => { setLog(null); setPage((p) => p - 1); }}>{book ? 'Earlier' : 'Newer'}</button>
                <button className="btn btn-small" disabled={(page + 1) * (book ? 25 : 30) >= log.total} onClick={() => { setLog(null); setPage((p) => p + 1); }}>{book ? 'Later' : 'Older'}</button>
                {book && <button className="btn btn-small" onClick={() => { setBook(null); setTab('shelves'); setLog(null); }}>Back to shelves</button>}
              </div>
            </>
          ) : <div className="muted">Turning pages…</div>}
        </>
      )}
      {tab === 'shelves' && !book && (
        shelves ? shelves.map((s) => (
          <div key={s.species}>
            <h3>{SPECIES[s.species].emblem} {SPECIES[s.species].name}</h3>
            {s.civs.map((c) => (
              <button key={c.id} className="list-row" style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px dotted var(--parchment-4)', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => { setBook(c.id); setPage(0); setLog(null); }}>
                <span style={{ flex: 1 }}>The Book of {c.name.replace(/^the /, '')} <span className="muted">({c.ascendant}{c.isBot ? ', Old One' : ''})</span></span>
                <span className="muted" style={{ fontSize: 12 }}>{c.fell !== null ? `fell ${fmt(c.fell)}` : 'living'}</span>
              </button>
            ))}
          </div>
        )) : <div className="muted">Finding the shelves…</div>
      )}
      {tab === 'scripture' && !book && (
        boards ? (
          <>
            <div style={{ fontSize: 13 }}>Upvote one line a day. The top line is quoted in the Chronicle and carved on its Ascendant’s next artifact.</div>
            {boards.scripture.map((s) => (
              <div key={s.ascId} className={`list-row ${s.isBot ? 'bot' : ''}`}>
                <span style={{ flex: 1 }}><i>“{s.text}”</i><br /><span className="muted" style={{ fontSize: 12 }}>{s.name}</span></span>
                <b>{s.votes}</b>
                {me && me.asc.id !== s.ascId && <button className="btn btn-small" disabled={!!me.votedFor} onClick={() => vote(s.ascId)}>▲</button>}
              </div>
            ))}
          </>
        ) : <div className="muted">Gathering scripture…</div>
      )}
      {tab === 'boards' && !book && (
        boards ? (
          <>
            <Board title="Most Remembered" rows={boards.remembered} />
            <Board title="Most Devoted (%)" rows={boards.devoted} />
            <Board title="Greatest Peoples (thousands)" rows={boards.people} />
            <Board title="Slayers" rows={boards.slayers} />
          </>
        ) : <div className="muted">Counting…</div>
      )}
    </Sheet>
  );
};
