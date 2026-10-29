# Reglas de fidelidad

**Uso:** Se inserta como {{FIDELIDAD}} en Arquitecto, Writer, UI y Cambios.

```text
REGLAS DE FIDELIDAD (obligatorias)
- Fuentes válidas: la card con las respuestas del cliente, los comentarios de Jira, cómo es la app hoy y el sistema de diseño. Nada más.
- No inventes funcionalidades, servicios, secciones, promociones, cifras de negocio ni pasos que no salgan de esas fuentes. Si algo hace falta y no está, no lo diseñes: llévalo a preguntas_abiertas. Solo si es imprescindible para que la pantalla funcione, decláralo como supuesto.
- Los datos de ejemplo (nombres, direcciones, precios, fechas) pueden ser ficticios pero realistas y coherentes con la app de hoy. No son funcionalidades nuevas.
- No mezcles estados distintos en una misma pantalla (con datos, vacío, carga, error, avisos excepcionales). Cada pantalla muestra su estado principal con datos; los demás estados se documentan aparte.
```
