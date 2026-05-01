/* ============================================================================
   KANJILOCK QUIZ ENGINE (Refactored)
   Main Orchestrator for Quiz Operations
   ============================================================================ */

import config from "./config";
import { getPlayer_setting, getSettings } from "./settings";
import { getSession } from "./quizSession";
import { MODES } from "./quizModes";

// Imported Modules
import { chooseWeightedKanji, updateBoxRanking as srsUpdateBoxRanking } from "./quiz/srs";
import { prepareQuestionObject } from "./quiz/questions";
import { checkLocalAnswer as quizCheckAnswer, updateEngineStateAfterAnswer } from "./quiz/answer";

// --- STATE VARIABLES ---
let staticData = {};
let userProgress = {};
let boxProgress = {};
let sessionHistory = new Set();
let penaltyQueue = new Map();
let reinjectionQueue = new Set();
let sessionFailures = new Set();

export let currentBoxFilter = null;
export let isInitialized = false;

// --- CONFIGURATION ---
const COOLDOWN_ERROR = 20;

let orderedBoxes = [];

let lastInitializedPlayer = null;

/* ============================
   1. INITIALIZATION
   ============================ */
export async function initEngine(playerOverride = null) {
    const player = playerOverride || getPlayer_setting();
    if (!player) return;

    if (isInitialized && lastInitializedPlayer === player) {
        console.log(`📡 Engine: Already initialized for player "${player}". Skipping...`);
        return;
    }

    try {
        console.log(`📡 Engine: Initializing for player "${player}"...`);
        lastInitializedPlayer = player;
        // Wait for backend cache
        let isReady = false;
        let readyAttempts = 0;
        const maxAttempts = 20; // Reduced from 60 to be more responsive, total ~20-30s

        while (!isReady && readyAttempts < maxAttempts) {
            try {
                console.log(`📡 Engine: Checking backend readiness (Attempt ${readyAttempts + 1}/${maxAttempts})...`);
                const rRes = await fetch(`${config.apiBaseUrl}/ready`, { cache: 'no-store' });
                if (!rRes.ok) throw new Error("Backend not responding correctly");
                
                const rData = await rRes.json();
                console.log("📡 Engine: Ready check data:", rData);
                
                if (rData.ready && rData.count > 0) {
                    isReady = true;
                } else {
                    await new Promise(r => setTimeout(r, 1000));
                    readyAttempts++;
                }
            } catch (e) {
                console.warn("📡 Engine: Readiness check error:", e.message);
                await new Promise(r => setTimeout(r, 1500));
                readyAttempts++;
            }
        }

        if (!isReady) {
            console.error("❌ Engine: Backend failed to become ready in time.");
            // We'll still try to fetch, but this likely means empty data
        }

        const res = await fetch(`${config.apiBaseUrl}/quiz/init?player=${encodeURIComponent(player)}&t=${Date.now()}`, {
            cache: 'no-store'
        });
        const data = await res.json();

        staticData = data.static_data || {};
        userProgress = data.user_progress || {};
        boxProgress = {};

        console.log(`📡 Engine: Received ${Object.keys(staticData).length} kanji. (Status: ${res.status})`);
        window.DEBUG_STATIC_DATA = staticData; // Allow manual inspection

        // Fetch Remote Box Levels
        try {
            const bRes = await fetch(`${config.apiBaseUrl}/box-progress/${encodeURIComponent(player)}`);
            const bData = await bRes.json();
            Object.keys(bRes.ok ? bData : {}).forEach(bId => {
                boxProgress[bId] = {};
                Object.keys(bData[bId]).forEach(m => {
                    const val = bData[bId][m];
                    boxProgress[bId][m] = typeof val === 'object' ? val : { level: val, last_attempt: null };
                });
            });
        } catch (e) {
            console.warn("⚠️ Remote box progress fetch failed.");
        }

        // Fetch Ordered Boxes
        try {
            const boxesRes = await fetch(`${config.apiBaseUrl}/available-boxes`);
            if (boxesRes.ok) {
                orderedBoxes = (await boxesRes.json()).map(String);
                console.log(`📡 Engine: Loaded ${orderedBoxes.length} ordered boxes.`);
            }
        } catch (e) {
            console.warn("⚠️ Available boxes fetch failed.");
        }

        // Load Local Box Progress Backup
        if (typeof window !== 'undefined') {
            const savedBoxes = localStorage.getItem("kanjilock_boxes_" + player);
            try {
                const localBoxes = savedBoxes ? JSON.parse(savedBoxes) : {};
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
            } catch (e) { }
        }

        isInitialized = true;
        console.log("✅ Engine Ready");
    } catch (e) {
        console.error("❌ Engine Load Error:", e);
        alert("Fatal: Quiz Engine failed to load. Check console for details.");
    }
}

/* ============================
   2. DATA ACCESSORS
   ============================ */
export const getUserProgress = () => userProgress;
export const getStaticData = () => staticData;
export const getBoxProgress = () => boxProgress;

export function getAvailableBoxes() {
    if (orderedBoxes.length > 0) return orderedBoxes;

    // Fallback if API failed - Try to sort numerically at least
    const boxes = new Set();
    Object.values(staticData).forEach(k => {
        if (k.boite !== undefined && k.boite !== null) boxes.add(String(k.boite));
    });
    // Fallback sort: basic numeric/alphabetic
    return Array.from(boxes).sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
    });
}


export function getBoxLevel(boxId, mode = "qa") {
    const bId = String(boxId);
    if (boxProgress[bId] && boxProgress[bId][mode]) {
        const entry = boxProgress[bId][mode];
        return typeof entry === 'object' ? (entry.level || 0) : entry;
    }
    return 0;
}

export function getNextBoxId(currentBoxId) {
    if (!currentBoxId || orderedBoxes.length === 0) return null;
    const idx = orderedBoxes.indexOf(String(currentBoxId));
    if (idx !== -1 && idx < orderedBoxes.length - 1) {
        return orderedBoxes[idx + 1];
    }
    return null;
}

export function getVisibleBoxes(progressiveMode = false, mode = "qa") {
    const allBoxesAvailable = getAvailableBoxes();
    if (!progressiveMode) return allBoxesAvailable;

    const visible = [];
    if (allBoxesAvailable.length === 0) return [];

    visible.push(allBoxesAvailable[0]);
    for (let i = 0; i < allBoxesAvailable.length - 1; i++) {
        const lvl = getBoxLevel(allBoxesAvailable[i], mode);
        if (lvl > 0) {
            visible.push(allBoxesAvailable[i + 1]);
        } else {
            console.log(`🔒 Progressive Mode: Stopping at ${allBoxesAvailable[i]} (Level: ${lvl}) for mode ${mode}`);
            break;
        }
    }
    return visible;
}

export const getBoxKanjiCount = (boxId) =>
    boxId ? Object.values(staticData).filter(k => String(k.boite) === String(boxId)).length : 0;

/* ============================
   3. SESSION MANAGEMENT
   ============================ */
export function setBoxContext(boxId) {
    currentBoxFilter = (boxId === "" || boxId === null) ? null : String(boxId);
}

export function resetBoxContext() {
    currentBoxFilter = null;
    sessionHistory.clear();
    penaltyQueue.clear();
    reinjectionQueue.clear();
}

export function reinjectKanji(kanji) {
    reinjectionQueue.add(kanji);
}

export function getReinjectionQueueSize() {
    return reinjectionQueue.size;
}

export function resetEngineSession() {
    sessionHistory.clear();
    reinjectionQueue.clear();
    sessionFailures.clear();
}

/* ============================
   4. QUESTION GENERATION
   ============================ */
export function getNextQuestion(mode, progressiveMode = false, sequentialOrder = false) {
    const srs = userProgress[mode] || {};
    let allKeys = Object.keys(staticData);

    // A. FILTERING CANDIDATES
    let candidates = [];
    if (currentBoxFilter) {
        candidates = allKeys.filter(k => String(staticData[k].boite) === currentBoxFilter);
    } else if (progressiveMode && mode !== "qg" && mode !== "qh") {
        const visibleBoxes = getVisibleBoxes(true, mode);
        candidates = allKeys.filter(k => visibleBoxes.includes(String(staticData[k].boite)));
    } else {
        candidates = allKeys;
    }

    if (mode === "qh") {
        candidates = candidates.filter(k => {
            const cw = staticData[k].comp_words;
            return cw && (Array.isArray(cw) ? cw.length > 0 : cw.trim().length > 0);
        });
    }

    if (candidates.length === 0) candidates = allKeys;

    // B. MANAGE PENALTIES
    for (let [k, count] of penaltyQueue) {
        if (count <= 1) penaltyQueue.delete(k);
        else penaltyQueue.set(k, count - 1);
    }

    // C. CREATE POOL
    let availablePool = candidates.filter(k => !sessionHistory.has(k) && !penaltyQueue.has(k));
    let fromReinjection = false;
    const settings = getSettings();
    const currentSession = getSession();
    const effectiveSessionSize = currentSession ? currentSession.size : settings.sessionSize;
    const isAllGood = settings.allGood && currentBoxFilter !== null;

    if (isAllGood && sessionHistory.size >= effectiveSessionSize && reinjectionQueue.size > 0) {
        availablePool = Array.from(reinjectionQueue);
        fromReinjection = true;
    } else if (availablePool.length === 0) {
        if (reinjectionQueue.size > 0) {
            availablePool = Array.from(reinjectionQueue);
            fromReinjection = true;
        } else {
            sessionHistory.clear();
            availablePool = candidates;
        }
    }

    // D. SELECT KANJI
    let selectedKanji = null;
    if (sequentialOrder) selectedKanji = availablePool[0];
    else if (currentBoxFilter) selectedKanji = availablePool[Math.floor(Math.random() * availablePool.length)];
    else selectedKanji = chooseWeightedKanji(srs, staticData, availablePool);

    if (!selectedKanji) {
        const count = Object.keys(staticData).length;
        return { done: true, message: `No available kanji (Loaded: ${count}, Box: ${currentBoxFilter || 'All'})` };
    }

    if (fromReinjection) reinjectionQueue.delete(selectedKanji);
    else sessionHistory.add(selectedKanji);

    // E. PREPARE OBJECT
    return prepareQuestionObject(selectedKanji, mode, staticData, candidates, orderedBoxes);
}

/* ============================
   5. ANSWER & UPDATES
   ============================ */
export function checkLocalAnswer(questionObj, userChoice, rt_ms) {
    return quizCheckAnswer(questionObj, userChoice, rt_ms);
}

export function updateEngineAfterAnswer(kanji, isCorrect, mode) {
    if (!isCorrect) sessionFailures.add(kanji);
    const hasFailedBefore = sessionFailures.has(kanji);
    return updateEngineStateAfterAnswer(kanji, isCorrect, mode, userProgress, penaltyQueue, COOLDOWN_ERROR, hasFailedBefore);
}

export async function updateBoxRanking(boxId, sessionStats, mode) {
    const result = await srsUpdateBoxRanking(boxId, sessionStats, mode, boxProgress);
    // Sync to LocalStorage after module update
    if (typeof window !== 'undefined') {
        localStorage.setItem("kanjilock_boxes_" + getPlayer_setting(), JSON.stringify(boxProgress));
    }
    return result;
}
