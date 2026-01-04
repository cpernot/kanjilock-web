// Variable pour stocker le contenu des pages en mémoire
const pageCache = {};

export async function navigate(path) {
  if (!getPlayer() && path !== "/login") {
    path = "/login";
  }
  const route = routes[path] || routes["/"];

  // Si la page n'est pas en cache, on la télécharge, sinon on utilise le cache
  if (!pageCache[route.page]) {
    const res = await fetch(route.page);
    pageCache[route.page] = await res.text();
  }
  
  document.getElementById("app").innerHTML = pageCache[route.page];
  history.pushState({}, "", path);

  setActiveLink(path);
  route.init?.();
}

// Fonction pour pré-charger TOUTES les pages dès le démarrage
async function prefetchPages() {
  Object.values(routes).forEach(async (route) => {
    try {
      const res = await fetch(route.page);
      pageCache[route.page] = await res.text();
      console.log(`✅ Page chargée : ${route.page}`);
    } catch (e) {
      console.error(`❌ Erreur prefetch : ${route.page}`);
    }
  });
}

// Lancer le prefetch au démarrage
prefetchPages();