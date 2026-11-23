import { useEffect, useState } from 'react';
import { DOMAINS, DOMAIN_IDS, RARITY_START, SPECIES, genAscendantName } from '../../shared/sim/data';
import { RARITY_LABEL } from '../../shared/sim/cradle';
import type { StarCard } from '../../shared/sim/cradle';
import type { Domain } from '../../shared/sim/types';
import { post, toast } from '../api';
import { art } from '../art';

type Props = { draw: StarCard[] | null; redrawUsed: boolean; reload: () => Promise<void> };

export const Onboarding = ({ draw, redrawUsed, reload }: Props) => {
  const [step, setStep] = useState<'intro' | 'draw' | 'domain' | 'name'>(draw ? 'draw' : 'intro');
  const [flipped, setFlipped] = useState(draw ? 7 : 0);
  const [pick, setPick] = useState<number | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [name, setName] = useState(() => genAscendantName(Math.random));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step !== 'draw' || !draw || flipped >= 7) return;
    const t = setTimeout(() => setFlipped((f) => f + 1), 420);
    return () => clearTimeout(t);
  }, [step, draw, flipped]);

  const doDraw = async (redraw: boolean) => {
    setBusy(true);
    try {
      await post('/api/onboard/draw', { redraw });
      setFlipped(0);
      setPick(null);
      setStep('draw');
      await reload();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (pick === null || !domain) return;
    setBusy(true);
    try {
      await post('/api/onboard/choose', { card: pick, domain, name: name.name, epithet: name.epithet });
      await reload();
    } catch (e) {
      toast((e as Error).message);
      setBusy(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="center-screen stars-bg fade-in">
        <img src={art.logo('app-icon')} width={96} height={96} alt="" />
        <img src={art.logo('wordmark')} alt="Faithfall" style={{ height: 52, maxWidth: '90%', background: 'var(--parchment)', borderRadius: 8, padding: '6px 10px' }} />
        <div style={{ maxWidth: 320, fontSize: 16 }}>
          Every Redditor is an Ascendant. Each day, history leaps forward by years or centuries for the whole world at once.
        </div>
        <div style={{ maxWidth: 320, fontSize: 14, opacity: 0.85 }}>
          Guide your people, leave relics behind, and when your civilization falls, hope someone digs you back up.
        </div>
        <button className="btn btn-gold" disabled={busy} onClick={() => doDraw(false)}>Begin the Starry Draw</button>
      </div>
    );
  }

  if (step === 'draw' && draw) {
    const card = pick !== null ? draw[pick] : undefined;
    const sp = card ? SPECIES[card.species] : undefined;
    return (
      <div className="stars-bg" style={{ height: '100%', overflowY: 'auto', padding: 14 }} onClick={() => flipped < 7 && setFlipped(7)}>
        <div className="display" style={{ fontSize: 20, textAlign: 'center', color: 'var(--gold-3)' }}>The Starry Draw</div>
        <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
          {flipped < 7 ? 'Tap to reveal all' : 'Choose your people. Rarer means a harder start, not a stronger people.'}
        </div>
        <div className="star-grid">
          {draw.map((c, i) => {
            const s = SPECIES[c.species];
            return (
              <div key={i} className={`star-card ${i < flipped ? 'flipped' : ''} ${pick === i ? 'chosen' : ''}`}
                onClick={(e) => { e.stopPropagation(); if (flipped >= 7) setPick(i); else setFlipped(7); }}>
                <div className="star-inner">
                  <div className="star-back"><img src={art.cardBack} alt="" draggable={false} /></div>
                  <div className="star-face">
                    <img className="frame" src={art.rarityFrame(c.rarity)} alt="" draggable={false} />
                    <img className="emblem" src={art.species(c.species)} alt="" draggable={false} />
                    <div className="star-name display">{s.name}</div>
                    <div className={`star-rarity smallcaps rarity-${c.rarity}`}>{RARITY_LABEL[c.rarity]} · {s.lifespan} yrs</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {sp && card && (
          <div className="panel fade-in" style={{ marginTop: 12, padding: 12, color: 'var(--ink)' }}>
            <div className="display" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><img src={art.species(card.species)} width={40} height={40} alt="" /> {sp.name} <span className={`smallcaps rarity-${card.rarity}`} style={{ fontSize: 13 }}>{RARITY_LABEL[card.rarity]}</span></div>
            <div style={{ fontSize: 13 }}><b>Lifespan</b> {sp.lifespan} years · <b>Home</b> {sp.homes.join(', ')}</div>
            <div style={{ fontSize: 13 }}><b>Speciality</b> {sp.speciality}</div>
            <div style={{ fontSize: 13 }}><b>Weakness</b> {sp.weakness}</div>
            <div style={{ fontSize: 13 }}><b>Learns</b> {sp.learns}</div>
            <div style={{ fontSize: 13 }}><b>Start</b> {RARITY_START[card.rarity].text}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {!redrawUsed && flipped >= 7 && <button className="btn" disabled={busy} onClick={(e) => { e.stopPropagation(); void doDraw(true); }}>Redraw (once)</button>}
          <button className="btn btn-gold" disabled={pick === null} onClick={(e) => { e.stopPropagation(); setStep('domain'); }}>Choose this people</button>
        </div>
      </div>
    );
  }

  if (step === 'domain') {
    return (
      <div className="parchment-bg" style={{ height: '100%', overflowY: 'auto', padding: 14 }}>
        <div className="display" style={{ fontSize: 20, textAlign: 'center' }}>Pick a domain</div>
        <div className="muted" style={{ textAlign: 'center', fontSize: 13, marginBottom: 10 }}>It decides which cards you draw more often. No domain is stronger overall.</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {DOMAIN_IDS.map((d) => {
            const def = DOMAINS[d];
            return (
              <button key={d} className={`panel`} onClick={() => setDomain(d)}
                style={{ padding: 10, textAlign: 'left', cursor: 'pointer', borderColor: domain === d ? 'var(--gold)' : undefined, boxShadow: domain === d ? '0 0 0 3px var(--gold-3)' : undefined }}>
                <img src={art.sigil(d)} width={44} height={44} alt="" style={{ float: 'left', marginRight: 10 }} />
                <b className="display">{def.name}</b>
                <div style={{ fontSize: 13 }}>Draws more {def.draws.map((c) => c[0]!.toUpperCase() + c.slice(1)).join(' and ')}. {def.passive}.</div>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={() => setStep('draw')}>Back</button>
          <button className="btn btn-gold" disabled={!domain} onClick={() => setStep('name')}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen parchment-bg">
      <div className="muted smallcaps">You shall be known as</div>
      <div className="display" style={{ fontSize: 30 }}>{name.name}</div>
      <div className="display gold" style={{ fontSize: 17 }}>{name.epithet}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" onClick={() => setName(genAscendantName(Math.random))}>Reroll</button>
        <button className="btn btn-gold" disabled={busy} onClick={finish}>Enter the Cradle</button>
      </div>
      <button className="btn btn-ghost btn-small" onClick={() => setStep('domain')}>Back</button>
    </div>
  );
};
