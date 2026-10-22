# MORIARTY V0.3

Estudio personal de escritura con biblioteca de libros y sagas. Sin dependencias externas, cuentas obligatorias ni APIs de pago.

**Novedades V0.3 (2026-10-22):** base visual nueva (tokens, modo oscuro automático, tipografías Literata e Inter empaquetadas en local bajo OFL, transiciones entre espacios, pantalla de arranque, legibilidad del manuscrito con tamaño de letra ajustable), formato **JSON v2** (fichas con imagen, color, etiquetas, campos por tipo y relaciones; capítulos con resumen, punto de vista, estado y fichas vinculadas; acontecimientos ordenables), **carga por partes** (paquetes de fichas/capítulos/acontecimientos, pegar JSON, arrastrar y soltar), portadas e imágenes de ficha comprimidas en el navegador, guardado con pausa corta y vuelta al último espacio abierto. Especificación en `docs/MORIARTY_JSON_V2.md`. El Pizarrón visual (reemplazo de Tablero y Archivo) llega en V0.4.

## Ejecutar

Desde esta carpeta:

```sh
python3 -m http.server 8080 --directory dist
```

Abrir http://localhost:8080 en un navegador moderno. No abrir `index.html` con `file://`: los módulos y el modo offline requieren HTTP/HTTPS. Para instalación o acceso desde celular se necesita un alojamiento HTTPS; este ZIP no publica la aplicación.

## Biblioteca

- Crear y abrir libros sin reemplazar los existentes.
- Editar título y sinopsis, buscar libros y filtrar la biblioteca.
- Crear y editar sagas; asignar cada libro a una saga opcional o dejarlo independiente.
- Ordenar los volúmenes dentro de una saga con las flechas de sus tarjetas.
- Volver a Biblioteca desde cualquier espacio para cambiar de libro.
- Iconos SVG locales acompañan controles y navegación, con etiquetas accesibles.

Cada libro conserva su propio manuscrito, capítulos, escenas, fichas, cronología, versiones y revisiones. Las portadas tipográficas se generan con el título y la saga; no son imágenes de portada personalizadas. No se incorporan borrado de libros, eliminación de sagas ni pertenencia a varias sagas en esta versión.

## Escribir

Se mantienen editor de texto plano, búsqueda de capítulos/contenido, conteo de palabras, modo enfoque, tablero ordenable y lienzo libre, fichas, cronología manual, versiones recuperables y papelera de capítulos/fichas/eventos. Enter o doble clic abre capítulos desde el tablero. Revisión manual por propuesta pegada y descarga de solicitud JSON; no hay generación IA incorporada.

## Guardado, migración y respaldos

La biblioteca se guarda en `localStorage` en este navegador y origen. No sincroniza dispositivos. Exporta con frecuencia y antes de mover o actualizar la app.

Al abrir V0.2 en el mismo origen donde se usó V0.1, el proyecto anterior se incorpora a la biblioteca y se conserva la clave antigua como copia de seguridad. Cambiar de puerto, dominio, protocolo o navegador crea otro almacenamiento: en ese caso exporta desde V0.1 e importa el JSON en V0.2. No borres los datos del navegador antes de respaldarlos.

En Biblioteca, **Respaldar biblioteca** descarga todos los libros, sagas y su orden. Dentro de un libro, **Exportar libro** descarga un proyecto compatible con el formato V0.1. **Descargar TXT** exporta el manuscrito activo.

**Cargar** acepta libros V0.1/V0.2/V0.3, bibliotecas y paquetes (`kind: moriarty-pack`) de hasta 25 MB; se detecta el tipo por el archivo. Los paquetes se incorporan al libro activo. También se puede pegar el JSON o arrastrar el archivo a la ventana. Añade copias independientes con nuevos identificadores sin reemplazar tus otros libros. Al importar repetidamente un archivo se crean copias adicionales; no hay sincronización ni deduplicación automática. Las sagas importadas también se añaden como copias. El formato individual de libro no contiene la sinopsis ni su pertenencia a una saga; usa el respaldo completo para conservar esa organización.

Un archivo inválido se rechaza antes de modificar la biblioteca. Si el guardado es ilegible, se bloquea su sobrescritura y se ofrece descargar el dato original, importar un respaldo o iniciar explícitamente otra biblioteca. Si el almacenamiento está lleno o deshabilitado, aparece un aviso y puedes descargar el estado en memoria. Recuperar una versión conserva también la anterior.

## Sin conexión

Después de una primera carga satisfactoria en HTTP local o HTTPS, el service worker permite recargar y seguir escribiendo sin conexión. La V0.2 incluye en caché los módulos de biblioteca e iconos. La instalación PWA depende del navegador y no se ha verificado en dispositivos físicos.

## Cambios respecto de V0.1

Además de biblioteca, sagas e iconos, se corrigieron los tres defectos reproducidos durante la revisión: IDs importados que podían inyectar HTML, etiquetas de escena desactualizadas y reordenación de cronología que incluía eventos en papelera.

## Límites explícitos

**Drive/MCP para revisión IA permanece PENDIENTE.** No se ha implementado ni activado. Tampoco se incluyen importación de respuestas de revisión JSON, resaltado de diferencias, aceptación por cambio, editor enriquecido, DOCX/PDF, relaciones gráficas ni sincronización remota.

## Imágenes

Las ilustraciones de `dist/img/` (logo, arranque, estados vacíos, retratos por tipo, portadas y texturas) son la entrega de Argos del 2026-10-22, convertidas a WebP y reducidas para la PWA (380 KB en total). Los originales viven en Drive (`APPS/MORIARTY/IMAGENES_ARGOS`).


Las portadas y las imágenes de ficha se guardan dentro del JSON como data URL (base64), comprimidas al subirlas (512 px para fichas, 900 px para portadas, WebP o JPEG). Los SVG con código se rechazan.

## Verificar

```sh
npm test
```

Las pruebas no requieren instalar dependencias (21 de dominio y biblioteca). La verificación en navegador V0.3 está en `evidencia/v0.3/verificar_v03.py` (23/23 comprobaciones en Chromium 141, escritorio, oscuro, 320/390 px y sin conexión); esos scripts de QA requieren Python, Playwright y Chromium, no son dependencias de la aplicación.

Responsable: Admin / Atátoriz. Código original MIT; ver LICENSE. Documento maestro y diseño V0.2 en `docs/`.

---

## Origen de este repositorio

Migrado el 2026-10-20 desde los ZIP de Drive (Gaston, `APPS/MORIARTY`), conservando el historial en tres commits:

1. `v0.1`: `MORIARTY_V0.1_2026-10-19.zip`.
2. Revisión de V0.1 con tres defectos y su evidencia: `MORIARTY_V0.1_REVISION.zip` → `evidencia/v0.1-revision/`.
3. `v0.2` (Biblioteca y sagas, con los tres defectos corregidos): `MORIARTY_V0.2_BIBLIOTECA_2026-10-19.zip` → evidencia en `evidencia/v0.2/`.

El código no se modificó en la migración. El documento maestro vigente está en Drive (`MORIARTY_DOCUMENTO_MAESTRO_V02.md`) y es la fuente de verdad del Registro de cambios.

> Repositorio **público**. Desde el 2026-10-22, por decisión de Admin, los libros se publican en `historias/` (todos los derechos reservados; el MIT cubre solo el código). No guardar aquí chats privados.
