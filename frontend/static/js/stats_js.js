import { initMode, getMode } from "./modeManager.js";
import { getPlayer_setting } from "./settings.js";
import { getUserProgress } from "./quizengine.js";

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
try {
  const res = await fetch(`${API_BASE_URL}/stats?mode=${mode}&player=${encodeURIComponent(player)}`);
  const data = await res.json();
  drawSrsChart(data.srs_levels);
  renderHeatmap(data.daily_stats);
  showWeakKanjis(data.kanjis,mode);
}catch (e) {
    console.error("Erreur chargement stats:", e);
  }
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

// function renderHeatmap(dailyStats) {
//   const container = document.getElementById("heatmap");
//   if (!container) return;
//   container.innerHTML = "";
//   if (!dailyStats || Object.keys(dailyStats).length === 0) {
//     container.innerHTML = "<p style='font-size:0.8em; color:gray;'>Aucune activité enregistrée</p>";
//     return;
//   }
//   const days = Object.keys(dailyStats).sort();
// days.forEach(day => {
//     // Calcul du total des réponses pour ce jour (Niveaux 1+2+3+4)
//     const dayData = dailyStats[day];
//     const total = Object.values(dayData).reduce((a, b) => a + (Number(b) || 0), 0);
    
//     if (total === 0) return; // Ne pas afficher les jours vides

//     const cell = document.createElement("div");
//     cell.className = "heatmap-cell"; // Utilise une classe CSS si possible
//     cell.title = `${day} : ${total} réponses`;

//     // Intensité du vert selon le nombre de réponses
//     const intensity = Math.min(20 + (total * 5), 255); 
//     cell.style.backgroundColor = `rgb(0, ${intensity}, 0)`;
//     cell.style.width = "20px";
//     cell.style.height = "20px";
//     cell.style.borderRadius = "3px";
//     cell.style.display = "inline-block";
//     cell.style.margin = "2px";

//     container.appendChild(cell);
//   });
// }

function showWeakKanjis(serverKanjis, mode) {
  const div = document.getElementById("weakKanjis");
  if (!div) return;
  div.innerHTML = "<h3>⚠️ Kanjis à réviser (Niveau 1 OU en retard)</h3>";

  // 🆕 RÉCUPÉRER LA PROGRESSION LOCALE (Mise à jour par updateEngineAfterAnswer)
  const localProgress = getUserProgress()[mode] || {};
  const now = new Date();

  console.log("Données reçues du serveur:", serverKanjis.length);
  console.log("Progression locale pour ce mode:", localProgress);

  // 1. On combine les infos statiques du serveur avec les niveaux mis à jour localement
  const kanjisToDisplay = serverKanjis.map(serverK => {
    const local = localProgress[serverK.kanji];
    if (local) {
      return { ...serverK, level: local.level, next_review: local.next_review };
    }
    return serverK;
  });
 
  // 2. Filtrer les kanjis faibles (Level 1 ou 2) ET qui sont dus (date passée)
  const weak = kanjisToDisplay.filter(k => {
    if (!k.next_review) return true; // Nouveau kanji = faible par défaut
    const isWeak = (Number(k.level) <= 1);
    const isDue = new Date(k.next_review) <= now;
    return isWeak || isDue;
  });

  if (weak.length === 0) {
    div.innerHTML += "<p>🎉 Tout est sous contrôle pour ce mode !</p>";
    return;
  }

  // 3. Affichage
  const list = document.createElement("div");
  list.className = "weak-list";
  
  weak.slice(0, 15).forEach(k => { // Limiter à 15 pour ne pas surcharger
    const item = document.createElement("div");
    item.style.padding = "8px";
    item.style.borderBottom = "1px solid #eee";
    item.innerHTML = `
      <span style="font-size:1.2em; font-weight:bold;">${k.kanji}</span> 
      <span style="color:#666;">(${k.romaji})</span> : ${k.signification}
      <br><small style="color:orange;">Niveau SRS: ${k.level || 1} • Boite: ${k.boite || '?'}</small>
    `;
    list.appendChild(item);
  });

  div.appendChild(list);
}
async function loadWeakKanjis() {
  const mode = getMode();
  const res = await fetch(`${API_BASE_URL}/stats?mode=${mode}`);
  const data = await res.json();
  showWeakKanjis(data.kanjis);
}

function renderHeatmap(dailyStats) {
  const container = document.getElementById("heatmap");
  if (!container) return;
  container.innerHTML = "";
  
  console.log("Données Heatmap reçues:", dailyStats);

  const days = Object.keys(dailyStats).sort();
  if (days.length === 0) {
    container.innerHTML = "<p>Aucune activité.</p>";
    return;
  }

  days.forEach(day => {
    const total = dailyStats[day]; // C'est maintenant directement un nombre
    
    const cell = document.createElement("div");
    cell.title = `${day} : ${total} points`;
    
    // Calcul de l'intensité du vert
    const level = Math.min(Math.floor(total / 10), 4); // 0 à 4 selon l'activité
    const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
    
    cell.style.backgroundColor = colors[level] || colors[4];
    cell.style.width = "15px";
    cell.style.height = "15px";
    cell.style.borderRadius = "2px";

    container.appendChild(cell);
  });
}

function renderHeatmap_ORIGINAL(dailyStats) {
console.log("Données reçues pour Heatmap:", dailyStats);
console.log("Nombre de jours trouvés:", Object.keys(dailyStats).length);
  const container = document.getElementById("heatmap");
  if (!container) return;
  container.innerHTML = "";
  
  const days = Object.keys(dailyStats).sort();
  if (days.length === 0) {
      container.innerHTML = "Aucune donnée d'activité.";
      return;
  }

  days.forEach(day => {
    const dayData = dailyStats[day];
    // On additionne les valeurs. Attention: s'assurer que b est un nombre.
    const total = Object.values(dayData).reduce((a, b) => a + (parseInt(b) || 0), 0);
    
    if (total > 0) {
        const cell = document.createElement("div");
        cell.title = `${day} : ${total} réponses`;
        
        // Couleur : on part d'un gris très clair pour 0 et on verdit
        const intensity = Math.min(50 + (total * 15), 255);
        cell.style.backgroundColor = `rgb(0, ${intensity}, 0)`;
        
        // SECURITE : Forcer les dimensions
        cell.style.width = "20px";
        cell.style.height = "20px";
        cell.style.minHeight = "20px"; // Ajouté
        cell.style.minWidth = "20px";  // Ajouté
        cell.style.border = "1px solid rgba(0,0,0,0.1)"; // Pour voir si les cases existent
        
        container.appendChild(cell);
    }
  });
}
