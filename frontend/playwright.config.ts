import { defineConfig } from '@playwright/test'

/**
 * Pruebas de extremo a extremo y de accesibilidad contra el compose levantado
 * (`docker compose up --build`, nginx en :8080). No arranca servidores propios.
 *
 *   npm run test:e2e        # flujos + axe en 390×844 y 1440×900
 *   CAPTURAS=1 npm run test:e2e   # además guarda capturas en docs/capturas/
 */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080'

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  globalSetup: './e2e/global-setup.ts',
  // En serie: el refresh token rota y se pasa de una prueba a la siguiente (ver e2e/fixtures.ts).
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block', // las pruebas no dependen del SW ni de su caché
  },
  projects: [
    {
      name: 'movil',
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
      },
    },
    {
      name: 'escritorio',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
})
