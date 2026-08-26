/* 极简工作台 Service Worker:网络优先 + 缓存兜底,支持离线打开 */
const CACHE = 'minimal-daily-v1';
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  // 跨域请求(指数行情 JSONP 等)一律不缓存、不拦截,交给网络
  if(url.origin !== self.location.origin) return;
  // 策略:网络优先,失败回退缓存(核心资源兜底到 index.html)
  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.ok){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(m){
        return m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
      });
    })
  );
});
