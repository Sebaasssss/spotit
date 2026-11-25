import { request, type FullConfig } from '@playwright/test'
import fs from 'node:fs'
import { estadoPath, PASSWORD } from './fixtures'

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
}
