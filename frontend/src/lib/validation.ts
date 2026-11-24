/** Validación en el cliente. Refleja las reglas del backend, que siempre tiene la última palabra. */

export const PASSWORD_MIN = 10

// Suficiente para atrapar errores de dedo; el servidor valida el formato real.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return 'Escribe tu email.'
  if (!EMAIL_RE.test(email)) return 'Revisa tu email; parece incompleto (ejemplo: nombre@correo.com).'
  return null
}

export function validateNombre(value: string): string | null {
  const nombre = value.trim()
  if (!nombre) return 'Escribe tu nombre.'
  if (nombre.length < 2) return 'Tu nombre necesita al menos 2 letras.'
  if (nombre.length > 150) return 'Tu nombre es demasiado largo (máximo 150 caracteres).'
  return null
}

export type PasswordCheck = { id: 'length' | 'notNumeric'; label: string; ok: boolean }

export function passwordChecks(value: string): PasswordCheck[] {
  return [
    { id: 'length', label: `Al menos ${PASSWORD_MIN} caracteres`, ok: value.length >= PASSWORD_MIN },
    { id: 'notNumeric', label: 'No solo números', ok: value.length > 0 && !/^\d+$/.test(value) },
  ]
}

export function validateNewPassword(value: string): string | null {
  if (!value) return 'Crea una contraseña.'
  if (value.length < PASSWORD_MIN) return `Usa al menos ${PASSWORD_MIN} caracteres.`
  if (/^\d+$/.test(value)) return 'Agrega letras o símbolos; no puede ser solo números.'
  return null
}

export function validateLoginPassword(value: string): string | null {
  return value ? null : 'Escribe tu contraseña.'
}
