/* ============================
   COMPOSE QUIZ
   ============================ */
let currentQid = null;
let selectedWords = new Set();
let composeTimeout = null;

/* ============================
   INIT
   ============================ */
export function initCompose() {
  console.log("Compose quiz init3");
  // startSession();
  loadComposeQuiz();
  console.log("Compose quiz init4")
}

/* ============================
   LOAD QUESTION
   ============================ */
async function loadComposeQuiz() {
  selectedWords.clear();

  const res = await fetch(`${API_BASE_URL}/quiz_compose`);
  const data = await res.json();

  currentQid = data.qid;

  document.getElementById("compose-question").textContent =
    `Quel(s) mot(s) correspondent au kanji signifiant "${data.signification}" ?`;

  const container = document.getElementById("compose-options");
  container.innerHTML = "";

  data.options.forEach(word => {
    const btn = document.createElement("button");
    btn.textContent = word;

    btn.onclick = () => toggleSelection(btn, word);

    container.appendChild(btn);
  });

  document.getElementById("validateBtn").onclick = validateAnswer;

  document.getElementById("compose-result").innerHTML = "";
}

/* ============================
   SELECTION
   ============================ */
function toggleSelection(btn, word) {
  if (selectedWords.has(word)) {
    selectedWords.delete(word);
    btn.classList.remove("selected");
  } else {
    selectedWords.add(word);
    btn.classList.add("selected");
  }
}

/* ============================
   VALIDATE
   ============================ */
async function validateAnswer() {
  const res = await fetch(`${API_BASE_URL}/quiz_compose/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qid: currentQid,
      selected: Array.from(selectedWords)
    })
  });

  const data = await res.json();
  showComposeResult(data);
}

/* ============================
   RESULT
   ============================ */
function showComposeResult(data) {
  const result = document.getElementById("compose-result");

  // sécurité anti-crash
  const correctWords = data.correct ?? [];

  result.className = "";
  void result.offsetWidth;
  result.className = data.success ? "correct" : "wrong";

  result.innerHTML = `
    <p>${data.success ? "✓ 正解" : "✗ 違います"}</p>

    <p><strong>Kanji :</strong> ${data.kanji ?? "-"}</p>
    <p><strong>Mots corrects :</strong> ${correctWords.join(", ")}</p>

    <div class="extras">
      <p><strong>Romaji :</strong> ${data.extras?.romaji || "-"}</p>
      <p><strong>Mot composé :</strong> ${data.extras?.mot || "-"}</p>
      <p><strong>Lecture :</strong> ${data.extras?.lecture_mot || "-"}</p>
      <p><strong>Signification :</strong> ${data.extras?.signification_mot || "-"}</p>      
      <p><strong>Boîte :</strong> ${data.extras?.boite ?? "-"}</p>
    </div>
  `;

  result.scrollIntoView({ behavior: "smooth", block: "start" });

  // désactiver boutons
  document
    .querySelectorAll("#compose-options button")
    .forEach(b => (b.disabled = true));

  clearTimeout(composeTimeout);
  composeTimeout = setTimeout(loadComposeQuiz, 5000);
}
