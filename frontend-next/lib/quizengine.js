/* ============================================================================
   KANJILOCK QUIZ ENGINE (Ported for Next.js)
   Handles: Data Loading, Question Generation, SRS Logic, Box Filtering
   ============================================================================ */

import config from "./config";
import { getPlayer_setting, getSettings } from "./settings"; 
import { getSession } from "./quizSession";

// --- STATE VARIABLES (kept in module scope for now, could be Context in future) ---
let staticData = {};       // Full Kanji Data (kanjilock.json)
let userProgress = {};     // User SRS Stats
let boxProgress = {};      // Local Box Levels
let sessionHistory = new Set();
let penaltyQueue = new Map(); // Kanji -> Remaining turns to wait
let reinjectionQueue = new Set(); // Kanji to be asked again at the end (All-Good mode)

export let currentBoxFilter = null; // null = Global Mode
export let isInitialized = false;

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
        // 0. Wait for backend to be ready (Cache loading)
        let isReady = false;
        let readyAttempts = 0;
        while (!isReady && readyAttempts < 60) {
            try {
                const rRes = await fetch(`${config.apiBaseUrl}/ready`);
                const rData = await rRes.json();
                if (rData.ready) {
                    isReady = true;
                } else {
                    console.log("⏳ Backend is still initializing cache...");
                    await new Promise(r => setTimeout(r, 1500));
                    readyAttempts++;
                }
            } catch (e) {
                console.warn("⚠️ Ready check failed, retrying...", e);
                await new Promise(r => setTimeout(r, 2000));
                readyAttempts += 2;
            }
        }

        // 1. Fetch Data from Backend (Kanji & SRS)
        const res = await fetch(`${config.apiBaseUrl}/quiz/init?player=${encodeURIComponent(player)}`);
        const data = await res.json();

        staticData = data.static_data;
        userProgress = data.user_progress;

        // Reset Box Progress to avoid player carryover
        boxProgress = {};

        // 2. Fetch Box Levels from Backend
        try {
            const bRes = await fetch(`${config.apiBaseUrl}/box-progress/${encodeURIComponent(player)}`);
            const bData = await bRes.json();
            // Normalize backend data (backen might send { box: { mode: level } })
            Object.keys(bData).forEach(bId => {
                boxProgress[bId] = {};
                Object.keys(bData[bId]).forEach(m => {
                    const val = bData[bId][m];
                    boxProgress[bId][m] = typeof val === 'object' ? val : { level: val, last_attempt: null };
                });
            });
        } catch (e) {
            console.warn("⚠️ Remote box progress fetch failed, falling back to local.");
        }

        // 3. Load Local Box Progress (Backup cache) - Client Side Only
        if (typeof window !== 'undefined') {
            const storageKey = "kanjilock_boxes_" + player;
            const savedBoxes = localStorage.getItem(storageKey);
            try {
                const localBoxes = savedBoxes ? JSON.parse(savedBoxes) : {};
                // Merge local into remote (local usually has more recent timestamps)
                Object.keys(localBoxes).forEach(bId => {
                    if (!boxProgress[bId]) boxProgress[bId] = {};
                    Object.keys(localBoxes[bId]).forEach(m => {
                        const localVal = localBoxes[bId][m];
                        const remoteVal = boxProgress[bId][m];
                        if (!remoteVal || (localVal.level >= (remoteVal.level || 0))) {
                            boxProgress[bId][m] = localVal;
                        }
                    });
                });
            } catch (e) {
                console.error("Local box parse error", e);
            }
        }

        console.log(`✅ Engine Ready: ${Object.keys(staticData).length} kanjis loaded.`);
        isInitialized = true;
    } catch (e) {
        console.error("❌ Engine Load Error:", e);
    }
}

export function getUserProgress() {
    return userProgress;
}

export function getStaticData() {
    return staticData;
}

export function getBoxProgress() {
    return boxProgress;
}

export function getAvailableBoxes() {
    const boxes = new Set();
    Object.values(staticData).forEach(k => {
        if (k.boite !== undefined && k.boite !== null) boxes.add(String(k.boite));
    });
    return Array.from(boxes);
}

export function getVisibleBoxes(progressiveMode = false, mode = "qa") {
    const allBoxesAvailable = getAvailableBoxes(); // Assuming this returns DB order
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
    // Return visible boxes in database sequence
    return visible;
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
    reinjectionQueue.clear();
}

/**
 * Removes a kanji from the current session history so it can be picked again.
 * Used for "All-Good" mode where failed questions are reinjected.
 */
/**
 * Adds a kanji to the reinjection queue to be asked again at the end of the session.
 * Used for "All-Good" mode.
 */
export function reinjectKanji(kanji) {
    reinjectionQueue.add(kanji);
    console.log(`♻️ Kanji ${kanji} added to reinjection queue.`);
}

export function getReinjectionQueueSize() {
    return reinjectionQueue.size;
}

export function resetEngineSession() {
    sessionHistory.clear();
    reinjectionQueue.clear();
    // We do NOT clear penaltyQueue here, so errors persist between quick sessions
}

/* ============================
   3. QUESTION GENERATION
   ============================ */
export function getNextQuestion(mode, progressiveMode = false, sequentialOrder = false) {
    const modeDef = MODES[mode] || MODES["qa"];
    const srs = userProgress[mode] || {};

    let allKeys = Object.keys(staticData);

    // A. FILTERING CANDIDATES
    let candidates = [];

    if (currentBoxFilter) {
        candidates = allKeys.filter(k => String(staticData[k].boite) === currentBoxFilter);
    } else if (progressiveMode) {
        const visibleBoxes = getVisibleBoxes(true, mode);
        candidates = allKeys.filter(k => visibleBoxes.includes(String(staticData[k].boite)));
    } else {
        candidates = allKeys;
    }

    // Additional Filter for Composition Modes: must have comp_words
    if (mode === "qh" || mode === "qg") {
        candidates = candidates.filter(k => {
            const cw = staticData[k].comp_words;
            if (!cw) return false;
            if (Array.isArray(cw)) return cw.length > 0;
            return typeof cw === 'string' && cw.trim().length > 0;
        });
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

    let fromReinjection = false;
    const settings = getSettings();
    const currentSession = getSession();
    const effectiveSessionSize = currentSession ? currentSession.size : settings.sessionSize;
    
    const isAllGood = settings.allGood && currentBoxFilter !== null;

    // In All-Good mode, if we reached the session size, prioritize reinjection
    if (isAllGood && sessionHistory.size >= effectiveSessionSize && reinjectionQueue.size > 0) {
        availablePool = Array.from(reinjectionQueue);
        fromReinjection = true;
    } else if (availablePool.length === 0) {
        // If regular pool is empty, check if we have failed questions to reinject
        if (reinjectionQueue.size > 0) {
            availablePool = Array.from(reinjectionQueue);
            fromReinjection = true;
        } else {
            // If truly exhausted, reset history (infinite loop prevention)
            sessionHistory.clear();
            availablePool = candidates;
        }
    }

    // D. SELECT KANJI
    let selectedKanji = null;

    if (sequentialOrder) {
        // SEQUENTIAL MODE: Pick the first available in candidate list
        selectedKanji = availablePool[0];
    } else if (currentBoxFilter) {
        // BOX MODE: Random selection
        selectedKanji = availablePool[Math.floor(Math.random() * availablePool.length)];
    } else {
        // GLOBAL MODE: Weighted SRS selection
        selectedKanji = chooseWeightedKanji(srs, staticData, availablePool);
    }

    if (!selectedKanji) return { done: true, message: "No available kanji." };

    if (fromReinjection) {
        reinjectionQueue.delete(selectedKanji);
        console.log(`🎯 Picked ${selectedKanji} from reinjection queue.`);
    } else {
        sessionHistory.add(selectedKanji);
    }

    // E. PREPARE DATA OBJECT
    // IMPORTANT: We inject the 'kanji' key into the object so MODES["qb"] works
    const kData = staticData[selectedKanji];
    kData.kanji = selectedKanji;

    return {
        qid: `local_${Date.now()}`,
        kanji: selectedKanji,
        question: modeDef.q(kData),
        correctAnswer: modeDef.a(kData),
        options: generateOptions(selectedKanji, modeDef, candidates, mode),
        extras: modeDef.extras(kData),
        mode: mode,
        // qh/qg specific
        correctAnswers: (mode === "qh" || mode === "qg")
            ? (Array.isArray(kData.comp_words)
                ? kData.comp_words
                : (typeof kData.comp_words === 'string' ? kData.comp_words.split(",") : [])
            ).map(w => w.trim()).filter(w => w.length > 0)
            : null
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
function generateOptions(correctKey, modeDef, candidates, mode) {
    const correctData = staticData[correctKey];
    correctData.kanji = correctKey; // Inject Key
    const isComposeMode = (mode === "qh" || mode === "qg");

    if (isComposeMode) {
        // Handle both Array and comma-separated String
        let rawCorrect = correctData.comp_words || [];
        if (typeof rawCorrect === 'string') rawCorrect = rawCorrect.split(",");
        const correctWords = rawCorrect.map(w => w.trim()).filter(w => w.length > 0);

        const distractors = [];
        let attempts = 0;

        // Find distractors from other kanji compositions
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
    let isCorrect = false;
    const isComposeMode = (questionObj.mode === "qh" || questionObj.mode === "qg");

    if (isComposeMode) {
        // userChoice is an array for qh/qg
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
        return state;
    }

    return userProgress[mode]?.[kanji] || null;
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
        boite: isNaN(boxId) ? String(boxId) : parseInt(boxId), // Fix: ensure integer for DB if possible
        mode: mode,
        level: current.level,
        last_attempt: now.toISOString()
    };

    try {
        console.log(`📡 Syncing box ${boxId} level ${current.level} to server for player: ${player}...`);
        const response = await fetch(`${config.apiBaseUrl}/box-progress/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressData)
        });

        const result = await response.json();

        if (!response.ok || result.status === "error") {
            const errorMsg = result.message || "Unknown server error";
            throw new Error(`Sync failed: ${errorMsg}`);
        }

        console.log("✅ Box progress synced successfully");
    } catch (err) {
        console.error("❌ Sync Error:", err.message);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`offline_box_${boxId}`, JSON.stringify(progressData));
        }
    }

    return { level: current.level, message: message, sessionLevel: newLevel };
}

/* ============================
   6. GET BOX LEVEL (UI Helper)
   ============================ */
export function getBoxLevel(boxId, mode = "qa") {
    // Check if box exists, then check if mode exists
    const bId = String(boxId);
    if (boxProgress[bId] && boxProgress[bId][mode]) {
        const entry = boxProgress[bId][mode];
        return typeof entry === 'object' ? (entry.level || 0) : entry;
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
