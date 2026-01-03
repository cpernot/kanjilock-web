import { initQuiz } from "./multi_quiz.js";
import { initStats } from "./stats_js.js";
import { initHome } from "./home.js";
import { initIntrus } from "./intrus.js";
import { initMode } from "./modeManager.js";
import { initCompose } from "./compose_quiz.js";
import { initSessionEnd } from "./session_end.js";
import { initRanking} from "./ranking.js";
import { resetPlayer } from "./settings.js";
import { getPlayer } from "./player.js";
import { initLogin} from "./login.js";

console.log("SPA BOOT 122");

// getPlayer();
const routes = {
  "/login": { page: "/pages/login.html", init: initLogin },
  "/": { page: "/pages/home.html", init: initHome },
  "/quiz-page": { page: "/pages/multi_quiz.html", init: initQuiz },
  "/intrus-page": { page: "/pages/intrus.html", init: initIntrus },
  "/stats-page": { page: "/pages/stats.html", init: initStats },
  "/compose-page": { page: "/pages/compose.html", init: initCompose }, 
   "/session-end": { page: "/pages/session_end.html", init: initSessionEnd },
   "/ranking-page": {    page: "/pages/ranking.html",    init: initRanking  }// 🆕
};


export async function navigate(path) {
  if (!getPlayer() && path !== "/login") {
    path = "/login";
  }
  const route = routes[path] || routes["/"];
  const res = await fetch(route.page);
  const html = await res.text();

  document.getElementById("app").innerHTML = html;
  history.pushState({}, "", path);

  setActiveLink(path);
  console.log("🔥");
  // 🔥 INIT PAGE
  route.init?.();
}

function setActiveLink(path) {
  document.querySelectorAll(".bottom-nav a").forEach(a => {
    a.classList.toggle("active", a.getAttribute("href") === path);
  });
}

document.addEventListener("click", e => {
  const link = e.target.closest("a[data-link]");
  if (!link) return;

  e.preventDefault();
  navigate(link.getAttribute("href"));
});

window.addEventListener("popstate", () => {
  navigate(location.pathname);
});

// first load
navigate(location.pathname);
