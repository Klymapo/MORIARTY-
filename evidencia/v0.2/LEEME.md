# MORIARTY V0.2 — Biblioteca y sagas

Esta entrega añade biblioteca, creación y navegación entre libros, sagas opcionales con orden de volúmenes e iconos SVG locales. Incluye migración del proyecto V0.1, importación aditiva y respaldo de toda la biblioteca. Se corrigieron los tres defectos detectados durante la revisión de V0.1.

## Abrir la aplicación

```sh
cd moriarty
python3 -m http.server 8080 --directory dist
```

Abrir http://localhost:8080. No abrir `index.html` directamente. Consulta `moriarty/README.md` para migración, respaldos y límites.

## Qué contiene

- `moriarty/`: código completo, documentación, licencia y pruebas sin dependencias de producto.
- `evidence/galeria.html`: galería de siete capturas reales.
- `evidence/resultados-ui.json`: 49 comprobaciones finales de navegador, todas correctas.
- `evidence/pruebas-dominio.txt`: 14 pruebas de dominio correctas.
- `evidence/verificar_v02.py`: recorrido de QA utilizado.
- `evidence/biblioteca-prueba.moriarty.json`: datos ficticios de prueba para explorar la biblioteca, importables desde la app.

La aplicación no incluye datos de muestra precargados; arranca con «Mi primer libro» o migra el proyecto V0.1 existente en el mismo origen.

**Drive para revisión IA sigue pendiente.** No hay sincronización ni envío de manuscritos a servidores. La app no se ha desplegado públicamente. Móvil verificado por emulación en Chromium, no en teléfono físico.
