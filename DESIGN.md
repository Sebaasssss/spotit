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
spacing:
  xs: "8px"
  sm: "16px"
  md: "20px"
  lg: "24px"
  xl: "28px"
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
---

# Design System: SpotIt

## Overview

**Creative North Star: "El punto en el plano"**

SpotIt es un plano de calles verde donde cae un pin ámbar, y al lado, papel cálido donde se escribe. Todo el sistema sale de esas dos materias: el **plano** (verde profundo con manzanas, calles translúcidas y un pin) marca la identidad y ocupa una región entera de la pantalla; el **papel** lleva el trabajo (formularios, texto, datos) sin tarjetas ni marcos que lo encierren.

Está hecho para la calle: modo claro siempre (se usa con sol), texto base de 17 px, controles de 56 px y toques de 44 px como mínimo, contraste alto y mensajes que dicen qué pasó y cómo seguir. La densidad es baja y directa: una columna, pocas piezas, nada decorativo que compita con la tarea.

**Key Characteristics:**
- Un campo verde que ocupa una banda (móvil) o una columna entera (escritorio), nunca un adorno pequeño.
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
- **Ámbar Hondo** (pin-deep): definido para cuando el ámbar necesite contraste sobre papel; aún sin uso en pantalla.

### Neutral
- **Papel** (paper): fondo de toda la app; mismo valor que la tinta del plano, así el papel y las calles son la misma materia.
- **Superficie** (surface): relleno de los campos de texto y de bloques de estado, un punto más claro que el papel.
- **Tinta** (ink): texto principal, etiquetas, anillo de foco global y fondo del aviso flotante.
- **Tinta Suave** (ink-soft): texto de apoyo, ayudas, placeholders, iconos en reposo, hover del borde de campo.
- **Línea** (line): divisores de 1 px (pie del formulario, filas de la cuenta).
- **Línea Fuerte** (line-strong): borde de 2 px de los campos en reposo.

### Estado
- **Verde Hecho** (ok): requisitos cumplidos y backend sano.
- **Rojo Error** (error) sobre **Rosa Error** (error-tint): borde y relleno del campo inválido, texto e icono del error, borde y fondo del aviso de error.
- **Verde Aviso** (info-tint): fondo de avisos informativos (sin conexión).

### Named Rules
**The Un Solo Pin Rule.** El ámbar aparece como el pin del plano y en detalles de respuesta (hover de enlace, selección, foco sobre oscuro). No se usa para botones, fondos ni texto.

**The Siempre Claro Rule.** `color-scheme: light` fijo: no hay modo oscuro. La app vive al sol.

## Typography

**Display Font:** pila del sistema (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)
**Body Font:** la misma pila del sistema

**Character:** Una sola familia del dispositivo, cargada al instante y legible para cualquiera; la jerarquía sale del peso (400 a 800) y del tracking negativo en los títulos, no de un cambio de familia. La pila del sistema es la decisión firme para cuerpo, etiquetas y controles; en el rol Display se registra tal como está construido y queda abierta: una cara de display propia puede sustituirla sin cambiar la escala.

### Hierarchy
- **Display** (800, 2.25rem móvil / 2.75rem escritorio en entrada / 3rem en el saludo de escritorio, 1.05, -0.025em): el título de cada pantalla ("Entra", "Crea tu cuenta", "Hola, …"). Uno por pantalla.
- **Headline** (700, 1.375rem, 1.2, -0.01em): títulos de sección dentro del papel.
- **Title** (700, 1.25rem, -0.01em): el nombre SpotIt junto al logo sobre el plano.
- **Frase del plano** (500, 1.0625rem, 1.4 en móvil; 700, 1.75rem, 1.2 en escritorio): la frase de la banda, máximo 22ch, `text-wrap: balance`.
- **Body** (400, 17px, 1.5): texto corrido; apoyo bajo el título a 36ch, párrafos de sección a 48ch.
- **Label** (650, 17px): etiquetas de campo, en tinta, siempre visibles encima del control.
- **Small** (0.9375rem, 1.4): ayudas, errores en línea (600) y metadatos; los términos de lista de datos van a 0.875rem 650 en tinta suave.

### Named Rules
**The Nada Bajo 16 Rule.** El texto de los campos es 1.0625rem (17 px): por encima de 16 px para que iOS no haga zoom. Ningún control de entrada baja de ahí.

## Layout

Mobile-first, una columna. En móvil la pantalla se parte en dos filas: la banda del plano arriba (`clamp(200px, 30dvh, 260px)` en la entrada; altura por contenido en la portada) y el papel debajo. A partir de **900 px** la entrada pasa a dos columnas: el plano a la izquierda (`minmax(380px, 45%)`, a toda altura) y el formulario centrado verticalmente a la derecha.

Medidas máximas: formulario de entrada 420 px (400 px en escritorio); contenido de la portada 560 px, centrado. Márgenes laterales de 24 px en la entrada y 20 px en la portada en móvil, 48 px en escritorio, siempre sumados a `env(safe-area-inset-*)`. Las alturas usan `100dvh`.

Ritmo: 8 px entre etiqueta y campo, 20 px entre campos, 24 px del título al formulario y entre bloques de la portada, 28 px antes del pie del formulario (con 20 px más tras su divisor).

## Elevation & Depth

Plano por defecto. La profundidad viene de las dos materias (verde contra papel), de las manzanas en verde hondo al 55 % y de bordes de 2 px, no de capas flotantes. Las sombras son pocas y con un rol concreto.

### Shadow Vocabulary
- **Sombra del pin** (`filter: drop-shadow(0 6px 8px rgb(5 30 26 / 0.35))` más una elipse en el suelo): el pin está clavado en el plano. Es la única sombra con presencia.
- **Apoyo del botón principal** (`box-shadow: 0 1px 3px rgb(5 30 26 / 0.25)`): un apoyo mínimo, no una elevación.
- **Aviso flotante** (`box-shadow: 0 12px 32px rgb(27 36 33 / 0.25)`): solo el aviso de actualización, que sí flota sobre el contenido.

### Named Rules
**The Papel Sin Tarjeta Rule.** El contenido se escribe sobre el papel; no se envuelve en tarjetas blancas con sombra. Los grupos se separan con espacio o con una línea de 1 px.

## Shapes

Esquinas suaves en dos pasos: **10 px** para campos, avisos y botones secundarios, y **14 px** para el botón principal y bloques mayores. El icono de la app usa la misma familia (112/512 de radio). Bordes de **2 px** en todo lo que se toca o avisa (campos, avisos, pastilla sin conexión); **1 px** solo para divisores. Los botones sobre el plano usan un trazo interior de 1.5 px en lugar de borde.

Iconos: una sola familia dibujada a mano, caja de 24, trazo de 2 px, puntas y uniones redondeadas, `currentColor`, siempre `aria-hidden`. El pin del plano es la misma silueta que el logo.

## Components

### Buttons
Firmes y a lo ancho; responden sin teatro.
- **Shape:** esquinas de 14 px en el primario, 10 px en el resto.
- **Primary:** verde plano con tinta de plano, 56 px de alto, a lo ancho del formulario, peso 700 a 17 px.
- **Hover / Active:** verde hondo en hover; `scale(0.98)` al presionar; transición de 120 ms ease-out.
- **Pendiente:** se deshabilita (`disabled` + `aria-disabled`), pasa a verde hondo, cursor `progress`, y muestra spinner y la acción en gerundio con puntos suspensivos ("Entrando…", "Saliendo…").
- **Sobre el plano:** fondo de papel al 14 % (24 % en hover), trazo interior de 1.5 px al 50 %, 44 px de alto, icono más texto; anillo de foco en tinta de plano.

### Inputs / Fields
- **Style:** etiqueta encima (650, tinta), campo de 56 px con relleno superficie, borde de 2 px línea fuerte, esquinas de 10 px, 16 px de padding lateral.
- **Hover:** el borde pasa a tinta suave.
- **Focus:** borde verde plano más anillo de 3 px en tinta con 2 px de separación.
- **Error:** borde rojo y relleno rosa error; debajo, mensaje en rojo 600 con icono de alerta dibujado, enlazado por `aria-describedby` y con `aria-invalid`.
- **Contraseña:** botón de mostrar/ocultar de 44 × 44 dentro del campo (a 6 px del borde derecho), con `aria-pressed` y etiqueta que cambia.
- **Requisitos:** lista en línea que se marca en vivo: punto en tinta suave pendiente, check en verde hecho y peso 600 cumplido, con texto oculto ": cumplido / : pendiente" para lectores de pantalla.

### Avisos de formulario
- **Style:** borde completo de 2 px en el color del tono, fondo teñido, esquinas de 10 px, 14 × 16 px de padding, icono a la izquierda en el color del tono y texto en tinta.
- **Error:** rojo sobre rosa error, `role="alert"`; título breve más una línea de ayuda en peso 450 que dice cómo seguir.
- **Info:** verde plano sobre verde aviso, `role="status"` (sin conexión, con icono de nube tachada).
- **Pastilla sin conexión** de la portada: mismo lenguaje que el aviso info (borde 2 px verde, fondo verde aviso, icono nube tachada).

### El plano (componente firma)
Banda o columna verde que se dibuja con un patrón de manzanas y calles de 400 × 300 px repetido a escala fija (conserva densidad a cualquier tamaño), una avenida curva que se estira sin engordar el trazo, dos puntos tenues y un pin ámbar con punto de papel. Es decorativo (`aria-hidden`). Al cargar, el pin baja 14 px y se asienta (700 ms, `cubic-bezier(0.16, 1, 0.3, 1)`) mientras su sombra crece; sin movimiento con `prefers-reduced-motion`. Tamaño del pin: 56 × 70 en la banda de entrada, 84 × 105 en la columna de escritorio, 44 × 55 (64 × 80 en escritorio) en la versión compacta de la portada. La marca (logo de 36 px con anillo de papel al 35 % y "SpotIt") va arriba a la izquierda sobre el plano.

### Lista de datos
Filas separadas por líneas de 1 px, 14 px de padding vertical; término en 0.875rem 650 tinta suave, valor en cuerpo con `overflow-wrap: anywhere`.

## Do's and Don'ts

### Do:
- **Do** dar al plano una región entera (banda de ~30 % de alto en móvil, columna de 45 % en escritorio) y poner un solo pin ámbar en él.
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
