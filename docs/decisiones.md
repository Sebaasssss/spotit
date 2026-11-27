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

## 2026-11-25 — Modo sin conexión y cola de reportes

**Idempotencia en el servidor:** el teléfono genera un UUID al guardar cada reporte y lo envía en la cabecera `Idempotency-Key` en todos los intentos. Se guarda en `Reporte.clave_idempotencia`, única **por autor** (la de otra persona no choca ni revela nada). Si la clave ya existe, el servidor responde **200** con el reporte ya creado (cabecera `Idempotent-Replayed: true`) sin volver a procesar la foto. Si dos envíos con la misma clave llegan a la vez, la restricción única decide: el perdedor borra las fotos que ya había escrito y devuelve el reporte ganador. Va en cabecera y no en el formulario para poder leerla antes de procesar el cuerpo y antes del límite de envíos.

**Límite de 20 por hora:** reintentar un reporte que ya se creó no gasta cupo ni recibe 429. Si la cola se topa con el límite, el reporte **sigue pendiente, no falla**: se respeta `Retry-After` y se muestra a qué hora se enviará. El tope de la cola es de 20 pendientes por persona, el mismo que el límite.

**Qué errores reintentan y cuáles no:**

| Respuesta | Qué pasa con el pendiente |
|---|---|
| Sin red, tiempo agotado, 408, 429, 5xx | Sigue pendiente; se reintenta solo (5 s, 30 s, 2 min y luego cada 10 min) o a la hora de `Retry-After` |
| 401 por red al renovar | Espera sin contar el intento; al volver la señal se renueva la sesión y se envía |
| 401 con sesión inválida | Se queda guardado hasta que esa persona vuelva a entrar |
| 400 (foto inválida, categoría retirada…), 413, 403 | Queda en "No se envió" con el motivo del servidor; la persona decide: Reintentar o Descartar. Nunca se borra solo |

Desde el formulario, un rechazo por los datos no deja nada en la cola: el reporte se quita y los errores se marcan en sus campos para corregirlos ahí.

**Cola en IndexedDB (`idb`):** cada pendiente guarda su clave, la persona, los datos, la foto ya reducida (1600 px, como bytes más su tipo, más robusto que un `Blob` en Safari) y su estado (`pendiente`, `enviando`, `error`). El formulario siempre pasa por la cola: guarda y luego intenta enviar ese mismo reporte con su progreso; si la señal falla, se queda guardado. Un envío solo a la vez, también entre pestañas (Web Locks); un `enviando` que quedó de una app cerrada a mitad vuelve a `pendiente` al abrir.

**Almacenamiento:** antes de guardar se comprueba el espacio (`navigator.storage.estimate()`) y un `QuotaExceededError` muestra un mensaje claro. Al guardar el primer pendiente (en contexto, no al abrir) se pide almacenamiento persistente; Chrome lo concede sin preguntar a la PWA instalada, Firefox pregunta, y en Safari la PWA de la pantalla de inicio no sufre el borrado de 7 días. Si se niega, la cola funciona igual. La caché de teselas se vacía primero si falta espacio (`purgeOnQuotaError`).

**Cuándo se envía:** al abrir la app, al volver la conexión (`online`), al volver a primer plano, con un temporizador mientras la app está abierta y con "Enviar ahora". Sin red no se intenta nada.

**Background Sync queda fuera (mejora futura):** el service worker no renueva la sesión ni envía reportes por su cuenta. Para enviar desde el service worker con la app cerrada tendría que renovar la sesión, y el refresh rota en cada uso: una renovación del service worker y otra de la página a la vez se pisarían y podrían cerrar la sesión, justo el caso que la gracia de 60 s solo cubre una vez. Además solo existe en Android con Chrome; en iOS no. Los otros disparadores cubren el caso real (la persona abre la app). Se podría retomar con un candado compartido entre página y service worker alrededor del refresh.

**Al cerrar sesión con pendientes:** un diálogo ofrece "Guardarlos y salir" (por defecto: se envían cuando esa persona vuelva a entrar) o "Borrarlos y salir" (teléfono compartido). En /entrar se avisa si hay reportes guardados. Otra cuenta en el mismo teléfono no los ve ni los envía.

**Caché de lectura (service worker):** se pasó a `injectManifest` (`src/sw.ts`) solo para poder usar plugins de Workbox en la caché; el service worker no hace nada más.
- **API, stale-while-revalidate:** categorías, listas, mapa y detalle (solo GET, solo 200; nunca `/api/auth/` ni `/api/health/`). 150 respuestas, 7 días. La copia lleva la fecha en que se guardó y la pantalla la muestra sin conexión ("Sin conexión: datos guardados el 25 nov, 10:40"). Si la revalidación trae algo distinto, el service worker avisa y la pantalla abierta vuelve a pedirlo.
- **Arranque sin conexión:** si no hay red ni para renovar la sesión, la app lee la copia guardada directamente desde Cache Storage, sin enviar ninguna petición sin token.
- **Privacidad:** las respuestas dependen de quién pregunta (`es_mio`, `votado`), así que la caché se borra al cerrar sesión, al caducar la sesión y antes de usar la sesión de una persona distinta. Tras votar o enviar un reporte se borran las entradas afectadas.
- **Teselas de OpenStreetMap:** solo las que la persona ya vio (nada por adelantado, como pide su política de uso), 500 teselas y 7 días como máximo; con conexión se respeta el `Cache-Control` del servidor de teselas y sin conexión se usa la guardada. Se piden con CORS (`crossOrigin` en Leaflet) para no guardar respuestas opacas, que Chrome cuenta como varios MB cada una. La atribución se mantiene. Las fotos de los reportes no se guardan (sus URL firmadas cambian cada 6 h).

**Accesibilidad:** una sola región viva anuncia los cambios ("Sin conexión…", "Conexión recuperada.", "Se envió 1 reporte pendiente.", "Reporte descartado."); la franja de estado no es región viva para no repetirlos. Descartar pide confirmación en la propia fila y lleva el foco a "Cancelar"; el diálogo de salida es un `<dialog>` modal nativo con el foco en la opción segura. Estados con icono y texto, nunca solo color.

**Dos fallos de sesión encontrados con las pruebas de esta fase:**
- **Gracia borrada por la caché de Django:** la caché en base de datos tenía el tope por defecto (300 entradas) y, al pasarlo, Django borra un tercio en orden de clave; las de gracia del refresh (`auth:rotated:…`) caían primero y la sesión se cerraba como `refresh_revocado`. Se subió el tope a 100 000 (todas las entradas caducan solas) y hay una prueba que lo demuestra.
- **Cerrar sesión con una renovación en curso:** la respuesta de la renovación llegaba después del cierre con una cookie nueva y reabría la sesión. Ahora el cierre espera la renovación en curso y toma el mismo candado.

## 2026-11-25 — Gracia del refresh con reintentos

**El problema:** la gracia aceptaba el token anterior una sola vez. Si se perdían dos respuestas seguidas (recargar justo cuando vuelve la señal, la app cerrada a mitad de una renovación), la sesión se cerraba aunque nadie más hubiera usado el token. Las pruebas de la Fase 5 lo reprodujeron (`gracia_ya_usada`, `gracia_sucesor_invalidado`).

**La regla ahora** (`accounts/rotation.py`):
- **Ventana fija:** 60 s desde la **primera** rotación del token; los reintentos no la alargan.
- **Reintentos:** dentro de la ventana, el token anterior se acepta otra vez **solo mientras su sucesor nunca se haya presentado**. Cada reintento emite un sucesor nuevo e invalida el anterior, así que nunca hay más de uno válido.
- **Tope de 3 reintentos** (`AUTH_REFRESH_GRACE_RETRIES`): cubre tres respuestas perdidas seguidas además de la rotación original, y limita cuántas veces un token robado puede canjearse en esa ventana. Pasado el tope: `gracia_ya_usada`, sin emitir nada y sin tocar el sucesor vigente.
- **Detección de reutilización** (`reutilizacion_detectada`): si el sucesor ya se usó y alguien presenta el anterior, se invalida **toda la cadena** (los sucesores que salieron de él). También si se presenta un sucesor que un reintento ya había descartado: si el teléfono lo tenía, su respuesta no se perdió y el reintento lo hizo alguien más.
- **Logout:** cierra la gracia del token que se cierra y del que sustituyó; si se cierra con una cookie vieja, también se invalida su sucesor.
- **Concurrencia:** las decisiones se toman con la fila de la persona bloqueada (`select_for_update`). Dos renovaciones simultáneas del mismo token cuentan como rotación más reintento y nunca dejan dos válidos.

**El compromiso de seguridad:** durante esos 60 s, quien tenga una copia del token anterior (robada de la cookie o del tráfico) puede canjearlo mientras el teléfono legítimo no haya usado aún su sucesor; antes podía hacerlo una vez, ahora hasta tres. Lo acotan:
- la ventana fija y corta, y el tope de reintentos;
- un solo sucesor válido a la vez, así que el canje del atacante deja inválido el del teléfono;
- la detección de reutilización: en cuanto el teléfono legítimo presente su token (ya descartado) o el sucesor ya usado, se invalida toda la cadena y el atacante pierde la sesión (el legítimo también tiene que volver a entrar);
- la cookie es httpOnly, `SameSite=Strict`, limitada a `/api/auth/` y solo viaja por HTTPS fuera de desarrollo.

Se aceptó a cambio de no cerrar la sesión de alguien que reporta con mala señal, que es el caso de uso principal. Cada rechazo deja su motivo en el registro (`gracia_ya_usada`, `gracia_sucesor_invalidado`, `reutilizacion_detectada`, `refresh_revocado`).

## 2026-11-25 — Panel de administración

**Dónde:** dentro de la PWA, en `/admin-panel` (resumen, lista y detalle), con su API en `/api/admin/`. Solo administradores: sin sesión la API responde 401 y a un ciudadano 403; en la app, un ciudadano que entra por la URL vuelve a Inicio. La barrera real es la API. El admin de Django queda para gestionar categorías y cuentas, y muestra los reportes **solo para consulta**: cambiar un estado ahí se saltaría el historial.

**Cambio de estado con historial:** mismas transiciones de siempre. Cada cambio guarda un `EventoReporte` (tipo, estado anterior y nuevo, nota pública opcional de hasta 500 caracteres, administrador y fecha). El cliente envía el estado que estaba viendo (`desde`); si otra persona lo cambió mientras tanto, la API responde **409** y no pisa el cambio (la fila se bloquea con `select_for_update`). El endpoint anterior `POST /api/reportes/<id>/estado/` se eliminó: no dejaba historial.

**Ocultar (moderación suave y reversible):** exige un motivo (5 a 500 caracteres, validado por la API) y admite una nota pública. Un reporte oculto:
- no sale en la lista general, en el mapa ni en el detalle para otros ciudadanos (404), y no se puede votar;
- su autor lo sigue viendo en Mis reportes, marcado "Oculto: no aparece en el mapa ni en las listas", sin foto y **sin el motivo** (si el administrador quiere explicarle algo, usa la nota pública);
- su foto solo la sirve un enlace firmado con **alcance de administrador**, que solo se entrega en respuestas del panel; un enlace emitido antes de ocultarlo deja de servir al momento;
- no pierde ningún archivo; "Volver a mostrar" lo deja como estaba y el historial conserva el motivo.

Con esto se resuelven los pendientes "Ocultar o eliminar reportes desde el admin" y, en su versión manual, "Moderación de fotos" (la difuminación automática sigue pendiente).

**Línea de tiempo del ciudadano:** en el detalle de un reporte se ven todos los cambios de estado con su fecha y su nota pública, nunca quién los hizo ni el motivo interno. Ocultar y volver a mostrar solo aparecen para el autor.

**Datos del autor que ve el administrador (privacidad):** solo **nombre y email, y solo en el detalle** de un reporte, para poder contactarlo cuando falta información. La lista, el resumen y el historial no llevan datos del autor; nunca se exponen su id, rol ni fechas de cuenta. Del administrador, el historial muestra solo su nombre y únicamente a otros administradores. Ninguna respuesta del panel lleva rutas de archivo del servidor: las fotos son URL firmadas hacia `/api/reportes/<id>/foto/` (hay una prueba que lo comprueba).

**Sin conexión:** `/api/admin/` queda fuera de la caché del service worker (lleva emails); está en la lista de rutas que nunca se guardan y hay una prueba de ello. El panel necesita conexión.

**Limitación conocida (caché de lectura):** lo que el service worker ya guardó en un teléfono puede seguir mostrando sin conexión, **durante un máximo de 7 días**, un reporte que después se ocultó: su descripción en la lista general y en el detalle que se hubiera abierto, y su punto en el mapa. Se corrige solo en cuanto el teléfono vuelve a tener conexión y revalida, o al caducar la copia. Las fotos no se cachean, así que la foto de un reporte oculto nunca se ve desde esa copia.

## 2026-11-26 — Notificaciones push

**Qué se avisa:** al ciudadano, cuando un administrador cambia el estado de su reporte, le deja una nota pública (acción nueva del panel «Dejar una nota», evento `nota`) o lo oculta o vuelve a mostrar. Solo los ciudadanos tienen avisos. No se avisa a quien hizo el cambio si es el autor del reporte (hoy no ocurre: los administradores no crean reportes, pero está cubierto).

**Claves VAPID:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` solo en el `.env` del servidor; `.env.example` lleva los nombres y la forma de generarlas (`python manage.py generar_vapid`, que imprime y no guarda nada). La imagen no las contiene: el contexto de build del backend no incluye el `.env` y llegan por `env_file` al arrancar. La pública llega al frontend en tiempo de ejecución (`GET /api/push/clave/`), no como `VITE_*`, así que cambiarlas no exige reconstruir. Sin las tres, el push queda apagado: la app no ofrece avisos y no se encola nada. Cambiarlas invalida todas las suscripciones.

**Suscripción por dispositivo:** la preferencia es por dispositivo (el interruptor suscribe o desuscribe este navegador; no hay preferencia global). Se guarda solo el `endpoint` y sus claves, sin user-agent ni datos del dispositivo. Si un endpoint ya registrado lo envía otra cuenta (teléfono compartido), pasa a la nueva y queda en el registro `push.suscripcion_reasignada` con el id de la suscripción, sin datos personales.

**Envío sin bloquear el panel (bandeja de salida):**
- Cada evento del historial crea sus `AvisoPush` (uno por dispositivo del autor) **en la misma transacción**: si el cambio no se guarda, no sale ningún aviso. El panel responde sin esperar al servicio de push.
- El servicio `push-worker` del compose (misma imagen, `manage.py enviar_push --loop`, no migra: espera al backend) toma los pendientes con `SKIP LOCKED`, así que varios workers nunca envían el mismo aviso dos veces.
- **Errores:** sin red, 429 o 5xx se reintenta (30 s, 2 min, 10 min, 30 min; respeta `Retry-After`) hasta 5 intentos; **404 y 410 borran la suscripción** (caducó o se quitó en el navegador); otro 4xx descarta ese aviso. Cada aviso caduca a las 24 h de crearse y los reintentos envían como TTL **lo que queda** de esas 24 h, nunca 24 h nuevas.
- **Purga:** los avisos enviados o descartados con más de 7 días se borran (una vez por hora en el worker y en cada pasada manual).

**Texto (pantalla de bloqueo):** sobrio y sin datos del reporte. «Tu reporte cambió a «En proceso».»; si hay nota, «… Tiene una nota nueva.»; una nota sola, «Tienes una nota nueva en tu reporte.». **La nota nunca va en el aviso**, ni la categoría ni la descripción. Un reporte oculto (y ocultar o mostrar) genera solo «Hay novedades en tu reporte.». La etiqueta por reporte junta sus avisos y `renotify` hace que el segundo vuelva a sonar en lugar de reemplazar al primero en silencio. Al tocarlo abre `/reportes/<id>` (solo rutas propias).

**Permiso en contexto:** nunca al abrir la app. Se ofrece una sola vez tras enviar un reporte («¿Te avisamos cuando cambie de estado?», «Ahora no» no vuelve a preguntar) y siempre está el ajuste «Avisos en este teléfono» en la portada. Si el permiso está bloqueado no se vuelve a pedir: se explica cómo cambiarlo en el navegador.

**iOS:** Web Push solo existe con la app instalada en la pantalla de inicio (iOS 16.4+). En Safari sin instalar, el ajuste lo explica y enlaza a la guía `/instalar` (también cubre el requisito de pantalla guiada de instalación del CLAUDE.md); con iOS anterior a 16.4 lo dice. No se asume `beforeinstallprompt`.

**Service worker:** ahora también muestra los avisos (`push`) y abre el reporte al tocarlos (`notificationclick`). Sigue sin renovar la sesión ni enviar nada por su cuenta. Si el navegador renueva la suscripción, la app la vuelve a registrar al abrirse.

**Cerrar sesión y teléfono compartido:** al salir se quita la suscripción del servidor y del navegador (con límite de 4 s; sin red se quita al menos del navegador y el servidor la borra con el primer 410). Si la sesión caduca y entra otra cuenta, la suscripción de la anterior se quita al abrir la app.

**Pruebas:** el backend simula el servicio de push. En e2e, el Chromium sin cabeza de Playwright no llega a un servicio de push real y deja el permiso de notificaciones siempre en `denied`, así que se simulan el permiso y `PushManager` en la página (servidor e interfaz reales). Lo que muestra el service worker se prueba como lógica pura (`src/push/avisoSW.ts`) y en un celular real con el túnel.

## Pendientes

- **Difuminar caras y placas automáticamente:** la moderación ya es posible a mano (ocultar desde el panel); falta detectar o difuminar caras y placas antes de mostrar las fotos.
- **Tipografía display propia (fase final de pulido de diseño):** sustituir la tipografía del sistema en los títulos por una fuente propia, **alojada localmente** (sin CDN de terceros) y **precacheada por el service worker** para que la PWA la tenga sin conexión. Aplicarla solo al rol display mediante una variable (`--font-display`); cuerpo y controles siguen con la pila del sistema.
- **Background Sync:** ver "Modo sin conexión y cola de reportes".
- **Un `refresh_revocado` intermitente en e2e (2026-11-26):** en una corrida completa (1 de 99 pruebas, escritorio, «un rechazo del servidor…» de la cola sin conexión) la sesión se cerró al recargar justo después de volver la conexión, y el registro lo mostró como `refresh_revocado`. No se reprodujo en 6 repeticiones de esa prueba. Si vuelve a aparecer, revisar la secuencia de renovaciones de ese `jti` en el registro.
- **Aviso push mostrado por el navegador en e2e:** no se puede automatizar con el Chromium sin cabeza de Playwright (sin servicio de push y con el permiso bloqueado); se cubre con la prueba manual en celular.
- **Renovaciones cruzadas en el mismo navegador:** si dos renovaciones salen a la vez con la misma cookie (dos pestañas sin Web Locks, p. ej. Safari anterior a 15.4, o una recarga justo mientras la app renueva), el servidor deja un solo sucesor válido y rechaza la otra con un 401 que borra la cookie. Si ese 401 llega después que la respuesta buena, borra también la cookie válida y la sesión se cierra. Ocurriría solo cuando ambas peticiones llevan la misma cookie y la rechazada responde última. En la app, Web Locks y la renovación única por pestaña lo hacen raro. Si apareciera, el registro lo mostrará como `gracia_sucesor_invalidado` seguido de `sin_cookie`, y se valorará no borrar la cookie en ese rechazo concreto.
- **Editar un reporte pendiente:** hoy solo se puede reintentar o descartar.
- **HEIC en un iPhone real:** el rechazo de HEIC está probado con un archivo de muestra, no con la cámara y la galería de un iPhone. Falta probarlo en un dispositivo con el túnel.
