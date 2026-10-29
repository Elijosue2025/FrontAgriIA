import { Platform } from 'react-native';
import { storage } from './storage';
import { API_URL } from './api';

export type DiagnosticoResultado = {
  exito: boolean;
  clase?: string;
  claseDetectada?: string;
  confianza?: number;
  cultivo?: string;
  mensaje?: string;
  manejoSugerido?: string;
  errorMensaje?: string;
};

/** multipart: campos "imagen" y opcional "cultivo" */
export async function analizarImagen(
  uri: string,
  cultivo?: string,
  nombre = 'foto.jpg'
): Promise<DiagnosticoResultado> {
  const token = await storage.get('token');
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('imagen', blob, nombre);
  } else {
    form.append('imagen', {
      uri,
      name: nombre,
      type: 'image/jpeg',
    } as any);
  }

  if (cultivo?.trim()) form.append('cultivo', cultivo.trim());

  const res = await fetch(`${API_URL}/Diagnostico/analizar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error || data.errorMensaje || data.mensaje || data.title || `Error ${res.status}`
    );
  }
  return data;
}

export function etiquetaDiagnostico(d: DiagnosticoResultado): string {
  return (
    d.claseDetectada ||
    d.clase ||
    d.mensaje ||
    'problema detectado en la imagen'
  );
}