import { apiFetch } from './api';

export type LoginResponse = {
  exito: boolean;
  mensaje: string;
  usuarioId: number;
  nombreCompleto: string;
  email: string;
  rol: string;
  token: string;
  refreshToken: string;
  expiraEn: string;
};

export type RegistroRequest = {
  nombreCompleto: string;
  email: string;
  password: string;
  telefono: string;
};

export const authService = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiFetch('/Auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  registro: (data: RegistroRequest): Promise<LoginResponse> =>
    apiFetch('/Auth/registro', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => apiFetch('/Auth/logout', { method: 'POST' }),
};