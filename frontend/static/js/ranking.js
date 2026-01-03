export function initRanking() {
  loadRanking("global");

  document.querySelectorAll(".ranking-controls button")
    .forEach(btn => {
      btn.onclick = () => {
        const range = btn.dataset.range;
        loadRanking(range);
      };
    });
}

async function loadRanking(range) {
  // 1. On initialise l'URL avec la variable globale API_BASE_URL
  let url = `${API_BASE_URL}/ranking/global`;

  if (range === "month") {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7); // YYYY-MM
    url = `${API_BASE_URL}/ranking/month/${ym}`;
  }

  try {
    const res = await fetch(url);
    
    // Sécurité : si le serveur répond 404 ou 500
    if (!res.ok) {
        console.error("Erreur serveur:", res.status);
        renderTable([]); // On affiche un tableau vide
        return;
    }

    const data = await res.json();

    // Sécurité : on vérifie que data est bien un tableau avant le forEach
    if (Array.isArray(data)) {
        renderTable(data);
    } else {
        console.error("Format de données invalide", data);
        renderTable([]);
    }
  } catch (error) {
    console.error("Erreur de connexion au backend:", error);
    renderTable([]);
  }
}

function renderTable(data) {
  const tbody = document.querySelector("#rankingTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.player}</td>
      <td>${p.score}</td>
      <td>${p.correct}</td>
      <td>${p.sessions}</td>
    `;
    tbody.appendChild(tr);
  });
}
