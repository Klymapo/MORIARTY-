# MORIARTY V0.1
Estudio personal de escritura. Sin dependencias ni APIs de pago.

## Ejecutar
Se requiere un navegador moderno. Desde esta carpeta: `python3 -m http.server 8080 --directory dist`, luego abrir http://localhost:8080. No abrir index.html con file://: los módulos y el modo offline requieren HTTP/HTTPS. Para uso en celular e instalación se necesita alojamiento HTTPS; esta entrega es código descargable y no incluye despliegue. La disponibilidad de instalación depende del navegador.

## Funciones
Capítulos, escenas, búsqueda, editor de texto plano, tablero ordenable y lienzo libre, fichas, cronología manual, versiones recuperables, papelera, exportación/importación JSON y manuscrito TXT. Revisión por propuesta pegada y solicitud JSON descargable. Enter o doble clic abre capítulos en tablero. Guardado local visible y modo enfoque.

## Protección de archivos
Exporta respaldos con frecuencia. localStorage puede ser borrado por el navegador y no sincroniza dispositivos. Abrir o crear otro proyecto solicita confirmación y descarga una copia del actual. Un archivo inválido se rechaza antes de reemplazarlo. Si el guardado inicial es ilegible se bloquea su sobrescritura. Recuperar una versión conserva también la anterior. Sin envío de textos a servidores.

## Límites explícitos
No hay conexión de Drive/MCP/IA, importación de respuestas JSON, resaltado de diferencias ni aceptación por cambio. No hay editor enriquecido, DOCX/PDF, conexiones gráficas entre fichas ni sincronización. Revisión manual de escena completa. Tablero libre tiene coordenadas independientes del orden. Cronología usa orden manual y fecha textual.

## Verificar
`node --test tests/*.test.mjs`

Responsable: Admin / Atátoriz. Código original MIT; ver LICENSE. Documentación en docs.
