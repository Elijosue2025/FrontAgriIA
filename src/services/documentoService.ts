import { Platform } from 'react-native';
import { apiFetch, apiFetchForm } from './api';

export type ListaManuales = {
  ruta?: string;
  total: number;
  manuales: string[];
};

export type SubidaManual = {
  mensaje: string;
  archivoGuardado?: string;
};

export async function listarManuales(): Promise<ListaManuales> {
  const data = await apiFetch('/documentos/listar');
  return {
    ruta: data.ruta,
    total: data.total ?? 0,
    manuales: Array.isArray(data.manuales) ? data.manuales : [],
  };
}

/** Campo form-data "archivo". El API guarda el PDF y lo vectoriza. */
export async function subirPdf(uri: string, nombre: string): Promise<SubidaManual> {
  const form = new FormData();
  const archivo = nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`;

  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('archivo', blob, archivo);
  } else {
    form.append('archivo', {
      uri,
      name: archivo,
      type: 'application/pdf',
    } as any);
  }

  return apiFetchForm('/documentos/subir', form);
}

export async function cargarUno(nombreArchivo: string): Promise<{ mensaje: string }> {
  return apiFetch('/documentos/cargar-uno', {
    method: 'POST',
    body: JSON.stringify({ nombreArchivo }),
  });
}

export async function cargarTodos(): Promise<{ mensaje: string; documentosProcesados: number }> {
  return apiFetch('/documentos/cargar', { method: 'POST' });
}
