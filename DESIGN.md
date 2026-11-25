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
- Formulario directo sobre papel, sin tarjeta, con etiquetas encima del campo.
- Bordes de 2 px para todo lo que se toca o avisa; el color nunca es la única señal.
- Movimiento mínimo: el pin se asienta una vez y la interfaz responde en 120 ms.

## Colors

Dos materias, verde de plano y papel cálido, con un único acento ámbar y un rojo reservado para errores.

### Primary
- **Verde Plano** (field): el campo de la banda y la columna, el botón principal, los enlaces, el borde del campo con foco y el borde de los avisos informativos. También es `caret-color` y `accent-color` del documento.
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
- **Rojo Error** (error) sobre **Rosa Error** (error-tint): borde y relleno del campo inválido, texto e icono del error, borde y fondo del aviso de error.
- **Verde Aviso** (info-tint): fondo de avisos informativos (sin conexión), de la opción elegida, de la pastilla "en proceso", de la fila recién creada, del hover del botón secundario, del círculo de icono de las acciones de la portada y fondo del mapa mientras cargan las teselas.

El círculo de precisión del GPS sobre el mapa usa verde plano: trazo de 2 px y relleno al 12 %.

### Named Rules
**The Un Solo Pin Rule.** El ámbar aparece como el pin del plano (dibujado o real) y en detalles de respuesta (hover de enlace, selección, foco sobre oscuro). No se usa para botones, fondos, estados ni texto.

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
- **Body** (400, 17px, 1.5): texto corrido; apoyo bajo el título a 36ch, párrafos de sección a 48ch.
- **Label** (650, 17px): etiquetas de campo, en tinta, siempre visibles encima del control.
- **Small** (0.9375rem, 1.4): ayudas, errores en línea (600), estado de la ubicación, descripción de filas y acciones; los términos de lista de datos, las pastillas de estado (650) y los metadatos de fila van a 0.875rem.

### Named Rules
**The Nada Bajo 16 Rule.** El texto de los campos es 1.0625rem (17 px): por encima de 16 px para que iOS no haga zoom. Ningún control de entrada baja de ahí.

## Layout

Mobile-first, una columna. En móvil la pantalla se parte en dos filas: la banda del plano arriba (`clamp(200px, 30dvh, 260px)` en la entrada; altura por contenido en la portada) y el papel debajo. A partir de **900 px** la entrada pasa a dos columnas: el plano a la izquierda (`minmax(380px, 45%)`, a toda altura) y el formulario centrado verticalmente a la derecha.

Medidas máximas: formulario de entrada 420 px (400 px en escritorio); contenido de la portada 560 px, centrado. Márgenes laterales de 24 px en la entrada y 20 px en la portada en móvil, 48 px en escritorio, siempre sumados a `env(safe-area-inset-*)`. Las alturas usan `100dvh`.

**Pantallas internas** (nuevo reporte, mis reportes, detalle): franja verde de 64 px (más `safe-area-inset-top`) arriba, a todo lo ancho; debajo, una sola columna de 560 px centrada con márgenes de 20 px, título display a 24 px de la franja (40 px en escritorio) y bloques a 24 px entre sí. Igual en móvil y escritorio: la columna no se parte en dos.

Ritmo: 8 px entre etiqueta y campo, 20 px entre campos, 24 px del título al formulario y entre bloques de la portada, 28 px antes del pie del formulario (con 20 px más tras su divisor). En formularios largos de secciones (el reporte) las secciones se separan 32 px. Las opciones de categoría se apilan a 8 px en una sola columna en todos los tamaños; los dos botones de foto van apilados a 10 px bajo 480 px y lado a lado desde 480 px.

## Elevation & Depth

Plano por defecto. La profundidad viene de las dos materias (verde contra papel), de las manzanas en verde hondo al 55 % y de bordes de 2 px, no de capas flotantes. Las sombras son pocas y con un rol concreto.

### Shadow Vocabulary
- **Sombra del pin** (`filter: drop-shadow(0 6px 8px rgb(5 30 26 / 0.35))` más una elipse en el suelo; `0 4px 6px` en el pin de 40 × 50 del mapa real): el pin está clavado en el plano. Es la única sombra con presencia.
- **Apoyo del botón principal** (`box-shadow: 0 1px 3px rgb(5 30 26 / 0.25)`): un apoyo mínimo, no una elevación.
- **Aviso flotante** (`box-shadow: 0 12px 32px rgb(27 36 33 / 0.25)`): solo el aviso de actualización, que sí flota sobre el contenido.

### Named Rules
**The Papel Sin Tarjeta Rule.** El contenido se escribe sobre el papel; no se envuelve en tarjetas blancas con sombra. Los grupos se separan con espacio o con una línea de 1 px.

## Shapes

Esquinas suaves en dos pasos: **10 px** para campos, avisos, botones secundarios, opciones, mapa, fotos y miniaturas, y **14 px** para el botón principal y las acciones grandes de la portada. La única forma de cápsula (999 px) es la pastilla de estado; los círculos se reservan para el fondo de los iconos de opción (36 px) y de acción (44 px). El icono de la app usa la misma familia (112/512 de radio). Bordes de **2 px** en todo lo que se toca o avisa (campos, avisos, pastilla sin conexión); **1 px** solo para divisores. Los botones sobre el plano usan un trazo interior de 1.5 px en lugar de borde.

Iconos: una sola familia dibujada a mano, caja de 24, trazo de 2 px, puntas y uniones redondeadas, `currentColor`, siempre `aria-hidden`. El pin del plano es la misma silueta que el logo. La familia incluye un icono por categoría de reporte (bache, alumbrado, agua, basura, áreas verdes, banqueta, señal, edificio, otro) y uno por estado (bandeja para recibido, llave para en proceso, check para resuelto); una categoría desconocida usa el de "otro".

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
- **Info:** verde plano sobre verde aviso, `role="status"` (sin conexión, con icono de nube tachada).
- **Pastilla sin conexión** de la portada: mismo lenguaje que el aviso info (borde 2 px verde, fondo verde aviso, icono nube tachada).
- **Nota de éxito:** mismo lenguaje en verde hecho: borde de 2 px verde hecho, fondo verde hecho claro, check de 20 px, texto 600, 12 × 14 px, `role="status"` ("Recibimos tu reporte…").

### Navegación de pantallas internas (franja del plano)
Franja verde plano a todo lo ancho, 64 px más el área segura, padding lateral de 12 px (32 px en escritorio). A la izquierda "volver": flecha de 20 px más el destino ("Inicio"), 44 px, mismo tratamiento que el botón sobre el plano (papel al 14 %, trazo interior de 1.5 px al 50 %, 650). A la derecha la marca (logo de 28 px y "SpotIt" en 700), decorativa. La franja no lleva manzanas ni pin: es la misma materia, no otra ilustración.

### Acciones de la portada
Enlaces grandes apilados a 12 px: 76 px de alto, borde de 2 px, esquinas de 14 px, padding de 14 × 16 px; icono en círculo de 44 px, título (700, 1.125rem) con una línea de apoyo (small, tinta suave) y chevron a la derecha. La principal ("Nuevo reporte") es verde plano con tinta de plano, círculo de papel al 16 % y apoyo en tinta de plano suave; hover verde hondo. La secundaria es superficie con borde línea fuerte (tinta suave en hover) y círculo verde aviso. Al presionar, `scale(0.99)`.

### Pastilla de estado
Cápsula con icono de 16 px y texto (650, 0.875rem), borde de 2 px, padding 3 × 10 px, texto oculto "Estado:" para lectores. **Recibido:** borde línea fuerte, superficie, tinta (bandeja). **En proceso:** borde verde plano, verde aviso, texto verde hondo (llave). **Resuelto:** borde verde hecho, verde hecho claro, texto verde hecho (check). Nunca color solo; nunca ámbar.

### Lista de reportes
- **Fila:** enlace a todo lo ancho, rejilla de miniatura 72 × 72 (esquinas 10 px, `cover`), cuerpo y chevron de 20 px; padding de 14 × 10 px y 14 px de separación; desde 480 px la lista sale 10 px a cada lado (margen negativo) para que la miniatura quede alineada con el título de la página; por debajo de 480 px no sale, para que el fondo de la fila nueva no toque el borde de la pantalla. Filas separadas por líneas de 1 px (línea arriba de la lista y bajo cada fila). Título (categoría) en 650, descripción en small tinta suave cortada a dos líneas, y metadatos con la pastilla de estado y el tiempo relativo. Hover: tinta al 4 %.
- **Recién creada:** la fila que acaba de enviarse solo cambia su fondo a verde aviso (sin mover nada), acompañada de la nota de éxito arriba.
- **Cabecera:** conteo ("3 reportes", 650 tinta suave) a la izquierda y botón secundario "Nuevo" a la derecha.
- **Carga:** tres filas esqueleto con la misma rejilla (miniatura y dos líneas de 14 px al 70 % y 45 %) en color línea, esquinas de 10 px, con pulso de 1.4 s; el anuncio real va en un `role="status"` oculto y la lista esqueleto es `aria-hidden`.
- **Vacío:** headline ("Aún no tienes reportes"), una línea en tinta suave a 44ch con ejemplos concretos y el botón principal a lo ancho hacia el primer reporte.
- **Error:** aviso de error con el motivo y el botón-enlace "Reintentar"; sin red, con icono de nube tachada.
- **Más:** botón secundario a lo ancho "Cargar más", con spinner mientras carga.

### Mapa (el plano real)
Cuando hay ubicación real, el mapa de OpenStreetMap ocupa el lugar del plano dibujado. Marco de 2 px línea fuerte, esquinas de 10 px, fondo verde aviso mientras cargan las teselas, 300 px de alto (360 px en escritorio); en solo lectura (detalle) 220 px (260 px en escritorio) sin arrastre ni zoom.
- **Pin:** 40 × 50 px, fijo en el centro del marco y sin eventos; se arrastra el mapa debajo, y el zoom es siempre alrededor del centro. Es el único pin: no hay marcadores de Leaflet. Dos estados:
  - **Fantasma** (aún no hay punto elegido): papel al 75 %, contorno discontinuo de 3 px en tinta suave, punto central solo en contorno y sin sombra. Sin ámbar: no promete una ubicación registrada.
  - **Clavado** (hay punto, por GPS, por mover el mapa o por aceptarlo): pin ámbar con contorno de 2 px en ámbar hondo, punto de papel y sombra.
- **Aceptar el centro:** sin punto, un botón-enlace "El problema está aquí: usar este punto" bajo el mapa fija el centro actual; desaparece en cuanto hay punto.
- **Precisión:** tras "Usar mi ubicación", círculo verde plano (trazo 2 px, relleno 12 %) con el radio del GPS.
- **Estado:** debajo, una línea en small tinta suave con `aria-live="polite"` que dice de dónde viene el punto ("Ubicación del GPS, precisión de ±15 m…" / "Punto ajustado a mano: …").
- **Controles:** zoom de 44 × 44 en tinta, con los iconos dibujados de la familia (más / menos) y títulos "Acercar" / "Alejar"; solo en el mapa interactivo; atribución en superficie al 90 % con enlace verde plano 600; foco del mapa con anillo de 3 px en tinta hacia dentro (-5 px).
- Si el permiso se niega, aviso info y el mapa sigue funcionando a mano.

### Detalle de reporte
Columna de bloques a 20 px: fila de estado (pastilla más "Tu reporte" en 0.875rem 650 tinta suave), foto en marco de 2 px línea fuerte (`contain`, hasta 60dvh), descripción a 48ch respetando saltos de línea, lista de datos y mapa de solo lectura.

### El plano (componente firma)
Banda o columna verde que se dibuja con un patrón de manzanas y calles de 400 × 300 px repetido a escala fija (conserva densidad a cualquier tamaño), una avenida curva que se estira sin engordar el trazo, dos puntos tenues y un pin ámbar con punto de papel. Es decorativo (`aria-hidden`). Al cargar, el pin baja 14 px y se asienta (700 ms, `cubic-bezier(0.16, 1, 0.3, 1)`) mientras su sombra crece; sin movimiento con `prefers-reduced-motion`. Tamaño del pin: 56 × 70 en la banda de entrada, 84 × 105 en la columna de escritorio, 44 × 55 (64 × 80 en escritorio) en la versión compacta de la portada. La marca (logo de 36 px con anillo de papel al 35 % y "SpotIt") va arriba a la izquierda sobre el plano.

### Lista de datos
Filas separadas por líneas de 1 px, 14 px de padding vertical; término en 0.875rem 650 tinta suave, valor en cuerpo con `overflow-wrap: anywhere`.

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

### Don't:
- **Don't** poner el formulario en una tarjeta blanca centrada sobre fondo gris con el logo encima.
- **Don't** usar el ámbar para botones, fondos o texto de interfaz.
- **Don't** indicar un error o un requisito solo con color.
- **Don't** usar texto de campo por debajo de 16 px.
- **Don't** añadir modo oscuro ni fondos oscuros a pantalla completa.
- **Don't** usar iconos de otra familia o glifos tipográficos en lugar de los iconos dibujados.
- **Don't** usar marcadores arrastrables de mapa ni un asistente de varios pasos con barra de progreso para reportar.
- **Don't** hacer que el aviso 911 se pueda cerrar u ocultar.
