# Decisiones técnicas

Registro breve de decisiones de arquitectura: qué se decidió, por qué y qué alternativas se descartaron.

## 2026-11-23 — Docker y Docker Compose para todo el proyecto

**Decisión:** todos los servicios (`db`, `backend`, `frontend`/nginx) corren en contenedores orquestados con Docker Compose, tanto en desarrollo como en el despliegue futuro (EC2).

**Por qué:**
- **Paridad entre entornos:** el mismo `docker-compose.yml` base se usa en local y en AWS; solo `docker-compose.override.yml` añade lo propio del desarrollo. Así se reducen los "en mi máquina sí funciona".
- **Sin instalaciones nativas:** PostgreSQL 16, Python y nginx vienen en las imágenes; no hay que instalar Postgres en Windows ni alinear versiones a mano.
- **Mismo origen y un solo HTTPS:** nginx sirve el build de la PWA y hace proxy de `/api` al backend. El service worker, la cámara y el GPS exigen contexto seguro, y con un único origen basta un solo certificado (o un solo túnel), sin CORS.
- **Despliegue simple:** una instancia EC2 con Docker Compose es suficiente para el MVP y no ata el proyecto a un PaaS concreto.
- **Configuración por entorno:** todo lo configurable entra por variables de entorno (`.env`, no versionado); `.env.example` documenta todas las claves.

**Alternativas descartadas:**
- *Postgres nativo + Django/Vite en el host:* más rápido de arrancar, pero diverge de producción y complica la instalación en cada máquina.
- *Solo Postgres en Docker:* resuelve la base de datos, pero deja nginx y el build fuera, que es justo lo que más importa probar en una PWA (caché del service worker, cabeceras).

## 2026-11-23 — Pruebas en celular real con túnel cloudflared

**Decisión:** para probar en un celular se abre un *Quick Tunnel* de cloudflared contra el puerto de nginx del compose (`cloudflared tunnel --url http://localhost:8080`).

**Por qué:** el teléfono necesita HTTPS válido para registrar el service worker e instalar la PWA. Un certificado autofirmado en la LAN no sirve en iOS sin instalar un perfil de CA. El túnel da HTTPS válido en iOS y Android sin cuenta y prueba el build real servido por nginx.

**Precaución:** la URL del túnel es pública mientras está abierto; se abre solo para probar y se cierra al terminar.

## 2026-11-23 — Desarrollo del frontend fuera de Docker

**Decisión:** el contenedor `frontend` siempre sirve el **build de producción** con nginx. Para iterar con recarga en caliente se usa `npm run dev` en el host; Vite hace proxy de `/api` al backend, expuesto solo en `127.0.0.1` por el override.

**Por qué:** el service worker solo existe en el build, así que nginx debe servir lo mismo que en producción. Correr Vite con HMR dentro de Docker en Windows es lento (vigilancia de archivos sobre volúmenes) y no aporta nada para la PWA.

## 2026-11-24 — Reportes: visibilidad, fotos y ubicación

**Visibilidad:** cualquier persona con sesión ve todos los reportes (lista y detalle), pero la API nunca expone nombre ni email de quien reportó; solo un indicador `es_mio`. El autor edita su reporte únicamente mientras está en `recibido`; el administrador solo cambia el estado (`recibido → en_proceso → resuelto`, y `resuelto → en_proceso` para reabrir).

**Fotos obligatorias y saneadas en el servidor:** el tipo se decide abriendo la imagen (JPEG, PNG o WebP), con límite de 10 MB y de 40 Mpx (bombas de descompresión). Se aplica la orientación EXIF, se recodifica a JPEG sin metadatos (se pierde el GPS de la cámara) y se guarda con nombre aleatorio. HEIC se rechaza con un mensaje claro; el cliente también lo detecta antes de subir.

**Entrega de fotos sin rutas internas:** la API devuelve URLs firmadas de 6 h hacia `/api/reportes/<id>/foto/` (las etiquetas `<img>` no pueden enviar el token). En Docker, Django responde con `X-Accel-Redirect` y nginx sirve el archivo desde una ubicación `internal`, con el volumen `media` montado en **solo lectura**. Para migrar a S3 basta con que `foto_url` devuelva una URL prefirmada.

**Ubicación:** el mapa usa Leaflet + teselas de OpenStreetMap con atribución. El centro sin GPS se configura con `VITE_MAPA_CENTRO` (por defecto la Ciudad de México). Si la persona mueve el punto a mano, `origen_ubicacion = manual` y se descarta la precisión del GPS. La política de uso de las teselas de OSM es suficiente para el MVP; con tráfico real habrá que usar un proveedor de teselas propio o de pago.

## 2026-11-24 — Tipografía de los títulos

**Decisión:** por ahora los títulos (voz display) siguen usando la tipografía del sistema, igual que el cuerpo y los controles.

**Por qué:** carga al instante, no añade peso ni dependencias externas y funciona sin conexión desde el primer arranque. Cambiarla afecta todas las pantallas (Fases 1 a 3), así que no se hace pantalla por pantalla.

## Pendientes

- **Moderación de fotos:** detectar o difuminar caras y placas de vehículos antes de mostrar las fotos a otras personas (hoy cualquier usuario con sesión ve todas las fotos).
- **Ocultar o eliminar reportes desde el admin:** hoy el admin solo cambia el estado; falta un estado o bandera de "oculto" para reportes inapropiados o duplicados, con registro de quién y por qué, en lugar de borrarlos.
- **Tipografía display propia (fase final de pulido de diseño):** sustituir la tipografía del sistema en los títulos por una fuente propia, **alojada localmente** (sin CDN de terceros) y **precacheada por el service worker** para que la PWA la tenga sin conexión. Aplicarla solo al rol display mediante una variable (`--font-display`); cuerpo y controles siguen con la pila del sistema.
