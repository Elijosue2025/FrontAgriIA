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

/** Vacío = el API detecta cultivo/tema y usa el chunking de appsettings. */
export type ParametrosCarga = {
  cultivo?: string;
  tema?: string;
  maxChars?: number;
  minChars?: number;
  soloGuardar?: boolean;
};

export async function listarManuales(): Promise<ListaManuales> {
  const data = await apiFetch('/documentos/listar');
  return {
    ruta: data.ruta,
    total: data.total ?? 0,
    manuales: Array.isArray(data.manuales) ? data.manuales : [],
  };
}

function anexar(form: FormData, p?: ParametrosCarga) {
  const cultivo = p?.cultivo?.trim();
  const tema = p?.tema?.trim();
  if (cultivo) form.append('cultivo', cultivo);
  if (tema) form.append('tema', tema);
  if (p?.maxChars && p.maxChars > 0) form.append('maxChars', String(p.maxChars));
  if (p?.minChars && p.minChars > 0) form.append('minChars', String(p.minChars));
  if (p?.soloGuardar) form.append('soloGuardar', 'true');
}

/** Campo form-data "archivo". Hasta 500 MB. soloGuardar no llama a Ollama. */
export async function subirPdf(
  uri: string,
  nombre: string,
  parametros?: ParametrosCarga,
): Promise<SubidaManual> {
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

  anexar(form, parametros);
  return apiFetchForm('/documentos/subir', form);
}

export async function cargarUno(
  nombreArchivo: string,
  parametros?: ParametrosCarga,
): Promise<{ mensaje: string }> {
  const body: Record<string, unknown> = { nombreArchivo };
  const cultivo = parametros?.cultivo?.trim();
  const tema = parametros?.tema?.trim();
  if (cultivo) body.cultivo = cultivo;
  if (tema) body.tema = tema;
  if (parametros?.maxChars && parametros.maxChars > 0) body.maxChars = parametros.maxChars;
  if (parametros?.minChars && parametros.minChars > 0) body.minChars = parametros.minChars;
  return apiFetch('/documentos/cargar-uno', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function cargarTodos(): Promise<{ mensaje: string; documentosProcesados: number }> {
  return apiFetch('/documentos/cargar', { method: 'POST' });
}
