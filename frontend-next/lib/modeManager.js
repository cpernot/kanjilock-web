/* ============================
   MODE MANAGER
   ============================ */

import { MODES } from "./quizModes";

export const MODES_LIST = Object.keys(MODES);

// In React, we might prefer using a Hook or Context for this.
// For now, we use localStorage to persist the preference, same as before.

export function getMode() {
    if (typeof window === 'undefined') return "qa";
    return localStorage.getItem("kanjilock_mode") || "qa";
}

export function setMode(mode) {
    if (typeof window === 'undefined') return;
    if (MODES_LIST.includes(mode)) {
        localStorage.setItem("kanjilock_mode", mode);
        return true;
    }
    return false;
}

export function initMode() {
    // Legacy function, might not be needed in Next.js structure 
    // where we can just read getMode() in the component.
    const mode = getMode();
    console.log("Current Mode: " + mode);
    return mode;
}

export function cycleMode() {
    const current = getMode();
    const idx = MODES_LIST.indexOf(current);
    const next = MODES_LIST[(idx + 1) % MODES_LIST.length];
    setMode(next);
    return next;
}
