(function(root){
'use strict';
const journalKey='chamtn:session', blobs=new WeakMap();
let dbPromise, queue=Promise.resolve();
function open(){
 if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
  const request=indexedDB.open('chamtn-session',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('images');request.result.createObjectStore('state');};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
 return dbPromise;
}
function imageBlob(canvas){
 if(!blobs.has(canvas))blobs.set(canvas,new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không lưu được ảnh')), 'image/png')));
 return blobs.get(canvas);
}
function snapshot(records,state){
 return {...state,version:1,savedAt:Date.now(),records:records.map(({source,points,...record})=>({...record,points:points.map(p=>({...p})),adjustments:points.adjustments||null}))};
}
function save(records,state){
 const meta=JSON.parse(JSON.stringify(snapshot(records,state)));
 // Small edits survive an immediate refresh, even while image encoding is pending.
 try{localStorage.setItem(journalKey,JSON.stringify(meta));}catch(_){}
 const images=records.map(r=>({id:r.id,blob:imageBlob(r.source)}));
 const task=queue.catch(()=>{}).then(async()=>{
  const db=await open(), encoded=await Promise.all(images.map(async r=>({id:r.id,blob:await r.blob})));
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(['images','state'],'readwrite'), store=tx.objectStore('images');
   // Images are immutable; only write new ones, and remove deleted papers.
   const ids=new Set(encoded.map(r=>r.id));
   const keys=store.getAllKeys();keys.onsuccess=()=>{
    const existing=new Set(keys.result);
    for(const id of existing)if(!ids.has(id))store.delete(id);
    for(const r of encoded)if(!existing.has(r.id))store.put(r.blob,r.id);
    tx.objectStore('state').put(meta,'current');
   };
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  return meta;
 });
 queue=task;return task;
}
async function load(){
 const db=await open();
 const stored=await new Promise((resolve,reject)=>{
  const tx=db.transaction(['images','state'],'readonly');let state,images,ids;
  const a=tx.objectStore('state').get('current'),b=tx.objectStore('images').getAll(),c=tx.objectStore('images').getAllKeys();
  a.onsuccess=()=>state=a.result;b.onsuccess=()=>images=b.result;c.onsuccess=()=>ids=c.result;
  tx.oncomplete=()=>resolve({state,images:new Map(ids.map((id,i)=>[id,images[i]]))});tx.onerror=()=>reject(tx.error);
 });
 let meta=stored.state;
 try{const journal=JSON.parse(localStorage.getItem(journalKey));if(journal?.version===1&&(!meta||journal.savedAt>=meta.savedAt))meta=journal;}catch(_){}
 if(!meta||meta.version!==1)return null;
 const restored=[];
 for(const data of meta.records){
  const blob=stored.images.get(data.id);if(!blob)continue;
  const url=URL.createObjectURL(blob);
  try{
   const image=new Image();image.src=url;await image.decode();
   const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;source.getContext('2d').drawImage(image,0,0);
   const {adjustments,...record}=data;if(adjustments)record.points.adjustments=adjustments;
   blobs.set(source,Promise.resolve(blob));restored.push({...record,source});
  }finally{URL.revokeObjectURL(url);}
 }
 return {...meta,records:restored};
}
root.ChamTNSession={save,load};
})(globalThis);
