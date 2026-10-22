import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createProject, validate, migrate, entity, createPack, validatePack, mergePack, uid, SCHEMA} from '../dist/model.js';
import {createLibrary, importIntoLibrary, validateLibrary} from '../dist/library.js';

const v1 = () => ({
  schemaVersion: 1,
  id: 'p1',
  title: 'Vieja',
  chapters: [{id: 'c1', title: 'Uno', act: 1, x: 0, y: 0, scenes: [{id: 's1', title: 'E', text: 'hola'}], versions: [], trashed: false}],
  entities: [{id: 'e1', type: 'Personaje', name: 'Theo', notes: '', trashed: false}],
  events: [{id: 'v1', title: 'Algo', when: 'ayer', chapterId: 'c1', trashed: false}],
  reviews: [],
});

test('v1 exports migrate to v2 with empty defaults and validate', () => {
  const p = validate(v1());
  assert.equal(p.schemaVersion, SCHEMA);
  assert.equal(p.cover, '');
  assert.deepEqual(p.chapters[0].entityIds, []);
  assert.equal(p.chapters[0].status, 'borrador');
  assert.deepEqual(p.entities[0].relations, []);
  assert.equal(p.events[0].order, 0);
  assert.equal(migrate(v1()).schemaVersion, SCHEMA);
});

test('v2 rejects dangling references, bad images, bad colors and unknown status', () => {
  const ok = () => validate(createProject());
  let p = createProject();
  p.chapters[0].entityIds = ['nope'];
  assert.throws(() => validate(p));
  p = createProject();
  p.entities.push({...entity(), relations: [{targetId: 'nope', label: 'x'}]});
  assert.throws(() => validate(p));
  p = createProject();
  p.entities.push({...entity(), image: 'javascript:alert(1)'});
  assert.throws(() => validate(p));
  p = createProject();
  p.entities.push({...entity(), image: 'data:image/png;base64,iVBORw0KGgo='});
  assert.equal(validate(p).entities.length, 1);
  p = createProject();
  p.chapters[0].color = 'red';
  assert.throws(() => validate(p));
  p = createProject();
  p.chapters[0].status = 'otro';
  assert.throws(() => validate(p));
  p = createProject();
  p.entities.push({...entity(), fields: {Edad: '1'}});
  assert.throws(() => validate(p));
  assert.ok(ok());
});

test('relations may point at chapters and entities', () => {
  const p = createProject();
  const a = entity(),
    b = entity('Lugar');
  a.relations = [
    {targetId: b.id, label: 'vive en'},
    {targetId: p.chapters[0].id, label: 'aparece en'},
  ];
  p.entities.push(a, b);
  p.chapters[0].entityIds = [a.id];
  assert.equal(validate(p).entities[0].relations.length, 2);
});

test('pack: entities only, remapped ids, relations preserved, chapters placed at the end', () => {
  const src = createProject('Fuente');
  const a = entity(),
    b = entity('Lugar');
  a.relations = [{targetId: b.id, label: 'vive en'}];
  src.entities.push(a, b);
  src.chapters[0].entityIds = [a.id];
  src.chapters[0].scenes[0].text = 'texto';
  const packE = createPack(src, {entities: true, chapters: false, events: false});
  assert.equal(packE.kind, 'moriarty-pack');
  assert.equal(packE.chapters.length, 0);
  const target = createProject('Destino');
  const merged = mergePack(target, JSON.parse(JSON.stringify(packE)));
  assert.equal(target.entities.length, 0, 'original untouched');
  assert.equal(merged.entities.length, 2);
  assert.notEqual(merged.entities[0].id, a.id);
  assert.equal(merged.entities[0].relations[0].targetId, merged.entities[1].id);
  const packAll = createPack(src);
  const merged2 = mergePack(target, packAll);
  assert.equal(merged2.chapters.length, 2);
  assert.equal(merged2.chapters[1].scenes[0].text, 'texto');
  assert.equal(merged2.chapters[1].entityIds[0], merged2.entities[0].id);
  assert.equal(merged2.chapters[1].versions.length, 0);
});

test('pack rejects wrong kind, empty content and unsafe ids', () => {
  assert.throws(() => validatePack({kind: 'moriarty-library'}));
  assert.throws(() => validatePack({kind: 'moriarty-pack', schemaVersion: SCHEMA}));
  assert.throws(() => validatePack({kind: 'moriarty-pack', schemaVersion: SCHEMA, entities: [{id: '<img>', type: 'Nota', name: 'x', notes: ''}]}));
  const minimal = validatePack({kind: 'moriarty-pack', schemaVersion: SCHEMA, entities: [{id: 'theo', type: 'Personaje', name: 'Theo', notes: ''}]});
  assert.equal(minimal.entities[0].name, 'Theo');
  assert.deepEqual(minimal.entities[0].tags, []);
});

test('events in a pack keep chapter links to pack chapters and get sequential order', () => {
  const target = createProject();
  target.events.push({id: uid(), title: 'Previo', when: '', order: 4, chapterId: '', trashed: false});
  const pack = {
    kind: 'moriarty-pack',
    schemaVersion: SCHEMA,
    chapters: [{id: 'cap', title: 'Cap', scenes: [{id: 'esc', title: 'E', text: ''}]}],
    events: [{id: 'ev', title: 'Evento', when: 'noche', chapterId: 'cap'}],
  };
  const m = mergePack(target, pack);
  assert.equal(m.events[1].order, 5);
  assert.equal(m.events[1].chapterId, m.chapters[1].id);
});

test('library import of a v1 book migrates and remaps entity references', () => {
  const lib = createLibrary();
  const next = importIntoLibrary(lib, v1());
  assert.equal(next.books[1].project.schemaVersion, SCHEMA);
  const p = createProject();
  const e = entity();
  p.entities.push(e);
  p.chapters[0].entityIds = [e.id];
  const n2 = importIntoLibrary(lib, p);
  assert.equal(n2.books[1].project.chapters[0].entityIds[0], n2.books[1].project.entities[0].id);
  assert.ok(validateLibrary(n2));
});

import {addBook, trashBook, restoreBook, purgeBook, liveBooks, moveBook, addSaga} from '../dist/library.js';
test('book trash is reversible, purge only from trash, active book always live', () => {
  const l = createLibrary();
  const a = l.books[0];
  const b = addBook(l, 'Dos');
  trashBook(l, b.project.id);
  assert.equal(liveBooks(l).length, 1);
  assert.equal(l.activeBookId, a.project.id, 'active moves to a live book');
  assert.ok(validateLibrary(l));
  restoreBook(l, b.project.id);
  assert.equal(liveBooks(l).length, 2);
  assert.throws(() => purgeBook(l, b.project.id), /papelera/);
  trashBook(l, a.project.id);
  trashBook(l, b.project.id);
  assert.equal(liveBooks(l).length, 1, 'a fresh book is created when everything is trashed');
  assert.equal(l.books.find((x) => x.project.id === l.activeBookId).trashed, undefined);
  purgeBook(l, a.project.id);
  assert.equal(l.books.length, 2);
  const bad = structuredClone(l);
  bad.books[0].trashed = 'sí';
  assert.throws(() => validateLibrary(bad));
});
test('saga ordering skips trashed volumes', () => {
  const l = createLibrary(), s = addSaga(l, 'Saga');
  const x = addBook(l, 'X', s.id), y = addBook(l, 'Y', s.id), z = addBook(l, 'Z', s.id);
  trashBook(l, y.project.id);
  moveBook(l, z.project.id, -1);
  assert.deepEqual(liveBooks(l).filter((b) => b.sagaId === s.id).map((b) => b.project.title), ['Z', 'X']);
});
