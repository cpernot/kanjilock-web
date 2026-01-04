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
export function initQuiz() {
  console.log("Quiz init");
  initMode();
  bindQuizButtons();
}
let currentData = null;
let quizRunning = false;
let questionStartTime = null;
let currentQid = null;
let timeoutId = null;
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

  console.log("MODE ACTIF:", mode);

  const res = await fetch(`${API_BASE_URL}/quiz?mode=${mode}`);
  const data = await res.json();
  
  if (data.error) {
    document.getElementById("multi_quiz").innerHTML = data.error;
    return;
  }

  currentData = data;
  currentQid = data.qid;
  
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
  
  const rt_ms = questionStartTime
    ? Date.now() - questionStartTime
    : null;

  const res = await fetch(`${API_BASE_URL}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qid: currentQid,
      choice,
      rt_ms
    })
  });

  const data = await res.json();
   
  showResult(data);
  stopTimer()
  if (data.correct) {
  playBip("success.wav");
} else {
  playBip("BOMB.WAV");
}
  let speed_factor = 1.0;
  if (rt_ms > 5000) speed_factor = 1.8;
  else if (rt_ms > 3000) speed_factor = 1.3;
  console.log("rt_ms",rt_ms)
   console.log("qid",currentQid )
  // body: JSON.stringify({  qid,  choice,  rt_ms,  speed_factor})
   //  "-----------------------------------------------"
   let correct= true;
  const finished = recordAnswer({
    correct: data.correct,
    rt_ms: rt_ms
  });
   console.log("end record proche du but",correct);   
   const summary = endSessionIfNeeded();
  //  const summary = setTimeout(endSessionIfNeeded, data.correct ? 2000 : 5000);
if (summary) {
  quizRunning = false;
  sessionStorage.setItem("lastSessionSummary", JSON.stringify(summary));

  // --------------------------------------------------  
  const payload = {
    player: getPlayer_setting(),          // 👈 important
    mode:"-",
    session_size:"-",
    correct: summary.correct,
    wrong: summary.wrong,
    total_time_ms: summary.totalTime,
    score_speed: summary.scoreOn100,
    score_global: summary.scoreOn100,
    started_at: summary.startedAt
  };
  console.log("session1",payload);
  await fetch(`${API_BASE_URL}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  console.log("session",payload); 
  sessionStorage.setItem(
    "lastSessionSummary",
    JSON.stringify(summary)
  );
  // ------------------------------------------------------

  navigate("/session-end");
  return;  
}
  // if (finished) {
  //   quizRunning = false;
  //   stopTimer();
  //   document.getElementById("answer-zone"). = "______________________________";
  //   showSessionEnd();
  //   return;
  // }
// "=----------------------------------------------------"
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