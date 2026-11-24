---
version: 1
slug: "frontend-src-routes-login-tsx"
primary_target: "frontend/src/routes/Login.tsx"
related_targets: ["frontend/src/routes/Register.tsx","frontend/src/routes/Home.tsx"]
---

# Superficie: entrada (inicio de sesión, registro) y portada protegida

Modo: Operate. Audiencia: ciudadanos en la calle, con el celular, a veces mayores o poco técnicos, a veces con sol directo. Tarea: entrar o crear cuenta en menos de un minuto y sin dudas. Restricciones: WCAG 2.2 AA, toques de 44 px como mínimo (campos y botón principal de 56 px), voz de tú, sin instituciones nombradas, español de México.

## Direction contract

THESIS: La entrada es "el punto en el plano": una banda verde con un plano de calles dibujado y el pin ámbar clavado es el umbral de la app. Rechaza la tarjeta blanca centrada sobre fondo gris con logo encima, el patrón por defecto de cualquier login.

OWN-WORLD: Verde profundo #0E5A4F como campo que ocupa una región entera (banda o columna), calles en papel translúcido, pin ámbar #E8A33D. Formulario directo sobre papel cálido #F6F3EC, sin tarjeta: etiquetas en tinta #1B2421 semibold encima del campo, campos altos con borde de 2 px, botón principal verde a lo ancho con esquinas de 14 px. Errores en rojo #B3261E con icono dibujado, nunca solo color.

STORY: Quien llega entiende que esto es para marcar problemas en un mapa, entra o se registra con tres campos como máximo, y si algo falla el mensaje dice qué pasó y cómo seguir. Sin conexión, sabe que necesita internet para entrar y que su sesión guardada sigue funcionando.

FIRST VIEWPORT: Móvil 390×844: banda verde de ~30 % de alto con el plano y el pin a la derecha; logo y nombre arriba a la izquierda sobre la banda. Debajo, título grande ("Entra" / "Crea tu cuenta"), una línea de apoyo, los campos y el botón principal a lo ancho, visible sin desplazar en el login. Enlace para cambiar de pantalla debajo del botón. Escritorio: columna verde a la izquierda (45 %) con el plano a toda altura y una frase; formulario a la derecha, medida máxima de 400 px.

FORM: Superficie dentro de la identidad visual ya definida (paleta, logo de pin y shell de la Fase 1), pedida de forma acotada. Sin tirada de conceptos por decisión del usuario (2026-11-24: "No hagas la tirada de conceptos: ya tenemos una identidad visual definida y esta fase fue una petición acotada. Usa mi petición literal como seed del contrato de diseño y déjalo así."). seed: none (pinned) — "Pantallas de registro e inicio de sesión, un contexto de autenticación y rutas protegidas. Usa las skills de diseño: mobile-first, estados de carga, error y validación en cada formulario, y que se vea cuidado, no como plantilla genérica."
Interacción firma: el pin se asienta sobre el plano al cargar (una sola vez, ease-out, sin movimiento si se prefiere reducido). Botón con estado de carga en línea ("Entrando…") y requisitos de contraseña que se marcan en vivo.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
