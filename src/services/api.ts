import { Platform } from 'react-native';
import { storage } from './storage';

export const API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:5261/api'
    : 'http://TU_IP_LOCAL:5261/api'; // ipconfig → IPv4, solo móvil físico

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

let renovando: Promise<boolean> | null = null;

async function renovarSesion(): Promise<boolean> {
  if (!renovando) {
    renovando = (async () => {
      try {
        const refreshToken = await storage.get('refreshToken');
        if (!refreshToken) return false;

        const res = await fetch(`${API_URL}/Auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;

        const data = await res.json();
        if (!data.exito) return false;

        await storage.set('token', data.token);
        await storage.set('refreshToken', data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => { renovando = null; });
  }
  return renovando;
}

async function leerError(res: Response): Promise<string> {
  const texto = await res.text().catch(() => '');
  try {
    const json = JSON.parse(texto);
    if (json.errors) return (Object.values(json.errors).flat() as string[])[0];
    if (json.title) return json.title;
  } catch {}
  return texto || res.statusText;
}

export async function apiFetch(path: string, options: RequestInit = {}, reintento = false): Promise<any> {
  const token = await storage.get('token');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (!reintento && !path.startsWith('/Auth/') && (await renovarSesion())) {
      return apiFetch(path, options, true);
    }
    onUnauthorized?.();
  }

  if (!res.ok) throw new Error(await leerError(res));
  if (res.status === 204) return null;
  return res.json();
}