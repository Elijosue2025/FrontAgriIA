import { Platform } from 'react-native';
import { storage } from './storage';

/**
 * URL del API. Se puede fijar con EXPO_PUBLIC_API_URL (por ejemplo en un
 * archivo .env.local: EXPO_PUBLIC_API_URL=http://192.168.1.10:5261/api).
 * Si no existe, usa localhost en web y el placeholder en móvil.
 */
const URL_POR_DEFECTO =
  Platform.OS === 'web'
    ? 'http://localhost:5261/api'
    : 'http://TU_IP_LOCAL:5261/api'; // ipconfig → IPv4, solo móvil físico

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL || URL_POR_DEFECTO;

const TIMEOUT_POR_DEFECTO_MS = 120_000;

/** timeoutMs: SIN_LIMITE → la petición espera lo que haga falta (chat, diagnóstico, ingesta). */
export const SIN_LIMITE = 0;

/** Error de la API o de la red. `sinConexion` = no se pudo hablar con el servidor. */
export class ApiError extends Error {
  status: number;
  sinConexion: boolean;

  constructor(mensaje: string, status = 0, sinConexion = false) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.sinConexion = sinConexion;
  }
}

export const esErrorDeRed = (e: unknown): boolean =>
  e instanceof ApiError && e.sinConexion;

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

async function conTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = ms > 0 ? setTimeout(() => ctrl.abort(), ms) : null;
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new ApiError(
        'El servidor tardó demasiado en responder. Revisa tu conexión e inténtalo de nuevo.',
        0,
        true,
      );
    }
    throw new ApiError(
      'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
      0,
      true,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type ResultadoRenovacion = 'ok' | 'rechazada' | 'sin_conexion';

let renovando: Promise<ResultadoRenovacion> | null = null;

/**
 * Renueva el token. Solo devuelve 'rechazada' (y por tanto se cierra la sesión)
 * si el servidor respondió y el refresh token no sirve. Si no hubo red o el
 * servidor falló, devuelve 'sin_conexion' y la sesión se conserva.
 */
async function renovarSesion(): Promise<ResultadoRenovacion> {
  if (!renovando) {
    renovando = (async (): Promise<ResultadoRenovacion> => {
      const refreshToken = await storage.get('refreshToken');
      if (!refreshToken) return 'rechazada';

      let res: Response;
      try {
        res = await conTimeout(
          `${API_URL}/Auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          },
          20_000,
        );
      } catch {
        return 'sin_conexion';
      }

      if (res.status >= 500) return 'sin_conexion';
      if (!res.ok) return 'rechazada';

      const data = await res.json().catch(() => null);
      if (!data?.exito) return 'rechazada';

      await storage.set('token', data.token);
      await storage.set('refreshToken', data.refreshToken);
      return 'ok';
    })().finally(() => { renovando = null; });
  }
  return renovando;
}

async function leerError(res: Response): Promise<string> {
  const texto = await res.text().catch(() => '');
  try {
    const json = JSON.parse(texto);
    if (typeof json.error === 'string' && json.error) return json.error;
<<<<<<< HEAD
    if (typeof json.mensaje === 'string' && json.mensaje) return json.mensaje;
    if (json.errors) return (Object.values(json.errors).flat() as string[])[0];
=======
    if (typeof json.errorMensaje === 'string' && json.errorMensaje) return json.errorMensaje;
    if (typeof json.mensaje === 'string' && json.mensaje) return json.mensaje;
    if (json.errors) {
      const primero = (Object.values(json.errors).flat() as string[])[0];
      if (primero) return primero;
    }
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)
    if (json.title) return json.title;
  } catch {}
  return texto || res.statusText;
}

export type OpcionesApi = RequestInit & { timeoutMs?: number };

async function enviar(
  path: string,
  opciones: OpcionesApi,
  esForm: boolean,
  reintento: boolean,
): Promise<any> {
  const { timeoutMs, headers, ...init } = opciones;
  const token = await storage.get('token');

  const res = await conTimeout(
    `${API_URL}${path}`,
    {
      ...init,
      headers: {
        // multipart: no pongas Content-Type, el navegador arma el boundary.
        ...(esForm ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((headers as Record<string, string> | undefined) ?? {}),
      },
    },
    timeoutMs ?? TIMEOUT_POR_DEFECTO_MS,
  );

  if (res.status === 401) {
    if (!reintento && !path.startsWith('/Auth/')) {
      const r = await renovarSesion();
      if (r === 'ok') return enviar(path, opciones, esForm, true);
      if (r === 'sin_conexion') {
        throw new ApiError(
          'No se pudo renovar la sesión por falta de conexión. Inténtalo de nuevo.',
          401,
          true,
        );
      }
    }
    onUnauthorized?.();
  }

  if (!res.ok) throw new ApiError(await leerError(res), res.status);
  if (res.status === 204) return null;
  return res.json();
}

<<<<<<< HEAD
/** multipart. No pongas Content-Type: el navegador arma el boundary. */
export async function apiFetchForm(path: string, form: FormData, reintento = false): Promise<any> {
  const token = await storage.get('token');

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (res.status === 401) {
    if (!reintento && (await renovarSesion())) {
      return apiFetchForm(path, form, true);
    }
    onUnauthorized?.();
  }

  if (!res.ok) throw new Error(await leerError(res));
  if (res.status === 204) return null;
  return res.json();
=======
export function apiFetch(path: string, opciones: OpcionesApi = {}): Promise<any> {
  return enviar(path, opciones, false, false);
}

/** multipart/form-data (POST). */
export function apiFetchForm(
  path: string,
  form: FormData,
  opciones: Pick<OpcionesApi, 'timeoutMs'> = {},
): Promise<any> {
  return enviar(path, { method: 'POST', body: form, ...opciones }, true, false);
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)
}
