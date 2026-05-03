import { getSettings } from "./settings";
import { reinjectKanji, currentBoxFilter, getReinjectionQueueSize } from "./quizengine";

// Keeping session state in module scope is acceptable for this simple app structure,
// but for a more robust React app, this should likely be in a Context or Reducer.
// For now, mirroring the imperative style of the original for easier porting.

let session = null;

export function startSession(customSize = null, boxId = null) {
    const settings = getSettings();

    session = {
        boxId: boxId,
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
    const isBoxSession = currentBoxFilter !== null;
    const isTooSlow = rt_ms > settings.maxTimeMs;
    const isActuallyCorrect = correct && !isTooSlow;

    if (settings.allGood && isBoxSession) {
        if (isActuallyCorrect) {
            session.current++;
            session.correct++;
        } else {
            // Reinject!
            session.wrong++;
            reinjectKanji(kanji);
            console.log(`[All-Good] Failed/Slow answer for ${kanji}. Reinjected. Current progress: ${session.current}/${session.size}`);
        }
    } else {
        // Normal mode
        session.current++;
        if (correct) session.correct++;
        else session.wrong++;
    }

    session.totalTime += rt_ms ?? settings.maxTimeMs;
    session.speedScore += computeSpeedScore(rt_ms, settings);
    
    const kanjiId = kanji || "unknown";
    const quizMode = mode || "qa";

    session.history.push({
        kanji: kanjiId,
        correct: correct,
        mode: quizMode,
        speed_factor: (rt_ms < 3000) ? 1.0 : (rt_ms < 5000 ? 0.8 : 0.6),
        newLevel: arguments[0].newLevel,
        isActuallyCorrect: isActuallyCorrect // Extra flag for UI if needed
    });

    return isSessionFinished();
}

export function isSessionFinished() {
    if (!session) return true;
    
    const settings = getSettings();
    const baseFinished = session.current >= session.size;
    
    if (settings.allGood && currentBoxFilter !== null) {
        // Must reach size AND have no pending reinjections
        return baseFinished && getReinjectionQueueSize() === 0;
    }
    
    return baseFinished;
}

export function getSessionSummary() {
    if (!session) return null;

    const avgTime = session.current > 0 ? (session.totalTime / session.current) : 0;
    
    // Speed Score Formula: 
    // 100 at 1.8s (1800ms), 0 at 10s (10000ms)
    // Decreases by 1 point for every ~82ms over 1.8s.
    let speedScore100 = 100;
    if (avgTime > 1800) {
        speedScore100 = Math.max(0, 100 - (avgTime - 1800) * (100 / 8200));
    }

    // Deduplicate history for UI display and backend SRS update
    const settings = getSettings();
    const isAllGood = settings.allGood && currentBoxFilter !== null;
    const historyMap = new Map();

    session.history.forEach(h => {
        const kanji = h.kanji;
        if (!historyMap.has(kanji)) {
            historyMap.set(kanji, { ...h });
        } else {
            const existing = historyMap.get(kanji);
            // In All-Good mode, if it was EVER wrong, we flag it as incorrect for the SRS update
            // to ensure the -1 penalty is applied and NO promotion (+1) occurs.
            if (isAllGood) {
                if (!h.isActuallyCorrect || !existing.isActuallyCorrect) {
                    existing.correct = false;
                    existing.isActuallyCorrect = false;
                }
                // Always keep the latest level reached
                existing.newLevel = h.newLevel;
            } else {
                // Normal mode: just keep the latest attempt info
                historyMap.set(kanji, { ...h });
            }
        }
    });

    const deduplicatedHistory = Array.from(historyMap.values());

    return {
        ...session,
        history: deduplicatedHistory,
        scoreOn10: Math.round((session.correct / session.size) * 10),
        scoreOn100: Math.round(speedScore100),
        avgTimeMs: Math.round(avgTime)
    };
}

/**
 * Updates the current session object with extra data (like boxRanking).
 */
export function updateSessionSummary(extraData) {
    if (session) {
        Object.assign(session, extraData);
    }
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
