import { getSettings } from "./settings";
import { reinjectKanji, currentBoxFilter, getReinjectionQueueSize } from "./quizengine";

// Keeping session state in module scope is acceptable for this simple app structure,
// but for a more robust React app, this should likely be in a Context or Reducer.
// For now, mirroring the imperative style of the original for easier porting.

let session = null;

export function startSession(customSize = null, boxId = null, extraOptions = {}) {
    const settings = getSettings();

    session = {
        boxId: boxId,
        size: customSize || settings.sessionSize,
        current: 0,
        correct: 0,
        wrong: 0,
        totalTime: 0,
        speedScore: 0,
        streak: 0,
        maxStreak: 0,
        fastStreak: 0,
        feverTriggered: false,
        flashCount: 0,
        isRevenge: Boolean(extraOptions.isRevenge),
        startedAt: Date.now(),
        history: []
    };

    console.log("🧩 Session started", session);
    return session;
}

export function getSession() {
    return session;
}

export function recordAnswer({ correct, rt_ms, kanji, mode, oldLevel, newLevel }) {
    if (!session) return false;

    const settings = getSettings();
    const isBoxSession = currentBoxFilter !== null;
    const isTooSlow = rt_ms > settings.maxTimeMs;
    const isActuallyCorrect = correct && !isTooSlow;
    const isFast = correct && rt_ms <= 2200;
    const isFlash = correct && rt_ms <= 1500;

    if (isActuallyCorrect) {
        session.streak = (session.streak || 0) + 1;
        if (session.streak > (session.maxStreak || 0)) {
            session.maxStreak = session.streak;
        }
        if (isFast) {
            session.fastStreak = (session.fastStreak || 0) + 1;
        } else {
            session.fastStreak = Math.max(0, (session.fastStreak || 0));
        }
        if (isFlash) {
            session.flashCount = (session.flashCount || 0) + 1;
        }
        if (session.streak >= 5 && session.fastStreak >= 3) {
            session.feverTriggered = true;
        }
    } else {
        session.streak = 0;
        session.fastStreak = 0;
    }

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
        rt_ms: rt_ms,
        mode: quizMode,
        speed_factor: (rt_ms < 3000) ? 1.0 : (rt_ms < 5000 ? 0.8 : 0.6),
        oldLevel: oldLevel,
        newLevel: newLevel,
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
                // Normal mode: keep initial oldLevel, update latest attempt info
                historyMap.set(kanji, { ...h, oldLevel: existing.oldLevel });
            }
        }
    });

    const deduplicatedHistory = Array.from(historyMap.values());
    const accuracyRatio = session.size > 0 ? Math.min(1, session.correct / session.size) : 0;
    const roundedSpeed = Math.round(speedScore100);
    let rank = "C";
    if (accuracyRatio >= 1.0 && roundedSpeed >= 95) rank = "S";
    else if (accuracyRatio >= 0.9 && roundedSpeed >= 80) rank = "A";
    else if (accuracyRatio >= 0.75 && roundedSpeed >= 60) rank = "B";

    return {
        ...session,
        history: deduplicatedHistory,
        scoreOn10: Math.round((session.correct / session.size) * 10),
        scoreOn100: roundedSpeed,
        avgTimeMs: Math.round(avgTime),
        rank: rank
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
