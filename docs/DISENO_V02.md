# MORIARTY V0.2 — Biblioteca y sagas

## Intención autorizada
El usuario solicita iconos y poder navegar entre libros, crearlos y agruparlos por saga. Se conserva la escritura local, sin cuentas ni dependencias; Drive para revisión IA permanece pendiente.

## Decisiones
Se amplía el proyecto individual con un contenedor de biblioteca persistido en una nueva clave local. Es preferible a sobrescribir el proyecto activo al cambiar de libro, porque permite guardar todos los libros y su organización en una operación atómica. No se incorpora almacenamiento remoto.

Entrada principal: Biblioteca, con búsqueda por título/sinopsis, vista de todos los libros, independientes o una saga. Cada tarjeta abre el libro y permite editar título, sinopsis y saga. Se pueden crear/editar sagas, cambiar un libro de saga y ordenar sus volúmenes. Una saga vacía muestra una acción para crear su primer libro. El orden se modifica con botones accesibles. El usuario confirmó una saga opcional por libro y el orden de volúmenes.

Los cinco espacios de V0.1 siguen vinculados al libro activo. Un acceso persistente a Biblioteca permite cambiar de libro. El título del libro activo se muestra al escribir; en biblioteca se muestra una cabecera propia. Iconos SVG locales con nombres textuales acompañan navegación y acciones; no se depende de fuentes externas ni de iconos sin etiqueta.

## Datos y protección
Biblioteca versionada: kind=moriarty-library, schemaVersion=1, activeBookId, books[{project, sagaId, synopsis}], sagas[{id,title,description}]. El orden del arreglo books fija el orden relativo de los volúmenes en cada saga. Cada project mantiene el formato V0.1 exportable.

Al detectar únicamente la clave antigua, se valida e incorpora el proyecto como primer libro sin borrar la clave original. Un guardado ilegible se conserva y bloquea la sobrescritura. Se puede exportar el contenido de recuperación y reiniciar explícitamente la biblioteca. La biblioteca se guarda en una única escritura localStorage; los errores se muestran y el estado en memoria puede exportarse.

Importar un libro añade una copia independiente sin sobrescribir otros libros: se reasignan IDs y referencias internos para evitar colisiones. Importar una biblioteca añade copias de libros y sagas. Se ofrece exportar el libro activo y respaldar la biblioteca completa. Validación antes de modificar datos, límites de tamaño de 25 MB y rechazo de IDs inseguros. No se introduce borrado permanente de libros ni sagas en esta entrega.

## Verificación
Pruebas de dominio para biblioteca, migración, independencia, orden, importación y referencias, rechazo de archivos inseguros. Pruebas reales en Chromium para creación de libros/sagas, edición y cambio de libro, recarga, exportación/importación, navegación móvil, iconos y offline. Regresiones para las tres incidencias de V0.1: IDs importados, título de escena y cronología con papelera.

## Entrega
Carpeta y ZIP V0.2 separados del original, documentación actualizada y capturas de escritorio/móvil emulado. Sin publicación ni integración Drive IA.
