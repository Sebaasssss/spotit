---
name: SpotIt
description: PWA para marcar lo que está mal en tu entorno y seguir cómo se arregla.
colors:
  field: "#0e5a4f"
  field-deep: "#0a463d"
  field-ink: "#f6f3ec"
  field-ink-soft: "#cfe1dc"
  pin: "#e8a33d"
  pin-deep: "#b8781c"
  paper: "#f6f3ec"
  surface: "#fffdf8"
  ink: "#1b2421"
  ink-soft: "#4a5652"
  line: "#cfc7b6"
  line-strong: "#8a8576"
  ok: "#1d6b45"
  ok-tint: "#e3f1e8"
  error: "#b3261e"
  error-tint: "#fbe9e6"
  info-tint: "#e6efec"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.5
  small:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "10px"
  md: "14px"
  full: "999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "20px"
  lg: "24px"
  xl: "28px"
  section: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "56px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.field-deep}"
  button-primary-pending:
    backgroundColor: "{colors.field-deep}"
  button-on-field:
    textColor: "{colors.field-ink}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "44px"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "56px"
  input-text-invalid:
    backgroundColor: "{colors.error-tint}"
  alert-error:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  alert-info:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.field}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "52px"
  button-secondary-hover:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.field-deep}"
  button-secondary-disabled:
    textColor: "{colors.ink-soft}"
  link-button:
    textColor: "{colors.field}"
    height: "44px"
    padding: "0"
  page-bar:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    padding: "10px 12px"
    height: "64px"
  page-bar-back:
    textColor: "{colors.field-ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px 0 10px"
    height: "44px"
  notice-911:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
    height: "56px"
  choice-checked:
    backgroundColor: "{colors.info-tint}"
  photo-preview:
    backgroundColor: "{colors.field-deep}"
    rounded: "{rounded.sm}"
  map-view:
    backgroundColor: "{colors.info-tint}"
    rounded: "{rounded.sm}"
    height: "300px"
  map-view-static:
    height: "220px"
  status-pill-recibido:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  status-pill-en-proceso:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.field-deep}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  status-pill-resuelto:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ok}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  report-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 10px"
  report-row-new:
    backgroundColor: "{colors.info-tint}"
  success-note:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  action-home:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "76px"
  action-home-primary:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    height: "76px"
  action-home-primary-hover:
    backgroundColor: "{colors.field-deep}"
  vote-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.field}"
    rounded: "{rounded.sm}"
    padding: "0 20px 0 16px"
    height: "52px"
  vote-button-hover:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.field-deep}"
  vote-button-on:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.sm}"
    padding: "0 20px 0 16px"
    height: "52px"
  vote-button-on-hover:
    backgroundColor: "{colors.field-deep}"
    textColor: "{colors.field-ink}"
  vote-readonly:
    textColor: "{colors.ink-soft}"
  map-chip-recibido:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "44px"
  map-chip-en-proceso:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.full}"
    size: "44px"
  map-chip-resuelto:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ok}"
    rounded: "{rounded.full}"
    size: "44px"
  map-chip-votes:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    padding: "0 5px"
    height: "20px"
  map-cluster:
    backgroundColor: "{colors.field-deep}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.full}"
    size: "44px"
  map-cluster-md:
    size: "48px"
  map-cluster-lg:
    size: "54px"
  map-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 20px 18px"
  map-sheet-desktop:
    width: "380px"
    padding: "4px 4px 4px 0"
  map-notice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  map-zoom:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    size: "44px"
  filter-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px 0 12px"
    height: "44px"
  filter-button-active:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.field-deep}"
  filter-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px 0 10px"
    height: "44px"
  filter-chip-on:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
  view-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "2px"
  view-toggle-on:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    padding: "0 12px"
    height: "44px"
  legend-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px 0 10px"
    height: "44px"
  map-list-row:
    textColor: "{colors.ink}"
    padding: "10px 0"
    height: "64px"
  conn-strip:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    padding: "2px 20px"
    height: "48px"
  conn-strip-error:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.ink}"
  conn-strip-action:
    textColor: "{colors.field}"
    padding: "0"
    height: "44px"
  status-pill-por-enviar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.field-deep}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  status-pill-enviando:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.field-deep}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  status-pill-no-enviado:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.error}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  pending-row:
    textColor: "{colors.ink}"
    padding: "14px 10px"
  pending-confirm:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  link-button-quiet:
    textColor: "{colors.ink-soft}"
    height: "44px"
    padding: "0"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "52px"
  button-danger-hover:
    backgroundColor: "{colors.error-tint}"
  button-danger-disabled:
    textColor: "{colors.ink-soft}"
  saved-note:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
  saved-success:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px 20px 16px"
    width: "420px"
  status-pill-oculto:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "3px 10px 3px 8px"
  report-row-thumb-oculto:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    size: "72px"
  admin-tab:
    textColor: "{colors.ink-soft}"
    padding: "0 12px"
    height: "44px"
  admin-tab-current:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
  state-legend-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
    height: "56px"
  votes-badge:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "3px 9px"
  admin-filters-mobile:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "16px"
  admin-filters-desktop:
    width: "280px"
    padding: "0"
  admin-table-row:
    textColor: "{colors.ink}"
    padding: "12px 10px"
  admin-table-thumb:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.sm}"
    size: "56px"
  admin-actions:
    width: "380px"
  admin-option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "6px 14px"
    height: "56px"
  admin-option-checked:
    backgroundColor: "{colors.info-tint}"
  hidden-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  hide-warning:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  timeline-note:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  timeline-note-internal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  setting-row:
    textColor: "{colors.ink}"
    padding: "16px 0"
  setting-icon:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.field}"
    rounded: "{rounded.full}"
    size: "44px"
  switch-track:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
    width: "52px"
    height: "32px"
  switch-track-on:
    backgroundColor: "{colors.field}"
  switch-knob:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "24px"
  switch-knob-on:
    backgroundColor: "{colors.field-ink}"
    textColor: "{colors.field}"
  push-offer:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  install-step-number:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.full}"
    size: "32px"
---

# Design System: SpotIt

## Overview

**Creative North Star: "El punto en el plano"**

SpotIt es un plano de calles verde donde cae un pin ámbar, y al lado, papel cálido donde se escribe. Todo el sistema sale de esas dos materias: el **plano** (verde profundo con manzanas, calles translúcidas y un pin) marca la identidad y ocupa una región entera de la pantalla; el **papel** lleva el trabajo (formularios, texto, datos) sin tarjetas ni marcos que lo encierren.

Está hecho para la calle: modo claro siempre (se usa con sol), texto base de 17 px, controles de 56 px y toques de 44 px como mínimo, contraste alto y mensajes que dicen qué pasó y cómo seguir. La densidad es baja y directa: una columna, pocas piezas, nada decorativo que compita con la tarea.

**Key Characteristics:**
- Un campo verde que ocupa una banda (móvil) o una columna entera (escritorio) en la entrada y la portada, y una franja a todo lo ancho en las pantallas internas; nunca un adorno pequeño.
- Cuando hay un mapa real, ese mapa es el plano: se mueve el mapa bajo un pin ámbar fijo al centro, no el pin.
- Un solo pin ámbar por pantalla; el ámbar es el punto, no un color de interfaz.
- En el mapa general cada reporte es una chapa redonda con el icono de su estado (no un pin) y los cercanos se juntan en una mancha verde con su número.
- Formulario directo sobre papel, sin tarjeta, con etiquetas encima del campo.
- Bordes de 2 px para todo lo que se toca o avisa; el color nunca es la única señal.
- Movimiento mínimo: el pin se asienta una vez y la interfaz responde en 120 ms.

## Colors

Dos materias, verde de plano y papel cálido, con un único acento ámbar y un rojo reservado para errores.

### Primary
- **Verde Plano** (field): el campo de la banda y la columna, el botón principal, los enlaces, el borde del campo con foco y el borde de los avisos informativos, la pista del interruptor encendido y los círculos numerados de la guía de instalación. También es `caret-color` y `accent-color` del documento.
- **Verde Plano Hondo** (field-deep): manzanas del plano, hover y estado pendiente del botón principal, hover de enlaces.
- **Tinta de Plano** (field-ink): todo texto y trazo sobre el verde (marca, frase, calles al 16 % de opacidad, punto del pin).
- **Tinta de Plano Suave** (field-ink-soft): texto secundario sobre el verde (el rol bajo el saludo).

### Secondary
- **Ámbar Pin** (pin): el cuerpo del pin sobre el plano, el subrayado de enlaces en hover, la selección de texto y el anillo de foco dentro del aviso oscuro.
- **Ámbar Hondo** (pin-deep): contorno de 2 px del pin ámbar sobre el mapa real, para que se separe de las teselas claras.

### Neutral
- **Papel** (paper): fondo de toda la app; mismo valor que la tinta del plano, así el papel y las calles son la misma materia.
- **Superficie** (surface): relleno de los campos de texto y de bloques de estado, un punto más claro que el papel.
- **Tinta** (ink): texto principal, etiquetas, anillo de foco global y fondo del aviso flotante.
- **Tinta Suave** (ink-soft): texto de apoyo, ayudas, placeholders, iconos en reposo, hover del borde de campo.
- **Línea** (line): divisores de 1 px (pie del formulario, filas de la cuenta).
- **Línea Fuerte** (line-strong): borde de 2 px de los campos en reposo.

### Estado
- **Verde Hecho** (ok): requisitos cumplidos, backend sano, borde y texto del estado "resuelto" y borde de la nota de éxito.
- **Verde Hecho Claro** (ok-tint): fondo de la pastilla "resuelto" y de la nota de éxito.
- **Rojo Error** (error) sobre **Rosa Error** (error-tint): borde y relleno del campo inválido, texto e icono del error, borde y fondo del aviso de error, de la franja de estado con envíos fallidos, de la pastilla "No se envió" y de la confirmación de descartar. El rojo solo como trazo y texto marca además la acción destructiva (botón destructivo), nunca como relleno.
- **Verde Aviso** (info-tint): fondo de avisos informativos (sin conexión, aviso de oculto para el autor), de la franja de estado, de la pastilla "Enviando", de la nota "Tu reporte quedó guardado", de la opción elegida (también la transición elegida del panel), de la nota pública en la línea de tiempo, de la pastilla "en proceso", de la fila recién creada, del hover del botón secundario, del círculo de icono de las acciones de la portada y del ajuste de avisos, de la oferta de avisos y fondo del mapa mientras cargan las teselas.

El círculo de precisión del GPS sobre el mapa usa verde plano: trazo de 2 px y relleno al 12 %.

Lo **oculto** (moderación) no tiene color propio: se dice en tinta con trazo discontinuo (pastilla, caja y punto de la línea de tiempo) más el ojo tachado. No es un estado del flujo ni un error, así que no usa verde, rojo ni ámbar.

En los conteos del panel, cada estado lleva el tratamiento de su pastilla: recibido en línea con borde línea fuerte, en proceso relleno verde plano, resuelto verde hecho claro con borde verde hecho y rayado diagonal al 28 %; el rayado es la segunda señal para quien no distingue los verdes.

### Named Rules
**The Un Solo Pin Rule.** El ámbar aparece como el pin del plano (dibujado o real) y en detalles de respuesta (hover de enlace, selección, foco sobre oscuro). No se usa para botones, fondos, estados ni texto. En el mapa general el anillo ámbar de 3 px alrededor de la chapa elegida es un detalle de respuesta (selección): marca cuál se abrió, nunca rellena una chapa ni distingue un estado.

**The Siempre Claro Rule.** `color-scheme: light` fijo: no hay modo oscuro. La app vive al sol.

## Typography

**Display Font:** pila del sistema (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)
**Body Font:** la misma pila del sistema

**Character:** Una sola familia del dispositivo, cargada al instante y legible para cualquiera; la jerarquía sale del peso (400 a 800) y del tracking negativo en los títulos, no de un cambio de familia. La pila del sistema es la decisión firme para cuerpo, etiquetas y controles; en el rol Display también se usa la pila del sistema por decisión del usuario (2026-11-24); cambiarla queda para una fase final de pulido de diseño, con una fuente alojada localmente y precacheada por el service worker, sin cambiar la escala (ver docs/decisiones.md).

### Hierarchy
- **Display** (800, 2.25rem móvil / 2.75rem escritorio en entrada y pantallas internas / 3rem en el saludo de escritorio, 1.05, -0.025em): el título de cada pantalla ("Entra", "Nuevo reporte", "Mis reportes", "Hola, …"). Uno por pantalla, sobre papel, bajo la franja.
- **Headline** (700, 1.375rem, 1.2, -0.01em): títulos de sección dentro del papel y título del estado vacío.
- **Título de acción** (700, 1.125rem): el nombre de cada acción grande de la portada.
- **Title** (700, 1.25rem, -0.01em): el nombre SpotIt junto al logo sobre el plano.
- **Frase del plano** (500, 1.0625rem, 1.4 en móvil; 700, 1.75rem, 1.2 en escritorio): la frase de la banda, máximo 22ch, `text-wrap: balance`.
- **Título del detalle del panel** (800, 1.75rem, 1.15, -0.02em): la categoría del reporte con su número ("Alumbrado #920", el número en tinta suave 650 con cifras tabulares), bajo el display "Panel".
- **Título de sección de acciones** (750, 1.125rem): "Cambiar estado", "Quién lo envió", "Moderación". Los títulos de bloque del panel y de la línea de tiempo ("Estado general", "Historial", "Seguimiento") usan la cabecera de sección de lista (750, 1.25rem) con su conteo en 650 tinta suave.
- **Cifra de conteo** (750, 1.5rem, -0.01em, cifras tabulares): el número de cada estado en la leyenda del resumen. Es la única cifra grande del panel y va en línea con su pastilla, nunca sola en una tarjeta.
- **Body** (400, 17px, 1.5): texto corrido; apoyo bajo el título a 36ch, párrafos de sección a 48ch.
- **Label** (650, 17px): etiquetas de campo, en tinta, siempre visibles encima del control.
- **Small** (0.9375rem, 1.4): ayudas, errores en línea (600), estado de la ubicación, descripción de filas y acciones; los términos de lista de datos, las pastillas de estado (650) y los metadatos de fila van a 0.875rem.

### Named Rules
**The Nada Bajo 16 Rule.** El texto de los campos es 1.0625rem (17 px): por encima de 16 px para que iOS no haga zoom. Ningún control de entrada baja de ahí.

## Layout

Mobile-first, una columna. En móvil la pantalla se parte en dos filas: la banda del plano arriba (`clamp(200px, 30dvh, 260px)` en la entrada; altura por contenido en la portada) y el papel debajo. A partir de **900 px** la entrada pasa a dos columnas: el plano a la izquierda (`minmax(380px, 45%)`, a toda altura) y el formulario centrado verticalmente a la derecha.

Medidas máximas: formulario de entrada 420 px (400 px en escritorio); contenido de la portada 560 px, centrado. Márgenes laterales de 24 px en la entrada y 20 px en la portada en móvil, 48 px en escritorio, siempre sumados a `env(safe-area-inset-*)`. Las alturas usan `100dvh`.

**Pantallas internas** (nuevo reporte, mis reportes, detalle): franja verde de 64 px (más `safe-area-inset-top`) arriba, a todo lo ancho; debajo, una sola columna de 560 px centrada con márgenes de 20 px, título display a 24 px de la franja (40 px en escritorio) y bloques a 24 px entre sí. Igual en móvil y escritorio: la columna no se parte en dos.

**Panel de administración:** la misma franja y el display "Panel", pero con densidad de escritorio: columna de **1120 px** centrada (cabecera, conmutador y contenido) con 20 px laterales más el área segura; contenido a 24 px del conmutador y bloques a 28 px. Resumen: barra de estados a lo ancho y, desde 900 px, dos columnas iguales a 48 px (categorías | más votados); debajo, una sola columna a 32 px. Lista: desde 900 px, filtros en columna fija de **280 px** (pegada a 16 px del borde superior al desplazar) y tabla a 32 px; por debajo, filtros plegables sobre la tabla. Detalle: desde 900 px, dos columnas a 48 px (reporte `minmax(0, 1fr)` | acciones **380 px**) e historial a lo ancho debajo; en móvil, acciones debajo del reporte.

Ritmo: 8 px entre etiqueta y campo, 20 px entre campos, 24 px del título al formulario y entre bloques de la portada, 28 px antes del pie del formulario (con 20 px más tras su divisor). En formularios largos de secciones (el reporte) las secciones se separan 32 px. Las opciones de categoría se apilan a 8 px en una sola columna en todos los tamaños; los dos botones de foto van apilados a 10 px bajo 480 px y lado a lado desde 480 px.

## Elevation & Depth

Plano por defecto. La profundidad viene de las dos materias (verde contra papel), de las manzanas en verde hondo al 55 % y de bordes de 2 px, no de capas flotantes. Las sombras son pocas y con un rol concreto.

### Shadow Vocabulary
- **Sombra del pin** (`filter: drop-shadow(0 6px 8px rgb(5 30 26 / 0.35))` más una elipse en el suelo; `0 4px 6px` en el pin de 40 × 50 del mapa real): el pin está clavado en el plano. Es la única sombra con presencia.
- **Apoyo del botón principal** (`box-shadow: 0 1px 3px rgb(5 30 26 / 0.25)`): un apoyo mínimo, no una elevación.
- **Aviso flotante** (`box-shadow: 0 12px 32px rgb(27 36 33 / 0.25)`): solo el aviso de actualización y el diálogo de salida, que sí flotan sobre el contenido. El fondo del diálogo (`::backdrop`) es tinta al 55 %.
- **Apoyo de chapa y mancha** (`0 3px 6px rgb(5 30 26 / 0.35)` en la chapa, `0 3px 8px` en la mancha y en la chapa elegida, siempre tras un anillo de superficie de 2–3 px): las chapas están clavadas sobre las teselas, como el pin.
- **Borde de la hoja móvil** (`box-shadow: 0 -12px 32px rgb(27 36 33 / 0.22)`): solo la hoja del mapa en móvil, que sube sobre el mapa; en escritorio la hoja es una columna sin sombra.

### Named Rules
**The Papel Sin Tarjeta Rule.** El contenido se escribe sobre el papel; no se envuelve en tarjetas blancas con sombra. Los grupos se separan con espacio o con una línea de 1 px.

## Shapes

Esquinas suaves en dos pasos: **10 px** para campos, avisos, botones secundarios, opciones, mapa, fotos y miniaturas, y **14 px** para el botón principal y las acciones grandes de la portada. La cápsula (999 px) es de la pastilla de estado y del contador de votos de "Más votados" (tinta con número en papel); los círculos se reservan para el fondo de los iconos de opción (36 px), de acción, de fila del mapa y del ajuste de avisos (44 px), para los números de los pasos de instalación (32 px), para la perilla del interruptor (24 px) y para las chapas y manchas del mapa general; la pista del interruptor (52 × 32) es una cápsula. Las piezas anidadas restan el borde: segmento del conmutador a 8 px, contadores (filtros activos, votos de la chapa) a 6 px. La hoja del mapa en móvil lleva 14 px solo en las esquinas de arriba. El icono de la app usa la misma familia (112/512 de radio). El diálogo de salida usa los 14 px del botón principal. Bordes de **2 px** en todo lo que se toca o avisa (campos, avisos, la línea inferior de la franja de estado); **1 px** solo para divisores. El borde discontinuo dice "no está a la vista de todos": la pastilla "Por enviar" (verde plano: todavía no está en el servidor) y, en tinta, todo lo oculto por moderación (pastilla "Oculto", caja de oculto del detalle, punto de la línea de tiempo al ocultar o mostrar); en línea fuerte, la miniatura de sustitución de un reporte oculto y la caja del motivo interno, que solo ven administradores. La barra de estados del resumen mide 20 px de alto con 6 px de esquina y tramos de 4 px separados 3 px; las barras de categoría, 8 px con 4 px de esquina. Los botones sobre el plano usan un trazo interior de 1.5 px en lugar de borde.

Iconos: una sola familia dibujada a mano, caja de 24, trazo de 2 px, puntas y uniones redondeadas, `currentColor`, siempre `aria-hidden`. El pin del plano es la misma silueta que el logo. La familia incluye un icono por categoría de reporte (bache, alumbrado, agua, basura, áreas verdes, banqueta, señal, edificio, otro) y uno por estado (bandeja para recibido, llave para en proceso, check para resuelto); una categoría desconocida usa el de "otro". Para el mapa general y el voto suma voto (flecha hacia arriba sobre una base), filtros (tres líneas decrecientes), mapa (plano plegado), información (círculo con "i") y cerrar (equis). Para el panel y la moderación: gráfica (`ChartIcon`, tres barras sobre una base) para "Resumen", lista para "Reportes", ojo (visible) y ojo tachado (oculto). Para los avisos: campana (`BellIcon`, avisos activos y la oferta), campana tachada (`BellOffIcon`, avisos apagados o no disponibles), compartir de iOS (`ShareIcon`, caja con flecha hacia arriba, solo en la guía de instalación) y globo de diálogo (`ChatIcon`, "Dejar nota"). Las chapas de Leaflet repiten en HTML los mismos trazos de estado.

## Components

### Buttons
Firmes y a lo ancho; responden sin teatro.
- **Shape:** esquinas de 14 px en el primario, 10 px en el resto.
- **Primary:** verde plano con tinta de plano, 56 px de alto, a lo ancho del formulario, peso 700 a 17 px.
- **Hover / Active:** verde hondo en hover; `scale(0.98)` al presionar; transición de 120 ms ease-out.
- **Pendiente:** se deshabilita (`disabled` + `aria-disabled`), pasa a verde hondo, cursor `progress`, y muestra spinner y la acción en gerundio con puntos suspensivos ("Entrando…", "Saliendo…").
- **Sobre el plano:** fondo de papel al 14 % (24 % en hover), trazo interior de 1.5 px al 50 %, 44 px de alto, icono más texto; anillo de foco en tinta de plano.
- **Secundario:** superficie con trazo interior de 2 px en verde plano y texto verde plano en 700, 52 px de alto, icono de 20 px más texto. Hover: fondo verde aviso y texto verde hondo. Deshabilitado (buscando, preparando): texto tinta suave, trazo línea fuerte, cursor `progress` y spinner en lugar del icono. Ancho natural en rejilla o junto a un contador; a lo ancho cuando es la única acción de la sección ("Usar mi ubicación", "Cargar más").
- **Botón-enlace** ("Reintentar", "El problema está aquí: usar este punto"): sin caja, texto verde plano 650 con subrayado de 2 px a 3 px de separación, icono opcional de 18 px, 44 px de alto táctil. Para acciones secundarias en línea: recuperar dentro de un aviso de error, o aceptar el valor que ya se ve.
- **Envío con progreso:** el botón principal en estado pendiente muestra el porcentaje real ("Enviando… 45 %"), con un `<progress>` oculto para lectores de pantalla.
- **Botón-enlace quieto** ("Descartar"): el mismo botón-enlace en tinta suave, para la acción que no se quiere invitar junto a otra principal ("Reintentar"). Deshabilitado (trabajando): tinta suave y cursor `progress`.
- **Destructivo** ("Sí, descartar", "Borrarlos y salir"): superficie con trazo interior de 2 px en rojo error y texto rojo error, icono de bote (`TrashIcon`) de 18–20 px más texto, 52 px de alto (44 px dentro de la confirmación en línea), esquinas de 10 px. Hover: fondo rosa error. Deshabilitado: texto tinta suave y trazo línea fuerte; mientras trabaja, spinner en lugar del icono y gerundio ("Borrando…"). Nunca relleno rojo: no compite con el botón principal, que sigue siendo la opción segura.

### Inputs / Fields
- **Style:** etiqueta encima (650, tinta), campo de 56 px con relleno superficie, borde de 2 px línea fuerte, esquinas de 10 px, 16 px de padding lateral.
- **Hover:** el borde pasa a tinta suave.
- **Focus:** borde verde plano más anillo de 3 px en tinta con 2 px de separación.
- **Error:** borde rojo y relleno rosa error; debajo, mensaje en rojo 600 con icono de alerta dibujado, enlazado por `aria-describedby` y con `aria-invalid`.
- **Contraseña:** botón de mostrar/ocultar de 44 × 44 dentro del campo (a 6 px del borde derecho), con `aria-pressed` y etiqueta que cambia.
- **Requisitos:** lista en línea que se marca en vivo: punto en tinta suave pendiente, check en verde hecho y peso 600 cumplido, con texto oculto ": cumplido / : pendiente" para lectores de pantalla.
- **Área de texto:** mismo campo, mínimo 128 px de alto, padding de 14 × 16 px, interlineado 1.5, redimensionable en vertical; contador debajo como ayuda. `textarea` y `select` heredan la tipografía del documento.
- **Grupos:** cada sección de varias piezas (foto, categoría, ubicación) es un `fieldset` sin borde con su `legend` en estilo de etiqueta; el error del grupo se enlaza al `fieldset` con `aria-describedby`. Un grupo inválido pinta su `legend` en rojo error y muestra el mensaje con icono debajo; los controles del grupo no cambian a rojo.

### Opciones (radios grandes)
Radios nativos (teclado y lector gratis) vestidos como filas.
- **Forma:** fila de 56 px como mínimo, borde de 2 px línea fuerte, esquinas de 10 px, superficie, padding de 8 × 14 px; el `input` queda invisible dentro de la etiqueta.
- **Contenido:** icono dibujado de 22 px en un círculo de 36 px (papel con trazo verde plano), texto, y a la derecha un check de 18 px solo en la elegida.
- **Hover:** borde tinta suave. **Foco:** anillo de 3 px en tinta con 2 px de separación sobre toda la fila (`:has(input:focus-visible)`).
- **Elegida:** borde verde plano, fondo verde aviso, círculo en verde plano con icono en tinta de plano, texto en 650. La señal es triple: color, check y peso.
- **Error:** la pregunta (`legend`) en rojo error y el mensaje del grupo debajo; las filas conservan su borde.

### Selector de foto
Dos botones secundarios ("Tomar foto" con cámara, "Elegir de la galería" con imagen), apilados en móvil estrecho y lado a lado desde 480 px, que pasan a "Tomar otra / Elegir otra" cuando ya hay foto. Sin foto, una línea de ayuda en tinta suave; con foto, la vista previa encima de los botones: un visor con marco de 2 px línea fuerte, esquinas de 10 px y fondo verde plano hondo (las franjas de una foto vertical se leen como marco), imagen `contain` hasta 320 px de alto. Mientras se prepara, estado en línea con spinner ("Preparando la foto…"). Ninguno de los dos pide permiso de cámara a la web.

### Aviso 911
Aviso fijo arriba del formulario: no se cierra ni se colapsa. Borde de 2 px en **tinta** (no en color de tono: no es error ni info), superficie, esquinas de 10 px, 12 × 16 px de padding, icono de teléfono de 22 px y texto en dos frases; el enlace `tel:` va en tinta, 800, con 44 px táctiles sin romper la línea.

### Avisos de formulario
- **Style:** borde completo de 2 px en el color del tono, fondo teñido, esquinas de 10 px, 14 × 16 px de padding, icono a la izquierda en el color del tono y texto en tinta.
- **Error:** rojo sobre rosa error, `role="alert"`; título breve más una línea de ayuda en peso 450 que dice cómo seguir.
- **Info:** verde plano sobre verde aviso, `role="status"` (sin conexión, con icono de nube tachada). En la entrada, si el teléfono guarda reportes sin enviar, un aviso info con la nube con flecha ("Hay 1 reporte guardado en este teléfono sin enviar. Entra con la cuenta que lo creó y se enviará solo.").
- **Sin conexión en la portada:** ya no es una pastilla; lo dice la franja de estado bajo el campo (ver "Franja de estado").
- **Nota de éxito:** mismo lenguaje en verde hecho: borde de 2 px verde hecho, fondo verde hecho claro, check de 20 px, texto 600, 12 × 14 px, `role="status"` ("Recibimos tu reporte…").
- **Nota "quedó guardado":** la misma forma que la nota de éxito pero en el tono info (borde de 2 px verde plano, fondo verde aviso, nube con flecha de 20 px en verde plano, texto 600, 12 × 14 px, `role="status"`): "Tu reporte quedó guardado en este teléfono y se enviará solo; aquí ves cómo va." No es verde hecho porque aún no llega al servidor. Solo aparece al llegar a Mis reportes desde un reporte guardado y mientras alguno siga esperando sin error.

### Navegación de pantallas internas (franja del plano)
Franja verde plano a todo lo ancho, 64 px más el área segura, padding lateral de 12 px (32 px en escritorio). A la izquierda "volver": flecha de 20 px más el destino ("Inicio"), 44 px, mismo tratamiento que el botón sobre el plano (papel al 14 %, trazo interior de 1.5 px al 50 %, 650). A la derecha la marca (logo de 28 px y "SpotIt" en 700), decorativa. La franja no lleva manzanas ni pin: es la misma materia, no otra ilustración.

### Franja de estado (conexión y cola)
Una sola línea que dice cómo está la conexión y la cola, pegada justo debajo del verde: bajo la franja del plano en las pantallas internas y bajo el campo en la portada. Desaparece cuando no hay nada que decir.
- **Forma:** a todo lo ancho, sin esquinas, con solo un borde inferior de 2 px en el color del tono. Contenido en la columna de 560 px (a todo lo ancho en el mapa general), 48 px de alto mínimo, 20 px laterales más el área segura; icono de 20 px, texto en small 600 tinta con cifras tabulares y, a la derecha, una acción.
- **Tonos:** info (verde aviso, borde e icono verde plano) y error (rosa error, borde e icono rojo error; la acción pasa a tinta). Nunca otro color.
- **Prioridad:** se dice una sola cosa, en este orden: **enviando** ("Enviando un reporte pendiente… 45 %", con spinner) > **sin conexión** (nube tachada: "Sin conexión · 2 reportes por enviar" con "Ver"; sin pendientes, "Sin conexión." y, en la portada, "Sin conexión. Tu sesión sigue guardada en este teléfono.") > **con error** (tono error, icono de alerta: "1 reporte no se pudo enviar." con "Revisar") > **por enviar** (nube con flecha: "1 reporte por enviar" con "Enviar ahora").
- **Acción:** texto 700 a 0.9375rem, subrayado de 2 px a 3 px, sin caja, 44 px táctiles. "Ver" y "Revisar" llevan a Mis reportes y no se muestran ahí; "Enviar ahora" tampoco, porque la sección "Por enviar" ya tiene el suyo.
- **No es región viva.** Los cambios de conexión y de la cola se anuncian una sola vez en una región viva global oculta (`role="status"`, `aria-live="polite"`, atómica; "Se envió 1 reporte pendiente"), que cambia de nodo para que un texto repetido se vuelva a leer.

### Acciones de la portada
Enlaces grandes apilados a 12 px: 76 px de alto, borde de 2 px, esquinas de 14 px, padding de 14 × 16 px; icono en círculo de 44 px, título (700, 1.125rem) con una línea de apoyo (small, tinta suave) y chevron a la derecha. La principal ("Nuevo reporte") es verde plano con tinta de plano, círculo de papel al 16 % y apoyo en tinta de plano suave; hover verde hondo. Las secundarias ("Mapa de reportes" con el icono de mapa, "Mis reportes") son superficie con borde línea fuerte (tinta suave en hover) y círculo verde aviso. Al presionar, `scale(0.99)`.

### Pastilla de estado
Cápsula con icono de 16 px y texto (650, 0.875rem), borde de 2 px, padding 3 × 10 px, texto oculto "Estado:" para lectores. **Recibido:** borde línea fuerte, superficie, tinta (bandeja). **En proceso:** borde verde plano, verde aviso, texto verde hondo (llave). **Resuelto:** borde verde hecho, verde hecho claro, texto verde hecho (check). Nunca color solo; nunca ámbar.

Los reportes guardados en el teléfono usan la misma cápsula, siempre con icono: **Por enviar** (borde discontinuo verde plano, superficie, texto verde hondo, nube con flecha), **Enviando** (borde verde plano, verde aviso, texto verde hondo, spinner y porcentaje con cifras tabulares: "Enviando… 45 %") y **No se envió** (borde rojo error, rosa error, texto rojo error, icono de alerta). No llevan el "Estado:" oculto: no son estados del reporte en el servidor.

**Oculto** (moderación): la misma cápsula con borde discontinuo de 2 px en tinta, superficie, texto tinta y ojo tachado de 16 px ("Oculto"; "Ocultos" en la leyenda del resumen). Va siempre **junto a** la pastilla de estado, nunca en su lugar: ocultar no cambia el estado del flujo. Aparece en la fila de Mis reportes (solo para el autor), en la cabecera del detalle del panel, en la tabla del panel y en la leyenda del resumen.

### Lista de reportes
- **Fila:** enlace a todo lo ancho, rejilla de miniatura 72 × 72 (esquinas 10 px, `cover`), cuerpo y chevron de 20 px; padding de 14 × 10 px y 14 px de separación; desde 480 px la lista sale 10 px a cada lado (margen negativo) para que la miniatura quede alineada con el título de la página; por debajo de 480 px no sale, para que el fondo de la fila nueva no toque el borde de la pantalla. Filas separadas por líneas de 1 px (línea arriba de la lista y bajo cada fila). Título (categoría) en 650, descripción en small tinta suave cortada a dos líneas, y metadatos con la pastilla de estado y el tiempo relativo. Hover: tinta al 4 %.
- **Oculta (solo en Mis reportes del autor):** su foto no se entrega fuera del panel, así que la miniatura se sustituye por una caja de 72 × 72 con borde discontinuo de 2 px línea fuerte, superficie y ojo tachado de 28 px en tinta suave (`aria-hidden`); en los metadatos, la pastilla "Oculto" junto a la de estado.
- **Recién creada:** la fila que acaba de enviarse solo cambia su fondo a verde aviso (sin mover nada), acompañada de la nota de éxito arriba.
- **Cabecera:** conteo ("3 reportes", 650 tinta suave) a la izquierda y botón secundario "Nuevo" a la derecha. Cuando hay reportes por enviar, el conteo se vuelve cabecera de sección "Enviados" (ver "Por enviar"), para que las dos listas se distingan.
- **Carga:** tres filas esqueleto con la misma rejilla (miniatura y dos líneas de 14 px al 70 % y 45 %) en color línea, esquinas de 10 px, con pulso de 1.4 s; el anuncio real va en un `role="status"` oculto y la lista esqueleto es `aria-hidden`.
- **Vacío:** headline ("Aún no tienes reportes"), una línea en tinta suave a 44ch con ejemplos concretos y el botón principal a lo ancho hacia el primer reporte.
- **Sin conexión:** si no hay copia guardada que mostrar, no es un error: aviso info con nube tachada, "Sin conexión. Tus reportes enviados aparecerán al volver la señal.", sin "Reintentar"; la lista se vuelve a pedir sola al volver la señal. Si hay copia, se muestra con la nota de copia guardada encima.
- **Error:** solo para fallos reales (el servidor respondió mal, o la red falló estando en línea): aviso de error con el motivo y el botón-enlace "Reintentar"; si fue la red, con icono de nube tachada.
- **Más:** botón secundario a lo ancho "Cargar más", con spinner mientras carga.

### Por enviar (cola de reportes en Mis reportes)
Los reportes guardados en el teléfono que aún no llegan al servidor, arriba de los enviados y con el mismo lenguaje de lista.
- **Cabecera de sección:** título en 750 a 1.25rem (1.2, -0.01em) con el conteo al lado en 650 a 1rem tinta suave y cifras tabulares ("Por enviar 2"); a la derecha, el botón secundario "Enviar ahora" (nube con flecha; spinner y "Enviando…" mientras envía), solo si alguno espera sin error y fuera del límite por hora, y deshabilitado sin conexión. Los enviados usan la misma cabecera ("Enviados 5") cuando hay pendientes.
- **Lead:** una línea en small tinta suave a 48ch que dice qué pasa sin hacer nada: "Guardados en este teléfono. Se envían solos; si alguno falla, aquí te decimos por qué." (sin conexión: "… Se enviarán solos cuando vuelva la conexión.").
- **Fila pendiente:** la misma rejilla que la fila enviada (miniatura de 72 × 72 con la foto local, título en 650, descripción cortada, metadatos con pastilla y "Guardado hace un momento"), padding de 14 × 10 px y divisores de 1 px, pero **sin enlace ni chevron**: aún no existe en el servidor.
- **Motivo:** bajo la fila, alineado con el texto (86 px; sin sangría bajo 380 px), small: en espera, tinta suave ("Llegaste al límite de envíos por hora. Se enviará a las 10:40.", "Se cortó la señal al enviarlo. Lo volvemos a intentar."); en error, texto tinta 600 con icono de alerta de 18 px en rojo error ("La foto no se pudo leer. Elige otra."). Mientras se envía no hay motivo ni acciones.
- **Acciones:** botones-enlace a 20 px entre sí con icono de 18 px. **Reintentar** (verde plano) solo en las que fallaron; **Descartar** (quieto, tinta suave) en todas. Ambos se ligan a su fila con `aria-describedby` (categoría y hora, oculta).
- **Confirmar descartar:** en línea, nunca en modal: caja con borde de 2 px rojo error sobre rosa error, esquinas de 10 px, 12 × 14 px, texto 600 ("¿Descartar este reporte? Se borra de este teléfono y no se puede deshacer."), `role="group"` con esa pregunta como etiqueta, y debajo el botón destructivo "Sí, descartar" (44 px) y el botón-enlace "Cancelar". Al abrir, el foco va a Cancelar; al cancelar vuelve a "Descartar"; tras descartar pasa a la primera acción de la fila que ocupa su lugar (o la anterior, o el título de la sección, o el de la página).

### Nota de copia guardada
Cuando lo que se ve sin conexión es una copia guardada (Mis reportes, detalle, mapa general y hoja del mapa), una línea sin caja encima del contenido: nube tachada de 18 px en verde plano y texto small 600 tinta suave, "Sin conexión: datos guardados el 25 nov, 10:40." (sin fecha: "Sin conexión: datos guardados en este teléfono."). Sobre el mapa va dentro del aviso flotante. No es un aviso: el contenido sí está; solo dice de cuándo es.

### Diálogo de salida
Al pulsar "Salir" con reportes sin enviar. `<dialog>` modal nativo (foco atrapado, Escape cancela salvo mientras sale, el foco vuelve a "Salir").
- **Forma:** papel, hasta 420 px de ancho (con 16 px de margen en móvil), esquinas de 14 px, 24 × 20 × 16 px de padding, sombra del aviso flotante y fondo de tinta al 55 %. Entra subiendo 12 px en 220 ms ease-out; sin animación con movimiento reducido.
- **Texto:** título en 800 a 1.375rem con `text-wrap: balance` ("Tienes 1 reporte sin enviar") y una explicación en tinta suave que dice qué pasa con cada opción y cuándo conviene borrar (teléfono compartido).
- **Acciones** apiladas a 10 px y a lo ancho: **"Guardarlos y salir"** (botón principal con nube con flecha; es la opción segura y recibe el foco al abrir), **"Borrarlos y salir"** (botón destructivo con trazo rojo) y el botón-enlace centrado "Cancelar, seguir aquí". Las etiquetas las fijó el usuario y no cambian con el número de reportes. Mientras sale, todo se deshabilita y la opción elegida muestra spinner y gerundio ("Saliendo…", "Borrando…").

### Mapa (el plano real)
Cuando hay ubicación real, el mapa de OpenStreetMap ocupa el lugar del plano dibujado. Marco de 2 px línea fuerte, esquinas de 10 px, fondo verde aviso mientras cargan las teselas, 300 px de alto (360 px en escritorio); en solo lectura (detalle) 220 px (260 px en escritorio) sin arrastre ni zoom.
- **Pin:** 40 × 50 px, fijo en el centro del marco y sin eventos; se arrastra el mapa debajo, y el zoom es siempre alrededor del centro. En el mapa de ubicación del reporte (formulario y detalle) es el único pin: no hay marcadores de Leaflet. El mapa general no usa pines sino chapas (ver "Mapa general"). Dos estados:
  - **Fantasma** (aún no hay punto elegido): papel al 75 %, contorno discontinuo de 3 px en tinta suave, punto central solo en contorno y sin sombra. Sin ámbar: no promete una ubicación registrada.
  - **Clavado** (hay punto, por GPS, por mover el mapa o por aceptarlo): pin ámbar con contorno de 2 px en ámbar hondo, punto de papel y sombra.
- **Aceptar el centro:** sin punto, un botón-enlace "El problema está aquí: usar este punto" bajo el mapa fija el centro actual; desaparece en cuanto hay punto.
- **Precisión:** tras "Usar mi ubicación", círculo verde plano (trazo 2 px, relleno 12 %) con el radio del GPS.
- **Estado:** debajo, una línea en small tinta suave con `aria-live="polite"` que dice de dónde viene el punto ("Ubicación del GPS, precisión de ±15 m…" / "Punto ajustado a mano: …").
- **Controles:** zoom de 44 × 44 en tinta, con los iconos dibujados de la familia (más / menos) y títulos "Acercar" / "Alejar"; solo en el mapa interactivo; atribución en superficie al 90 % con enlace verde plano 600; foco del mapa con anillo de 3 px en tinta hacia dentro (-5 px).
- Si el permiso se niega, aviso info y el mapa sigue funcionando a mano.

### Detalle de reporte
Columna de bloques a 20 px: fila de estado (pastilla más "Tu reporte" en 0.875rem 650 tinta suave), el voto justo debajo (ver "Botón de voto"), foto en marco de 2 px línea fuerte (`contain`, hasta 60dvh), descripción a 48ch respetando saltos de línea, lista de datos, mapa de solo lectura y, al final, la línea de tiempo "Seguimiento" (ver "Línea de tiempo").
- **Aviso de oculto para el autor:** si un administrador lo ocultó, el voto se sustituye por un aviso info (borde de 2 px verde plano, verde aviso, ojo tachado de 20 px, `role="note"`): "Oculto: no aparece en el mapa ni en las listas." en 700 y una línea de ayuda que remite al seguimiento por si le dejaron nota. No es error ni lleva el motivo interno.

### El plano (componente firma)
Banda o columna verde que se dibuja con un patrón de manzanas y calles de 400 × 300 px repetido a escala fija (conserva densidad a cualquier tamaño), una avenida curva que se estira sin engordar el trazo, dos puntos tenues y un pin ámbar con punto de papel. Es decorativo (`aria-hidden`). Al cargar, el pin baja 14 px y se asienta (700 ms, `cubic-bezier(0.16, 1, 0.3, 1)`) mientras su sombra crece; sin movimiento con `prefers-reduced-motion`. Tamaño del pin: 56 × 70 en la banda de entrada, 84 × 105 en la columna de escritorio, 44 × 55 (64 × 80 en escritorio) en la versión compacta de la portada. La marca (logo de 36 px con anillo de papel al 35 % y "SpotIt") va arriba a la izquierda sobre el plano.

### Lista de datos
Filas separadas por líneas de 1 px, 14 px de padding vertical; término en 0.875rem 650 tinta suave, valor en cuerpo con `overflow-wrap: anywhere`.

### Mapa general
El plano real ocupando una región entera: bajo la franja, el título display y la fila de controles, el mapa llena todo el alto que queda (`100dvh` en columna). En móvil va a sangre, solo con borde superior de 2 px línea fuerte y sin esquinas; desde 900 px se enmarca (2 px, 10 px de esquinas) con 32 px de margen.
- **Chapa de un reporte:** botón real de 44 × 44 con un disco de 36 px (borde de 2.5 px, anillo de superficie de 2 px y apoyo de sombra) y el icono de su estado a 20 px. **Recibido:** superficie con borde y bandeja en tinta. **En proceso:** verde plano con borde verde hondo y llave en tinta de plano. **Resuelto:** verde hecho claro con borde y check en verde hecho. El estado se lee por relleno, borde e icono; la etiqueta accesible dice categoría, estado y votos ("Alumbrado, recibido, 1 voto").
- **Votos en la chapa:** con al menos un voto, un contador de tinta con número en superficie (800, 0.75rem, cifras tabulares), 20 px de alto, esquinas de 6 px y anillo de superficie, arriba a la derecha del disco. Es `aria-hidden`: el número ya va en la etiqueta.
- **Mancha:** varios reportes cercanos según el zoom; círculo verde hondo con anillo de superficie de 3 px, número en tinta de plano 800. Tres tamaños por cantidad: 44 px (menos de 10), 48 px (menos de 100) y 54 px. Tocarla acerca hasta separarla (vuelo de 0.35 s, salto directo con movimiento reducido); si ni al zoom máximo se separa, abre la hoja "N reportes en este lugar".
- **Hover y selección:** hover escala el disco a 1.08 (la mancha a 1.06) en 120 ms. La chapa elegida escala a 1.14 y suma el anillo ámbar de 3 px por fuera del anillo de superficie, con `aria-current` y encima de las demás; elegir un punto acerca o desplaza el mapa hasta que su chapa se ve sola. Si comparte el lugar exacto con otros y ningún zoom la separa, la mancha que la contiene lleva el mismo anillo ámbar (por fuera de su anillo de superficie) y su etiqueta dice "incluido el que tienes abierto".
- **Sin chapas cortadas:** una chapa o mancha a menos de 22 px del borde, o bajo un control flotante (zoom, "Leyenda", avisos), no se dibuja; reaparece al mover el mapa. Se recalcula al mover y al cambiar el tamaño del mapa. La elegida es la excepción: nunca se omite, y si al abrir la hoja queda cerca del borde o bajo un control, el mapa se centra en ella.
- **Controles de zoom:** los de todo mapa interactivo: 44 × 44, superficie con iconos dibujados en tinta, borde de 2 px línea fuerte, esquinas de 10 px, divisor de 1 px entre ambos y verde aviso en hover.
- **Avisos sobre el mapa:** caja de superficie con borde de 2 px en tinta, esquinas de 10 px, 10 × 16 px, centrada arriba en escritorio y abajo (sobre la atribución) en móvil. Vacío: "Aún no hay reportes en el mapa." con "Haz el primer reporte"; vacío por filtros: "No hay reportes con estos filtros." con "Quitar filtros". La variante quieta (borde línea fuerte, 0.9375rem 600) lleva el spinner de "Cargando reportes…" o avisa que solo se ven los más recientes. Mientras llegan otros filtros se siguen viendo los puntos anteriores.
- **Error:** aviso de error de formulario encima del mapa, con nube tachada sin red y el botón-enlace "Reintentar".

### Filtros del mapa
Se despliegan en línea bajo la barra de controles, nunca en un modal, y dejan al mapa al menos la mitad del alto (máximo 50dvh en móvil, 40dvh en escritorio, con scroll propio).
- **Botón "Filtros":** superficie con trazo interior de 2 px línea fuerte, icono de filtros de 20 px y texto en 650, 44 px de alto, `aria-expanded`. Con filtros activos pasa a verde aviso con trazo verde plano y texto verde hondo, y suma un contador verde plano (800, 0.875rem, 24 px, esquinas de 6 px) con texto oculto "activos".
- **Grupos:** "Estado" y "Tipo de problema" en estilo de etiqueta, opciones en fila que se envuelven a 8 px, grupos a 20 px.
- **Chip de filtro:** botón con `aria-pressed`, 44 px de alto, borde de 2 px línea fuerte, esquinas de 10 px, superficie, texto 1rem en tinta. Los de estado llevan la chapa de su estado a 28 px; los de categoría, su icono a 20 px en verde plano. Marcado: borde verde plano, fondo verde aviso, texto 650 y check de 18 px al final; la señal es triple, como en las opciones.
- **Pie fijo:** pegado al fondo del panel sobre papel con línea de 1 px arriba: resumen de lo marcado ("Marcaste: …" o "Sin filtros ves todos los reportes.") en small tinta suave, "Quitar filtros" como botón-enlace y un botón secundario que cierra el panel con el total ("Ver 12 reportes") y devuelve el foco a "Filtros".

### Conmutador Mapa | Lista
Grupo de dos botones con `aria-pressed` (`role="group"`, "Ver como") dentro de una caja de superficie con trazo interior de 2 px línea fuerte, 2 px de padding y esquinas de 10 px. Cada segmento: 44 px, icono de 20 px más texto en 650, tinta suave (tinta en hover), esquinas de 8 px; el elegido es verde plano con tinta de plano. En móvil va a la derecha de "Filtros"; en escritorio, junto a él a 16 px. La vista, los filtros y el reporte elegido viven en la URL sin apilar historial.

### Hoja del reporte
Lo esencial de un reporte y el voto, sin salir del mapa.
- **Móvil:** la hoja no flota sobre el mapa: comparte el alto con él (el mapa se encoge arriba, mínimo 140 px) y así ningún punto queda tapado. Papel con borde superior de 2 px línea fuerte, esquinas de 14 px arriba, sombra de la hoja, hasta 62 % del alto con scroll propio, padding de 12 × 20 px más el área segura; entra subiendo 24 px en 180 ms (sin animación con movimiento reducido).
- **Escritorio:** columna de 380 px a la derecha del mapa, a 28 px, sin borde, fondo ni sombra: es papel. Sin reporte elegido, la columna muestra la leyenda.
- **Contenido** a 14 px: cabecera con la categoría en headline (foco al abrir) y cerrar de 44 × 44 (equis de 22 px, verde aviso en hover); resumen con miniatura de 72 × 72 (esquinas de 10 px) junto a la pastilla de estado, el tiempo relativo y la descripción cortada a tres líneas; el voto; y el botón secundario a lo ancho "Ver el reporte completo" con chevron, que vuelve al mapa con filtros y selección.
- **Estados:** carga con esqueleto de miniatura y dos líneas; error con aviso y "Reintentar" ("Este reporte ya no existe." sin reintento). Escape cierra y el foco vuelve a la chapa.

### Hoja "N reportes en este lugar"
Misma hoja, con el título "4 reportes en este lugar" y la lista del mapa ordenada por más votados; cerrar con "Cerrar la lista" y Escape. Solo aparece cuando el zoom ya no puede separar los reportes.

### Leyenda
"Cómo leer el mapa" (headline): una fila por estado con su chapa a tamaño real, la mancha a 32 px con "Varios reportes juntos: tócalo para acercarte" y una línea en tinta suave ("Toca un punto para ver el reporte y votarlo."). En escritorio ocupa la columna de la hoja mientras no hay reporte elegido. En móvil se abre como hoja desde el botón "Leyenda" sobre el mapa, arriba a la derecha: superficie, borde de 2 px línea fuerte, esquinas de 10 px, icono de información de 20 px y texto 650, 44 px, `aria-expanded`.

### Lista del mapa
La alternativa al mapa, con los mismos filtros. Encabezado "Más votados primero" (650, tinta suave). Filas de 64 px como mínimo separadas por líneas de 1 px: icono de categoría de 22 px en círculo verde aviso de 44 px, título (categoría) en 650, metadatos con la pastilla de estado y "Aún sin votos / 1 voto / N votos" en 0.875rem tinta suave, y chevron. Hover: título en verde hondo con subrayado ámbar. Muestra 30 y suma de 30 en 30 con el botón secundario "Mostrar más (N restantes)". Carga con cuatro filas esqueleto; vacío con headline y "Quitar filtros" si hay filtros. Tocar una fila abre la hoja del reporte. En escritorio la lista mide hasta 640 px.

### Botón de voto
Un toque para priorizar; el conteo cambia al instante.
- **Botón:** nombre fijo "Votar" y `aria-pressed`: el lector anuncia el estado sin que cambie la etiqueta. 52 px de alto, padding de 16 × 20 px, esquinas de 10 px, texto 700 a 1.0625rem e icono de 20 px.
- **Sin votar:** superficie con trazo interior de 2 px verde plano, texto verde plano e icono de voto; hover verde aviso con texto verde hondo.
- **Votado:** relleno verde plano con tinta de plano y check en lugar del icono de voto (hover verde hondo); la señal es relleno, icono y texto del conteo, no solo color. Al presionar, `scale(0.98)`.
- **Conteo:** a la derecha (debajo si no cabe), 650 con cifras tabulares y `aria-live="polite"`: "Aún sin votos", "1 voto", "7 votos, incluido el tuyo". El botón lo enlaza con `aria-describedby` junto con la ayuda.
- **Ayuda:** small tinta suave debajo: "Vota si también te afecta: ayuda a decidir qué se atiende primero." / "Vuelve a tocar para quitar tu voto."
- **Pendiente y error:** mientras se guarda, `aria-disabled` y cursor `progress` (un toque a la vez). Si el servidor no lo guarda, el voto vuelve a su estado anterior y aparece debajo un error en rojo 600 con icono de alerta y `role="alert"`.
- **Solo lectura:** sin botón, icono de voto y conteo en una línea, en tinta suave con el conteo en tinta: el propio reporte ("Tu reporte · 3 votos") y el resuelto ("2 votos · ya está resuelto, la votación se cerró").
- Va en el detalle, bajo la fila de estado, y en la hoja del mapa; el conteo confirmado se refleja en la chapa y en la lista.

### Línea de tiempo
Cada cambio del reporte, lo más reciente arriba, como lista ordenada sobre el papel (sin caja).
- **Forma:** cada evento con 26 px de sangría y 18 px hasta el siguiente; un punto de 12 px (borde de 2 px verde plano, relleno de papel; el más reciente relleno de verde plano) unido al siguiente por una línea de 2 px en color línea. Al ocultar o volver a mostrar, el punto es discontinuo en tinta.
- **Cabecera:** qué pasó en 650 ("Pasó a «En proceso»", "Se ocultó", "Se volvió a mostrar"; una nota sin cambio de estado es "Nota del equipo" para el ciudadano y "Nota al autor" en el panel, con el punto normal y la nota pública debajo) y la fecha completa en 0.875rem tinta suave. El primer evento es el envío ("Lo enviaste" / "Se envió" para el ciudadano; "Lo envió el ciudadano" en el panel).
- **Nota pública:** caja sin borde en verde aviso, esquinas de 10 px, 8 × 12 px, hasta 60ch, `overflow-wrap: anywhere`.
- **Historial (panel):** título "Historial" tras una línea de 2 px línea fuerte, a lo ancho bajo las dos columnas. Añade "Por <nombre>" (o "Por una cuenta eliminada") en 0.875rem tinta suave, la nota con la etiqueta "Nota pública:" en 650, y el **motivo interno** en una caja con borde discontinuo de 2 px línea fuerte sobre superficie con la etiqueta "Motivo interno:".
- **Seguimiento (ciudadano):** misma línea, al final del detalle, con título "Seguimiento". Nunca dice quién hizo el cambio ni el motivo interno; la nota pública va sin etiqueta.

### Panel: marco y conmutador
Franja verde con "Inicio", display "Panel" y, debajo (a 16 px), el conmutador **Resumen | Reportes**: la misma caja del conmutador Mapa | Lista (superficie, trazo interior de 2 px línea fuerte, segmentos de 44 px a 8 px de esquina, 650 tinta suave), con icono de 20 px en ambos segmentos (gráfica y lista). Son enlaces de navegación, no botones: la sección actual se marca con `aria-current="page"` y se pinta verde plano con tinta de plano. El conmutador no aparece en el detalle, que en su lugar lleva el enlace "← Reportes" (verde plano 650, subrayado de 2 px, 44 px) de vuelta a la lista con sus filtros.

### Resumen del panel
Conteos que se leen como barra y tabla, nunca como tarjetas de métricas.
- **Estado general:** cabecera de sección con el total ("916 reportes") y a la derecha "N nuevos en los últimos 7 días" en small tinta suave. Debajo, una **barra proporcional** de 20 px: un tramo por estado con su tratamiento (ver Colors), mínimo 12 px, `aria-hidden`.
- **Leyenda enlazada:** la que da la información real (la barra nunca va sola): rejilla `auto-fit` de 200 px mínimo con línea arriba y bajo cada celda; cada celda es un enlace de 56 px con la pastilla del estado (o "Ocultos"), la cifra de conteo a la derecha y un chevron de 18 px en tinta suave; hover tinta al 4 %. Lleva a la lista ya filtrada (los estados, solo visibles).
- **Por tipo de problema:** tabla real (`caption` y cabeceras ocultas) con filas de 48 px separadas por líneas de 1 px: el icono de categoría de 20 px en verde plano y el nombre como enlace (hover verde hondo con subrayado ámbar), una barra de 8 px (fondo línea, relleno verde plano, proporcional al mayor, `aria-hidden`) y el número en 700 con cifras tabulares.
- **Más votados:** lista ordenada de filas enlazadas (12 × 10 px, líneas de 1 px): contador de votos en cápsula de tinta con número en papel (700, 0.875rem, icono de voto de 16 px, mínimo 52 px), categoría en 650 con la descripción en una línea cortada, y la pastilla de estado a la derecha (bajo 600 px baja bajo el título). Al final el botón-enlace "Ver todos por votos". Sin votos: una línea en tinta suave.
- **Estados:** carga con esqueleto de barra y dos líneas; error con aviso y "Reintentar"; sin ningún reporte, vacío con headline "Aún no hay reportes".

### Lista del panel
- **Barra:** búsqueda en la descripción (`role="search"`, campo con etiqueta oculta y botón secundario "Buscar") y, en móvil, el botón "Filtros" del mapa con su contador.
- **Filtros:** los chips del mapa en grupos "Estado" (con la chapa del estado), "Visibilidad" (Todos, Visibles con ojo, Ocultos con ojo tachado) y "Tipo de problema", más campos de 48 px: "Enviado desde", "Hasta", "Votos mínimos" y "Ordenar por". En escritorio son una columna fija de 280 px sobre el papel, siempre a la vista, con solo "Quitar filtros" al pie. En móvil se pliegan bajo la barra en una caja de superficie con borde de 2 px línea fuerte y 16 px de padding, hasta 50dvh con scroll propio, y un pie fijo con "N filtros activos.", "Quitar filtros" y el botón secundario "Ver N reportes", que cierra y devuelve el foco a "Filtros". Los filtros viven en la URL.
- **Tabla:** sobre el papel, sin tarjeta. Cabecera con línea de 2 px línea fuerte (0.875rem 650 tinta suave); filas con línea de 1 px y 12 × 10 px. Columnas en escritorio: reporte (miniatura de 56 px a 10 px de esquina, categoría como enlace en 650, descripción cortada a dos líneas en small tinta suave, y la pastilla "Oculto" si aplica), estado, votos (650, cifras tabulares, a la derecha) y fecha. En móvil una sola columna: estado, votos y tiempo relativo viajan en los metadatos de la fila. **Toda la fila es el enlace** (el `::after` del título cubre la fila): hover tinta al 4 % con subrayado ámbar en el título y foco de 3 px en tinta por dentro de la fila. Sin datos personales del autor.
- **Paginación:** botones secundarios "Anterior" y "Siguiente" a los lados y "Página N de M" en el centro con cifras tabulares; 25 por página. Mientras llega otra página, spinner y "Actualizando…" junto al conteo, sin vaciar la tabla.
- **Vacío:** "Nada coincide con «…»" cuando hay búsqueda, "Ningún reporte con estos filtros" con filtros (1.25rem 750), una línea a 44ch y el botón-enlace "Quitar búsqueda y filtros" / "Quitar filtros". Carga con cuatro filas esqueleto; error con aviso y "Reintentar".

### Detalle del panel
- **Cabecera:** título del detalle con el número, y en una línea la pastilla de estado, la de "Oculto" si aplica y "N votos" con icono en 650 tinta suave. Tras cada acción, la nota de éxito ("Estado cambiado a «En proceso». El ciudadano verá tu nota.") recibe el foco.
- **Reporte (izquierda):** foto, descripción, lista de datos y mapa de solo lectura, igual que el detalle del ciudadano.
- **Acciones (columna de 380 px):** secciones separadas por línea de 1 px y 20 px de padding, con título de sección de acciones.
  - **Cambiar estado:** `fieldset` con la leyenda "Pasar de «Recibido» a" y solo las transiciones válidas como opciones: radio nativo invisible dentro de una fila de 56 px (borde de 2 px línea fuerte, superficie, 10 px de esquina) con la pastilla del estado destino ("reabrir" en small tinta suave si viene de resuelto). Elegida: borde verde plano, verde aviso, peso 650 y check de 18 px; foco con anillo de 3 px en tinta. Debajo, la **nota pública** (área de texto con la ayuda "La verá el ciudadano en su reporte." y un contador que pasa a "Te quedan N caracteres." bajo 100) y el botón principal "Cambiar estado" ("Guardando…").
  - **Dejar una nota:** entre "Cambiar estado" y "Quién lo envió" (ver "Dejar una nota").
  - **Aviso 409:** si otra persona lo cambió mientras tanto, aviso de error arriba de la sección con el mensaje del servidor y "Ya ves el estado actual."; el reporte se recarga y la nota escrita se conserva.
  - **Quién lo envió:** solo nombre (650) y email como enlace `mailto:` de 44 px con asunto "Tu reporte #N en SpotIt". Si la cuenta ya no existe, una línea en tinta suave.
  - **Moderación:** en reposo, una línea de ayuda y el botón destructivo "Ocultar reporte…" (ojo tachado). Al abrir, **confirmación en línea**: caja con borde de 2 px rojo error sobre rosa error que explica qué pasa (deja de verse, la foto solo para administradores, el autor lo ve oculto sin el motivo, no se borra nada), el campo **"Motivo (interno)"** obligatorio con la ayuda "Obligatorio. Solo lo ven los administradores." (recibe el foco; error de campo si falta), la nota pública opcional para el autor, y el botón destructivo "Ocultar reporte" ("Ocultando…") con el botón-enlace "Cancelar" (devuelve el foco). Oculto, la sección muestra la **caja de oculto**: borde discontinuo de 2 px en tinta, superficie, 12 × 14 px, ojo tachado de 20 px con "Oculto por <nombre> el <fecha>." en 650 y "Motivo interno:" con el texto; debajo, la nota pública opcional y el botón secundario a lo ancho "Volver a mostrar" (ojo).
- **Historial:** a lo ancho debajo (ver "Línea de tiempo").
- **Estados:** carga con spinner y "Cargando el reporte…"; error con aviso y "Reintentar" ("Este reporte no existe." sin reintento).

### Ajuste de avisos ("Avisos en este teléfono")
Un ajuste por dispositivo, siempre a la vista en la portada del ciudadano, justo bajo la lista de la Cuenta. No es tarjeta: es una fila más del papel.
- **Forma:** 16 px de padding vertical entre líneas de 1 px (bajo la Cuenta pierde la línea de arriba y sube 1 px para no doblarla). Rejilla de tres columnas a 12 px, centradas en vertical: icono en círculo de 44 px verde aviso con la campana de 22 px en verde plano (campana tachada si no están activos), la columna de texto y, a la derecha, el interruptor.
- **Texto:** título "Avisos en este teléfono" (`h2`, 650 a 1rem) y debajo una ayuda en small tinta suave que cambia con el estado y dice qué pasa o qué hacer. Los enlaces y mensajes van dentro de esta columna, alineados con el título.
- **Mensaje de resultado:** bajo la ayuda, a 4 px, small 600 con icono de 18 px. Hecho: texto en tinta con check en verde hecho ("Avisos activados en este teléfono." / "Avisos desactivados…"). Error: el lenguaje del error de campo (rojo error 600, icono de alerta) con `role="alert"`. El cambio se anuncia además en la región viva global.
- **Estados:**
  - **Apagado** (listo, sin suscripción): campana tachada, interruptor en "No", "Actívalos para saber cuándo cambia el estado de tus reportes."
  - **Activo:** campana, interruptor en "Sí", "Te avisamos aquí cuando cambie el estado de tus reportes o te dejen una nota."
  - **Bloqueado:** sin interruptor; la ayuda explica que están bloqueados y cómo permitirlos en la configuración del navegador. El ajuste se vuelve a revisar al volver a la pestaña, al volver la señal y al cambiar el permiso, sin recargar.
  - **iPhone sin instalar:** sin interruptor; "En iPhone los avisos solo funcionan con SpotIt en la pantalla de inicio." y el botón-enlace "Cómo instalarla" hacia la guía.
  - **iOS anterior a 16.4**, **sin soporte** y **sin conexión** ("podrás cambiar los avisos cuando vuelva la señal"): sin interruptor, solo la ayuda.
  - Mientras se revisa, o si el servidor no tiene los avisos encendidos, el ajuste no se dibuja.

### Interruptor
`button` con `role="switch"` y `aria-checked`, nombrado por el título del ajuste y descrito por su ayuda.
- **Forma:** 44 px táctiles como mínimo; pista en cápsula de 52 × 32 y perilla circular de 24 px a 4 px del borde, más el texto "Sí" / "No" (650, tinta, `aria-hidden`) a 8 px.
- **Apagado:** pista de superficie con trazo interior de 2 px línea fuerte, perilla en tinta suave a la izquierda. **Encendido:** pista verde plano sin trazo, perilla en tinta de plano desplazada 20 px. La señal es triple: posición, relleno y texto.
- **Trabajando:** `aria-disabled` y `aria-busy` (no `disabled`: el foco se queda en el control), cursor `progress` y spinner de 14 px dentro de la perilla.
- **Foco:** el anillo global (3 px en tinta, 3 px de separación) alrededor de la pista, no del botón entero.
- **Movimiento:** pista y perilla en 160 ms ease-out; sin transición con movimiento reducido.

### Oferta de avisos
Tras enviar un reporte, en Mis reportes, bajo la nota de éxito: el único momento en que se pide el permiso.
- **Forma:** el aviso informativo (borde de 2 px verde plano, verde aviso, esquinas de 10 px, 14 × 16 px) con la campana de 22 px en verde plano, título "¿Te avisamos cuando cambie de estado?" (`h2`, 700 a 1.0625rem) y una línea que dice qué llega y que se apagan en Inicio. 16 px bajo ella.
- **Acciones** a 20 px: botón secundario "Activar avisos" (campana; spinner y "Activando…" mientras pide el permiso, con `aria-disabled`) y el botón-enlace quieto "Ahora no".
- **Al activar:** la oferta se cambia por la nota de éxito "Avisos activados en este teléfono.", que recibe el foco. **Al cerrar con "Ahora no":** desaparece y el foco va al título de la pantalla. **Si el permiso queda bloqueado:** se quedan el texto y el mensaje de error, sin acciones.
- **Una sola vez por dispositivo:** solo si los avisos se pueden activar, no están activos y el permiso nunca se ha pedido; la respuesta se recuerda y no se vuelve a ofrecer. El ajuste de la portada sigue disponible.

### Guía de instalación
Pantalla interna "Instalar SpotIt" (vuelve a Inicio, o a Entrar sin sesión) con un apoyo que dice por qué instalarla. Bloques a 28 px, cada uno con la cabecera de sección de lista.
- **Pasos:** lista numerada (`ol` con `role="list"`) a 14 px; cada paso en rejilla de 32 px más texto a 12 px: número en círculo plano verde plano de 32 px con tinta de plano 700 y cifras tabulares (`aria-hidden`), y la instrucción en cuerpo con el nombre del botón en negrita y su icono de 20 px en verde plano en línea (compartir, más).
- **Orden:** en iOS primero "En iPhone o iPad (Safari)"; en lo demás primero "En Android o en la computadora".
- **Android / escritorio:** si el navegador ofrece instalar, botón principal a lo ancho "Instalar SpotIt" con el icono de más; si no, una línea que dice dónde está la opción en el menú. Nunca se asume que Safari lo ofrece.
- **Ya instalada:** solo la nota de éxito "Ya estás usando SpotIt instalada."

### Dejar una nota
Sección de las acciones del panel para escribir al autor sin cambiar el estado.
- **Forma:** título de sección "Dejar una nota", área de texto de tres líneas con la etiqueta "Nota pública, sin cambiar el estado", un ejemplo como placeholder y la ayuda "La verá el ciudadano en su reporte; su aviso solo dice «Tienes una nota nueva»." (más "Te quedan N caracteres." bajo 100).
- **Botón:** secundario a lo ancho "Dejar nota" con el globo de 20 px; spinner y "Enviando…" mientras envía.
- **Error:** vacía, "Escribe la nota." como error de campo y el foco vuelve al área; sin red, "Sin conexión: la nota no se envió. Inténtalo de nuevo." **Éxito:** la nota de éxito del detalle ("Nota enviada. El autor la verá en su reporte y recibirá un aviso si los tiene activos.") y el evento en el historial.

### Aviso del sistema
El aviso push que se ve en la pantalla de bloqueo. Sobrio: dice que algo cambió, no qué dice el reporte.
- **Título:** siempre "SpotIt". Icono de la app de 192 px y distintivo de 64 px; idioma es-MX.
- **Texto:** cambio de estado, "Tu reporte cambió a «En proceso»." (más " Tiene una nota nueva." si la lleva); nota sola, "Tienes una nota nueva en tu reporte."; reporte oculto, al ocultar o al volver a mostrar, el genérico "Hay novedades en tu reporte.", que también se usa si el contenido llega ilegible. Nunca la nota, la categoría ni la descripción.
- **Agrupación:** una etiqueta por reporte (`reporte-<id>`) con `renotify`: los avisos del mismo reporte se juntan y el nuevo vuelve a sonar.
- **Al tocarlo:** abre el reporte en SpotIt; solo rutas propias (si no, Mis reportes).
- Solo para el autor y nunca por un cambio que hizo él mismo.

## Do's and Don'ts

### Do:
- **Do** dar al plano una región entera (banda de ~30 % de alto en móvil, columna de 45 % en escritorio) en la entrada y la portada, y poner un solo pin ámbar en él; en pantallas internas, la franja verde de 64 px con "volver".
- **Do** fijar el pin al centro del mapa real y mover el mapa debajo; anunciar en texto de dónde viene el punto.
- **Do** mostrar cada estado de reporte como pastilla con icono y texto.
- **Do** dar a cada lista sus estados de carga (esqueleto con la forma real), vacío (qué hacer primero) y error (con "Reintentar").
- **Do** escribir formularios directo sobre el papel, con la etiqueta visible encima de cada campo de 56 px.
- **Do** acompañar cada error de icono y texto que diga cómo seguir, enlazado al campo con `aria-describedby` y `aria-invalid`.
- **Do** usar borde completo de 2 px para avisos y campos; 1 px solo para divisores.
- **Do** mantener toda zona táctil en 44 px como mínimo, también los enlaces del pie y el botón de mostrar contraseña.
- **Do** usar el anillo de foco global (3 px en tinta, 3 px de separación) y cambiarlo a tinta de plano o ámbar solo sobre fondos oscuros.
- **Do** mostrar el estado pendiente dentro del propio botón: spinner más la acción en gerundio.
- **Do** desactivar el asentamiento del pin y el pulso de estado con `prefers-reduced-motion`.
- **Do** mostrar cada reporte del mapa general como chapa de 44 px con relleno, borde e icono de su estado, y juntar los cercanos en una mancha verde hondo con su número.
- **Do** marcar la chapa elegida solo con el anillo ámbar y no dibujar chapas cortadas por el borde o tapadas por un control.
- **Do** desplegar los filtros en línea con el resultado en un pie fijo ("Ver N reportes") y dejar visible el mapa.
- **Do** hacer que la hoja del mapa en móvil comparta el alto con el mapa en lugar de taparlo.
- **Do** dar al voto `aria-pressed` con nombre fijo, conteo con `aria-live` y reversión con mensaje si falla.
- **Do** decir el estado de la conexión y de la cola en una sola franja bajo el verde, con una sola frase según la prioridad (enviando, sin conexión, con error, por enviar), y anunciar los cambios en una única región viva.
- **Do** tratar "sin conexión" como un estado esperado: tono info, decir de cuándo es lo que se ve y volver a pedir los datos solos al volver la señal.
- **Do** confirmar en línea lo que se borra del teléfono, con el foco en "Cancelar", y dejar la opción segura como principal en el diálogo de salida.
- **Do** mostrar cada reporte por enviar con la misma rejilla de la lista, sin enlace, con su pastilla y el motivo en palabras.
- **Do** leer los conteos del panel como barra proporcional con leyenda enlazada (pastilla, número y chevron) y tablas con barras sobre el papel.
- **Do** marcar lo oculto con borde discontinuo en tinta y ojo tachado, siempre junto a la pastilla de estado y nunca en su lugar.
- **Do** ofrecer solo las transiciones de estado válidas y, ante un conflicto (409), decirlo, recargar el reporte y conservar la nota escrita.
- **Do** pedir motivo obligatorio y confirmar en línea antes de ocultar, con la opción de volver a mostrar.
- **Do** hacer enlace toda la fila de la tabla del panel y marcar la sección actual del conmutador con `aria-current`.
- **Do** pedir el permiso de avisos solo tras una acción del usuario con sentido (enviar un reporte, o el interruptor de la portada), una sola vez, y recordar la respuesta.
- **Do** dar al interruptor `role="switch"` con triple señal (posición, relleno y "Sí"/"No") y mantener el foco en él mientras trabaja (`aria-disabled`, no `disabled`).
- **Do** decir en la ayuda del ajuste por qué no hay interruptor (bloqueado, iPhone sin instalar, iOS viejo, sin soporte, sin conexión) y qué hacer.
- **Do** llevar al iPhone sin instalar a la guía con pasos numerados, primero los de iOS en iOS.

### Don't:
- **Don't** poner el formulario en una tarjeta blanca centrada sobre fondo gris con el logo encima.
- **Don't** usar el ámbar para botones, fondos o texto de interfaz.
- **Don't** indicar un error o un requisito solo con color.
- **Don't** usar texto de campo por debajo de 16 px.
- **Don't** añadir modo oscuro ni fondos oscuros a pantalla completa.
- **Don't** usar iconos de otra familia o glifos tipográficos en lugar de los iconos dibujados.
- **Don't** usar marcadores arrastrables de mapa ni un asistente de varios pasos con barra de progreso para reportar.
- **Don't** hacer que el aviso 911 se pueda cerrar u ocultar.
- **Don't** rellenar chapas de ámbar ni usarlo para distinguir un estado en el mapa.
- **Don't** distinguir estados solo por color: chapas, chips de filtro y pastillas llevan siempre el icono del estado.
- **Don't** usar los marcadores azules de Leaflet ni pines por reporte en el mapa general.
- **Don't** poner los filtros del mapa en un modal ni cambiar la etiqueta del voto según su estado.
- **Don't** pintar "sin conexión" como error ni ofrecer "Reintentar" en algo que solo espera la señal o su turno: "Reintentar" es solo para lo que falló.
- **Don't** ofrecer forzar el envío ("Enviar ahora") mientras un reporte espera el límite por hora: solo traería otro rechazo.
- **Don't** rellenar de rojo una acción destructiva: trazo rojo de 2 px sobre superficie, nunca un botón rojo sólido.
- **Don't** convertir la franja de estado en región viva ni repetir su anuncio en cada pantalla.
- **Don't** hacer el resumen con tarjetas de métricas de números grandes, ni dejar la barra de estados sin su leyenda: el color nunca es la única señal.
- **Don't** mostrar al ciudadano el motivo interno ni quién hizo un cambio: el seguimiento lleva solo qué pasó, cuándo y la nota pública.
- **Don't** mostrar datos del autor fuera del detalle del panel, ni más que nombre y email; la lista y el resumen no llevan datos personales.
- **Don't** entregar la foto de un reporte oculto fuera del panel: al autor se le muestra la miniatura de sustitución.
- **Don't** pintar lo oculto de rojo o de ámbar: no es error ni selección.
- **Don't** pedir el permiso de avisos al abrir la app ni al cargar una pantalla.
- **Don't** volver a pedir el permiso si está bloqueado ni mostrar un interruptor que no puede funcionar: se explica cómo permitirlo en el navegador.
- **Don't** poner en el aviso de la pantalla de bloqueo la nota, la categoría, la descripción ni nada de un reporte oculto.
- **Don't** asumir que el navegador ofrece instalar: el botón "Instalar SpotIt" solo aparece si existe el evento.
