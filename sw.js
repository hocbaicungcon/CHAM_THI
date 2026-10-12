'use strict';
const CACHE='chamtn-offline-v7';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const assets=await (await fetch(new URL('offline-assets.json',self.registration.scope),{cache:'no-store'})).json();
 const cache=await caches.open(CACHE);await cache.addAll(assets.map(asset=>new URL(asset,self.registration.scope).href));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('chamtn-offline-')&&name!==CACHE)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).catch(()=>caches.match(new URL('index.html',self.registration.scope))));return;
 }
 event.respondWith((async()=>{
  const cached=await caches.match(event.request);if(cached)return cached;
  const response=await fetch(event.request);
  if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}
  return response;
 })());
});
