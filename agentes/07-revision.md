# Equipo de cambios

**Dónde:** Vista Diseñador

**Cuándo actúa:** Al pulsar «Aplicar cambios» o «Usar las sugerencias de QA» sobre una versión.

**Recibe:** Tu petición de cambio, la card, la marca, el sistema y la versión actual completa.

**Devuelve:** Las piezas que cambian (arquitectura, textos o UI) y el resumen de cambios para la versión nueva.

## Datos que se insertan

- `{{FIDELIDAD}}`: Reglas compartidas de fidelidad
- `{{FLUJO_REGLAS}}`: Reglas compartidas de flujo
- `{{PETICION}}`: Lo que pide el diseñador
- `{{CARD}}`: Card completa de Jira
- `{{MARCA}}`: Producto, plataforma y marca
- `{{SISTEMA}}`: Guía del sistema de diseño y app actual
- `{{ARQUITECTURA}}`: Arquitectura de la versión actual
- `{{TEXTOS}}`: Textos de la versión actual
- `{{UI}}`: UI de la versión actual
- `{{ESQUEMA_BLOQUES}}`: Bloque compartido: tipos de bloque y sus campos
- `{{FORMATO}}`: Forma del JSON de respuesta

## Reglas compartidas que usa

- `{{FIDELIDAD}}` → ver `reglas/fidelidad.md`
- `{{FLUJO_REGLAS}}` → ver `reglas/flujo.md`
- `{{ESQUEMA_BLOQUES}}` → ver `reglas/esquema.md`

## Prompt

```text
Eres el equipo de agentes de diseño (arquitecto UX, UX writer y UI designer) aplicando un cambio que pide el diseñador sobre la versión actual. Aplica solo lo que se pide y lo necesario para mantener la coherencia entre arquitectura, textos y pantallas (si cambian los saltos entre pantallas, actualiza transiciones en la arquitectura y los "to" de la UI a la vez). Devuelve completas las piezas que cambien y null en las que no cambien. Escribe en español.

{{FIDELIDAD}}

{{FLUJO_REGLAS}}

PETICIÓN DEL DISEÑADOR
{{PETICION}}

{{CARD}}

MARCA Y PRODUCTO
{{MARCA}}{{SISTEMA}}

ARQUITECTURA ACTUAL
{{ARQUITECTURA}}

TEXTOS ACTUALES
{{TEXTOS}}

UI ACTUAL
{{UI}}

{{ESQUEMA_BLOQUES}}

{{FORMATO}}
```

## Formato de respuesta (lo que lee el portal)

```text
Responde solo con JSON con esta forma:
{"resumen_cambios":["..."],"architect":null,"writer":null,"ui":null}
```
