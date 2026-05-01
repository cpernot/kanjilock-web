/**
 * Question Generation Logic for KanjiLock
 */

import { MODES } from "../quizModes";

export function generateOptions(correctKey, modeDef, candidates, staticData, mode) {
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
        const allKeys = Object.keys(staticData);

        // Find distractors from the entire dataset for better variety
        while (distractors.length < 8 && attempts < 100) {
            attempts++;
            const randomKey = allKeys[Math.floor(Math.random() * allKeys.length)];
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

        const nbLeurres = Math.max(4, 10 - correctWords.length);
        const options = [...correctWords, ...distractors.slice(0, nbLeurres)];
        return options.sort(() => Math.random() - 0.5);
    }

    if (mode === "qg") {
        // --- QG: KANJI -> BOITE (Box Selection) ---
        const correctBox = String(correctData.boite || "0");
        // Options are box numbers (standard set 1-5 + 0 if needed)
        const boxes = ["0", "1", "2", "3", "4", "5"];
        return boxes.sort(() => Math.random() - 0.5);
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
export function prepareQuestionObject(selectedKanji, mode, staticData, candidates) {
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
        options: generateOptions(selectedKanji, modeDef, candidates, staticData, mode),
        extras: modeDef.extras ? modeDef.extras(kData) : {},
        mode: mode,
        correctAnswers: correctAnswers
    };
}
