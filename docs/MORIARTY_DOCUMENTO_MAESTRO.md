# MORIARTY — Documento maestro
Responsable: Admin / Atátoriz. Desarrollo: Argos. Fecha: 2026-10-19 (CDMX).
Estado inicial: diseño visual aprobado; Martillo autorizado. Documento redactado ANTES del código.

## Objetivo y límites
Estudio personal de escritura para computadora y celular. Manuscritos, capítulos, escenas, fichas, cronología y versiones. Compartición por archivos descargables. Sin APIs de pago, cuentas obligatorias ni generación IA incorporada.
La conexión de revisión con Drive y MCP queda PENDIENTE por decisión de Admin. Guardar entregables en Drive es una operación del desarrollo, independiente de esa función.

## Diseño aprobado
Marfil, azul tinta y verde petróleo; serif en manuscrito, sans en controles. Cinco espacios: Escribir, Tablero, Archivo, Cronología, Revisiones. Icono compacto por capítulo; Enter o doble clic abre el documento. Dos columnas de revisión en escritorio y pestañas en celular. Los ejemplos visuales no constituyen canon de las novelas.

## Arquitectura de la primera entrega
Aplicación estática HTML/CSS/JavaScript sin dependencias externas ni proceso de compilación. Módulo de dominio separado de vistas. Persistencia local con aviso de fallo; archivo .moriarty.json exportable e importable con validación antes de reemplazar datos. Service worker para uso sin conexión después de primera carga por HTTP/HTTPS. No requiere servicios remotos para escritura.
Modelo: proyecto con schemaVersion=1, id, title, chapters[{id,title,act,x,y,scenes[{id,title,text}],versions[]}], entities[{id,type,name,notes}], events[{id,title,when,chapterId}], reviews[]. Versiones son instantáneas de escenas; recuperar conserva el estado anterior. Papelera no destructiva para capítulos, fichas y eventos.
Texto plano en esta primera base: formato enriquecido, DOCX/PDF, relaciones gráficas y autenticación no se presentan como terminados.

## Alcance de implementación V0.1
- Editor de escenas y creación/selección de capítulos; búsqueda; conteo de palabras; modo enfoque.
- Tablero de capítulos, orden por botones accesibles y lienzo con posiciones independientes.
- Fichas editables de personaje/lugar/objeto/nota; cronología textual vinculada a capítulos.
- Versiones manuales y recuperación conservadora.
- Exportación/importación de proyecto y exportación TXT.
- Revisión manual por texto pegado: original/propuesta, aceptación explícita y detección de original modificado. Sin generación IA ni Drive.
- Diseño adaptable, navegación por teclado y guardado visible.

## Plan de trabajo
1. Crear y guardar este maestro antes del código.
2. Probar validación de archivos, recuperación y conflictos; implementar dominio.
3. Implementar interfaz y persistencia, exportaciones, fichas y tablero.
4. Verificar sintaxis y pruebas de dominio; verificar navegador si disponible.
5. Empaquetar fuente, instrucciones y diseños; subir a la misma carpeta; actualizar registro.

## Criterios de aceptación
Un proyecto exportado puede reabrirse conservando escenas, fichas, cronología y versiones. Un archivo inválido no reemplaza el proyecto. Recuperar una versión conserva una instantánea previa. Una revisión obsoleta no sobrescribe texto cambiado. Navegar no pierde lo escrito. Fallos de guardado son visibles.

## Registro de cambios
- 2026-10-19: Admin aprobó diseños y autorizó codificación. Se excluyó integración Drive de la aplicación.
- 2026-10-19: Se creó carpeta MORIARTY en APPS de Gaston. Se redactó maestro, alcance y plan antes de codificar. Se guarda esta base antes de la implementación.
- 2026-10-19: Se implementó V0.1 estática: editor de escenas, capítulos, búsqueda, modo enfoque, tablero ordenable/lienzo, fichas, cronología, versiones, papelera, JSON/TXT y revisión manual.
- 2026-10-19: Se ejecutaron seis pruebas de dominio: exportación Unicode, estructuras e IDs inválidos, recuperación independiente, conflicto de revisión, revisión histórica y texto inválido. Todas pasan. Sintaxis de módulos comprobada.
- 2026-10-19: Se detectó y corrigió que una revisión histórica impedía reimportar proyectos tras recuperar versiones donde ya no existía esa escena. Se conserva la revisión sin permitir aplicación a escena inexistente.
- 2026-10-19: Se añadieron README, licencia MIT y tres diseños aprobados. Se empaqueta fuente completa y pruebas en MORIARTY_V0.1_2026-10-19.zip; entrega en la misma carpeta de Drive. Se actualiza este maestro en el mismo archivo.

## Verificación y límites de esta entrega
Pruebas de dominio: 6/6. Sintaxis: app.js, model.js y sw.js. No se realizó prueba interactiva ni capturas reales: la herramienta del navegador conectado no está disponible en esta sesión. Las imágenes incluidas son conceptos, no capturas del código. No se publica ni despliega: entrega descargable solicitada. Modo offline e instalación requieren prueba en navegador bajo HTTPS/localhost y no se dan por verificados.

## Próximos bloques definidos
1. Validación visual e interactiva en computadora y celular, incluido guardado/exportación y modo offline.
2. Formato enriquecido y comparación con cambios individuales; UI contextual de fichas.
3. Relaciones visuales y cronología gráfica.
4. Integración Drive para revisión JSON: pendiente por instrucción explícita; no implementada.
