import { Platform } from 'react-native';
import { storage } from './storage';
import { API_URL } from './api';

export type DiagnosticoResultado = {
  exito: boolean;
  clase?: string;
  confianza?: number;
  cultivo?: string;
  mensaje?: string;
  manejoSugerido?: string;
  errorMensaje?: string;
};

/**
 * POST multipart /api/Diagnostico/analizar
 * Campos: Imagen (file), Cultivo (string opcional)
 */
export async function analizarImagen(
  uri: string,
  cultivo?: string,
  nombreArchivo = 'foto.jpg'
): Promise<DiagnosticoResultado> {
  const token = await storage.get('token');
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('Imagen', blob, nombreArchivo);
  } else {
    form.append('Imagen', {
      uri,
      name: nombreArchivo,
      type: 'image/jpeg',
    } as any);
  }

  if (cultivo?.trim()) form.append('Cultivo', cultivo.trim());

  const res = await fetch(`${API_URL}/Diagnostico/analizar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // NO pongas Content-Type: el boundary lo pone fetch
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.errorMensaje || data.title || `Error ${res.status}`);
  }
  return data;
}