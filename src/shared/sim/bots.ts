// Old Ones: rule-based, seeded bot Ascendants that follow the same rules and Trust budget.
import { CARDS } from './data';
import { neighbours } from './map';
import { Rng } from './rng';
import { cardCost, civStats, drawHand, isAscOwner, ownedRegions } from './rules';
import type { Ctx } from './engine';
import type { ActionCard, Ascendant, BotType, CardId, Region } from './types';
import { RUIN, WILD } from './types';

const WEIGHTS: Record<BotType, Partial<Record<CardId, number>>> = {
  devourer: { smite: 8, teach: 6, inspire: 5, bless: 2, whisper: 2 },
  shepherd: { bless: 7, ward: 5, cleanse: 6, spring: 4, whisper: 3, sign: 2 },
  hermit: { commission: 8, teach: 4, spring: 4, sign: 3, ward: 2 },
  trickster: { whisper: 7, inspire: 5, smite: 4, envoy: 1 },
  pale: { whisper: 5, sign: 3, explore: 4, cleanse: 1, commission: 3 },
};

const pickTarget = (c: Ctx, bot: Ascendant, card: CardId): { target: number | null; to?: string } | null => {
  const w = c.w;
  const own = ownedRegions(w, bot.id);
  const frontier = new Set<number>();
  for (const r of own) for (const n of neighbours(w.regions, r.id)) frontier.add(n);
  const near = [...frontier].map((id) => w.regions[id]!).filter((r) => r.owner !== bot.id);
  const lowestFood = own.slice().sort((a, b) => a.food - b.food)[0];
  switch (CARDS[card].target) {
    case 'none':
      return { target: null };
    case 'own': {
      const r = card === 'teach' ? own.slice().sort((a, b) => a.might - b.might)[0] : lowestFood;
      return r ? { target: r.id } : null;
    }
    case 'any': {
      if (card === 'bless') {
        if (bot.botType === 'shepherd') {
          const weak = near.filter((r) => isAscOwner(r.owner)).sort((a, b) => a.food - b.food)[0];
          if (weak && weak.food < 40) return { target: weak.id };
        }
        return lowestFood ? { target: lowestFood.id } : null;
      }
      const corrupt = [...own, ...near].filter((r) => r.corruption > 0).sort((a, b) => b.corruption - a.corruption)[0];
      if (card === 'cleanse') return corrupt && (w.season?.discovered || corrupt.owner === bot.id) ? { target: corrupt.id } : null;
      if (card === 'ward') {
        const s = w.season;
        if (!s || s.phase === 'omens') return null;
        const threatened = own.find((r) => neighbours(w.regions, r.id).some((n) => w.regions[n]!.corruption > 40));
        return threatened ? { target: threatened.id } : null;
      }
      return null;
    }
    case 'ruinOrWild': {
      if (bot.status === 'fading') {
        const spot = w.regions.find((r) => (r.owner === WILD || r.owner === RUIN) && !r.landing && !r.fog && r.terrain !== 'water'
          && r.ruinLayers.some((l) => l.builder === bot.id));
        const any = spot ?? c.rng.shuffle(w.regions.filter((r) => r.owner === WILD && !r.landing && !r.fog && r.people > 0))[0];
        return any ? { target: any.id } : null;
      }
      const wild = near.filter((r) => r.owner === WILD && r.people > 0 && !r.landing && !r.fog).sort((a, b) => a.tradition - b.tradition)[0];
      return wild ? { target: wild.id } : null;
    }
    case 'foreign': {
      const enemies = near.filter((r) => isAscOwner(r.owner) && w.ascendants[r.owner] && w.ascendants[r.owner]!.protectedUntil <= c.leapNo);
      if (!enemies.length) return null;
      // grudges first, then the weakest
      const grudge = enemies.find((r) => (bot.memory[r.owner] ?? 0) <= -3);
      if (grudge) return { target: grudge.id };
      if (bot.botType === 'trickster') {
        const leader = enemies.sort((a, b) => b.belief.devoted - a.belief.devoted)[0]!;
        return { target: leader.id };
      }
      const weakest = enemies.sort((a, b) => a.might * a.people - b.might * b.people)[0]!;
      return { target: weakest.id };
    }
    case 'fog': {
      const fog = [...frontier].map((id) => w.regions[id]!).find((r) => r.fog)
        ?? w.regions.find((r) => r.fog && neighbours(w.regions, r.id).some((n) => !w.regions[n]!.fog));
      return fog ? { target: fog.id } : null;
    }
    case 'ascendant':
      return null;
  }
  return null;
};

export const botActions = (c: Ctx): ActionCard[] => {
  const out: ActionCard[] = [];
  const w = c.w;
  for (const bot of Object.values(w.ascendants)) {
    if (!bot.isBot || !bot.botType || bot.twilight > 0) continue;
    const rng = new Rng(`${c.leapNo}:${bot.id}:hand`);
    const fading = bot.status === 'fading';
    const hand = drawHand(`${c.leapNo}:${bot.id}:${rng.next()}`, bot.domain, 30, fading);
    if (fading && (c.rem[bot.id] ?? 0) >= 5 && !hand.includes('whisper')) hand.push('whisper');
    const stats = civStats(w, bot.id);
    const scored = hand.map((card) => {
      let s = WEIGHTS[bot.botType!][card] ?? 1;
      if (card === 'bless' && stats.food < 30) s += 10;
      if (card === 'smite' && Object.values(bot.memory).some((v) => v <= -3)) s += 5;
      if (card === 'whisper' && fading) s += 20;
      return { card, s: s + rng.next() };
    }).sort((a, b) => b.s - a.s);
    let plays = 0;
    for (const { card } of scored) {
      if (plays >= 2) break;
      const cost = cardCost(w, bot.id, card);
      if ((c.trust[bot.id] ?? 0) < cost) continue;
      const t = pickTarget(c, bot, card);
      if (!t) continue;
      c.trust[bot.id] = (c.trust[bot.id] ?? 0) - cost;
      c.trustDelta[bot.id] = (c.trustDelta[bot.id] ?? 0) - cost;
      out.push({ ascendantId: bot.id, card, target: t.target });
      plays++;
    }
  }
  return out;
};

export type { Region };
