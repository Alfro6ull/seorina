const memory=new Map();
let db;
function open(){
 return db||=(new Promise((resolve,reject)=>{
  const r=indexedDB.open('seorina-filter-photos',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('photos',{keyPath:'id'});
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 })).catch(()=>null);
}
async function use(mode,work){
 const store=await open();
 if(!store)return undefined;
 return new Promise((resolve,reject)=>{
  const tx=store.transaction('photos',mode),req=work(tx.objectStore('photos'));
  tx.oncomplete=()=>resolve(req.result);tx.onabort=()=>reject(tx.error);
 }).catch(()=>undefined);
}
export async function listLocal(){
 const rows=await use('readonly',s=>s.getAll());
 const available=new Map((rows||[]).map(row=>[row.id,row]));
 for(const [id,row] of memory)available.set(id,row);
 return [...available.values()].sort((a,b)=>b.saved-a.saved);
}
export async function addLocal(file){
 const id=[file.name,file.size,file.lastModified].join('|'),row={id,name:file.name,file,saved:Date.now()};
 memory.set(id,row);await use('readwrite',s=>s.put(row));
 return row;
}
export async function removeLocal(id){
 memory.delete(id);await use('readwrite',s=>s.delete(id));
}
