
import { initEngine, getNextQuestion, checkLocalAnswer } from "./quizengine.js";
import { getMode, initMode } from "./modeManager.js";
import { getPlayer_setting } from "./settings.js";
import {
  startSession,
  recordAnswer,
  getSessionSummary,
  resetSession,
  endSessionIfNeeded 
} from "./quizSession.js";
import { navigate } from "./spa.js"; // ou ta fonction équivalente

console.log("multi_quiz.js chargé");
/* ============================
   INIT PAGE QUIZ (SPA)
   ============================ */
export async function initQuiz() {
  console.log("Quiz init");
  initMode();
  bindQuizButtons();
  await initEngine();
}
let currentData = null;
let quizRunning = false;
let questionStartTime = null;
let currentQid = null;
let timeoutId = null;
let currentLocalQuestion = null;

// let player = null;

/* ============================
   BINDINGS UI
   ============================ */
function bindQuizButtons() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (startBtn) {
    startBtn.onclick = () => {
      quizRunning = true;
      startSession();
      loadQuiz();
    };
  }

  if (stopBtn) {
    stopBtn.onclick = () => {
      quizRunning = false;
      stopTimer();
      document.getElementById("multi_quiz").innerHTML = "⏸ Quiz arrêté";
    };
  }
}
/* ============================
   QUIZ TIMER
   ============================ */
let timerInterval = null;
let bipTimeout = null;
let timerStart = null;

function startTimer() {
  const fill = document.getElementById("timeFill");
  if (!fill) return;

  timerStart = Date.now();

  fill.style.transition = "none";
  fill.style.width = "100%";
  void fill.offsetWidth;

  requestAnimationFrame(() => {
    fill.style.transition = "width 5s linear";
    fill.style.width = "0%";
  });
  bipTimeout = setTimeout(() => {
    playBip("BOMB.WAV");
  }, 5000);
}
function stopTimer() {
  if (bipTimeout) {
    clearTimeout(bipTimeout);
    bipTimeout = null;
  }

  const fill = document.getElementById("timeFill");
  if (!fill || !timerStart) return;

  const elapsed = Date.now() - timerStart;
  const remainingPercent = Math.max(0, 100 - (elapsed / 5000) * 100);

  fill.style.transition = "none";
  fill.style.width = `${remainingPercent}%`;
}
function playBip(selected_sound) {
  try {
    const audio = new Audio(`/static/sounds/${selected_sound}`);
    audio.play();
  } catch {
    console.warn("🔇 Bip ignoré");
  }
}
/* ============================
   QUIZ LOGIC
   ============================ */
function getQuizModeForPage() {
  const page = document.querySelector("[data-page]")?.dataset.page;
  if (page === "intrus") return "intrus";
  return getMode(); // qa / qb / qc / qd / qe
}
async function loadQuiz() {
  if (!quizRunning) return;
  // playBip("ARROW.WAV")
  questionStartTime = Date.now();
  startTimer() ;
  // const mode = getMode();
  const mode = getQuizModeForPage();
  const data = getNextQuestion(mode);

  currentLocalQuestion = data; // On garde ça en mémoire pour vérifier la réponse
  
  console.log("timer end")
  renderQuestion(data); 
}
function renderQuestion(data) {
  const quiz = document.getElementById("multi_quiz");
  console.log("quiz.innerHTML = `<h2>${data.question}</h2>`");
  quiz.innerHTML = `<h2>${data.question}</h2>`;
  quiz.classList.remove("fade-in");
  void quiz.offsetWidth;
  quiz.classList.add("fade-in");  

  data.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.onclick = () => sendAnswer(opt);
    quiz.appendChild(btn);
  });

  document.getElementById("result").innerHTML = "";
}
async function sendAnswer(choice) {
    if (!quizRunning) return;
    
    const rt_ms = Date.now() - questionStartTime;

    // 1. Vérification locale (Instantané)
    const data = checkLocalAnswer(currentLocalQuestion, choice, rt_ms);

    // 2. Affichage UI (Couleurs, Sons)
    showResult(data);
    stopTimer();
    
    if (data.correct) playBip("success.wav");
    else playBip("BOMB.WAV");

    // 3. Enregistrement dans la session locale
    const finished = recordAnswer({
        correct: data.correct,
        rt_ms: rt_ms,
        kanji: currentLocalQuestion.kanji,
        mode: getQuizModeForPage()
    });

    // ==========================================
    // 🛑 LOGIQUE DE FIN DE SESSION (Ce qu'il manquait)
    // ==========================================
    if (finished) {
        quizRunning = false; // On arrête le jeu
        
        // On attend un peu (1.5s) pour que le joueur voie le résultat de la dernière question
        setTimeout(async () => {
            const summary = getSessionSummary();
            
            // Construction du Payload pour le serveur
            const payload = {
                player: getPlayer_setting(),
                mode: getQuizModeForPage(),
                session_size: summary.size,
                correct: summary.correct,
                wrong: summary.wrong,
                total_time_ms: summary.totalTime,
                score_global: summary.scoreOn100,
                score_speed: summary.scoreOn100,
                started_at: summary.startedAt,
                // 👇 C'est ici qu'on envoie le détail pour le SRS !
                answers: summary.history 
            };

            try {
                // Envoi unique au serveur (Sauvegarde stats + SRS)
                await fetch(`${API_BASE_URL}/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } catch (e) {
                console.error("Erreur sauvegarde session:", e);
            }

            // Stockage pour la page de fin (Session End)
            sessionStorage.setItem("lastSessionSummary", JSON.stringify(summary));

            // Navigation
            navigate("/session-end");

        }, 1500); // Délai avant de changer de page

        return; // IMPORTANT : On s'arrête là, on ne recharge pas de question
    }

    // ==========================================
    // 🔄 SINON : QUESTION SUIVANTE
    // ==========================================
    // On attend un peu avant la prochaine question
    setTimeout(loadQuiz, data.correct ? 1000 : 2500);
}
/* ============================
   RESULT
   ============================ */
function showResult(data) {
  const result = document.getElementById("result");

  result.className = "";
  void result.offsetWidth;
  result.className = data.correct ? "correct" : "wrong";
  result.innerHTML = data.correct ? "✓ 正解" : "✗ 違います";

  if (navigator.vibrate) {
    navigator.vibrate(data.correct ? 30 : 80);
  }
  if (!data.correct) {
    result.innerHTML += `<p>Bonne réponse : <b>${data.bonne}</b></p>`;
  }

  if (data.extras) {
    let html = "<ul>";
    for (const k in data.extras) {
      html += `<li><b>${k}</b> : ${data.extras[k]}</li>`;
    }
    html += "</ul>";
    result.innerHTML += html;
  }
  result.scrollIntoView({ behavior: "smooth", block: "start" });
  timeoutId = setTimeout(loadQuiz, data.correct ? 2000 : 5000);
}
function showSessionEnd() {
  const s = getSessionSummary();

  const quiz = document.getElementById("multi_quiz");
  console.log("improbable");
  quiz.innerHTML = `
    <h2>🎉 Session terminée</h2>
    <p>✔️ ${s.correct} / ${s.size}</p>
    <p>⏱ ${(s.totalTime / 1000).toFixed(1)} s</p>
    <p>⚡ Score vitesse : ${s.scoreOn100} / 100</p>

    <button id="restartSession">🔁 Rejouer</button>
  `;

  document.getElementById("restartSession").onclick = () => {
    resetSession();
    startSession();
    loadQuiz();
  };
}
// function iosTap() {
//   const audio = new Audio();
//   audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=";
//   audio.play();
// };