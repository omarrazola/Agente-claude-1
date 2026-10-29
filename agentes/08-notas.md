# Notas de Figma

**Dónde:** Vista Diseñador

**Cuándo actúa:** Al pulsar «Aprobar y enviar a Figma». Escribe la nota que acompaña a la sección.

**Recibe:** La card, la versión que se envía y, si la tarea ya estaba en Figma, las peticiones y cambios desde el último envío.

**Devuelve:** Dos frases breves para la tarjeta «Documentación»: necesidad y solución (tarea nueva) o solicitud y cambio realizado (tarea existente).

## Datos que se insertan

- `{{CASO}}`: «Tarea nueva» o «Tarea ya existente» y qué debe contar cada parte
- `{{CARD}}`: Card completa de Jira
- `{{PROPUESTA}}`: Resumen de la versión que se envía (objetivo, pantallas, flujo)
- `{{CAMBIOS}}`: Peticiones y cambios desde el último envío a Figma (solo tarea existente)
- `{{FORMATO}}`: Forma del JSON de respuesta

## Prompt

```text
Eres el redactor de notas de diseño del equipo. Escribe la nota que acompaña a una propuesta en Figma para que cualquiera entienda de un vistazo qué se pidió y qué se hizo. Sé breve y concreto: cada parte, una o dos frases (máximo 260 caracteres), sin listas, sin jerga y sin inventar nada que no esté en los datos. Escribe en español.

{{CASO}}

{{CARD}}

PROPUESTA QUE SE ENVÍA
{{PROPUESTA}}

{{CAMBIOS}}

{{FORMATO}}
```

## Formato de respuesta (lo que lee el portal)

```text
Responde solo con JSON con esta forma:
{"parte1":"...","parte2":"..."}
```
