import { useEffect, useMemo, useState } from 'react';
import type { PublicRegion, StateResponse } from '../../shared/api';
import { CARDS } from '../../shared/sim/data';
import type { CardId } from '../../shared/sim/types';
import { post, storage, toast } from '../api';
import { HexMap } from './HexMap';
import { fmt, fmtPeople, neighbourIds } from './hex';
import { art } from '../art';
import { Icon } from './Icon';
import {
  AscendantSheet, ChronicleSheet, DigSheet, EndCard, EnvoySheet, LibrarySheet, ProphecySheet, RegionSheet,
} from './Sheets';

type Panel =
  | { kind: 'chronicle' }
  | { kind: 'region'; id: number }
  | { kind: 'dig'; id: number }
  | { kind: 'prophecy' }
  | { kind: 'me' }
  | { kind: 'end' }
  | { kind: 'envoy' }
  | { kind: 'library'; tab: 'annals' | 'shelves' | 'boards' | 'scripture' }
  | null;

export const MainScreen = ({ state, reload }: { state: StateResponse; reload: () => Promise<void> }) => {
  const me = state.me!;
  const myId = me.asc.id;
  const regions = state.world.regions;
  const ascMap = useMemo(() => new Map(state.world.ascendants.map((a) => [a.id, a])), [state.world.ascendants]);
  const nb = useMemo(() => neighbourIds(regions), [regions]);
  const chron = state.chronicle;
  const seenKey = `ff:seen:${chron?.leap ?? 0}`;
  const [panel, setPanel] = useState<Panel>(() => (chron && !storage.get(seenKey) ? { kind: 'chronicle' } : null));
  const [wash, setWash] = useState(() => !!chron && chron.leap > 0 && !storage.get(seenKey));
  const [selected, setSelected] = useState<CardId | null>(null);
  const [busy, setBusy] = useState(false);
  const fading = me.asc.status === 'fading';
  const home = regions.find((r) => r.owner === myId)?.id ?? null;
  const discovered = !!state.season?.discovered;

  useEffect(() => {
    if (!wash) return;
    const t = setTimeout(() => setWash(false), 1800);
    return () => clearTimeout(t);
  }, [wash]);

  const closeChronicle = () => {
    storage.set(seenKey, '1');
    setPanel(null);
  };

  const validTarget = (card: CardId, r: PublicRegion): boolean => {
    const def = CARDS[card];
    const owner = ascMap.get(r.owner);
    switch (def.target) {
      case 'own': return r.owner === myId;
      case 'any':
        if (r.fog) return false;
        if ((card === 'ward' || card === 'cleanse') && !discovered) return r.owner === myId && (card === 'ward' || r.corruption !== 0);
        return true;
      case 'ruinOrWild':
        if (r.fog || r.landing) return false;
        if (r.owner === 'hollow') return true;
        if (fading) return r.owner === 'wild' || r.owner === 'ruin';
        return r.owner === 'wild' && r.people > 0 && (nb(r.id).some((n) => regions[n]?.owner === myId));
      case 'foreign': return !!owner && owner.id !== myId && !r.protected && owner.status !== 'fading';
      case 'fog': return r.fog && nb(r.id).some((n) => !regions[n]?.fog);
      default: return false;
    }
  };

  const highlight = useMemo(() => {
    if (!selected) return new Set<number>();
    return new Set(regions.filter((r) => validTarget(selected, r)).map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, regions]);

  const play = async (card: CardId, target: number | null, extra: { to?: string; text?: string } = {}) => {
    setBusy(true);
    try {
      const r = await post<{ cost: number; lands: string }>('/api/play', { card, target, ...extra });
      toast(`${CARDS[card].name} played for ${r.cost} Trust. It lands: ${r.lands.toLowerCase()}.`);
      setSelected(null);
      setPanel(null);
      await reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pickCard = (card: CardId) => {
    if (me.played.includes(card) || me.played.length >= me.maxPlays) return;
    const def = CARDS[card];
    if (def.target === 'none') {
      void play(card, null);
      return;
    }
    if (def.target === 'ascendant') {
      setSelected(card);
      setPanel({ kind: 'envoy' });
      return;
    }
    setSelected(selected === card ? null : card);
  };

  const tapRegion = (id: number) => setPanel({ kind: 'region', id });

  const markers = [
    ...(state.season?.lairRegion !== null && state.season?.lairRegion !== undefined ? [{ id: state.season.lairRegion, glyph: '☠︎', color: '#5d2b72' }] : []),
    ...(state.season?.sourceRegion !== null && state.season?.sourceRegion !== undefined ? [{ id: state.season.sourceRegion, glyph: '◉', color: '#5d2b72' }] : []),
  ];

  const playsLeft = me.maxPlays - me.played.length;
  const allDone = playsLeft <= 0 && me.digsLeft <= 0 && !!me.prophecy;
  const region = panel && (panel.kind === 'region' || panel.kind === 'dig') ? regions[panel.id] : undefined;
  const regionPlay = region && selected && validTarget(selected, region) ? { name: CARDS[selected].name, cost: me.hand.find((h) => h.id === selected)?.cost ?? 0 } : null;

  return (
    <div className="app parchment-bg">
      <div className="topbar">
        <span className="year">Year {fmt(state.world.year)}</span>
        {chron && chron.years > 0 && <span className="badge">{chron.leapName}</span>}
        <span style={{ flex: 1 }} />
        <span className="stat" title="Trust"><Icon name="trust" label="Trust" />{me.trust}</span>
        {!fading && <span className="stat" title="People"><Icon name="people" label="People" />{fmtPeople(me.stats.people)}</span>}
        {!fading && <span className="stat" title="Food"><Icon name="food" label="Food" />{me.stats.food}</span>}
        {!fading && me.day >= 3 && <span className="stat" title="Might"><Icon name="might" label="Might" />{me.stats.might}</span>}
        {me.streak > 0 && <span className="stat" title={`${me.streak}-day streak`}><Icon name="streak" label="Streak" />{me.streak}</span>}
        <button className="sigil-btn" aria-label="Your Ascendant" onClick={() => setPanel({ kind: 'me' })}>
          <img src={art.sigil(me.asc.domain)} alt="" width={32} height={32} draggable={false} />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="today">
          <span className="step done" onClick={() => setPanel({ kind: 'chronicle' })}><Icon name="chronicle" size={14} /> Chronicle</span>
          <span className={`step ${playsLeft <= 0 ? 'done' : ''}`}>Cards {me.played.length}/{me.maxPlays}</span>
          <span className={`step ${me.digsLeft <= 0 ? 'done' : ''}`} onClick={() => toast('Tap a ruin (broken stones) on the map to dig.')}><Icon name="dig" size={14} /> Digs {3 - me.digsLeft}/3</span>
          <span className={`step ${me.prophecy ? 'done' : ''}`} onClick={() => setPanel({ kind: 'prophecy' })}><Icon name="prophecy" size={14} /> Prophecy</span>
          <span className={`step ${allDone ? 'done' : ''}`} onClick={() => setPanel({ kind: 'end' })}>Share</span>
          <span className="step" onClick={() => setPanel({ kind: 'library', tab: 'annals' })}><Icon name="library" size={14} /> Library</span>
          {state.season && !state.season.outcome && <span className="step" style={{ borderColor: 'var(--violet)', color: 'var(--violet)' }} onClick={() => setPanel({ kind: 'chronicle' })}>Omens</span>}
        </div>
        {fading && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 3 }} className="panel">
            <div style={{ padding: 8, fontSize: 13 }} className="violet">
              Your civilization has fallen and you are fading. {me.canReturn ? 'Whisper to a wild people or ruin to return.' : `Gather 5 Remembrance (${me.remembrance} now) or dig up your own ruins to return.`}
            </div>
          </div>
        )}
        {selected && !panel && (
          <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 4, display: 'flex', gap: 8, alignItems: 'center' }} className="panel">
            <span style={{ padding: 8, flex: 1, fontSize: 13 }}>Choose a glowing region for <b>{CARDS[selected].name}</b>.{highlight.size === 0 ? ' No valid region right now.' : ''}</span>
            <button className="btn btn-small" onClick={() => setSelected(null)}>Cancel</button>
          </div>
        )}
        <HexMap regions={regions} ascendants={ascMap} me={myId} highlight={highlight} selected={region?.id ?? null}
          onTap={tapRegion} focus={home} markers={markers} />
        {wash && chron && (
          <div className="ff-leap" style={{ '--from': chron.year - chron.years, '--to': chron.year }}>
            <img className="ff-leap-wash" src={art.anim('inkwash')} alt="" />
            <span className="ff-leap-year" aria-label={`${chron.years} years pass`} />
          </div>
        )}
        {state.world.leaping && <div className="panel" style={{ position: 'absolute', top: 44, left: 8, padding: 6, fontSize: 13, zIndex: 3 }}>History is leaping forward…</div>}
      </div>

      <div className="tray">
        {me.hand.map((h) => {
          const def = CARDS[h.id];
          const used = me.played.includes(h.id) || (playsLeft <= 0);
          return (
            <button key={h.id} className={`card ${selected === h.id ? 'selected' : ''} ${used ? 'used' : ''}`} disabled={busy || used}
              onClick={() => pickCard(h.id)} aria-label={`${def.name}, ${h.cost} Trust`}>
              <img className="frame" src={art.cardFrame} alt="" draggable={false} />
              <img className="illus" src={art.card(h.id)} alt="" draggable={false} />
              <span className="cost" style={{ color: h.cost > me.trust ? 'var(--vermilion)' : undefined }}>{h.cost}</span>
              <span className="name">{def.name}</span>
              <span className="eff">{def.effect}<br /><i>{def.lands}</i></span>
            </button>
          );
        })}
      </div>

      {panel?.kind === 'chronicle' && chron && (
        <ChronicleSheet c={chron} season={state.season} me={me} onClose={closeChronicle}
          openAnnals={() => { storage.set(seenKey, '1'); setPanel({ kind: 'library', tab: 'annals' }); }} onPledged={() => void reload()} />
      )}
      {panel?.kind === 'region' && region && (
        <RegionSheet r={region} state={state} onClose={() => setPanel(null)} onDig={() => setPanel({ kind: 'dig', id: region.id })}
          canPlay={regionPlay} onPlay={() => selected && void play(selected, region.id)} reload={reload} />
      )}
      {panel?.kind === 'dig' && region && <DigSheet region={region} me={me} onClose={() => setPanel(null)} reload={reload} />}
      {panel?.kind === 'prophecy' && <ProphecySheet me={me} onClose={() => setPanel(null)} reload={reload} />}
      {panel?.kind === 'me' && <AscendantSheet me={me} onClose={() => setPanel(null)} reload={reload} openLibrary={() => setPanel({ kind: 'library', tab: 'boards' })} />}
      {panel?.kind === 'end' && <EndCard state={state} onClose={() => setPanel(null)} />}
      {panel?.kind === 'envoy' && (
        <EnvoySheet state={state} onClose={() => { setPanel(null); setSelected(null); }} onSend={(to, text) => void play('envoy', null, { to, text })} />
      )}
      {panel?.kind === 'library' && <LibrarySheet start={panel.tab} me={me} onClose={() => setPanel(null)} reload={reload} />}
    </div>
  );
};
