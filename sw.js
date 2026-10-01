const CACHE_NAME="take-me-static-v1";
const PRECACHE=[
 "/",
 "/offline.html",
 "/manifest.json",
 "/favicon.svg",
 "/destinations.html",
 "/privacy.html",
 "/terms.html",
 "/cyprus.html",
 "/thailand.html",
 "/dubai.html",
 "/greece.html",
 "/italy.html",
 "/spain.html",
 "/prague.html",
 "/budapest.html",
 "/barcelona.html",
 "/marbella.html"
];

self.addEventListener("install",event=>{
 event.waitUntil(
  caches.open(CACHE_NAME)
   .then(cache=>cache.addAll(PRECACHE))
   .then(()=>self.skipWaiting())
 );
});

self.addEventListener("activate",event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.startsWith("/api/"))return;

 if(request.mode==="navigate"){
  event.respondWith(
   fetch(request)
    .then(response=>{
     if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
     }
     return response;
    })
    .catch(async()=>{
     const cached=await caches.match(request);
     return cached||caches.match("/offline.html");
    })
  );
  return;
 }

 if(["/favicon.svg","/manifest.json"].includes(url.pathname)){
  event.respondWith(
   caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));
    return response;
   }))
  );
 }
});
