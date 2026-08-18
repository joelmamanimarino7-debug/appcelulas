// Muchos líderes no tienen correo electrónico propio. Para esos casos se
// loguean con un "usuario" corto (ej. "lider23") que se convierte acá en un
// correo sintético válido para Firebase Auth. Quien sí tenga correo real
// simplemente escribe su correo normal (se detecta por el "@").
export const AUTH_EMAIL_SUFFIX =
  process.env.NEXT_PUBLIC_AUTH_EMAIL_SUFFIX || "primeraasamblea.app";

export function toAuthEmail(usuarioOCorreo: string): string {
  const value = usuarioOCorreo.trim();
  return value.includes("@") ? value : `${value}@${AUTH_EMAIL_SUFFIX}`;
}
