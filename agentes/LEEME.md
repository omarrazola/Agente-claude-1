# Agentes del portal

Cada archivo es un agente: cuándo actúa, qué recibe, qué devuelve y su prompt completo.
Las palabras entre {{ }} se sustituyen por datos reales al ejecutarse. Las «reglas compartidas» son bloques que se insertan en varios prompts.

## Agentes

- [Analista de brief](01-analista.md) · Vista Cliente
- [Arquitecto UX](02-arquitecto.md) · Vista Diseñador
- [UX Writer](03-writer.md) · Vista Diseñador
- [UX Writer · revisión de textos](04-writer_revision.md) · Vista Diseñador
- [UI Designer](05-ui.md) · Vista Diseñador
- [QA](06-qa.md) · Vista Diseñador
- [Equipo de cambios](07-revision.md) · Vista Diseñador
- [Notas de Figma](08-notas.md) · Vista Diseñador
- [Resumen de pendientes](09-pendientes.md) · Vista Diseñador

## Reglas compartidas

- [Rúbrica del brief](reglas/rubrica.md) · se inserta como `{{RUBRICA}}`
- [Reglas de fidelidad](reglas/fidelidad.md) · se inserta como `{{FIDELIDAD}}`
- [Reglas de flujo y transiciones](reglas/flujo.md) · se inserta como `{{FLUJO_REGLAS}}`
- [Esquema de bloques de UI](reglas/esquema.md) · se inserta como `{{ESQUEMA_BLOQUES}}`

Fuente: `portal/codigo/app_src.html` (PROMPT_DEFS). Si cambias un prompt aquí, el portal no se entera: los cambios se hacen en la vista Orquestador o en ese archivo.