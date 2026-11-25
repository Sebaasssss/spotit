---
version: 1
slug: "frontend-src-routes-mappage-tsx"
primary_target: "frontend/src/routes/MapPage.tsx"
related_targets: ["frontend/src/components/map/ReportsMap.tsx","frontend/src/components/report/VoteButton.tsx","frontend/src/routes/ReportDetail.tsx","frontend/src/routes/Home.tsx"]
---

# Superficie: mapa general de reportes y votos

Modo: Operate. Audiencia: ciudadanos en la calle, con el celular, a veces mayores o poco técnicos, con sol directo y mala señal. Tarea: ver qué se ha reportado cerca, filtrar por tipo y estado, abrir un reporte y votarlo para priorizarlo. Restricciones: WCAG 2.2 AA, toques de 44 px, voz de tú, sin datos de quien reportó ni de quien votó, no se vota el propio reporte, en `resuelto` los votos se congelan. Fuera de esta fase: panel de administración, push y cola offline.

## Direction contract

THESIS: El mapa general es el plano real ocupando una región entera bajo la franja: cada reporte es una chapa redonda con el icono de su estado y los cercanos se juntan en una mancha verde con su número. Tocar una chapa abre una hoja con lo esencial y el voto. Rechaza la lista de tarjetas con un mapa miniatura, los marcadores azules de Leaflet y los filtros en un modal.

OWN-WORLD: Franja verde de 64 px con "Inicio"; título display sobre papel; barra de controles en papel (Filtros con conteo, conmutador Mapa | Lista). Chapas de 36 px dentro de 44 px táctiles: recibido en superficie con borde de tinta, en proceso en verde plano con llave en tinta de plano, resuelto en verde hecho claro con borde verde hecho y check; conteo de votos en una pastilla de tinta. Manchas en verde plano hondo con anillo de papel y número en 700. Selección con anillo ámbar (detalle de respuesta, nunca relleno). Hoja sobre papel con borde superior de 2 px, sin sombra de tarjeta salvo el apoyo flotante.

STORY: Quien entra ve el mapa con todo lo reportado, entiende el estado de cada punto por forma e icono sin depender del color, acerca o toca una mancha para separarla, toca una chapa y lee categoría, estado, foto y descripción; vota con un toque y ve el conteo subir al instante (si falla, vuelve atrás y lo dice). Puede filtrar y cambiar a lista ordenada por más votados.

FIRST VIEWPORT: Móvil 390×844: franja de 64 px; título "Mapa de reportes" a 2.25rem; fila de controles de 44 px (Filtros a la izquierda, Mapa | Lista a la derecha); el mapa a sangre ocupa todo el alto restante. La hoja aparece abajo sobre el mapa, con el botón Votar al alcance del pulgar. Escritorio: columna de 560 px para título y controles a la izquierda arriba, mapa enmarcado a lo ancho con la hoja como columna de 380 px a la derecha.

FORM: Extensión acotada de la identidad ya definida en DESIGN.md (Fases 1 a 3), sin tirada de conceptos. seed: none (pinned) — regla del usuario (Fase 2, 2026-11-24): "No hagas la tirada de conceptos: ya tenemos una identidad visual definida y esta fase fue una petición acotada. Usa mi petición literal como seed del contrato de diseño y déjalo así." Petición de la Fase 4: "Pantalla de mapa general con marcadores agrupados (clustering) según el zoom, filtros por categoría y estado, y detalle del reporte al tocar un marcador." / "Botón de votar con estado accesible y actualización inmediata, que se revierte si falla." / "Mantén mobile-first, WCAG AA y uso con sol."
Interacción firma: tocar una mancha acerca el mapa hasta separarla; tocar una chapa la marca con anillo ámbar y abre la hoja con el foco en su título. Movimiento: hoja que sube 180 ms ease-out; nada con `prefers-reduced-motion`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
