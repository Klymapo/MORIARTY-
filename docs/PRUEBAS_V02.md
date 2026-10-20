# Verificación V0.2

Fecha: 2026-10-19 UTC. Navegador: Chromium 154.0.8037.57, con Playwright Python en el entorno de revisión.

Resultado final: **14/14 pruebas de dominio y 49/49 comprobaciones de navegador correctas. Cero errores JavaScript en el recorrido final.**

## Dominio

Las seis pruebas originales siguen pasando. Ocho nuevas pruebas cubren migración sin alterar la clave antigua, independencia entre libros, orden por saga, importación con reasignación de referencias y versiones, combinación de bibliotecas, atomicidad de validación, bloqueo de IDs inseguros y estructura de biblioteca.

Comando reproducible: `npm test`. Registro en `../../evidence/pruebas-dominio.txt`.

## Navegador

Se probó crear/abrir libros, editar sinopsis y saga, crear saga, orden de volúmenes, traslado a independiente y vuelta a saga, búsqueda, filtros y persistencia tras recargar. Las fichas y revisiones permanecen en su libro. Se comprobó abrir capítulos con teclado, versiones, la corrección de cronología y renombrado de escenas, exportación de libro, respaldo de biblioteca, importación aditiva de libro y biblioteca, rechazo de estructura e IDs inseguros, migración de V0.1 y protección de un guardado ilegible.

El modo sin conexión se verificó después de la primera carga: recarga de biblioteca, apertura de otro libro, edición y persistencia. No se verificó la instalación PWA.

Escritorio: viewport 1440 × 1000. Móvil emulado en Chromium: 390 × 844 con creación de libro y capturas. Comprobación de ausencia de desborde horizontal en los seis espacios a 320, 390 y 768 px. Esto no equivale a pruebas en un teléfono físico, Safari/iOS o Firefox.

Script y resultados detallados: `../../evidence/verificar_v02.py` y `../../evidence/resultados-ui.json`. El script usa puertos y rutas del entorno de revisión; ajustar `O`, `URL` y la ruta del proyecto V0.1 para reproducirlo en otra máquina. La aplicación no depende de Python/Playwright para funcionar una vez servida por HTTP/HTTPS.

## Capturas reales

1. `01-biblioteca-escritorio.png`: biblioteca de varios libros.
2. `02-saga-escritorio.png`: saga y orden de volúmenes.
3. `03-detalles-libro.png`: título, sinopsis y pertenencia a saga.
4. `04-escritor-iconos.png`: iconos y acceso a la biblioteca desde el editor.
5. `05-biblioteca-movil.png`: biblioteca en móvil emulado.
6. `06-saga-movil.png`: saga en móvil emulado.
7. `07-nuevo-libro-movil.png`: formulario de creación en móvil emulado.

Los textos e historias son datos ficticios de prueba. Las capturas son PNG directos del navegador. No son diseños conceptuales ni imágenes generadas.
