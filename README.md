# Tante Marlene · Inventario PWA

MVP local-first en HTML/CSS/JavaScript puro.

## Qué incluye
- 59 artículos / 719 unidades de base, transcritos desde las cuatro fotos.
- Loza, cubiertos, vasos de cerveza, vasos/jugos y copas.
- Cantidades con botones +/− o escritura directa.
- Guardado de conteos completos con fecha/hora e historial.
- Alta/edición/eliminación de artículos.
- Stock mínimo, ubicación, observaciones y marca “por revisar”.
- Exportar/importar respaldo JSON.
- IndexedDB: los datos quedan guardados en el dispositivo.
- Service worker + manifest para uso offline e instalación como PWA.

## Publicación
El proyecto está preparado para GitHub Pages desde la rama `main` y la raíz `/`.

URL esperada:

`https://bemowl.github.io/tante-marlene-inventario/`

## Datos por revisar
Algunos nombres de la cuarta foto siguen marcados como “por revisar” y se pueden editar directamente desde la aplicación.

## Desarrollo local
```bash
python -m http.server 8081
```

Luego abrir `http://localhost:8081`.
