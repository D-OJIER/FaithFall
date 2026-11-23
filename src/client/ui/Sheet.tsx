import type { ReactNode } from 'react';

export const Sheet = ({ onClose, children, title }: { onClose: () => void; children: ReactNode; title?: string }) => (
  <>
    <div className="sheet-backdrop" onClick={onClose} />
    <div className="sheet" role="dialog" aria-label={title}>
      <div className="grab" />
      <button className="btn btn-ghost btn-small close" onClick={onClose} aria-label="Close">✕</button>
      {title && <h2>{title}</h2>}
      {children}
    </div>
  </>
);

export const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="bar">
    <div style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`, background: color }} />
  </div>
);

export const BeliefBar = ({ devoted, faithful, doubtful }: { devoted: number; faithful: number; doubtful: number }) => (
  <div>
    <div className="belief-bar">
      <div style={{ width: `${devoted}%`, background: 'var(--gold)' }} />
      <div style={{ width: `${faithful}%`, background: 'var(--gold-3)' }} />
      <div style={{ width: `${doubtful}%`, background: 'var(--parchment-3)' }} />
    </div>
    <div className="muted" style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
      <span>Devoted {devoted}%</span><span>Faithful {faithful}%</span><span>Doubtful {doubtful}%</span>
    </div>
  </div>
);

export const Flame = ({ n }: { n: number }) => (
  <span className="stat" title={`${n}-day streak`}>
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden>
      <path d="M6 0 C7 4 11 5 11 9 A5 5 0 0 1 1 9 C1 6 3 5 4 3 C4.5 5 5.5 5.5 6 6 C6.5 4 6 2 6 0Z" fill="#d6a63c" stroke="#b07f22" strokeWidth="0.8" />
    </svg>
    {n}
  </span>
);
