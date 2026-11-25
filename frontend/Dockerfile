# --- Etapa 1: build de Vite ---
# Debian (glibc) en vez de Alpine: TypeScript 7, rolldown y oxlint traen binarios nativos.
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Las variables VITE_* se incrustan aquí, en tiempo de build: nunca poner secretos.
ARG VITE_MAPA_CENTRO=""
ENV VITE_MAPA_CENTRO=$VITE_MAPA_CENTRO
RUN npm run build

# --- Etapa 2: nginx sin root sirviendo el build y haciendo proxy de /api ---
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
