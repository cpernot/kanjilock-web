import { initMode, getMode } from "./modeManager.js";
import { getPlayer_setting } from "./settings.js";

export function initStats() {
  console.log("Stats init");
  initMode();
  loadStats();   // affichage auto
}

console.log("stats_js.js chargé");


// 🔁 Réagir aux changements de mode (quiz → stats, nav, select…)
window.addEventListener("modechange", (e) => {
  console.log("Mode changé → reload stats", e.detail.mode);
  loadStats();
});

// 📊 Boutons UI
document.getElementById("statsBtn")?.addEventListener("click", loadStats);

document.getElementById("dailyBtn")?.addEventListener("click", async () => {
  const mode = getMode();
  const res = await fetch(`${API_BASE_URL}/stats?mode=${mode}`);
  const data = await res.json();
  renderHeatmap(data.daily_stats);
});

document.getElementById("weakkanjiBtn")?.addEventListener("click", loadWeakKanjis);


// =======================
// 📊 FONCTIONS
// =======================

async function loadStats() {
  const mode = getMode();
  const player = getPlayer_setting();
  console.log("MODE UTILISÉ:", mode);
  console.log("JOUEUR:", player);

  const res = await fetch(`${API_BASE_URL}/stats?mode=${mode}&player=${encodeURIComponent(player)}`);
  const data = await res.json();

  drawSrsChart(data.srs_levels);
  renderHeatmap(data.daily_stats);
  showWeakKanjis(data.kanjis);
}

function drawSrsChart(srsLevels) {
  const levels = Object.keys(srsLevels);
  const values = Object.values(srsLevels);

  const canvas = document.getElementById("srsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const max = Math.max(...values, 1);
  const barWidth = 60;

  values.forEach((v, i) => {
    const height = (v / max) * 150;
    ctx.fillRect(50 + i * 80, 180 - height, barWidth, height);
    ctx.fillText(`N${levels[i]}`, 65 + i * 80, 195);
    ctx.fillText(v, 70 + i * 80, 170 - height);
  });
}

function renderHeatmap(dailyStats) {
  const container = document.getElementById("heatmap");
  if (!container) return;
  container.innerHTML = "";
  const days = Object.keys(dailyStats).sort();

  days.forEach(day => {
    const total = Object.values(dailyStats[day]).reduce((a, b) => a + b, 0);
    const cell = document.createElement("div");

    cell.title = `${day} : ${total} réponses`;
    cell.style.backgroundColor = `rgb(0, ${Math.min(total * 20, 255)}, 0)`;
    cell.style.width = "20px";
    cell.style.height = "20px";

    container.appendChild(cell);
  });
}

function showWeakKanjis(kanjis) {
  const div = document.getElementById("weakKanjis");
  if (!div) return;
  div.innerHTML = "<h3>⚠️ Kanjis faibles du jour</h3>";

  const now = new Date();
  const weak = kanjis.filter(k => {
    if (!k.next_review) return false;
    return k.level <= 2 && new Date(k.next_review) <= now;
  });
  if (weak.length === 0) {
    div.innerHTML += "<p>🎉 Rien de critique aujourd’hui</p>";
    return;
  }
  weak.forEach(k => {
    div.innerHTML += `
      <div>
        <b>${k.kanji}</b> — ${k.signification}
        | ${k.romaji} | ${k.mot}
        (${k.lecture_mot}) → ${k.signification_mot}
        | boîte ${k.boite}
      </div>
    `;
  });
}

async function loadWeakKanjis() {
  const mode = getMode();
  const res = await fetch(`${API_BASE_URL}/stats?mode=${mode}`);
  const data = await res.json();
  showWeakKanjis(data.kanjis);
}
