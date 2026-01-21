import { resetSession, startSession } from "./quizSession.js";
import { navigate } from "./spa.js";

export function initSessionEnd() {
  const raw = sessionStorage.getItem("lastSessionSummary");
  if (!raw) return;

  const s = JSON.parse(raw);

  const container = document.getElementById("session-summary");
  container.innerHTML = `
    <p>❌ Erreurs : ${s.wrong} / ${s.size}</p>
    <p>⏱ Temps total : ${(s.totalTime / 1000).toFixed(1)} s</p>
    <p>⏱ Temps par kanji : ${(s.totalTime / 1000/ s.size).toFixed(1)} s</p>
    <p>🎯 Score /10 : ${s.scoreOn10}</p>
    <p>🔥 Score /100 : ${s.scoreOn100}</p>
  `;
  
  document.getElementById("continueBtn").onclick = () => {
    sessionStorage.removeItem("lastSessionSummary");
    resetSession();
    startSession();
    navigate("/quiz-page"); // ou home, ou dernier quiz
  };
}