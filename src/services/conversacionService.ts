import { apiFetch } from './api';

export type Conversacion = {
  id: number;
  usuarioId: number;
  titulo: string;
  fechaCreacion: string;
  fechaActualizacion: string | null;
  activo: boolean;
};

export const conversacionService = {
  crear: (usuarioId: number, titulo: string = 'Nueva Consulta Agronómica') =>
    apiFetch('/Conversacion/crear', {
      method: 'POST',
      body: JSON.stringify({ usuarioId, titulo }),
    }) as Promise<Conversacion>,

  listar: (usuarioId: number): Promise<Conversacion[]> =>
    apiFetch(`/Conversacion/usuario/${usuarioId}`),
};