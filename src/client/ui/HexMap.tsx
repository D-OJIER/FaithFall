import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as RPointerEvent, WheelEvent as RWheelEvent } from 'react';
import type { PublicAsc, PublicRegion } from '../../shared/api';
import { HEX, SIGILS, hexCenter, hexPoints } from './hex';
import { art } from '../art';

type Props = {
  regions: PublicRegion[];
  ascendants: Map<string, PublicAsc>;
  me: string | null;
  highlight?: Set<number>;
  selected?: number | null;
  markers?: { id: number; glyph: string; color: string }[];
  onTap: (id: number) => void;
  focus?: number | null;
  compact?: boolean;
};

const DASHES = ['', '3 2', '1 2', '5 2 1 2', '6 3', '2 2 6 2'];

export const HexMap = ({ regions, ascendants, me, highlight, selected, markers, onTap, focus, compact }: Props) => {
  const bounds = useMemo(() => {
    const pts = regions.map((r) => hexCenter(r.q, r.r));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const pad = HEX * 1.6;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  }, [regions]);

  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: 0, pinch: 0 });

  useEffect(() => {
    if (focus === null || focus === undefined) return;
    const r = regions[focus];
    if (!r) return;
    const c = hexCenter(r.q, r.r);
    const s = compact ? 1 : 1.8;
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView({ s, x: (cx - c.x) * s, y: (cy - c.y) * s });
    // focus only when the target changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const toSvgScale = () => {
    const el = svgRef.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    return Math.max(bounds.w / rect.width, bounds.h / rect.height);
  };

  const onPointerDown = (e: RPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current.pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  };
  const onPointerMove = (e: RPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (drag.current.pinch > 0) {
        const f = d / drag.current.pinch;
        setView((v) => ({ ...v, s: Math.min(4, Math.max(0.7, v.s * f)) }));
      }
      drag.current.pinch = d;
      drag.current.moved += 10;
      return;
    }
    const k = toSvgScale();
    const dx = (next.x - prev.x) * k;
    const dy = (next.y - prev.y) * k;
    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const onPointerUp = (e: RPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) drag.current.pinch = 0;
  };
  const onWheel = (e: RWheelEvent) => {
    setView((v) => ({ ...v, s: Math.min(4, Math.max(0.7, v.s * (e.deltaY < 0 ? 1.12 : 0.89))) }));
  };
  const tap = (id: number) => {
    if (drag.current.moved > 8) return;
    onTap(id);
  };

  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const showNames = view.s >= 1.5 || compact;

  return (
    <div className="map-wrap">
      {!compact && (
        <div className="map-tools">
          <button aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, s: Math.min(4, v.s * 1.3) }))}>+</button>
          <button aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, s: Math.max(0.7, v.s / 1.3) }))}>−</button>
          <button aria-label="Show whole map" onClick={() => setView({ s: 1, x: 0, y: 0 })}>◎</button>
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <rect x={bounds.x - 400} y={bounds.y - 400} width={bounds.w + 800} height={bounds.h + 800} fill="var(--parchment-2)" />
        <g transform={`translate(${cx + view.x} ${cy + view.y}) scale(${view.s}) translate(${-cx} ${-cy})`}>
          {regions.map((r) => {
            const { x, y } = hexCenter(r.q, r.r);
            const owner = ascendants.get(r.owner);
            const mine = !!me && r.owner === me;
            const dash = owner ? DASHES[owner.sigil % DASHES.length] : '';
            // Art tiles are drawn for a hex of radius 58 inside a 104×120 box.
            const k = HEX / 58;
            const box = { x: x - 52 * k, y: y - 60 * k, width: 104 * k, height: 120 * k };
            const layers: string[] = [];
            if (r.fog) layers.push(art.overlay('fog'));
            else if (r.terrain) layers.push(art.terrain(r.terrain));
            if (r.owner === 'ruin') layers.push(art.overlay(`ruin-${r.ruin?.realm ?? 'surface'}`));
            if (r.owner === 'waste') layers.push(art.overlay('ruin-deep'), art.overlay('corruption-heavy'));
            if (r.owner === 'hollow') layers.push(art.overlay('hollowed'));
            else if (r.corruption >= 60) layers.push(art.overlay('corruption-heavy'));
            else if (r.corruption > 0 || r.corruption === -1) layers.push(art.overlay('corruption-light'));
            if (r.owner === 'wild' && r.people > 0 && !r.fog) layers.push(art.overlay('wild-village'));
            if (r.landing) layers.push(art.overlay('landing'));
            if (mine) layers.push(art.overlay('owner-border'));
            return (
              <g key={r.id} className="hex" onClick={() => tap(r.id)}>
                {layers.map((href, i) => (
                  <image key={i} href={href} {...box} preserveAspectRatio="none" opacity={r.ruin && i > 0 && r.owner === 'ruin' ? Math.max(0.55, 1 - r.ruin.buried * 0.1) : r.corruption === -1 && href.includes('corruption') ? 0.55 : 1} />
                ))}
                <polygon points={hexPoints(x, y, HEX - 0.4)} fill="transparent" stroke="var(--ink-3)" strokeWidth={0.25} />
                {owner && !mine && <polygon points={hexPoints(x, y, HEX - 2.2)} fill="none" stroke="var(--ink)" strokeWidth={1.2} strokeDasharray={dash} opacity={owner.status === 'fading' ? 0.3 : 0.8} />}
                {highlight?.has(r.id) && <polygon className="target-pulse" points={hexPoints(x, y, HEX - 1)} fill="var(--gold)" stroke="var(--gold-edge)" strokeWidth={1.5} />}
                {selected === r.id && <polygon points={hexPoints(x, y, HEX - 1)} fill="none" stroke="var(--vermilion)" strokeWidth={2} />}
                {r.ruin?.glow && <circle className="glow" cx={x} cy={y} r={HEX * 0.7} fill="var(--gold)" />}
                {owner && !r.fog && (
                  <g>
                    <circle cx={x + 8.5} cy={y - 9} r={4.2} fill="var(--parchment)" stroke={mine ? 'var(--gold-edge)' : 'var(--ink)'} strokeWidth={0.6} />
                    <text x={x + 8.5} y={y - 7.2} textAnchor="middle" fontSize={5} fill={mine ? 'var(--gold-edge)' : 'var(--ink)'} className="hex-label">
                      {SIGILS[owner.sigil % SIGILS.length]}
                    </text>
                  </g>
                )}
                {showNames && !r.fog && (
                  <text x={x} y={y + 13} textAnchor="middle" fontSize={4.4} fill="var(--ink)" stroke="var(--parchment)" strokeWidth={1.2} paintOrder="stroke" className="hex-label">{r.name}</text>
                )}
              </g>
            );
          })}
          {markers?.map((m) => {
            const r = regions[m.id];
            if (!r) return null;
            const { x, y } = hexCenter(r.q, r.r);
            return <text key={`m${m.id}${m.glyph}`} x={x + 9} y={y - 7} fontSize={9} fill={m.color} className="hex-label">{m.glyph}</text>;
          })}
        </g>
      </svg>
    </div>
  );
};
