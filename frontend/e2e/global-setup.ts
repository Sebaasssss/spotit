import { request, type FullConfig } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import { ADMIN_EMAIL, estadoAdminPath, estadoPath, PASSWORD } from './fixtures'

/**
 * Cuenta de administrador para las pruebas del panel. Solo se crea desde el servidor
 * (manage.py dentro del contenedor), nunca por la API. La contraseña es aleatoria en cada
 * corrida y no se guarda: solo queda la sesión en e2e/.auth/ (ignorado por git).
 */
function prepararAdmin(): string {
  const password = randomBytes(18).toString('base64url')
  const script = [
    'from accounts.models import Rol, User',
    `u = User.objects.filter(email=${JSON.stringify(ADMIN_EMAIL)}).first()`,
    `u = u or User.objects.create_user(${JSON.stringify(ADMIN_EMAIL)}, "x", nombre="Admin Pruebas")`,
    'u.rol = Rol.ADMINISTRADOR',
    'u.is_active = True',
    `u.set_password(${JSON.stringify(password)})`,
    'u.save()',
  ].join('\n')
  execFileSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell'], {
    cwd: '..',
    input: script,
    stdio: ['pipe', 'ignore', 'inherit'],
  })
  return password
}

/** Un ciudadano nuevo por proyecto; su sesión (cookie de refresh) queda en e2e/.auth/. */
export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync('e2e/.auth', { recursive: true })
  for (const project of config.projects) {
    const baseURL = project.use.baseURL!
    const api = await request.newContext({ baseURL })
    const salud = await api.get('/api/health/')
    if (!salud.ok()) {
      throw new Error(`El backend no responde en ${baseURL}. Levanta el compose antes de las pruebas.`)
    }
    const email = `e2e.${project.name}.${Date.now()}@ejemplo.mx`
    const res = await api.post('/api/auth/register/', {
      data: { email, nombre: `Prueba ${project.name}`, password: PASSWORD },
    })
    if (res.status() !== 201) {
      throw new Error(`No se pudo registrar el usuario de prueba: ${res.status()} ${await res.text()}`)
    }
    await api.storageState({ path: estadoPath(project.name) })
    await api.dispose()
  }

  const adminPassword = prepararAdmin()
  for (const project of config.projects) {
    const api = await request.newContext({ baseURL: project.use.baseURL! })
    const res = await api.post('/api/auth/login/', {
      data: { email: ADMIN_EMAIL, password: adminPassword },
    })
    if (res.status() !== 200) {
      throw new Error(`No se pudo entrar como administrador: ${res.status()} ${await res.text()}`)
    }
    await api.storageState({ path: estadoAdminPath(project.name) })
    await api.dispose()
  }
}
