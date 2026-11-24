# SpotIt

PWA para reportar incidencias en un campus o colonia (baches, luminarias, fugas…). Ver [CLAUDE.md](CLAUDE.md) para el alcance y [docs/decisiones.md](docs/decisiones.md) para las decisiones técnicas.

## Requisitos

- Docker Desktop (o Docker Engine + Compose v2)
- Node 22 (solo para desarrollo del frontend con recarga en caliente y para `npm test`)

## Arranque

```sh
cp .env.example .env    # y rellena SECRET_KEY y POSTGRES_PASSWORD (también dentro de DATABASE_URL)
docker compose up --build
```

La app queda en <http://localhost:8080> (o el puerto de `HTTP_PORT`). nginx sirve el build de la PWA y hace proxy de `/api` al backend; es el único servicio expuesto.

| Servicio   | Qué es                                   | Puerto en desarrollo |
|------------|------------------------------------------|----------------------|
| `frontend` | nginx con el build de Vite + proxy `/api` | `HTTP_PORT` (8080)   |
| `backend`  | Django REST (gunicorn; `runserver` en dev) | `127.0.0.1:8000`     |
| `db`       | PostgreSQL 16 con volumen `pgdata`        | `127.0.0.1:5433`     |

Los puertos de `backend` y `db` solo existen en `docker-compose.override.yml`, que Compose aplica automáticamente en local. Para levantar únicamente la configuración base: `docker compose -f docker-compose.yml up -d --build`.

## Comandos

```sh
docker compose down                                   # detener (añade -v para borrar la base de datos)
docker compose exec backend python manage.py test     # pruebas del backend
docker compose logs -f backend                        # logs
cd frontend && npm install && npm test                # pruebas del frontend
cd frontend && npm run lint                           # linter del frontend (oxlint)
```

### Frontend con recarga en caliente

Con el compose levantado (expone el backend en `127.0.0.1:8000`):

```sh
cd frontend && npm run dev    # http://localhost:5173, /api va al backend por el proxy de Vite
```

El service worker solo existe en el build, así que la PWA se prueba siempre contra nginx (puerto 8080).

## Probar en un celular real

El celular necesita HTTPS para registrar el service worker e instalar la PWA. Con el compose levantado:

```sh
cloudflared tunnel --url http://localhost:8080
```

Abre en el celular la URL `https://….trycloudflare.com` que imprime el comando:

- **iOS (Safari):** Compartir → Añadir a pantalla de inicio.
- **Android (Chrome):** menú → Instalar app.

Comprueba que se vea "Servidor en línea", que abra en pantalla completa con su icono y que, en modo avión, el shell siga cargando. La URL es pública mientras el túnel está abierto: ciérralo (Ctrl+C) al terminar.

Para depurar en Android: conecta por USB, abre `chrome://inspect` en la PC y usa *Port forwarding* `8080 → localhost:8080`.
