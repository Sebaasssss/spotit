import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Genera favicon, iconos PWA (incluido maskable) y apple-touch-icon desde public/logo.svg.
// Ejecutar con `npm run generate-pwa-assets` cuando cambie el logo.
const brand = '#0E5A4F'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: brand } },
    apple: { ...preset.apple, resizeOptions: { background: brand } },
  },
  images: ['public/logo.svg'],
})
