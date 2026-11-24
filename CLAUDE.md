# SpotIt — PWA de reporte de incidencias

## Qué es
PWA (instalable en iOS, Android y escritorio) para reportar incidencias en un campus o colonia: baches, luminarias fundidas, fugas de agua, fallas en salones, etc. El usuario toma una foto, la ubicación se captura automáticamente y el reporte aparece en un mapa con estados. Los demás usuarios pueden votar para priorizar. Un panel web permite a administradores gestionar reportes.

## Stack
- **Frontend:** React + Vite + TypeScript, `vite-plugin-pwa` (Workbox), React Router
- **Mapa:** Leaflet + OpenStreetMap (sin API keys de pago)
- **Backend:** Django REST Framework + PostgreSQL, autenticación JWT
- **Almacenamiento de fotos:** local en desarrollo; abstraído para cambiar a un servicio externo después
- **Contenedores:** Docker + Docker Compose para desarrollo y producción (mismo `docker-compose.yml` base)
- **Despliegue:** AWS, una instancia EC2 con Docker Compose (más adelante, no en las primeras fases; HTTPS obligatorio: cámara, GPS y service worker lo exigen)

## Estructura
```
/frontend              → app React (PWA) + Dockerfile (build y nginx)
/backend               → API Django REST + Dockerfile (gunicorn)
/docs                  → decisiones, historias de usuario, capturas
docker-compose.yml     → servicios base (db, backend, frontend/nginx), igual en local y AWS
docker-compose.override.yml → solo desarrollo (hot reload, puertos, volúmenes)
.env.example           → todas las variables, sin valores secretos
CLAUDE.md
```

## Docker y despliegue
- Servicios: `db` (PostgreSQL 16 con volumen persistente), `backend` (Django + gunicorn) y `frontend` (build de Vite servido por nginx, que además hace proxy de `/api` al backend, así todo sale del mismo origen y con un solo HTTPS)
- Todo lo configurable va por **variables de entorno** (`.env` local, nunca versionado; `.env.example` versionado con todas las claves): `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Las variables `VITE_*` se incrustan en tiempo de build, no de ejecución: no poner secretos ahí
- `docker-compose.yml` igual para local y AWS; las diferencias de desarrollo van solo en `docker-compose.override.yml`
- Healthchecks en `db` y `backend` (usando `/api/health/`) y `depends_on` con `condition: service_healthy`
- Las migraciones se ejecutan en el arranque del backend (entrypoint), sin pasos manuales
- Imágenes ligeras (multi-stage en el frontend), contenedores sin usuario root y `.dockerignore` en cada servicio
- Detrás del proxy: configurar `SECURE_PROXY_SSL_HEADER` y `CSRF_TRUSTED_ORIGINS` para que Django funcione bien con HTTPS
- nginx: `Cache-Control: no-cache` para `index.html`, `sw.js` y `manifest.webmanifest`; caché larga solo para archivos con hash
- Fotos: volumen persistente en el inicio; dejar el almacenamiento abstraído para migrar a S3
- Nada de secretos en imágenes, en el compose ni en el repo

## Alcance del MVP
1. Registro e inicio de sesión (roles: ciudadano, administrador)
2. Crear reporte: categoría, descripción, foto (cámara o galería) y ubicación (GPS con ajuste manual en el mapa)
3. Mapa con reportes y filtros por categoría y estado
4. Estados del reporte: `recibido` → `en_proceso` → `resuelto`
5. Votos para priorizar (un voto por usuario por reporte)
6. Panel de administración: lista, filtros, cambio de estado y comentarios
7. Notificaciones push cuando cambia el estado de un reporte propio
8. Modo offline: los reportes se guardan localmente y se sincronizan al volver la conexión

**Fuera de alcance por ahora:** chat entre usuarios, pagos, moderación con IA, multi-idioma.

## Requisitos PWA
- `manifest.webmanifest` completo (nombre, iconos maskable, `display: standalone`, colores)
- Service worker con precache del shell y estrategia de caché para API y tiles del mapa
- Cola offline de reportes con reintento (IndexedDB) e indicador visible de "pendiente de enviar"
- iOS: las push solo funcionan con la PWA instalada en la pantalla de inicio (iOS 16.4+). Incluir una pantalla guiada de instalación y no asumir que `beforeinstallprompt` existe en Safari
- Pedir permisos (cámara, ubicación, notificaciones) en contexto, nunca al cargar la app
- Objetivo: Lighthouse PWA sin fallos y buen rendimiento en móvil

## Diseño
- Mobile-first; probar siempre en viewport 390×844 y luego en escritorio
- Usar las skills de diseño instaladas y evitar el aspecto genérico de plantilla
- Zonas táctiles de al menos 44 px, contraste accesible, estados de carga, vacío y error en cada pantalla
- Verificar cada pantalla con Playwright (capturas) antes de darla por terminada

## Forma de trabajar
- **Antes de escribir código en cada fase, proponer un plan** y esperar confirmación
- Trabajar por fases pequeñas; no adelantar funcionalidades de fases futuras
- Si algo del alcance es ambiguo, preguntar en vez de inventar
- Commits pequeños con mensajes convencionales (`feat:`, `fix:`, `chore:`), uno por unidad lógica
- Escribir pruebas para la lógica de negocio del backend y para la cola offline
- No guardar secretos en el repo; usar `.env` y mantener un `.env.example`
- Al terminar una fase: correr linter y pruebas, verificar en Playwright y resumir qué se hizo y qué sigue

## Comandos
- Levantar todo: `docker compose up --build`
- Detener: `docker compose down` (añadir `-v` borra la base de datos local)
- Pruebas backend: `docker compose exec backend python manage.py test`
- Pruebas frontend: `cd frontend && npm test`
- Probar en celular real: túnel HTTPS (cloudflared) apuntando al puerto de nginx del compose
