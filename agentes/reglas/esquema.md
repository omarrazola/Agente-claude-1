# Esquema de bloques de UI

**Uso:** Se inserta como {{ESQUEMA_BLOQUES}} en UI y Cambios. Los tipos de bloque deben existir en el portal y en Figma: si añades uno nuevo aquí no se dibujará.

```text
Bloques permitidos (campo "t") y sus campos:
- appbar: title, left ("back" | "close", opcional; sin left en pantallas principales), right (texto de acción, opcional). Siempre el primer bloque.
- heading: text, level (1, 2 o 3)
- text: text, tone ("default" | "muted"), size ("m" | "s")
- button: label, variant ("primary" | "secondary" | "ghost" | "danger")
- input: label, placeholder, value (opcional), helper (opcional), error (opcional: texto de error)
- card: meta, title, body, cta (todos opcionales salvo title)
- stat: label, value, delta (opcional)
- list: items [{title, subtitle, trailing}]
- chips: items [texto]
- tabs: items [texto], active (índice)
- image: label (qué representa: foto, gráfico, mapa…), h (alto en px)
- banner: title (opcional), text, tone ("info" | "warning" | "success" | "error")
- tags: items [{text, tone: "gray" | "solid" | "accent" | "positive" | "warning" | "negative"}]
- segmented: items [texto], active (índice)
- check: kind ("checkbox" | "radio" | "toggle"), label, checked (true/false)
- progress: label, value (0 a 100)
- avatar: name, detail (opcional), initials (opcional)
- row: children [2 o 3 bloques stat, card o button en horizontal]
- grid: cols (2 a 4), children [bloques tile]
- tile: label, icon (una palabra)
- divider
- spacer: h
- search: placeholder, action (opcional: botón dentro del buscador, p. ej. "Más tarde")
- select: label, placeholder, value (opcional), helper (opcional). Desplegable de selección.
- sectionheading: text. Cabecera de sección de lista.
- empty: kind ("first" | "success" | "warning" | "error"), title, text, cta (opcional). Estado vacío o de resultado.
- sheetheader: title, subtitle (opcional). Cabecera de hoja inferior (bottom sheet); va en lugar de appbar, como primer bloque.
- dock: label, secondary (opcional). Botonera fija abajo con la acción principal; va como último bloque, en lugar de bottomnav.
- NAVEGACIÓN DEL PROTOTIPO: pon "to" (id de destino) SOLO en el elemento que dispara cada transición de la arquitectura, y en ningún otro. Lo admiten button, search, option, card, empty, tile, dock y dialog ("secondaryTo" para su acción secundaria), y los items de list. Si la arquitectura no tiene transiciones, no pongas ningún "to". La barra inferior (bottomnav) se enlaza sola: no le pongas "to". Un appbar con left "back" vuelve a la pantalla anterior.
- option: opción seleccionable tipo fila de viaje: title, capacity (opcional, nº de personas), subtitle (p. ej. "11:55 · 6 min"), price, badge (opcional {text, tone: "accent" | "positive" | "warning"}), selected (true/false), icon (una palabra)
- list: los items admiten además lead (texto corto a la izquierda, p. ej. "20 km")
- bottomnav: items [texto], active (índice). Solo si la app tiene navegación principal; siempre el último bloque.
- map: kind ("explore" | "route" | "approaching"), eta (opcional, p. ej. "4 min"). Mapa a ancho completo; va arriba, antes del sheetheader.
- driver: name, rating, car, plate. Tarjeta del conductor asignado.
- snackbar: text, action (opcional). Confirmación temporal.
- dialog: title, text, primary, secondary. Decisión crítica (cancelar viaje…).
- dock: admite además caption (texto pequeño encima del botón, p. ej. método de pago).
```
