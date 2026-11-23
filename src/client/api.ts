import { showToast } from '@devvit/web/client';

export class ApiError extends Error {}

export const toast = (text: string) => {
  try {
    showToast(text);
  } catch {
    console.log('[toast]', text);
  }
};

export const getJson = async <T,>(path: string): Promise<T> => {
  const res = await fetch(path);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof data === 'object' && data && 'message' in data ? String((data as { message: unknown }).message) : `Error ${res.status}`;
    throw new ApiError(msg);
  }
  return data as T;
};

export const post = async <T,>(path: string, body: object = {}): Promise<T> => {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok || (typeof data === 'object' && data && 'status' in data && (data as { status: string }).status === 'error')) {
    const msg = typeof data === 'object' && data && 'message' in data ? String((data as { message: unknown }).message) : `Error ${res.status}`;
    throw new ApiError(msg);
  }
  return (data as { result: T }).result;
};

export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, v: string) {
    try {
      localStorage.setItem(key, v);
    } catch {
      /* storage unavailable */
    }
  },
};
