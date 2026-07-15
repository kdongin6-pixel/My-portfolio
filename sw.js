// 서비스 워커 — 네트워크 우선, 오프라인 시 캐시 폴백
// 캐시 대상: 같은 출처(앱 파일) + chart.js CDN. GAS API 요청은 캐시하지 않음.
const CACHE='pf-cache-v1';

self.addEventListener('install',e=>{
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const cacheable=url.origin===location.origin||url.hostname==='cdn.jsdelivr.net';
  if(!cacheable)return; // GAS 등 동적 API 요청은 항상 네트워크로
  e.respondWith((async()=>{
    try{
      const res=await fetch(req);
      if(res&&(res.ok||res.type==='opaque')){
        const c=await caches.open(CACHE);
        c.put(req,res.clone());
      }
      return res;
    }catch(err){
      const cached=await caches.match(req);
      if(cached)return cached;
      if(req.mode==='navigate'){
        const idx=await caches.match('./index.html');
        if(idx)return idx;
      }
      throw err;
    }
  })());
});
