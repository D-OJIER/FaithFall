import './index.css';

import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { StateResponse } from '../shared/api';
import { getJson } from './api';
import { Cradle } from './ui/Cradle';
import { MainScreen } from './ui/MainScreen';
import { Onboarding } from './ui/Onboarding';
import { LibrarySheet } from './ui/Sheets';

export const App = () => {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState(false);

  const reload = useCallback(async () => {
    try {
      setState(await getJson<StateResponse>('/api/state'));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    getJson<StateResponse>('/api/state').then(setState).catch((e: Error) => setError(e.message));
  }, []);

  if (error && !state) {
    return (
      <div className="center-screen parchment-bg">
        <div className="display" style={{ fontSize: 22 }}>Faithfall</div>
        <div>{error}</div>
        <button className="btn" onClick={() => void reload()}>Try again</button>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="center-screen parchment-bg">
        <img src="/art/logo/app-icon.svg" width={88} height={88} alt="" />
        <img src="/art/logo/wordmark.svg" alt="Faithfall" style={{ height: 40 }} />
        <div className="muted">Unrolling the map…</div>
      </div>
    );
  }
  if (!state.loggedIn) {
    return (
      <div className="app parchment-bg">
        <div className="center-screen">
          <div className="display" style={{ fontSize: 26 }}>Faithfall</div>
          <div>Log in to Reddit to become an Ascendant. Anyone can read the Library.</div>
          <button className="btn btn-gold" onClick={() => setLibrary(true)}>Open the Library</button>
        </div>
        {library && <LibrarySheet start="annals" me={null} onClose={() => setLibrary(false)} reload={reload} />}
      </div>
    );
  }
  if (state.stage === 'joined' && state.me) return <MainScreen state={state} reload={reload} />;
  if (state.stage === 'cradle' && state.cradle) return <Cradle cradle={state.cradle} reload={reload} />;
  return <Onboarding draw={state.onboarding?.draw ?? null} redrawUsed={state.onboarding?.redrawUsed ?? false} reload={reload} />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
