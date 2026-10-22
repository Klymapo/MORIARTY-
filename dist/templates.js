// MORIARTY — plantillas de capítulos y fichas. Las líneas que empiezan con "> " son guías: bórralas al escribir.
import {chapter, entity, scene} from './model.js';

export const CHAPTER_TEMPLATES = [
  {id: 'blank', name: 'En blanco', desc: 'Un capítulo con una escena vacía.'},
  {
    id: 'first',
    name: 'Primer capítulo',
    desc: 'Epígrafe, gancho, presentación del mundo y cierre con pregunta.',
    build: (c) => {
      c.title = '1 · ';
      c.status = 'idea';
      c.summary = 'Qué promete este libro y quién lo cuenta.';
      c.scenes = [
        scene('Apertura', '-> *Epígrafe o cita que marque el tono.* <-\n\n> GANCHO. Primera frase que haga una promesa: una imagen, una voz o un problema. Sin explicar todavía.\n\n> Dónde estamos y quién mira. Un detalle físico concreto en el primer párrafo.'),
        scene('El mundo y la voz', '> Mostrar la vida normal del protagonista con una acción, no con un resumen.\n\n> Un deseo claro y algo que estorba.\n\n> Sembrar un detalle que cobrará sentido más adelante.'),
        scene('Cierre', '> El giro o la llamada que rompe la normalidad.\n\n> Última línea: una pregunta que obligue a pasar la página.'),
      ];
    },
  },
  {
    id: 'three',
    name: 'Tres escenas',
    desc: 'Planteamiento, giro y cierre.',
    build: (c) => {
      c.scenes = [scene('Planteamiento', '> Objetivo de la escena y quién lo quiere.'), scene('Giro', '> Algo cambia: nueva información o un obstáculo.'), scene('Cierre', '> Consecuencia y gancho hacia el siguiente capítulo.')];
    },
  },
  {
    id: 'flashback',
    name: 'Flashback',
    desc: 'Anclaje en el presente, salto al pasado y regreso.',
    build: (c) => {
      c.scenes = [
        scene('Anclaje', '> Un objeto, olor o frase del presente dispara el recuerdo.'),
        scene('Entonces', '> El pasado en tiempo vivo, no resumido. Entrar tarde, salir temprano.\n\n***'),
        scene('Regreso', '> Volver al presente con algo cambiado en quien recuerda.'),
      ];
    },
  },
  {
    id: 'illustrated',
    name: 'Capítulo ilustrado',
    desc: 'Con espacio para imágenes y pies de foto.',
    build: (c) => {
      c.scenes = [scene('Escena', '> Usa el botón Imagen de la barra para insertar una imagen aquí. Queda guardada dentro del libro.\n\n> El texto entre corchetes de la imagen es el pie de foto.')];
    },
  },
];

export const ENTITY_TEMPLATES = [
  {id: 'blank', name: 'Ficha vacía', type: null, desc: 'Del tipo que elijas.'},
  {
    id: 'arc',
    name: 'Arco de personaje',
    type: 'Nota',
    desc: 'Deseo, necesidad, mentira, herida, quiebre.',
    build: (e) => {
      e.name = 'Arco · (personaje)';
      e.tags = ['arco'];
      e.notes =
        'DESEO (lo que quiere): \nNECESIDAD (lo que le falta de verdad): \nMENTIRA QUE CREE: \nVERDAD QUE DESCUBRE: \nHERIDA / FANTASMA: \nESTADO AL INICIO: \nPUNTO DE QUIEBRE (capítulo): \nESTADO AL FINAL: \nTIPO DE ARCO: positivo / plano / negativo\n\nHITOS DEL ARCO\n1. \n2. \n3. ';
    },
  },
  {
    id: 'map',
    name: 'Mapa',
    type: 'Lugar',
    desc: 'Un lugar con imagen de mapa y sus zonas.',
    build: (e) => {
      e.name = 'Mapa de ';
      e.tags = ['mapa'];
      e.fields = {region: ''};
      e.notes = 'Toca el retrato de esta ficha para subir la imagen del mapa.\n\nZONAS\n- \n- \n\nDISTANCIAS Y TIEMPOS\n- \n\nQUIÉN VIVE DÓNDE\n- ';
    },
  },
  {
    id: 'outline',
    name: 'Escaleta de capítulo',
    type: 'Nota',
    desc: 'Objetivo, conflicto, giro, cierre.',
    build: (e) => {
      e.name = 'Escaleta · (capítulo)';
      e.tags = ['escaleta'];
      e.notes = 'OBJETIVO DEL CAPÍTULO: \nPOV: \nDÓNDE Y CUÁNDO: \nQUIÉN APARECE: \n\nESCENAS\n1. (objetivo → conflicto → resultado)\n2. \n3. \n\nGIRO: \nCIERRE / GANCHO: \nPISTAS SEMBRADAS: ';
    },
  },
  {
    id: 'timeline',
    name: 'Línea de vida',
    type: 'Nota',
    desc: 'Fechas clave de un personaje.',
    build: (e) => {
      e.name = 'Línea de vida · (personaje)';
      e.tags = ['cronología'];
      e.notes = 'AÑO — Nace en \nAÑO — \nAÑO — \nPRESENTE — ';
    },
  },
  {
    id: 'world',
    name: 'Regla del mundo',
    type: 'Nota',
    desc: 'Una ley, sistema o costumbre y sus límites.',
    build: (e) => {
      e.name = 'REGLA · ';
      e.tags = ['continuidad'];
      e.notes = 'LA REGLA: \nQUÉ PERMITE: \nQUÉ CUESTA / QUÉ PROHÍBE: \nEXCEPCIONES: \nDÓNDE SE VE EN LA HISTORIA: ';
    },
  },
];

export function chapterFrom(templateId) {
  const c = chapter();
  const t = CHAPTER_TEMPLATES.find((x) => x.id === templateId);
  if (t?.build) t.build(c);
  return c;
}
export function entityFrom(templateId, type = 'Personaje') {
  const t = ENTITY_TEMPLATES.find((x) => x.id === templateId);
  const e = entity(t?.type || type);
  if (t?.build) t.build(e);
  return e;
}
