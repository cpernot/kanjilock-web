/* ============================================================================
   KANJILOCK QUIZ ENGINE (Ported for Next.js)
   Handles: Data Loading, Question Generation, SRS Logic, Box Filtering
   ============================================================================ */

import config from "./config";
import { getPlayer_setting } from "./settings"; // You'll need to implement this or pass player as arg

// --- STATE VARIABLES (kept in module scope for now, could be Context in future) ---
let staticData = {};       // Full Kanji Data (kanjilock.json)
let userProgress = {};     // User SRS Stats
let boxProgress = {};      // Local Box Levels
let sessionHistory = new Set();
let penaltyQueue = new Map(); // Kanji -> Remaining turns to wait

export let currentBoxFilter = null; // null = Global Mode

// --- CONFIGURATION ---
const WEIGHTS = { 1: 5, 2: 3, 3: 1, 4: 0.2 };
const COOLDOWN_ERROR = 20; // Turns to wait after an error

import { MODES } from "./quizModes";

/* ============================
   1. INITIALIZATION
   ============================ */
export async function initEngine(playerOverride = null) {
    // If we have data, we might not need to reload, unless player changed?
    // For safety in React, we might want to just reload or check player.

    const player = playerOverride || getPlayer_setting();
    if (!player) return;

    try {
        // 1. Fetch Data from Backend
        const res = await fetch(`${config.apiBaseUrl}/quiz/init?player=${encodeURIComponent(player)}`);
        const data = await res.json();

        staticData = data.static_data;
        userProgress = data.user_progress;

        // 2. Load Local Box Progress (Backup cache) - Client Side Only
        if (typeof window !== 'undefined') {
            const storageKey = "kanjilock_boxes_" + player;
            const savedBoxes = localStorage.getItem(storageKey);
            try {
                boxProgress = savedBoxes ? JSON.parse(savedBoxes) : {};
            } catch (e) {
                boxProgress = {};
            }
        }

        console.log(`✅ Engine Ready: ${Object.keys(staticData).length} kanjis loaded.`);
    } catch (e) {
        console.error("❌ Engine Load Error:", e);
    }
}

export function getUserProgress() {
    return userProgress;
}

export function getAvailableBoxes() {
    const boxes = new Set();
    Object.values(staticData).forEach(k => {
        if (k.boite !== undefined && k.boite !== null) boxes.add(String(k.boite));
    });
    return Array.from(boxes);
}

export function getVisibleBoxes(progressiveMode = false, mode = "qa") {
    const allBoxesAvailable = getAvailableBoxes().sort((a, b) => parseInt(a) - parseInt(b));
    if (!progressiveMode) return allBoxesAvailable;

    const visible = [];
    if (allBoxesAvailable.length === 0) return [];

    visible.push(allBoxesAvailable[0]); // Box 0 is always visible

    for (let i = 0; i < allBoxesAvailable.length - 1; i++) {
        const currentBox = allBoxesAvailable[i];
        if (getBoxLevel(currentBox, mode) > 0) {
            visible.push(allBoxesAvailable[i + 1]);
        } else {
            break;
        }
    }
    // Return visible boxes in reverse order of completion/id as requested
    return visible.sort((a, b) => parseInt(b) - parseInt(a));
}

export function getBoxKanjiCount(boxId) {
    if (!boxId) return 0;
    const count = Object.values(staticData).filter(k => String(k.boite) === String(boxId)).length;
    return count;
}

/* ============================
   2. CONTEXT MANAGEMENT
   ============================ */
export function setBoxContext(boxId) {
    // Treat empty string or null as "Global Mode"
    currentBoxFilter = (boxId === "" || boxId === null) ? null : String(boxId);
}

export function resetBoxContext() {
    currentBoxFilter = null;
    sessionHistory.clear();
    penaltyQueue.clear();
}

export function resetEngineSession() {
    sessionHistory.clear();
    // We do NOT clear penaltyQueue here, so errors persist between quick sessions
}

/* ============================
   3. QUESTION GENERATION
   ============================ */
export function getNextQuestion(mode, progressiveMode = false) {
    const modeDef = MODES[mode] || MODES["qa"];
    const srs = userProgress[mode] || {};

    let allKeys = Object.keys(staticData);

    // A. FILTERING CANDIDATES
    let candidates = [];
    if (currentBoxFilter) {
        candidates = allKeys.filter(k => String(staticData[k].boite) === currentBoxFilter);
    } else if (progressiveMode) {
        // All-Box in Progressive Mode: only kanji from visible boxes
        const visibleBoxes = getVisibleBoxes(true, mode);
        candidates = allKeys.filter(k => visibleBoxes.includes(String(staticData[k].boite)));
    } else {
        candidates = allKeys;
    }

    if (candidates.length === 0) {
        candidates = allKeys;
    }

    // B. MANAGE PENALTIES (Decrement cooldowns)
    for (let [k, count] of penaltyQueue) {
        if (count <= 1) penaltyQueue.delete(k);
        else penaltyQueue.set(k, count - 1);
    }

    // C. CREATE POOL (Exclude history & penalties)
    let availablePool = candidates.filter(k => !sessionHistory.has(k) && !penaltyQueue.has(k));

    if (availablePool.length === 0) {
        // If pool exhausted, reset history (infinite loop prevention)
        sessionHistory.clear();
        availablePool = candidates;
    }

    // D. SELECT KANJI
    let selectedKanji = null;

    if (currentBoxFilter) {
        // BOX MODE: Random selection
        selectedKanji = availablePool[Math.floor(Math.random() * availablePool.length)];
    } else {
        // GLOBAL MODE: Weighted SRS selection
        selectedKanji = chooseWeightedKanji(srs, staticData, availablePool);
    }

    if (!selectedKanji) return { done: true, message: "No available kanji." };

    sessionHistory.add(selectedKanji);

    // E. PREPARE DATA OBJECT
    // IMPORTANT: We inject the 'kanji' key into the object so MODES["qb"] works
    const kData = staticData[selectedKanji];
    kData.kanji = selectedKanji;

    return {
        qid: `local_${Date.now()}`,
        kanji: selectedKanji,
        question: modeDef.q(kData),
        correctAnswer: modeDef.a(kData),
        options: generateOptions(selectedKanji, modeDef, candidates),
        extras: modeDef.extras(kData),
        mode: mode
    };
}

// Helper: SRS Weighted Selection
function chooseWeightedKanji(srs, staticData, pool) {
    let weightedList = [];
    pool.forEach(k => {
        const state = srs[k] || { level: 1, next_review: null };

        // Skip if review is in the future
        if (state.next_review && new Date(state.next_review) > new Date()) return;

        const weight = WEIGHTS[state.level] || 1;
        // Multiply occurrences for weight
        for (let i = 0; i < weight * 5; i++) weightedList.push(k);
    });

    // Fallback: If everything is reviewed, pick random from pool
    if (weightedList.length === 0) return pool[Math.floor(Math.random() * pool.length)];

    return weightedList[Math.floor(Math.random() * weightedList.length)];
}

// Helper: Generate Options (Distractors)
function generateOptions(correctKey, modeDef, candidates) {
    // Correct Answer
    const correctData = staticData[correctKey];
    correctData.kanji = correctKey; // Inject Key
    const correct = modeDef.a(correctData);

    // Generate Distractors
    let others = candidates
        .filter(k => k !== correctKey)
        .map(k => {
            const d = staticData[k];
            d.kanji = k; // Inject Key
            return modeDef.a(d);
        });

    // Unique & Shuffle
    others = [...new Set(others)];
    let shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    shuffled.push(correct);

    return shuffled.sort(() => 0.5 - Math.random());
}

/* ============================
   4. ANSWER & UPDATES
   ============================ */
export function checkLocalAnswer(questionObj, userChoice, rt_ms) {
    const isCorrect = (userChoice === questionObj.correctAnswer);
    return {
        correct: isCorrect,
        bonne: questionObj.correctAnswer,
        extras: questionObj.extras,
        rt_ms: rt_ms
    };
}

export function updateEngineAfterAnswer(kanji, isCorrect, mode) {
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
    }
}

/* ============================
   5. BOX RANKING LOGIC
   ============================ */
export async function updateBoxRanking(boxId, sessionStats, mode) {
    if (!boxId) return null;
    boxId = String(boxId);
    mode = mode || "qa";

    const player = getPlayer_setting();
    const now = new Date();
    if (!boxProgress[boxId]) boxProgress[boxId] = {};

    // Load current progress or default
    let current = boxProgress[boxId][mode] || { level: 0, last_attempt: null };

    // LEVEL CALCULATION RULES
    let newLevel = 1;
    let message = "Niveau 1 Validé !";

    // Level 2: 100% Success
    if (sessionStats.wrong === 0) {
        newLevel = 2;
        message = "Niveau 2 : Sans faute !";

        // Level 3: 100% + Total Time < 40s
        if (sessionStats.totalTime <= 40000) {
            newLevel = 3;
            message = "Niveau 3 : Éclair (40s) !";

            // Level 4: Confirmation (5 days later)
            if (current.last_attempt) {
                const lastDate = new Date(current.last_attempt);
                const diffTime = Math.abs(now - lastDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (current.level >= 3 && diffDays >= 5) {
                    newLevel = 4;
                    message = "🏆 NIVEAU 4 : MAÎTRE DU SCEAU !";
                } else if (current.level >= 3) {
                    message = `Niveau 3 confirmé. Revenez dans ${5 - diffDays} jours.`;
                }
            }
        }
    }

    // Keep highest level
    if (newLevel > current.level) {
        current.level = newLevel;
    }
    current.last_attempt = now.toISOString();

    // SAVE 1: LocalStorage (Update nested structure)
    if (typeof window !== 'undefined') {
        boxProgress[boxId][mode] = current; // Save specific mode
        localStorage.setItem("kanjilock_boxes_" + player, JSON.stringify(boxProgress));
    }

    // SAVE 2: Supabase / Backend
    const progressData = {
        user_id: player,
        boite: String(boxId),
        mode: mode,
        level: newLevel,
        last_attempt: now.toISOString()
    };

    try {
        // Use API route wrapper for cors/security if needed
        const response = await fetch(`${config.apiBaseUrl}/box-progress/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressData)
        });
        if (!response.ok) throw new Error("Sync failed");
    } catch (err) {
        console.error("❌ Sync Error:", err);
        // Offline Fallback
        if (typeof window !== 'undefined') {
            localStorage.setItem(`offline_box_${boxId}`, JSON.stringify(progressData));
        }
    }

    return { level: newLevel, message: message };
}

/* ============================
   6. GET BOX LEVEL (UI Helper)
   ============================ */
export function getBoxLevel(boxId, mode = "qa") {
    // Check if box exists, then check if mode exists
    if (boxProgress[String(boxId)] && boxProgress[String(boxId)][mode]) {
        return boxProgress[String(boxId)][mode].level;
    }
    return 0;
}

/* ============================
   7. COMPOSE QUIZ LOGIC
   ============================ */
export function getComposeQuestionLocal() {
    const keys = Object.keys(staticData);

    // Filter kanjis with 'comp_words'
    const pool = keys.filter(key => {
        const k = staticData[key];
        return k.comp_words && k.comp_words.trim().length > 0;
    });

    if (pool.length === 0) return null;

    const selectedKey = pool[Math.floor(Math.random() * pool.length)];
    const kData = staticData[selectedKey];
    kData.kanji = selectedKey; // Inject Key

    // Extract correct words
    const correctWords = kData.comp_words.split(',').map(w => w.trim()).filter(w => w.length > 0);

    // Generate Distractors
    const distractors = [];
    let attempts = 0;
    while (distractors.length < 5 && attempts < 50) {
        attempts++;
        const randomKey = pool[Math.floor(Math.random() * pool.length)];
        if (randomKey === selectedKey) continue;

        const otherData = staticData[randomKey];
        if (!otherData.comp_words) continue;

        const otherWords = otherData.comp_words.split(',').map(w => w.trim());
        const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];

        if (randomWord && !correctWords.includes(randomWord) && !distractors.includes(randomWord)) {
            distractors.push(randomWord);
        }
    }

    // Shuffle
    const nbLeurres = Math.max(2, 6 - correctWords.length);
    const options = [...correctWords, ...distractors.slice(0, nbLeurres)];
    options.sort(() => Math.random() - 0.5);

    return {
        qid: crypto.randomUUID(),
        kanji: selectedKey,
        signification: kData.signification,
        options: options,
        correctAnswers: correctWords,
        extras: {
            romaji: kData.romaji,
            lecture_mot: kData.lecture_mot,
            mot: kData.mot,
            signification_mot: kData.signification_mot,
            boite: kData.boite
        }
    };
}

export function checkComposeAnswer(questionData, selectedWords) {
    const correctSet = new Set(questionData.correctAnswers);
    const selectedSet = new Set(selectedWords);

    const noErrors = selectedWords.every(w => correctSet.has(w));
    const allFound = correctSet.size === selectedSet.size;

    return {
        success: noErrors && allFound,
        kanji: questionData.kanji,
        correct: questionData.correctAnswers,
        extras: questionData.extras
    };
}
