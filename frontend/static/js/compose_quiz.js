/* ============================
   COMPOSE QUIZ (LOCAL & ROBUSTE)
   ============================ */
import { initEngine, getComposeQuestionLocal, checkComposeAnswer } from "./quizengine.js";

let currentQuestionData = null; // On stocke la question en cours
let selectedWords = new Set();
let composeTimeout = null;

/* ============================
   INIT
   ============================ */
export async function initCompose() {
  console.log("🧩 Init Compose Quiz (Local)");
  
  // 1. On s'assure que les données sont là
  await initEngine();

  // 2. On lance le jeu
  loadComposeQuiz();
}

/* ============================
   LOAD QUESTION
   ============================ */
function loadComposeQuiz() {
  selectedWords.clear();
  
  // Appel LOCAL (Instantané)
  const data = getComposeQuestionLocal();

  if (!data) {
    document.getElementById("compose-quiz").innerHTML = "<p>Erreur: Pas de données de composition disponibles.</p>";
    return;
  }

  currentQuestionData = data; // Sauvegarde pour validation

  // Mise à jour UI
  document.getElementById("compose-question").textContent =
    `Quel(s) mot(s) correspondent au kanji signifiant "${data.signification}" ?`;

  const container = document.getElementById("compose-options");
  container.innerHTML = "";

  data.options.forEach(word => {
    const btn = document.createElement("button");
    btn.textContent = word;
    // Animation d'entrée
    btn.style.opacity = "0"; 
    btn.onclick = () => toggleSelection(btn, word);
    container.appendChild(btn);
    
    // Petit effet d'apparition
    requestAnimationFrame(() => btn.style.opacity = "1");
  });

  // Reset boutons et résultats
  const validateBtn = document.getElementById("validateBtn");
  validateBtn.style.display = "block"; // Réafficher le bouton
  validateBtn.onclick = validateAnswer;
  validateBtn.disabled = false;

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
function validateAnswer() {
  if (!currentQuestionData) return;

  // Validation LOCALE
  const resultData = checkComposeAnswer(
      currentQuestionData, 
      Array.from(selectedWords)
  );

  showComposeResult(resultData);
}

/* ============================
   RESULT
   ============================ */
function showComposeResult(data) {
  const resultEl = document.getElementById("compose-result");
  const validateBtn = document.getElementById("validateBtn");
  
  // Masquer le bouton valider pour éviter le spam
  validateBtn.style.display = "none";

  resultEl.className = "";
  void resultEl.offsetWidth; // Trigger reflow pour animation css
  resultEl.className = data.success ? "correct" : "wrong";

  resultEl.innerHTML = `
    <h2 style="margin:0">${data.success ? "✓ Bravo !" : "✗ Raté..."}</h2>

    <div style="margin-top:15px; text-align:left; background:rgba(255,255,255,0.5); padding:10px; border-radius:8px;">
        <p><strong>Kanji :</strong> ${data.kanji}</p>
        <p><strong>Mots attendus :</strong> ${data.correct.join(", ")}</p>
        <hr style="border:0; border-top:1px solid #ccc; margin:10px 0;">
        <p><strong>Romaji :</strong> ${data.extras?.romaji || "-"}</p>
        <p><strong>Mot compose:</strong> ${data.extras?.mot || "-"}</p>
        <p><strong>Lecture :</strong> ${data.extras?.lecture_mot || "-"}</p>
        <p><strong>Signification :</strong> ${data.extras?.signification_mot || "-"}</p>
        <p><strong>Boite :</strong> ${data.extras?.boite || "-"}</p>
    </div>
  `;

  resultEl.scrollIntoView({ behavior: "smooth", block: "center" });

  // Désactiver les boutons de choix
  document.querySelectorAll("#compose-options button").forEach(b => {
      b.disabled = true;
      // Mettre en évidence les bonnes réponses qu'on a manqué
      if (data.correct.includes(b.textContent) && !b.classList.contains("selected")) {
          b.style.border = "2px solid green";
      }
  });

  clearTimeout(composeTimeout);
  
  // On passe à la suivante après un délai
  composeTimeout = setTimeout(loadComposeQuiz, data.success ? 2500 : 5000);
}