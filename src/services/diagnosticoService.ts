import { Platform } from 'react-native';
import { storage } from './storage';
import { API_URL } from './api';

export type DeteccionDto = {
  clave?: string;
  nombre?: string;
  cultivo?: string;
  tipo?: string;
  confianza?: number;
  descripcion?: string;
};

export type RecomendacionDto = {
  titulo?: string;
  seccion?: string;
  pagina?: number | null;
  texto?: string;
};

export type DiagnosticoResultado = {
  exito: boolean;
  errorMensaje?: string;
  modeloDisponible?: boolean;
  resumen?: string;
  respuestaAsistente?: string;
  estado?: string;
  confianzaPrincipal?: number;
  clasePredicha?: string;
  cultivo?: string;
  detecciones?: DeteccionDto[];
  lesiones?: {
    tejidoDetectado?: boolean;
    porcentajeAfectado?: number;
    numeroManchas?: number;
    severidad?: string;
  } | null;
  recomendaciones?: RecomendacionDto[];
  fuentes?: string[];
  advertencia?: string;
  tiempoMs?: number;
  fechaRespuesta?: string;
};

/**
 * POST /api/Diagnostico/analizar
 * multipart: imagen, cultivo?, conversacionId?
 */
export async function analizarImagen(
  uri: string,
  cultivo?: string,
  opciones?: { nombre?: string; conversacionId?: number | null }
): Promise<DiagnosticoResultado> {
  const token = await storage.get('token');
  const form = new FormData();
  const nombre = opciones?.nombre ?? 'foto.jpg';

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
  if (opciones?.conversacionId && opciones.conversacionId > 0) {
    form.append('conversacionId', String(opciones.conversacionId));
  }

  const res = await fetch(`${API_URL}/Diagnostico/analizar`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(
      data.error || data.errorMensaje || data.mensaje || data.title || `Error ${res.status}`
    );
  }
  return normalizarDiagnostico(data);
}

function normalizarDiagnostico(raw: any): DiagnosticoResultado {
  return {
    exito: raw.exito ?? raw.Exito ?? false,
    errorMensaje: raw.errorMensaje ?? raw.ErrorMensaje ?? '',
    modeloDisponible: raw.modeloDisponible ?? raw.ModeloDisponible,
    resumen: raw.resumen ?? raw.Resumen ?? '',
    respuestaAsistente: raw.respuestaAsistente ?? raw.RespuestaAsistente ?? '',
    estado: raw.estado ?? raw.Estado ?? '',
    confianzaPrincipal: raw.confianzaPrincipal ?? raw.ConfianzaPrincipal,
    clasePredicha: raw.clasePredicha ?? raw.ClasePredicha,
    cultivo: raw.cultivo ?? raw.Cultivo,
    detecciones: (raw.detecciones ?? raw.Detecciones ?? []).map((d: any) => ({
      clave: d.clave ?? d.Clave,
      nombre: d.nombre ?? d.Nombre,
      cultivo: d.cultivo ?? d.Cultivo,
      tipo: d.tipo ?? d.Tipo,
      confianza: d.confianza ?? d.Confianza,
      descripcion: d.descripcion ?? d.Descripcion,
    })),
    lesiones: mapLesiones(raw.lesiones ?? raw.Lesiones),
    recomendaciones: (raw.recomendaciones ?? raw.Recomendaciones ?? []).map((r: any) => ({
      titulo: r.titulo ?? r.Titulo,
      seccion: r.seccion ?? r.Seccion,
      pagina: r.pagina ?? r.Pagina,
      texto: r.texto ?? r.Texto,
    })),
    fuentes: raw.fuentes ?? raw.Fuentes ?? [],
    advertencia: raw.advertencia ?? raw.Advertencia ?? '',
    tiempoMs: raw.tiempoMs ?? raw.TiempoMs,
    fechaRespuesta: raw.fechaRespuesta ?? raw.FechaRespuesta,
  };
}

function mapLesiones(l: any) {
  if (!l) return null;
  return {
    tejidoDetectado: l.tejidoDetectado ?? l.TejidoDetectado,
    porcentajeAfectado: l.porcentajeAfectado ?? l.PorcentajeAfectado,
    numeroManchas: l.numeroManchas ?? l.NumeroManchas,
    severidad: l.severidad ?? l.Severidad,
  };
}

export function textoParaChat(d: DiagnosticoResultado): string {
  const principal =
    d.respuestaAsistente?.trim() ||
    d.resumen?.trim() ||
    'No se pudo generar una respuesta de diagnóstico.';

  if (d.advertencia?.trim() && !principal.includes(d.advertencia.trim())) {
    return `${principal}\n\n${d.advertencia.trim()}`;
  }
  return principal;
}

export function etiquetaDiagnostico(d: DiagnosticoResultado): string {
  const p = d.detecciones?.[0];
  if (p?.nombre) {
    const conf = p.confianza != null ? ` (${(p.confianza * 100).toFixed(0)}%)` : '';
    return `${p.nombre}${conf}`;
  }
  return d.clasePredicha?.trim() || d.resumen?.trim() || 'análisis de imagen';
}