/**
 * Answer Checking and Post-Answer State Updates
 */

export function checkLocalAnswer(questionObj, userChoice, rt_ms) {
    let isCorrect = false;
    const isComposeMode = (questionObj.mode === "qh" || questionObj.mode === "qg");

    if (isComposeMode) {
        const correctSet = new Set(questionObj.correctAnswers);
        const selectedSet = new Set(userChoice || []);
        if (correctSet.size === selectedSet.size && [...correctSet].every(item => selectedSet.has(item))) {
            isCorrect = true;
        }
    } else {
        isCorrect = (userChoice === questionObj.correctAnswer);
    }

    return {
        correct: isCorrect,
        bonne: isComposeMode ? questionObj.correctAnswers : questionObj.correctAnswer,
        extras: questionObj.extras,
        rt_ms: rt_ms
    };
}

export function updateEngineStateAfterAnswer(kanji, isCorrect, mode, userProgress, penaltyQueue, COOLDOWN_ERROR, hasFailedBefore) {
    // A. PENALTY (Wrong Answer)
    if (!isCorrect) {
        penaltyQueue.set(kanji, COOLDOWN_ERROR);
        
        if (!userProgress[mode]) userProgress[mode] = {};
        if (!userProgress[mode][kanji]) userProgress[mode][kanji] = { level: 1 };

        const state = userProgress[mode][kanji];
        // Rule: Level of the kanji lose 1 point (Math.max(1, lvl - 1))
        state.level = Math.max((state.level || 1) - 1, 1);
    }

    // B. SUCCESS (Local SRS Update)
    if (isCorrect) {
        if (!userProgress[mode]) userProgress[mode] = {};
        if (!userProgress[mode][kanji]) userProgress[mode][kanji] = { level: 1 };

        const state = userProgress[mode][kanji];

        // Push next review to tomorrow locally
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        state.next_review = tomorrow.toISOString();

        // Increment Level locally ONLY if it hasn't failed in this session
        if (!hasFailedBefore) {
            state.level = Math.min((state.level || 1) + 1, 4);
        }
        
        return state;
    }

    return userProgress[mode]?.[kanji] || null;
}
