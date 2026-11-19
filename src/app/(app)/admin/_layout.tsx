import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { puedeAdministrar } from '@/constants/roles';

/** Todas las rutas /admin/* pasan por aquí: si no corresponde, vuelve al chat. */
export default function AdminLayout() {
  const { rol } = useAuth();
  if (!puedeAdministrar(rol)) return <Redirect href="/(app)/chat" />;
  return <Slot />;
}
