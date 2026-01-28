/* ============================
   QUIZ SESSION MANAGER
   ============================ */

import { getSettings } from "./settings.js";

let session = null;

export function startSession() {
  const settings = getSettings();

  session = {
    size: settings.sessionSize,
    current: 0,
    correct: 0,
    wrong: 0,
    totalTime: 0,
    speedScore: 0,
    startedAt: Date.now(),
    history: []
  };

  console.log("🧩 Session démarrée", session);
  return session;
}

// frontend/static/js/quizSession.js

export function recordAnswer({ correct, rt_ms, kanji, mode }) { // <--- AJOUTÉ kanji, mode ici
  if (!session) return;

  const settings = getSettings();

  session.current++;
  session.totalTime += rt_ms ?? settings.maxTimeMs;

  if (correct) session.correct++;
  else session.wrong++;

  session.speedScore += computeSpeedScore(rt_ms, settings);
  const kanjiId = kanji || "unknown";
  const quizMode = mode || "qa";

  // Maintenant kanji et mode sont définis car extraits des arguments au dessus
  session.history.push({
      kanji: kanjiId,
      correct: correct,
      mode: quizMode,
      speed_factor: (rt_ms < 3000) ? 1.0 : (rt_ms < 5000 ? 0.8 : 0.6) 
  });

  return isSessionFinished();
}

export function isSessionFinished() {
  return session && session.current >= session.size;
}

export function getSessionSummary() {
  if (!session) return null;

  return {
    ...session,
    scoreOn10: Math.round((session.correct / session.size) * 10),
    scoreOn100: Math.min(
      100,
      Math.round((session.speedScore / (session.size * 10)) * 100)
    )
  };
}

export function resetSession() {
  session = null;
}

function computeSpeedScore(rt_ms, settings) {
  if (!rt_ms) return settings.speedScores.slow;

  if (rt_ms <= settings.speedThresholds.fast)
    return settings.speedScores.fast;

  if (rt_ms <= settings.speedThresholds.medium)
    return settings.speedScores.medium;

  return settings.speedScores.slow;
}

export function endSessionIfNeeded() {
  if (isSessionFinished()) {
    return getSessionSummary();
  }
  return null;
}
