
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
import { updateEngineAfterAnswer } from "./quizengine.js";
import { updateBoxRanking, currentBoxFilter } from "./quizengine.js";

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
let isProcessingAnswer = false;
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
console.warn("🔓 loadquiz du bouton");
      loadQuiz();
    };
  }

  if (stopBtn) {
    stopBtn.onclick = () => {
      quizRunning = false;
      stopTimer();
      document.getElementById("multi_quiz").innerHTML = "⏸ Quiz arrêté";
        //  🆕 Cleanup background when stopping
        document.getElementById("app").style.backgroundImage = "";
        document.getElementById("app").style.backgroundColor = "";
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
// Nettoyage de l'interface précédente pour éviter les flashs
    const container = document.getElementById("options-container");
    if (container) container.innerHTML = "";
// 🆕 Set Background
  // currentBoxFilter comes from quizengine.js imports
  console.warn("current Box Filter: ",engine.currentBoxFilter);
  import("./quizengine.js").then(engine => {
      if (engine.currentBoxFilter) {
          setBackground(engine.currentBoxFilter);
      } else {
          setBackground(null); // Clear if Global mode
      }
  });
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
function setBackground(boxId) {
    const appElement = document.getElementById("app"); // or document.body
    
    if (boxId) {
        // CONFIGURE YOUR SUPABASE URL HERE
        // Replace 'your-project-id' with your actual Supabase project ID found in config.js or Dashboard
        const SUPABASE_URL = "https://wbeoqdtafvyscmncalzc.supabase.co"; 
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/box-backgrounds/${boxId}.svg`;
        
        // CSS Styling
        appElement.style.backgroundImage = `url('${imageUrl}')`;
        appElement.style.backgroundSize = "cover"; // or "contain" if you want to see the whole image
        appElement.style.backgroundPosition = "center";
        appElement.style.backgroundRepeat = "no-repeat";
        
        // OPTIONAL: Add an overlay so text remains readable over the image
        // This adds a 85% white layer on top of the image
        appElement.style.backgroundBlendMode = "overlay";
        appElement.style.backgroundColor = "rgba(255, 255, 255, 0.85)";  
        // 0.85 means 85% white, 15% image visibility.
    } else {
        // Reset to default if no box is selected (Global mode)
        appElement.style.backgroundImage = "";
        appElement.style.backgroundColor = ""; 
    }
}
function renderQuestion(data) {
  const quiz = document.getElementById("multi_quiz");
  
  quiz.innerHTML = `<h2>${data.question}</h2>`;
console.log(`quiz.innerHTML = <h2>${data.question}</h2>`);
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

let isProcessing = false; // Verrou anti-double-clic global au fichier

async function sendAnswer(choice) {
    // Si déjà en train de traiter ou quiz fini, on ignore
    if (isProcessing || !quizRunning) return;
    
    isProcessing = true; // On verrouille
    console.warn("🔒 Traitement réponse...");

    const rt_ms = Date.now() - questionStartTime;

    // 1. Vérification locale
    const data = checkLocalAnswer(currentLocalQuestion, choice, rt_ms);
    updateEngineAfterAnswer(
        currentLocalQuestion.kanji, 
        data.correct, 
        getQuizModeForPage() // ou le mode courant
    );
    // 2. UI
    showResult(data);
    

    // 3. Enregistrement
    const finished = recordAnswer({
        correct: data.correct,
        rt_ms: rt_ms,
        kanji: currentLocalQuestion.kanji,
        mode: getQuizModeForPage()
    });

    stopTimer();
    
    if (data.correct) playBip("success.wav");
    else playBip("BOMB.WAV");

    if (finished) {
        quizRunning = false;
        setTimeout(async () => {
            const summary = getSessionSummary();
            const currentMode = getQuizModeForPage(); // Get the active mode
            // Check if this was a Box Challenge
            if (currentBoxFilter) {                
                console.log("📊 Calculating Box Rank for Box:", currentBoxFilter, " and for mode: ", currentMode);
                const rankResult = await updateBoxRanking(currentBoxFilter, summary, currentMode);                
                // Attach the result so session_end.js can display the badge/medal
                summary.boxRanking = rankResult; 
                // Trigger the Supabase update
                updateBoxRanking(currentBoxFilter, summary).then(result => {
                    // Display a popup or update the text on the end-screen
                    alert(`Félicitations ! ${result.message}`);
                });
            }

            const payload = {
                player: getPlayer_setting(),
                mode: getQuizModeForPage(),
                session_size: summary.size,
                correct: summary.correct,
                wrong: summary.wrong,
                total_time_ms: summary.totalTime,
                score_global: summary.scoreOn100,
                answers: summary.history 
            };

            try {
                await fetch(`${API_BASE_URL}/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } catch (e) { console.error(e); }

            sessionStorage.setItem("lastSessionSummary", JSON.stringify(summary));
            isProcessing = false; // Déverrouillage final
            navigate("/session-end");
        }, 1500);
        setTimeout(() => navigate("/session-end"), 1000);
        return; 
    }

    // 🔄 QUESTION SUIVANTE
    setTimeout(() => {
        isProcessing = false; // On déverrouille JUSTE AVANT de charger la suite
        console.warn("🔓 Prêt pour la suivante");
        // loadQuiz();
    }, data.correct ? 1000 : 2500);
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