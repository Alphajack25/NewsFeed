const SHELL_CACHE = 'shell-v4';
const DJ_CACHE = 'dj-sets-v1';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(cache =>
      // cache: 'reload' bypasses the HTTP cache. addAll() can otherwise
      // store a stale index.html in the new shell cache, and cache-first
      // would keep serving it.
      Promise.all(SHELL.map(url =>
        fetch(new Request(url, { cache: 'reload' })).then(res => {
          if (!res.ok) throw new Error('shell ' + res.status + ' ' + url);
          return cache.put(url, res);
        })
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== DJ_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // App shell: cache-first
  const isShell = url.origin === self.location.origin &&
    (url.pathname.endsWith('.html') || url.pathname.endsWith('.json') ||
     url.pathname.endsWith('.png') || url.pathname === '/' || url.pathname.endsWith('/'));

  if (isShell) {
    e.respondWith(
      caches.open(SHELL_CACHE).then(cache =>
        cache.match(e.request).then(cached => cached || fetch(e.request))
      )
    );
    return;
  }

  // DJ Sets (R2 audio): cache-first if available, else network
  // We match by checking the DJ cache for any downloaded set.
  if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.m4a') ||
      url.pathname.endsWith('.wav') || url.pathname.endsWith('.flac')) {
    e.respondWith(
      caches.open(DJ_CACHE).then(cache =>
        cache.match(e.request).then(cached => cached || fetch(e.request))
      )
    );
    return;
  }

  // RSS / podcast streaming audio / everything else: pass through
});
