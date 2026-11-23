import { useMemo, useState } from 'react';
import type { CradleView } from '../../shared/api';
import { SPECIES } from '../../shared/sim/data';
import { post, toast } from '../api';
import { HexMap } from './HexMap';
import { art } from '../art';
import { fmtPeople } from './hex';

const BEATS = [
  { beat: 'bless', title: 'Bless', card: 'Bless Harvest', text: 'Your people are hungry. Play Bless Harvest on the Cradle.', target: 0 },
  { beat: 'dig', title: 'Dig', card: 'Dig the ruin', text: 'Old stones lie beside you. Dig into the ruin.', target: 1 },
  { beat: 'whisper', title: 'Whisper', card: 'Whisper', text: 'A wild village lives next door. Whisper to them.', target: 2 },
  { beat: 'ward', title: 'Omen', card: 'Ward', text: 'A darkness creeps toward your home. Play Ward on the Cradle.', target: 0 },
] as const;

export const Cradle = ({ cradle, reload }: { cradle: CradleView; reload: () => Promise<void> }) => {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [landing, setLanding] = useState<number | null>(cradle.landings[0]?.id ?? null);
  const [scripture, setScripture] = useState('');
  const asc = cradle.asc;
  const ascMap = useMemo(() => new Map([[asc.id, asc]]), [asc]);
  const beat = BEATS[cradle.stage];
  const sp = SPECIES[asc.species];

  const act = async () => {
    if (!beat) return;
    setBusy(true);
    const before = { people: cradle.people, food: cradle.food, year: cradle.year };
    try {
      await post('/api/cradle/step', { beat: beat.beat });
      await reload();
      const msgs: Record<string, string> = {
        bless: `5 years pass. The fields ripen and your village grows.`,
        dig: `Under the stones: a relic of a fallen Old One. It comes with you.`,
        whisper: `25 years pass. The village comes to believe in you, and your land grows.`,
        ward: `5 years pass. The darkness beats against your Ward, and stops.`,
      };
      setNote(`${msgs[beat.beat] ?? ''} (was ${fmtPeople(before.people)} People, Food ${before.food})`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const ascend = async () => {
    if (landing === null) return;
    setBusy(true);
    try {
      await post('/api/ascend', { region: landing, scripture });
      await reload();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="app parchment-bg">
      <div className="topbar">
        <span className="display" style={{ fontWeight: 'bold' }}>The Cradle</span>
        <img src={art.species(asc.species)} width={28} height={28} alt="" />
        <span className="badge">{sp.cradle}</span>
        <span style={{ flex: 1 }} />
        <span className="stat">People {fmtPeople(cradle.people)}</span>
        <span className="stat">Food {cradle.food}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, padding: '6px 10px', justifyContent: 'center' }}>
        {['Bless', 'Dig', 'Whisper', 'Omen', 'Ascend'].map((t, i) => (
          <span key={t} className={`step ${i < cradle.stage ? 'done' : ''}`} style={{ fontWeight: i === cradle.stage ? 'bold' : undefined }}>{t}</span>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 180, position: 'relative' }}>
        <HexMap regions={cradle.regions} ascendants={ascMap} me={asc.id} compact
          highlight={beat ? new Set([beat.target]) : new Set()} onTap={(id) => beat && id === beat.target && !busy && void act()} />
      </div>
      <div className="panel" style={{ margin: 10, padding: 12 }}>
        {note && <div className="fade-in" style={{ fontSize: 13, marginBottom: 6 }}>{note}</div>}
        {cradle.relic && cradle.stage === 2 && (
          <div className="fade-in" style={{ marginBottom: 8, padding: 8, border: '1.5px solid var(--gold)', borderRadius: 6 }}>
            <div className="display" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}><img src={art.dig('artifact')} width={40} height={40} alt="" /> {cradle.relic.name}</div>
            <div style={{ fontSize: 12 }}>Made by {cradle.relic.civName}. Inscribed: <i>“{cradle.relic.inscription}”</i></div>
          </div>
        )}
        {beat ? (
          <>
            <div className="display" style={{ fontSize: 17 }}>{beat.title}</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>{beat.text}</div>
            <button className="btn btn-gold" disabled={busy} onClick={act}>{beat.card}</button>
          </>
        ) : (
          <>
            <div className="display" style={{ fontSize: 17 }}>Ascend</div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>Your people leave the Cradle for the shared world. Choose where they land. For 3 days no one can Smite or raid you.</div>
            {cradle.landings.length === 0 && <div className="muted">No landing is open right now. Try again in a moment.</div>}
            {cradle.landings.map((l) => (
              <label key={l.id} className="list-row" style={{ cursor: 'pointer' }}>
                <input type="radio" checked={landing === l.id} onChange={() => setLanding(l.id)} />
                <span><b>{l.name}</b> <span className="muted">({l.terrain})</span><br /><span style={{ fontSize: 12 }}>{l.note}</span></span>
              </label>
            ))}
            <div style={{ fontSize: 13, marginTop: 8 }}>Your first scripture line (optional, up to 80 characters):</div>
            <input className="text" maxLength={80} value={scripture} placeholder="Plant for a harvest you will not see." onChange={(e) => setScripture(e.target.value)} />
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-gold" disabled={busy || landing === null} onClick={ascend}>Ascend</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
