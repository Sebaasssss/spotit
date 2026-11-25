---
version: 1
slug: "frontend-src-routes-newreport-tsx"
primary_target: "frontend/src/routes/NewReport.tsx"
related_targets: ["frontend/src/routes/MyReports.tsx","frontend/src/routes/ReportDetail.tsx","frontend/src/routes/Home.tsx"]
---

# Superficie: reportes (nuevo reporte, mis reportes, detalle) y acciones de la portada

Modo: Operate. Audiencia: ciudadanos en la calle, con el celular, a veces mayores o poco técnicos, a veces con sol directo y mala señal. Tarea: reportar un problema con foto, tipo, descripción y lugar en menos de un minuto, y seguir su estado. Restricciones: WCAG 2.2 AA, toques de 44 px como mínimo, voz de tú, sin instituciones nombradas, permisos de cámara y ubicación solo en contexto, el flujo funciona aunque se nieguen, aviso fijo de emergencias (911).

## Direction contract

THESIS: Reportar es "poner el punto en el plano real": el mapa de OpenStreetMap es el plano y el pin ámbar fijo en el centro es el único punto; se mueve el mapa debajo del pin, no el pin. Rechaza el asistente de varios pasos con barra de progreso y el marcador arrastrable diminuto de los formularios de mapa genéricos.

OWN-WORLD: Franja verde del plano arriba con "volver" y la marca; título display sobre papel. Formulario de una columna directo sobre papel, sin tarjetas: secciones con etiqueta semibold encima, opciones de categoría como filas de 56 px con borde de 2 px e icono dibujado en círculo, la elegida en verde aviso con borde verde. Botones secundarios con trazo verde de 2 px. Mapa con borde de 2 px y esquinas de 10 px. Estados como pastillas con icono y texto (gris recibido, verde aviso en proceso, verde hecho resuelto). Ámbar solo en el pin.

STORY: Quien entra ve primero el aviso de que no es para emergencias, toma o elige la foto y la ve, toca el tipo de problema, escribe qué pasa y ubica el punto con su GPS o moviendo el mapa. Si algo falta, cada campo dice qué y cómo. Al enviar ve el progreso real y llega a "Mis reportes" con su reporte resaltado y su estado en texto.

FIRST VIEWPORT: Móvil 390×844: franja verde de 64 px con "← Inicio" y SpotIt; título "Nuevo reporte" grande con una línea de apoyo; aviso 911 con borde de tinta e icono de teléfono; debajo empieza la sección Foto con los dos botones a lo ancho. Escritorio: misma columna de 560 px centrada bajo la franja.

FORM: Extensión acotada de la identidad ya definida en DESIGN.md (Fase 1 y 2), sin tirada de conceptos. Regla del usuario que fija el mundo (Fase 2, 2026-11-24): "No hagas la tirada de conceptos: ya tenemos una identidad visual definida y esta fase fue una petición acotada. Usa mi petición literal como seed del contrato de diseño y déjalo así." El plan de la Fase 3, aprobado por el usuario, la extiende a esta fase. seed: none (pinned) — "Pantalla "Nuevo reporte": foto desde la cámara o la galería con vista previa, categoría, descripción y ubicación por GPS con ajuste manual. Los permisos de cámara y ubicación se piden en contexto y el flujo debe funcionar si el usuario los niega." / "Pantalla "Mis reportes" con estados de carga, vacío y error." / "Mantén mobile-first, WCAG AA y uso con sol."
Interacción firma: el mapa se arrastra bajo el pin fijo; "Usar mi ubicación" recentra y dibuja el círculo de precisión; el estado de ubicación se anuncia en texto. Envío con progreso real ("Enviando… 45 %").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
