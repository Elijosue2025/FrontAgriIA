/**
 * Mientras todos los usuarios se registren como "Agricultor", el panel de
 * Administración queda abierto a cualquier usuario con sesión.
 *
 * Cuando el API asigne el rol Admin, cambia EXIGIR_ROL_ADMIN a true:
 * el menú y las rutas /admin/* pasan a ser solo para administradores.
 * (El API debe proteger esos endpoints con [Authorize(Roles = "Admin")]).
 */
export const EXIGIR_ROL_ADMIN = false;

export const esAdmin = (rol?: string | null) => rol?.toLowerCase() === 'admin';

export const puedeAdministrar = (rol?: string | null) =>
  !EXIGIR_ROL_ADMIN || esAdmin(rol);