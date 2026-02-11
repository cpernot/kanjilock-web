/* ============================
   QUIZ SESSION MANAGER (Next.js Port)
   ============================ */

import { getSettings } from "./settings";

// Keeping session state in module scope is acceptable for this simple app structure,
// but for a more robust React app, this should likely be in a Context or Reducer.
// For now, mirroring the imperative style of the original for easier porting.

let session = null;

export function startSession(customSize = null) {
    const settings = getSettings();

    session = {
        size: customSize || settings.sessionSize,
        current: 0,
        correct: 0,
        wrong: 0,
        totalTime: 0,
        speedScore: 0,
        startedAt: Date.now(),
        history: []
    };

    console.log("🧩 Session started", session);
    return session;
}

export function getSession() {
    return session;
}

export function recordAnswer({ correct, rt_ms, kanji, mode }) {
    if (!session) return false;

    const settings = getSettings();

    session.current++;
    session.totalTime += rt_ms ?? settings.maxTimeMs;

    if (correct) session.correct++;
    else session.wrong++;

    session.speedScore += computeSpeedScore(rt_ms, settings);
    const kanjiId = kanji || "unknown";
    const quizMode = mode || "qa";

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
