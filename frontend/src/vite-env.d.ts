/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Centro del mapa sin GPS: "latitud,longitud,zoom". Ver .env.example. */
  readonly VITE_MAPA_CENTRO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
