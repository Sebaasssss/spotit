---
version: 1
slug: "frontend-src-routes-admin-adminpanel-tsx"
primary_target: "frontend/src/routes/admin/AdminPanel.tsx"
related_targets: ["frontend/src/routes/admin/AdminReportes.tsx","frontend/src/routes/admin/AdminReporte.tsx","frontend/src/routes/ReportDetail.tsx","frontend/src/routes/MyReports.tsx","frontend/src/routes/Home.tsx"]
---

# Superficie: panel de administración (/admin-panel)

Modo: Operate. Audiencia: personal que gestiona los reportes, sobre todo en escritorio con ratón y teclado; a veces desde el celular en campo. Tarea: ver de un vistazo cuánto hay en cada estado, encontrar reportes con filtros y búsqueda, cambiar su estado con una nota pública, ocultar o volver a mostrar con un motivo, y leer el historial. Restricciones: WCAG 2.2 AA, toques de 44 px, voz de tú, datos del autor solo nombre y email y solo en el detalle, el motivo de ocultar nunca llega al ciudadano, sin datos personales en la lista. Fuera de esta fase: push, exportación y gestión de categorías.

## Direction contract

THESIS: El panel es la mesa de trabajo del mismo plano: misma franja verde, mismo papel y mismas pastillas de estado, pero con densidad de escritorio. El resumen se lee como una barra de estado proporcional y una tabla de categorías, no como tarjetas de métricas; la lista es una tabla clara con filtros a la izquierda; el detalle separa lo que es del ciudadano (foto, texto, lugar) de las acciones del administrador (estado, moderación) y del historial. Rechaza el dashboard de tarjetas con números grandes y la tabla de admin genérica gris.

OWN-WORLD: Franja verde de 64 px con "Inicio"; título display sobre papel; conmutador Resumen | Reportes con el mismo estilo que Mapa | Lista. Pastillas de estado de siempre (icono y texto). Filtros como los chips del mapa, en columna de 280 px en escritorio y en panel desplegable en móvil. Tabla sobre papel con líneas de 1 px, sin tarjetas; fila con miniatura de 56 px, categoría en 650 y descripción en tinta suave. Oculto se marca con pastilla de borde discontinuo en tinta y icono de ojo tachado (nunca solo color). Acciones del detalle en una columna con secciones separadas por línea; destructivo (ocultar) con trazo rojo y confirmación en línea. Ámbar solo para selección y foco sobre oscuro.

STORY: El administrador entra al resumen y ve cuántos reportes hay por estado y categoría, los más votados y los ocultos; toca un conteo y llega a la lista ya filtrada. Busca, filtra por fechas o votos, abre un reporte, lee quién lo envió y cómo contactarlo, lo pasa a "En proceso" con una nota que el ciudadano verá, o lo oculta con un motivo interno. Si otra persona lo cambió mientras tanto, se le dice y se recarga. El ciudadano ve en su reporte la línea de tiempo con fechas y notas, sin nombres ni motivos.

FIRST VIEWPORT: Escritorio 1440×900: franja; columna de 1120 px centrada; título "Panel"; conmutador; en el resumen, barra de estados a lo ancho y debajo dos columnas (categorías | más votados). En la lista, filtros a la izquierda (280 px) y tabla a la derecha con 25 filas por página. En el detalle, dos columnas: el reporte (foto, texto, mapa) a la izquierda y las acciones (estado, autor, moderación) en 380 px a la derecha; historial debajo. Móvil 390×844: una columna, filtros desplegables, filas como Mis reportes, acciones debajo del reporte.

FORM: Extensión acotada de la identidad ya definida en DESIGN.md (Fases 1 a 5), sin tirada de conceptos. seed: none (pinned) — regla del usuario (Fase 2, 2026-11-24): "No hagas la tirada de conceptos: ya tenemos una identidad visual definida y esta fase fue una petición acotada. Usa mi petición literal como seed del contrato de diseño y déjalo así." Petición de la Fase 6: "Resumen con los conteos, lista filtrable de reportes, detalle con cambio de estado, nota y ocultar, y el historial." / "Funciona bien en escritorio, que es donde se usará más, y también en móvil. Mantén WCAG AA y los estados de carga, vacío y error."
Interacción firma: cambiar el estado ofrece solo las transiciones válidas; si otra persona lo cambió, aviso claro y recarga del reporte. Ocultar pide motivo obligatorio y confirmación en línea.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
