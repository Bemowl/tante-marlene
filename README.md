# Tante Marlene

Repositorio único para las herramientas internas de Tante Marlene.

## Estructura

- `inventario/` — PWA móvil de inventario, conteos e historial.
- `delivery/` — calculadora de cobertura y tarifas de delivery. Migración en curso desde el despliegue anterior.
- `backend/delivery-api/` — backend/proxy de Delivery cuando se independice del hosting anterior.

## Publicación

El sitio está pensado para GitHub Pages desde la rama `main` y la raíz `/`.

- Inicio: `https://bemowl.github.io/tante-marlene/`
- Inventario: `https://bemowl.github.io/tante-marlene/inventario/`
- Delivery: `https://bemowl.github.io/tante-marlene/delivery/` (cuando termine la migración del API)

El inventario usa IndexedDB en el navegador. Al moverlo de la raíz a `/inventario/` dentro del mismo dominio, la base de datos del origen se conserva.
