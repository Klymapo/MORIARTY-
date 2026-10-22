# MORIARTY — Formato JSON v2

Especificación para generar archivos que MORIARTY V0.3 carga sin errores, desde un chat (Elio, Argos) o a mano. Todo campo omitido en un archivo v2 se rellena con su valor vacío al cargar; los archivos v1 se migran solos.

## Tres tipos de archivo

| `kind` | Qué es | Cómo se carga |
| --- | --- | --- |
| *(sin kind)* | **Libro** completo (`schemaVersion: 2`) | Se añade a la biblioteca como libro nuevo |
| `moriarty-library` | **Biblioteca**: varios libros y sagas | Se añaden copias de todos los libros y sagas |
| `moriarty-pack` | **Paquete**: solo fichas, capítulos o acontecimientos | Se incorporan al **libro activo**, sin tocar lo demás |

Carga: menú **Cargar → Abrir archivo JSON**, **Pegar JSON**, o arrastrar el archivo a la ventana. Límite 25 MB. Un archivo inválido se rechaza completo antes de modificar nada.

## Identificadores

`id` es texto de 1 a 128 caracteres: letras, números, `_` y `-`. Deben ser únicos dentro del archivo. En un paquete los IDs son locales: MORIARTY los reasigna al cargar y conserva las referencias entre ellos (`entityIds`, `relations.targetId`, `events.chapterId`).

## Libro

```json
{
  "schemaVersion": 2,
  "id": "mi-libro",
  "title": "Título",
  "cover": "",
  "chapters": [ … ],
  "entities": [ … ],
  "events": [ … ],
  "reviews": []
}
```

`cover`: `""` o un data URL de imagen (`data:image/webp;base64,…`, también png/jpeg/gif/svg+xml), máximo 1.5 M de caracteres.

## Capítulo

```json
{
  "id": "cap-1",
  "title": "1 · El consultor",
  "act": 1,
  "x": 40, "y": 40,
  "summary": "Qué pasa, en dos líneas.",
  "pov": "Alastor",
  "status": "borrador",
  "color": "",
  "entityIds": ["alastor"],
  "scenes": [{"id": "cap-1-esc-1", "title": "Escena 1", "text": ""}],
  "versions": [],
  "trashed": false
}
```

- `act`: 1, 2 o 3. `x`, `y`: posición en el lienzo libre (números).
- `status`: `idea` · `borrador` · `revisado` · `listo`.
- `color`: `""` o `#rrggbb`.
- `entityIds`: IDs de fichas que aparecen en el capítulo. Deben existir.
- `scenes`: al menos una. Para dejar el texto vacío usa `"text": ""`.
- Obligatorios en un libro: `id`, `title`, `scenes`. El resto se rellena si falta.

## Ficha (entity)

```json
{
  "id": "alastor",
  "type": "Personaje",
  "name": "Alastor Kleinteil",
  "notes": "Descripción libre.",
  "image": "",
  "color": "",
  "tags": ["protagonista"],
  "fields": {"edad": "28", "rol": "Detective"},
  "relations": [{"targetId": "theo", "label": "dúo"}],
  "trashed": false
}
```

- `type`: `Personaje` · `Lugar` · `Objeto` · `Nota`.
- `fields`: claves fijas por tipo (solo letras minúsculas, sin acentos):
  - Personaje: `edad`, `rol`
  - Lugar: `region`
  - Objeto: `dueno`
  - Nota: ninguna
- `tags`: hasta 20 etiquetas de ≤ 64 caracteres.
- `relations`: `targetId` puede ser otra ficha **o un capítulo**; `label` ≤ 120 caracteres.
- `image`: igual que `cover`. La app comprime a 512 px al subir desde el dispositivo.

## Acontecimiento (event)

```json
{"id": "ev-1", "title": "El concierto", "when": "D0, noche", "order": 0, "chapterId": "cap-1", "trashed": false}
```

`when` es texto libre; `order` decide el orden (número); `chapterId` puede ser `""`.

## Paquete

```json
{
  "kind": "moriarty-pack",
  "schemaVersion": 2,
  "title": "opcional",
  "entities": [ … ],
  "chapters": [ … ],
  "events": [ … ]
}
```

Cualquiera de las tres listas puede faltar o ir vacía, pero no las tres. Los capítulos del paquete se colocan al final del libro; los acontecimientos, después de los existentes. **Exportar → Exportar paquete de fichas** genera uno desde el libro activo.

## Paquete de capítulo

*Exportar capítulo* genera un paquete con `bookId` y `bookTitle` del libro de origen, un solo capítulo (sin historial de versiones), sus fichas vinculadas y sus acontecimientos. Si se carga en el libro con ese mismo `bookId` y las piezas ya existen, se puede **reemplazar por ID** (el texto anterior queda como versión) en lugar de duplicar. Las referencias a fichas o capítulos que no vienen en el paquete se conservan solo si existen en el libro de destino.

## Identidad de libros

Un libro conserva su `id` al importarse si la biblioteca no tiene otro con el mismo `id`. Si ya existe, la app ofrece reemplazarlo (la versión previa va a la papelera de libros) o importar una copia con IDs nuevos.

## Ejemplo mínimo de paquete de fichas

```json
{"kind":"moriarty-pack","schemaVersion":2,"entities":[
 {"id":"theo","type":"Personaje","name":"Theo","notes":"Consultor.","fields":{"edad":"28","rol":"Consultor"}},
 {"id":"libreria","type":"Lugar","name":"Librería de los Brown","notes":"","fields":{"region":"Ashenmoor"},
  "relations":[{"targetId":"theo","label":"donde escribe"}]}
]}
```

## Errores frecuentes

- `type` con otra palabra (`"character"`) → rechazado.
- Clave de `fields` con mayúsculas o acentos (`"Edad"`) → rechazado.
- `entityIds` o `targetId` que no existen en el mismo archivo → rechazado.
- `status` fuera de la lista → rechazado.
- JSON con comas finales o comillas simples → "No es un JSON válido".
