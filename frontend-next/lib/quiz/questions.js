/**
 * Question Generation Logic for KanjiLock
 */

import { MODES } from "../quizModes";

export function generateOptions(correctKey, modeDef, candidates, staticData, mode, availableBoxes = []) {
    const correctData = staticData[correctKey];
    if (!correctData) return [];

    correctData.kanji = correctKey; // Inject Key
    const isComposeMode = (mode === "qh" || mode === "qg");

    if (mode === "qh") {
        // --- QH: KANJI -> COMPOSITION (Word Selection) ---
        let rawCorrect = correctData.comp_words || [];
        if (typeof rawCorrect === 'string') rawCorrect = rawCorrect.split(",");
        const correctWords = rawCorrect.map(w => w.trim()).filter(w => w.length > 0);

        const distractors = [];
        let attempts = 0;
        
        // Strategy: Try current candidates first, then fallback to allKeys if needed
        const pools = [candidates, Object.keys(staticData)];
        
        for (const pool of pools) {
            if (distractors.length >= 10) break;
            let poolAttempts = 0; // Reset attempts for each pool
            while (distractors.length < 10 && poolAttempts < 100) {
                poolAttempts++;
                attempts++;
                const randomKey = pool[Math.floor(Math.random() * pool.length)];
                if (randomKey === correctKey) continue;

                const otherData = staticData[randomKey];
                if (!otherData || !otherData.comp_words) continue;

                let rawOther = otherData.comp_words;
                if (typeof rawOther === 'string') rawOther = rawOther.split(",");
                const otherWords = rawOther.map(w => w.trim()).filter(w => w.length > 0);

                if (otherWords.length === 0) continue;
                const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];

                if (randomWord && !correctWords.includes(randomWord) && !distractors.includes(randomWord)) {
                    distractors.push(randomWord);
                }
            }
        }

        // Target exactly 7 buttons total
        const totalTarget = 7;
        const fillerCount = Math.max(0, totalTarget - correctWords.length);
        const options = [...correctWords, ...distractors.slice(0, fillerCount)];
        
        // If we still have less than 7 (rare), add more from distractors if available
        if (options.length < totalTarget && distractors.length > fillerCount) {
             const extraNeeded = totalTarget - options.length;
             options.push(...distractors.slice(fillerCount, fillerCount + extraNeeded));
        }

        return options.sort(() => Math.random() - 0.5);
    }

    if (mode === "qg") {
        // --- QG: KANJI -> BOITE (Box Selection) ---
        const correctBox = String(correctData.boite || "0");

        // Use availableBoxes from engine if provided, else fallback
        const pool = availableBoxes.length > 0 ? availableBoxes : ["0", "1", "2", "3", "4", "5"];

        const distractors = pool.filter(b => String(b) !== correctBox);
        const shuffledDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 5);

        const options = [correctBox, ...shuffledDistractors];
        return options.sort(() => Math.random() - 0.5);
    }

    // Standard Modes (qa, qb, qc, qd, qe, qf)
    const correct = modeDef.a(correctData);

    // Generate Distractors
    let others = candidates
        .filter(k => k !== correctKey)
        .map(k => {
            const d = { ...staticData[k] }; // Clone to avoid mutation
            d.kanji = k;
            return modeDef.a(d);
        });

    // Unique & Shuffle
    others = [...new Set(others.filter(o => o !== correct))];
    let shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.push(correct);

    return shuffled.sort(() => 0.5 - Math.random());
}

/**
 * Prepares the full question object for the UI
 */
export function prepareQuestionObject(selectedKanji, mode, staticData, candidates, availableBoxes = []) {
    const kData = staticData[selectedKanji];
    if (!kData) return null;

    // Inject kanji into data object for MODES that need it
    kData.kanji = selectedKanji;

    const modeDef = MODES[mode] || MODES["qa"];

    // Generate qh/qg correct answers array
    let correctAnswers = null;
    if (mode === "qh") {
        correctAnswers = (Array.isArray(kData.comp_words)
            ? kData.comp_words
            : (typeof kData.comp_words === 'string' ? kData.comp_words.split(",") : [])
        ).map(w => w.trim()).filter(w => w.length > 0);
    } else if (mode === "qg") {
        correctAnswers = [String(kData.boite || "0")];
    }

    return {
        qid: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        kanji: selectedKanji,
        question: modeDef.q(kData),
        correctAnswer: modeDef.a(kData),
        options: generateOptions(selectedKanji, modeDef, candidates, staticData, mode, availableBoxes),
        extras: modeDef.extras ? modeDef.extras(kData) : {},
        mode: mode,
        correctAnswers: correctAnswers
    };
}
