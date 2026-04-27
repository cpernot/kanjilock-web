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

export function updateEngineStateAfterAnswer(kanji, isCorrect, mode, userProgress, penaltyQueue, COOLDOWN_ERROR) {
    // A. PENALTY (Wrong Answer)
    if (!isCorrect) {
        penaltyQueue.set(kanji, COOLDOWN_ERROR);
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

        // Increment Level locally
        state.level = Math.min((state.level || 1) + 1, 4);
        return state;
    }

    return userProgress[mode]?.[kanji] || null;
}
