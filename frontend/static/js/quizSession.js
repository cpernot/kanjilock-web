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
    startedAt: Date.now()
  };

  console.log("🧩 Session démarrée", session);
  return session;
}

export function recordAnswer({ correct, rt_ms }) {
  if (!session) return;

  const settings = getSettings();

  session.current++;
  session.totalTime += rt_ms ?? settings.maxTimeMs;

  if (correct) session.correct++;
  else session.wrong++;

  session.speedScore += computeSpeedScore(rt_ms, settings);

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
