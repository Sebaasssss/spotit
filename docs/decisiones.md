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

## 2026-11-24 — El 401 del arranque en frío

**Qué se vio:** en la Fase 2 un 401 que no se pudo explicar al verificar con Playwright; en la Fase 3, una corrida de la prueba de estados falló porque la respuesta interceptada de "Mis reportes" no traía `results`.

**Causa (reproducida 3 de 3 veces):** no era intermitente ni un access caducado. Con el perfil guardado en `localStorage`, la app entra de inmediato como `authenticated`, pero el access token vive solo en memoria y al abrir es `null`. React ejecuta los efectos de los hijos antes que los del padre, así que la pantalla pedía sus datos antes de que `AuthProvider` lanzara el refresh: la primera petición salía **sin** `Authorization`, recibía 401, el cliente renovaba y repetía. Pasaba en cada apertura de una pantalla que carga datos; solo se notaba en la red y en el log, y la prueba de la Fase 3 interceptó justo ese primer 401. En el log del backend, la mayoría de los 401 de una hora de pruebas eran esto (`/api/categorias/`, `/api/reportes/mios/`), y tapaban los 401 reales.

**Fase 2:** probable que fuera el mismo mecanismo (la portada también pide datos al montarse), **sin evidencia**: no se guardó traza ni log de ese momento.

**Arreglo:**
- Si una petición autenticada va a salir sin token, el cliente (`apiFetch` y la subida de fotos) espera primero la renovación que ya está en curso, en lugar de mandar una petición que seguro recibe 401. Varias pantallas comparten la misma renovación.
- **Sin conexión:** la espera falla como `NetworkError`, igual que antes fallaba la petición: la sesión guardada sigue abierta, el aviso de la portada dice que sigue guardada y cada pantalla muestra su estado sin conexión con "Reintentar". No se da la sesión por caducada.
- **Red lenta:** la espera tiene un límite de 8 s. Pasado ese tiempo la petición se rinde con `SlowNetworkError` (subclase de `NetworkError`, las pantallas la tratan como sin conexión); la renovación sigue en segundo plano y deja el token listo para "Reintentar".
- Si renovó antes de enviar y aun así recibe 401, no vuelve a renovar: ese 401 es real.

**Registro de 401 (`accounts/auditoria.py`):** un middleware escribe una línea por cada 401 en el logger `spotit.auth`, solo con la ruta (sin query string, donde van los tokens de las fotos), el motivo y los 8 primeros caracteres del `jti`; nunca el token, el email, el nombre ni el id del usuario:

```
auth.401 ruta=/api/auth/refresh/ motivo=gracia_ya_usada jti=3f9a1c07
```

Motivos en recursos: `sin_token`, `cabecera_invalida`, `access_caducado`, `access_invalido`. En el refresh: `sin_cookie`, `refresh_ilegible`, `refresh_caducado`, `refresh_revocado` (logout o gracia vencida), `gracia_ya_usada`, `gracia_sucesor_invalidado`, `usuario_inactivo`. Para distinguir "gracia ya usada", la marca del periodo de gracia ya no se borra al usarse: se sustituye por una marca de "usada" con el mismo vencimiento.

**Cómo se verifica:** pruebas de Vitest del arranque en frío (sin token, sin red, red lenta, sesión inválida) y una prueba de Playwright (`e2e/sesion.spec.ts`) que abre cada pantalla en una pestaña nueva con la sesión guardada y exige **cero** respuestas 401. Esa prueba falló contra el build anterior y pasa con el nuevo. Además, la prueba de fotos de e2e usaba el fixture `request`, con su propio almacén de cookies: rotaba la sesión compartida sin guardarla y la prueba siguiente dependía del único uso del periodo de gracia. Ahora usa `page.request`.

## 2026-11-24 — Votos

**Un voto por persona y reporte, y se puede quitar.** Lo garantiza una restricción única en la base de datos; votar dos veces o quitar un voto que no existe no da error (operaciones idempotentes), así un doble toque o un reintento no rompen nada.

**No se puede votar el propio reporte.** Quien reporta ya expresó su prioridad al crearlo; si pudiera votarlo, cada reporte empezaría con +1 sin que nadie más lo respalde y el conteo dejaría de medir el apoyo de otras personas. En el propio reporte se ve el conteo y "Tu reporte", sin botón; la API responde 403.

**En `resuelto` los votos se congelan:** se ve el conteo, pero no se puede votar ni quitar el voto, porque votar sirve para priorizar trabajo pendiente. Si el administrador lo reabre (`resuelto → en_proceso`), los votos vuelven a estar disponibles y se conservan los que ya tenía.

**Solo votan los ciudadanos.** El administrador decide la prioridad desde su panel; si votara, su voto se confundiría con el apoyo de los vecinos. Ve el conteo sin botón.

**El conteo se calcula, no se guarda.** Las listas y el detalle traen `votos`, `votado` y `puede_votar` con una anotación (`Count` + `Exists`) en la misma consulta. Un contador guardado en el reporte se desincroniza con votos simultáneos; con el índice de la restricción única el cálculo es barato. La API nunca dice quién votó. Hay orden `?orden=votos` (desempate por fecha) además de `recientes`.

**Concurrencia:** el voto se crea dentro de un punto de guardado; si dos peticiones del mismo usuario llegan a la vez, la restricción única rechaza la segunda y se responde como "ya votado" (200). Hay pruebas con hilos reales contra PostgreSQL.

**En la interfaz:** el botón "Votar" tiene `aria-pressed` y nombre fijo; el conteo ("5 votos, incluido el tuyo") se anuncia con `aria-live`. Cambia al instante y, si el servidor no lo guarda, vuelve a su estado anterior con un mensaje que dice qué pasó. Un segundo toque mientras se guarda se ignora.

## 2026-11-25 — Mapa general

**Endpoint propio (`/api/reportes/mapa/`):** devuelve solo `id`, `lat`, `lng`, `categoria`, `estado` y `votos`, en una sola consulta y sin fotos, descripción ni datos del autor. Filtra en el servidor por categoría y estado (acepta varios valores separados por coma). Tiene un tope de 2000 puntos (los más recientes) con un indicador `truncado`; con más volumen habrá que filtrar por la zona visible (`bbox`).

**Agrupación en el cliente con `supercluster`:** es ligero y deja dibujar las chapas como botones propios, en lugar de los marcadores por defecto de Leaflet. Tocar una mancha acerca el mapa hasta separarla. Si los reportes comparten el lugar exacto (el mismo bache reportado varias veces), ningún zoom los separa: la mancha abre una lista de los reportes de ese lugar.

**Diseño:** cada reporte es una chapa redonda con el icono de su estado (forma, icono y color; nunca solo color) y su número de votos; el ámbar solo marca la chapa elegida, como anillo. En móvil el mapa ocupa todo el alto restante y el reporte se abre en una hoja inferior con el voto al alcance del pulgar; en escritorio, la hoja es una columna junto al mapa y, sin selección, muestra la leyenda. Filtros y vista (mapa o lista) viven en la URL, así que volver desde el detalle conserva el contexto. La vista de lista, ordenada por más votados, es la alternativa accesible al mapa.

**Ningún punto medio tapado:** en móvil la hoja del reporte comparte el alto con el mapa (el mapa se encoge encima) en vez de flotar sobre él, y no se dibujan chapas cortadas por el borde ni escondidas bajo un control (zoom, "Leyenda", avisos): serían blancos de pocos píxeles que parecen rotos, y reaparecen al mover el mapa un poco. La chapa elegida es la excepción: nunca se omite y el mapa se centra en ella; si comparte lugar con otros, se marca la mancha que la contiene. Lo detectó axe (`target-size`) y lo cubre la suite e2e.

## Pendientes

- **Moderación de fotos:** detectar o difuminar caras y placas de vehículos antes de mostrar las fotos a otras personas (hoy cualquier usuario con sesión ve todas las fotos).
- **Ocultar o eliminar reportes desde el admin:** hoy el admin solo cambia el estado; falta un estado o bandera de "oculto" para reportes inapropiados o duplicados, con registro de quién y por qué, en lugar de borrarlos.
- **Tipografía display propia (fase final de pulido de diseño):** sustituir la tipografía del sistema en los títulos por una fuente propia, **alojada localmente** (sin CDN de terceros) y **precacheada por el service worker** para que la PWA la tenga sin conexión. Aplicarla solo al rol display mediante una variable (`--font-display`); cuerpo y controles siguen con la pila del sistema.
- **Sesión cerrada por dos refresh perdidos seguidos:** el periodo de gracia acepta el token anterior una sola vez durante 60 s. Si la app se abre dos veces seguidas y en ambas se pierde la respuesta del refresh, la segunda vez no hay gracia y la sesión se cierra. No se ha observado; si aparece, el registro lo mostrará como `gracia_ya_usada` o `gracia_sucesor_invalidado`, y entonces se valorará aceptar el token anterior mientras su sucesor siga sin usarse.
- **HEIC en un iPhone real:** el rechazo de HEIC está probado con un archivo de muestra, no con la cámara y la galería de un iPhone. Falta probarlo en un dispositivo con el túnel.
