# MORIARTY V0.1 — revisión ejecutada

Fecha: 2026-10-19 UTC. Fuente: `MORIARTY_V0.1_2026-10-19.zip`, recibido mediante el enlace de Drive facilitado por el usuario. Se leyeron íntegramente `README.md` y `docs/MORIARTY_DOCUMENTO_MAESTRO.md`.

**Resultado:** la V0.1 arranca y sus flujos principales funcionan en Chromium. La interfaz respeta marfil, azul tinta, verde petróleo y serif para el manuscrito; ofrece los cinco espacios previstos. La revisión detectó tres defectos reproducibles, uno prioritario en importación. No se modificó el código de la aplicación.

**Drive/MCP para revisión IA: PENDIENTE, sin implementar ni activar.** Descargar el ZIP original desde Drive fue únicamente una operación para obtener el proyecto.

## Hallazgos

### 1. Prioridad alta: importar un identificador puede ejecutar HTML/JavaScript

Referencias: `moriarty/dist/model.js:7`, `moriarty/dist/app.js:14`; otros identificadores también se interpolan directamente en atributos HTML.

La validación admite cualquier cadena como ID. Al renderizar la lista de capítulos, se inserta ese valor dentro de `innerHTML` sin escapar el atributo. Se verificó en un contexto aislado con un JSON ficticio: un ID que cierra el atributo e introduce una imagen con manejador de error ejecutó un marcador inocuo (`document.body.dataset.importProbe = '1'`). No hubo extracción de información ni envío externo.

Impacto: abrir un proyecto manipulado puede ejecutar código con acceso al almacenamiento del origen de la app. El riesgo afecta a la compartición por archivos prevista para MORIARTY. No dar por segura la importación de archivos no confiables hasta corregirlo.

Recomendación: construir nodos con APIs DOM y asignar `dataset`/`value` sin interpolación HTML; validar identificadores con un formato acotado y consistente, incluidas referencias. Añadir una prueba de regresión en navegador que demuestre que un ID importado nunca crea nodos ni ejecuta manejadores.

Evidencia: `evidence/resultados-bordes.json` y `evidence/verificar_bordes.py`.

### 2. Prioridad media: reordenar cronología atraviesa elementos ocultos

Referencia: `moriarty/dist/app.js:20`, función `timelineView`.

Reproducción: crear A, B y C; enviar B a la papelera; pulsar una vez Subir sobre C. La lista visible sigue siendo A, C. El intercambio ocurre con B, que está oculto, en lugar del anterior evento visible. La numeración y los límites de los botones también usan el arreglo completo.

Recomendación: calcular anterior/siguiente y numeración sobre eventos activos, conservando la papelera por separado en el modelo. Evidencia: `16-defecto-cronologia.png` y `resultados-bordes.json`.

### 3. Prioridad baja: renombrar una escena deja etiquetas antiguas

Referencia: `moriarty/dist/app.js:16`, manejador de `sceneTitle` en `writeView`.

Reproducción: cambiar «Nueva escena» por «Nombre actualizado». El campo y el dato guardado cambian, pero el selector de escena y la barra lateral siguen mostrando «Nueva escena» hasta volver a renderizar la vista.

Recomendación: actualizar la opción seleccionada y la etiqueta lateral al editar el título, sin perder el foco. Evidencia: `15-defecto-nombre-escena.png` y `resultados-ui.json`.

## Verificación realizada

- Servidor estático local: `python3 -m http.server 8080 --bind 127.0.0.1 --directory dist`.
- Navegador real automatizado: Chromium 154.0.8037.57, modo headless, con Playwright Python.
- Escritorio: viewport 1440 × 1000. Móvil emulado: 390 × 844; comprobaciones adicionales de anchura a 320, 360, 560 y 768 px.
- Pruebas de dominio: 6/6 con `node tests/model.test.mjs`; también se ejecutó `npm test`.
- Sintaxis: `node --check` en `app.js`, `model.js` y `sw.js`, sin errores.
- Recorrido principal: 35 comprobaciones correctas de 36; falla la actualización inmediata del título de escena. Los casos adicionales confirmaron el defecto de cronología y la ejecución de HTML importado. No se contabilizan como aprobaciones de funcionalidad.
- No hubo errores JavaScript ni peticiones externas durante el recorrido principal con datos normales.

| Área | Resultado observado |
|---|---|
| Escritura | Crear capítulos y escenas, editar Unicode, buscar contenido y navegar sin perder texto |
| Persistencia | Recargar conserva datos; error de cuota visible; guardado ilegible no se sobrescribe |
| Enfoque | Oculta controles exteriores y permite volver |
| Versiones | Crear y recuperar; se conserva el estado anterior |
| Tablero | Reordenar, abrir con Enter y arrastrar en lienzo sin cambiar el orden del libro |
| Archivo | Crear, editar, enviar ficha a papelera y recuperar |
| Cronología | Crear, vincular y ordenar eventos activos; defecto con eventos ocultos documentado |
| Revisiones | Propuesta manual, solicitud JSON, aplicación con versión previa y bloqueo por original cambiado |
| Exportación | JSON conserva todo el proyecto; TXT conserva Unicode |
| Importación | Archivo estructuralmente inválido rechazado; JSON válido reabre con respaldo automático; falta seguridad en IDs |
| Offline | Service worker activo; recargar, escribir y volver a recargar sin conexión conserva el texto |
| Móvil | Cinco espacios sin desborde global a 390 px; pestañas Original/Propuesta operativas; editor sin desborde en los otros cuatro anchos |

## Evaluación visual

La lectura del manuscrito es clara y la paleta coincide con el documento maestro. Escritorio mantiene jerarquía entre navegación, herramientas y texto; las revisiones aparecen en dos columnas. En móvil, las revisiones cambian a pestañas y los controles se redistribuyen sin desborde horizontal de la página. La navegación superior tiene desplazamiento horizontal: en 390 px, Revisiones queda parcialmente fuera de la vista inicial. Sería útil un indicador de desplazamiento. En 320 px, el encabezado y las herramientas ocupan bastante altura antes del manuscrito.

Las 16 imágenes son capturas PNG directas del navegador, sin montaje ni generación. Los textos de Inés y la carta son datos ficticios de prueba, no canon de una novela. Algunas capturas del recorrido incluyen mensajes de estado temporales, tal como los mostró la aplicación.

## Capturas

Abrir [la galería](evidence/galeria.html) para recorrer todas las imágenes.

1. [Inicio en escritorio](evidence/01-inicio-escritorio.png)
2. [Editor en escritorio](evidence/02-escribir-escritorio.png)
3. [Versiones](evidence/03-versiones-escritorio.png)
4. [Tablero](evidence/04-tablero-escritorio.png)
5. [Lienzo](evidence/05-lienzo-escritorio.png)
6. [Archivo](evidence/06-archivo-escritorio.png)
7. [Cronología](evidence/07-cronologia-escritorio.png)
8. [Revisión en escritorio](evidence/08-revision-escritorio.png)
9. [Escritura sin conexión](evidence/09-offline-escritorio.png)
10. [Editor móvil](evidence/10-escribir-movil.png)
11. [Tablero móvil](evidence/11-tablero-movil.png)
12. [Revisión móvil: original](evidence/12-revision-original-movil.png)
13. [Revisión móvil: propuesta](evidence/13-revision-propuesta-movil.png)
14. [Editor a 320 px](evidence/14-escribir-320px.png)
15. [Defecto de nombre de escena](evidence/15-defecto-nombre-escena.png)
16. [Cronología con evento en papelera](evidence/16-defecto-cronologia.png)

## Límites y pendientes

No se probó en un teléfono físico, Safari/iOS ni Firefox. La emulación móvil verifica distribución y flujos en Chromium, no compatibilidad completa entre dispositivos. No se verificó instalación PWA, despliegue HTTPS, teclado virtual, lector de pantalla, actualización de caché entre versiones ni recuperación tras cierre del navegador. Offline sí se comprobó bajo localhost tras la primera carga.

Esta entrega es una revisión: los tres defectos siguen presentes en la V0.1 original incluida. El código `dist/` se conserva idéntico al ZIP recibido. Se añadió a la copia local del documento maestro un registro de esta revisión. No se modificó el archivo de Drive ni se publicó la aplicación. La integración Drive/MCP para revisión IA continúa PENDIENTE por instrucción explícita.
