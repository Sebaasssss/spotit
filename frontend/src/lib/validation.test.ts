import { describe, expect, it } from 'vitest'
import {
  passwordChecks,
  validateEmail,
  validateLoginPassword,
  validateNewPassword,
  validateNombre,
} from './validation'

describe('validación', () => {
  it('email', () => {
    expect(validateEmail('')).toMatch(/Escribe tu email/)
    expect(validateEmail('ana@')).toMatch(/incompleto/)
    expect(validateEmail('ana@correo')).toMatch(/incompleto/)
    expect(validateEmail('  ana@correo.mx ')).toBeNull()
  })

  it('nombre', () => {
    expect(validateNombre('   ')).toMatch(/Escribe tu nombre/)
    expect(validateNombre('A')).toMatch(/al menos 2/)
    expect(validateNombre('x'.repeat(151))).toMatch(/demasiado largo/)
    expect(validateNombre('Ana')).toBeNull()
  })

  it('contraseña nueva refleja las reglas del backend', () => {
    expect(validateNewPassword('')).toMatch(/Crea una contraseña/)
    expect(validateNewPassword('corta')).toMatch(/al menos 10/)
    expect(validateNewPassword('12345678901')).toMatch(/solo números/)
    expect(validateNewPassword('girasol-azul')).toBeNull()
  })

  it('contraseña de login solo exige que exista', () => {
    expect(validateLoginPassword('')).toMatch(/Escribe tu contraseña/)
    expect(validateLoginPassword('x')).toBeNull()
  })

  it('requisitos en vivo', () => {
    expect(passwordChecks('').map((c) => c.ok)).toEqual([false, false])
    expect(passwordChecks('1234567890').map((c) => c.ok)).toEqual([true, false])
    expect(passwordChecks('girasol-azul').map((c) => c.ok)).toEqual([true, true])
  })
})
