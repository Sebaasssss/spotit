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
