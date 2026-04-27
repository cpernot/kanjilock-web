/**
 * Question Generation Logic for KanjiLock
 */

import { MODES } from "../quizModes";

export function generateOptions(correctKey, modeDef, candidates, staticData, mode) {
    const correctData = staticData[correctKey];
    correctData.kanji = correctKey; // Inject Key
    const isComposeMode = (mode === "qh" || mode === "qg");

    if (isComposeMode) {
        let rawCorrect = correctData.comp_words || [];
        if (typeof rawCorrect === 'string') rawCorrect = rawCorrect.split(",");
        const correctWords = rawCorrect.map(w => w.trim()).filter(w => w.length > 0);

        const distractors = [];
        let attempts = 0;

        while (distractors.length < 8 && attempts < 100) {
            attempts++;
            const randomKey = candidates[Math.floor(Math.random() * candidates.length)];
            if (randomKey === correctKey) continue;

            const otherData = staticData[randomKey];
            if (!otherData.comp_words) continue;

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

    // Standard Modes
    const correct = modeDef.a(correctData);
    let others = candidates
        .filter(k => k !== correctKey)
        .map(k => {
            const d = staticData[k];
            d.kanji = k;
            return modeDef.a(d);
        });

    others = [...new Set(others)];
    let shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.push(correct);

    return shuffled.sort(() => 0.5 - Math.random());
}

export function prepareQuestionObject(selectedKanji, mode, staticData, candidates) {
    const modeDef = MODES[mode] || MODES["qa"];
    const kData = staticData[selectedKanji];
    kData.kanji = selectedKanji;

    return {
        qid: `local_${Date.now()}`,
        kanji: selectedKanji,
        question: modeDef.q(kData),
        correctAnswer: modeDef.a(kData),
        options: generateOptions(selectedKanji, modeDef, candidates, staticData, mode),
        extras: modeDef.extras(kData),
        mode: mode,
        correctAnswers: (mode === "qh" || mode === "qg")
            ? (Array.isArray(kData.comp_words)
                ? kData.comp_words
                : (typeof kData.comp_words === 'string' ? kData.comp_words.split(",") : [])
            ).map(w => w.trim()).filter(w => w.length > 0)
            : null
    };
}
