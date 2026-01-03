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
  let url = "/ranking/global";

  if (range === "month") {
    const now = new Date();
    const ym = now.toISOString().slice(0, 7); // YYYY-MM
    url = `${API_BASE_URL}/ranking/month/${ym}`;
  }

  const res = await fetch(url);
  const data = await res.json();

  renderTable(data);
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
