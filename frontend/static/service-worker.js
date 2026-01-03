const CACHE_NAME = "kanjilock-v1";
const PAGES = [
  "/",
  "/quiz-page",
  "/intrus-page",
  "/stats-page",
  "/compose-page",
  "/ranking-page"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PAGES)
    )
  );
});

