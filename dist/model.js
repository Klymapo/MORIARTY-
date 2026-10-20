export const uid=()=>globalThis.crypto.randomUUID();
export const scene=()=>({id:uid(),title:'Nueva escena',text:''});
export const chapter=()=>({id:uid(),title:'Nuevo capítulo',act:1,x:40,y:40,scenes:[scene()],versions:[],trashed:false});
export function createProject(title='Mi nueva novela'){return {schemaVersion:1,id:uid(),title,chapters:[chapter()],entities:[],events:[],reviews:[]};}
export function validate(p){
 const fail=()=>{throw Error('Archivo MORIARTY inválido o de versión incompatible.');};
 const str=x=>typeof x==='string';const ids=new Set();const id=x=>{if(!str(x)||ids.has(x))fail();ids.add(x);};
 if(!p||p.schemaVersion!==1||!str(p.title)||!Array.isArray(p.chapters)||!p.chapters.length||!Array.isArray(p.entities)||!Array.isArray(p.events)||!Array.isArray(p.reviews))fail();id(p.id);
 const scenes=a=>{if(!Array.isArray(a)||!a.length)fail();const seen=new Set();for(const s of a){if(!s||!str(s.id)||seen.has(s.id)||!str(s.title)||!str(s.text))fail();seen.add(s.id);}};
 for(const c of p.chapters){if(!c||!str(c.title)||!Number.isInteger(c.act)||c.act<1||c.act>3||!Number.isFinite(c.x)||!Number.isFinite(c.y)||typeof c.trashed!=='boolean'||!Array.isArray(c.versions))fail();id(c.id);scenes(c.scenes);for(const s of c.scenes)id(s.id);for(const v of c.versions){if(!str(v.label)||!str(v.date))fail();id(v.id);scenes(v.scenes);}}
 for(const e of p.entities){if(!e||!str(e.name)||!str(e.notes)||!['Personaje','Lugar','Objeto','Nota'].includes(e.type)||typeof e.trashed!=='boolean')fail();id(e.id);}
 for(const e of p.events){if(!e||!str(e.title)||!str(e.when)||!str(e.chapterId)||typeof e.trashed!=='boolean'||(e.chapterId&&!p.chapters.some(c=>c.id===e.chapterId)))fail();id(e.id);}
 for(const r of p.reviews){if(!r||!str(r.base)||!str(r.proposal)||!str(r.sceneId)||!str(r.chapterId)||!str(r.instruction)||!p.chapters.some(c=>c.id===r.chapterId))fail();id(r.id);}
 return structuredClone(p);
}
export function snapshot(c,label='Versión manual'){const v={id:uid(),label,date:new Date().toISOString(),scenes:structuredClone(c.scenes)};c.versions.push(v);return v;}
export function restore(c,id){const v=c.versions.find(v=>v.id===id);if(!v)throw Error('Versión inexistente');const copy=structuredClone(v.scenes);snapshot(c,'Antes de recuperar');c.scenes=copy;}
export function applyReview(s,r){if(s.text!==r.base)throw Error('El original cambió. Conservamos la propuesta, pero debes iniciar otra revisión.');s.text=r.proposal;}
