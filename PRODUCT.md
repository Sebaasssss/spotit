# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Ciudadanos:** estudiantes, trabajadores o vecinos de un campus o colonia que ven un problema (bache, luminaria fundida, fuga de agua, falla en un salón) y quieren reportarlo en segundos desde el celular, muchas veces de pie y en la calle. Incluye personas mayores o poco técnicas.
- **Administradores:** personal que recibe los reportes, cambia su estado y comenta. No se registran por la app; se crean desde el admin de Django o con `createsuperuser`.

## Product Purpose

PWA instalable (iOS, Android, escritorio) para reportar incidencias con foto y ubicación automática, verlas en un mapa con su estado (`recibido` → `en_proceso` → `resuelto`) y votar para priorizarlas. El éxito es que reportar cueste menos que ignorar el problema y que quien reporta vea que su reporte avanza.

## Positioning

Producto genérico, sin una institución concreta: cualquier campus o colonia puede usarlo. Las pantallas no nombran a ninguna universidad, municipio o comité.

## Operating Context

- Se usa sobre todo en el teléfono, en exteriores y a veces con mala señal: la app debe abrir sin conexión y guardar reportes pendientes de enviar.
- Permisos (cámara, ubicación, notificaciones) se piden en contexto, nunca al abrir.
- En iOS las notificaciones solo funcionan con la PWA instalada en la pantalla de inicio.

## Capabilities and Constraints

- MVP: registro e inicio de sesión (roles ciudadano y administrador), crear reporte, mapa con filtros, estados, votos (uno por usuario y reporte), panel de administración, push por cambio de estado y modo offline.
- Fuera de alcance por ahora: chat entre usuarios, pagos, moderación con IA, multi-idioma (la app es solo en español de México).
- Mapa con Leaflet + OpenStreetMap, sin servicios de pago.

## Brand Commitments

- Nombre: **SpotIt**. Logo existente: pin de mapa sobre cuadrado verde (`frontend/public/logo.svg`).
- Voz: se habla de **tú**, cercana y directa, frases cortas y sin tecnicismos ("Reporta lo que veas").

## Evidence on Hand

No hay usuarios, testimonios, cifras ni instituciones reales todavía. No inventar ninguno.

## Product Principles

1. Reportar debe ser más rápido que quejarse: el mínimo de pasos y de campos.
2. Funciona en la calle: con sol, con una mano, con mala señal.
3. Transparencia del avance: quien reporta siempre ve en qué estado está su reporte.
4. Nada de jerga: cualquier persona, de cualquier edad, entiende cada pantalla a la primera.

## Accessibility & Inclusion

- WCAG 2.2 AA como mínimo: contraste, foco visible, lectores de pantalla, zonas táctiles de al menos 44 px.
- Pensado también para personas mayores o poco técnicas: texto generoso, pasos mínimos, mensajes de error que dicen cómo resolver.
- Uso en exteriores con sol: alto contraste y elementos grandes.
