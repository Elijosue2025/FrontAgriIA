import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storage } from '@/services/storage';
import { authService, LoginResponse } from '@/services/authService';
import { setUnauthorizedHandler } from '@/services/api';

type AuthContextType = {
  token: string | null;
  usuarioId: number | null;
  nombreCompleto: string | null;
  email: string | null;
  rol: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (data: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const CLAVES = ['token', 'refreshToken', 'usuarioId', 'nombreCompleto', 'email', 'rol'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [nombreCompleto, setNombreCompleto] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const limpiarSesion = useCallback(async () => {
    await Promise.all(CLAVES.map((k) => storage.remove(k)));
    setToken(null);
    setUsuarioId(null);
    setNombreCompleto(null);
    setEmail(null);
    setRol(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [t, u, n, e, r] = await Promise.all(
          ['token', 'usuarioId', 'nombreCompleto', 'email', 'rol'].map((k) => storage.get(k))
        );
        setToken(t);
        setUsuarioId(u ? Number(u) : null);
        setNombreCompleto(n);
        setEmail(e);
        setRol(r);
      } catch (error) {
        console.log('Error cargando sesión:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Si la API responde 401 y no se pudo renovar, la sesión se cierra sola
  useEffect(() => {
    setUnauthorizedHandler(() => { limpiarSesion(); });
    return () => setUnauthorizedHandler(null);
  }, [limpiarSesion]);

  const setSession = async (data: LoginResponse) => {
    await storage.set('token', data.token);
    await storage.set('refreshToken', data.refreshToken);
    await storage.set('usuarioId', String(data.usuarioId));
    await storage.set('nombreCompleto', data.nombreCompleto);
    await storage.set('email', data.email);
    await storage.set('rol', data.rol);

    setToken(data.token);
    setUsuarioId(data.usuarioId);
    setNombreCompleto(data.nombreCompleto);
    setEmail(data.email);
    setRol(data.rol);
  };

  const login = async (email: string, password: string) => {
    const data = await authService.login(email, password);
    if (!data.exito) throw new Error(data.mensaje || 'Error al iniciar sesión');
    await setSession(data);
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}   // revoca el refresh token en el servidor
    await limpiarSesion();
  };

  return (
    <AuthContext.Provider
      value={{ token, usuarioId, nombreCompleto, email, rol, loading, login, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}