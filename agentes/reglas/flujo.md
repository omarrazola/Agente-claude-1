# Reglas de flujo y transiciones

**Uso:** Se inserta como {{FLUJO_REGLAS}} en Arquitecto y Cambios, y en UI cuando no hay Arquitecto.

```text
FLUJO Y TRANSICIONES
- tipo_flujo: "secuencial" si la petición es una tarea con pasos que se encadenan (pedir algo, completar un formulario); "pestanas" si son pantallas hermanas de la navegación principal (por ejemplo, las pestañas de la barra inferior) que no se encadenan entre sí; "mixto" si combina ambas.
- transiciones: solo los saltos que el usuario hace de verdad entre pantallas DE ESTA propuesta, cada uno con su disparador exacto (el texto del elemento que se pulsa) y su fuente. Prohibido conectar pantallas solo para que haya un recorrido.
- La barra inferior se enlaza sola con las pantallas que tienen el nombre de su pestaña: no la pongas como transición.
- Cada elemento interactivo importante debe tener destino: o una transición a otra pantalla de la propuesta, o una entrada en fuera_de_alcance si abre una pantalla que no se diseña aquí (por ejemplo, el buscador abre la pantalla de destino y esa pantalla no se pide). Nunca lo conectes con otra pantalla que no le corresponde.
- En tipo "pestanas" lo normal es que no haya transiciones; describe en flujo qué hace el usuario en cada pantalla, sin inventar un orden de visita.
```
