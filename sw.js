const CACHE_NAME = 'gymapp-v7';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './sounds/beep.mp3',
  './js/app.js',
  './js/data.js',
  './js/utils.js',
  './js/themes.js',
  './js/modal.js',
  './js/toast.js',
  './js/sound.js',
  './js/timers.js',
  './js/badges.js',
  './js/exercise-db.js',
  './js/workout.js',
  './js/days.js',
  './js/exercises.js',
  './js/settings.js',
  './js/progress.js',
  './js/nav.js',
  './js/home.js',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).catch(function() { return cached; });
    })
  );
});
