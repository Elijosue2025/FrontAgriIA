import { apiFetch } from './api';

export type Conversacion = {
  id: number;
  usuarioId?: number;
  titulo: string;
  fechaCreacion: string;
  fechaActualizacion: string | null;
  activo?: boolean;
  cultivoActual?: string | null;
};

export type MensajeApi = {
  id: number;
  rol: string;
  contenido: string;
  fecha: string;
  tokens?: number | null;
};

export type ConversacionDetalle = Conversacion & {
  mensajes: MensajeApi[];
};

export const conversacionService = {
  /** Legacy: POST /api/Conversacion/crear */
  crear: (usuarioId: number, titulo: string = 'Nueva Consulta Agronómica') =>
    apiFetch('/Conversacion/crear', {
      method: 'POST',
      body: JSON.stringify({ usuarioId, titulo }),
    }) as Promise<Conversacion>,

  /** Legacy: GET /api/Conversacion/usuario/{id} */
  listar: (usuarioId: number): Promise<Conversacion[]> =>
    apiFetch(`/Conversacion/usuario/${usuarioId}`),

  /** Nuevo: GET /api/Conversacion/{id} → detalle + mensajes */
  obtener: (id: number): Promise<ConversacionDetalle> =>
    apiFetch(`/Conversacion/${id}`),

  /** Nuevo: GET /api/Conversacion/{id}/mensajes */
  mensajes: (id: number): Promise<MensajeApi[]> =>
    apiFetch(`/Conversacion/${id}/mensajes`),

  renombrar: (id: number, titulo: string) =>
    apiFetch(`/Conversacion/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ titulo }),
    }),

  eliminar: (id: number) =>
    apiFetch(`/Conversacion/${id}`, { method: 'DELETE' }),
};