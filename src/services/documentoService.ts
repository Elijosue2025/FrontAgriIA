import { Platform } from 'react-native';
<<<<<<< HEAD
import { apiFetch, apiFetchForm } from './api';
=======
import { apiFetch, apiFetchForm, SIN_LIMITE } from './api';

/** Mismo valor que [RequestSizeLimit(50_000_000)] de POST /api/documentos/subir. */
export const LIMITE_PDF_MB = 50;
export const LIMITE_PDF_BYTES = LIMITE_PDF_MB * 1_000_000;

/**
 * El API actual de documentos solo recibe el archivo (subir) o el nombre
 * (cargar-uno): detecta cultivo y tema solo y siempre vectoriza. Ignora
 * cultivo, tema, maxChars, minChars y soloGuardar.
 * Cuando el API los admita, cambia esto a true y el formulario completo
 * vuelve a mostrarse en Administración → Documentos.
 */
export const API_ACEPTA_METADATOS = false;

// La ingesta corre dentro de la petición y con Ollama puede tardar varios minutos.
const TIMEOUT_INGESTA_MS = SIN_LIMITE;
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)

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

<<<<<<< HEAD
/** Campo form-data "archivo". Hasta 500 MB. soloGuardar no llama a Ollama. */
=======
/** Campo form-data "archivo" (hasta LIMITE_PDF_MB). */
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)
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
<<<<<<< HEAD
  return apiFetchForm('/documentos/subir', form);
=======
  return apiFetchForm('/documentos/subir', form, { timeoutMs: TIMEOUT_INGESTA_MS });
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)
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
<<<<<<< HEAD
=======
    timeoutMs: TIMEOUT_INGESTA_MS,
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)
  });
}

export async function cargarTodos(): Promise<{ mensaje: string; documentosProcesados: number }> {
<<<<<<< HEAD
  return apiFetch('/documentos/cargar', { method: 'POST' });
=======
  return apiFetch('/documentos/cargar', { method: 'POST', timeoutMs: TIMEOUT_INGESTA_MS });
>>>>>>> dff0f05 (Agregar módulos de AgroGuía IA)
}
