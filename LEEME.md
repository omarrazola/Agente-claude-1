# Portal «Diseño con IA» · Rumbo

Copia de seguridad de todo lo necesario para el portal (27/10/2026).

## Qué hay en cada carpeta

- **portal/portal.html** — El portal completo, tal como está publicado en Claude (versión 54). Es el archivo que se publica como artefacto.
- **portal/codigo/** — Las piezas con las que se construye el portal:
  - `app_src.html`: el portal (vistas Cliente, Diseñador y Orquestador, agentes y prompts).
  - `figma_renderer.js` / `.min.js`: lo que dibuja las pantallas, el flujo y la nota en Figma.
  - `construir.py`: junta las dos piezas y genera `portal.html`.
  - `figma_ds.js`, `dslib.json`, `base_theme.json`, `build_min.js`: datos y utilidades del sistema de diseño Rumbo.
- **figma/identidad-verbal/** — Las directrices de identidad verbal preparadas para Figma (contenido, código para crearlas y vista previa). Pendiente de crear en Figma cuando se renueve el límite.
- **agentes/** — Cada agente en su propio archivo: cuándo actúa, qué recibe, qué devuelve y su prompt completo. También las reglas compartidas. Es una copia para leer; el portal usa los que están dentro de `portal/codigo/app_src.html`.
- **datos/** — La configuración guardada dentro del portal: el sistema de diseño Rumbo y los ajustes del producto. No incluye el trabajo hecho en las tarjetas.
- **diagramas/** — El flujo de agentes explicado de forma sencilla (.mmd, .png y .pdf).

## Importante

- El trabajo hecho en el portal (tarjetas, versiones, envíos a Figma y entregas a PM) vive dentro del artefacto publicado en Claude y no está en esta carpeta.
- Enlace del portal: https://claude.ai/artifact/7pRJw3yWSmquxnsx1SdNB5
