/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Solo para `npm run dev` / `npm run preview` en el host. En Docker el proxy lo hace nginx.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:8000'
const proxy = {
  '/api': { target: apiTarget },
  '/admin': { target: apiTarget },
  '/django-static': { target: apiTarget },
}

const brand = '#0E5A4F'
const paper = '#F6F3EC'

export default defineConfig({
  // El .env vive en la raíz del repo (lo comparte con Docker). Vite solo expone VITE_*.
  envDir: '..',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // SW propio (src/sw.ts) solo para la caché: plugins de Workbox que el SW generado no permite.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // El registro lo hace <UpdatePrompt /> con virtual:pwa-register/react.
      injectRegister: false,
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'SpotIt — Reporta incidencias',
        short_name: 'SpotIt',
        description:
          'Reporta baches, luminarias fundidas, fugas y otras incidencias de tu campus o colonia.',
        lang: 'es-MX',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: brand,
        background_color: paper,
        categories: ['utilities', 'government'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        // Precache del shell (incluye las pantallas que se cargan aparte, para abrirlas sin red).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  server: {
    proxy,
    // Permite abrir el dev server desde un túnel de cloudflared si hiciera falta.
    allowedHosts: ['.trycloudflare.com'],
  },
  preview: { proxy, allowedHosts: ['.trycloudflare.com'] },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
