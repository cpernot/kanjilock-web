"use client";
import { getPlayer_setting } from "./settings";

const FLASHCARD_STORAGE_KEY = "kanjilock_flashcards_";

/**
 * Loads flashcard progress from localStorage.
 * Format: { [kanji]: level }
 */
export function loadFlashcardProgress() {
    if (typeof window === 'undefined') return {};
    const player = getPlayer_setting();
    const data = localStorage.getItem(FLASHCARD_STORAGE_KEY + player);
    return data ? JSON.parse(data) : {};
}

/**
 * Saves level evaluation for a specific kanji.
 */
export function saveFlashcardEvaluation(kanji, level) {
    if (typeof window === 'undefined') return;
    const player = getPlayer_setting();
    const progress = loadFlashcardProgress();
    progress[kanji] = level;
    localStorage.setItem(FLASHCARD_STORAGE_KEY + player, JSON.stringify(progress));
}

/**
 * Filters and prepares a deck based on user criteria.
 */
export function prepareDeck(allKanjis, filters, srsProgress, boxProgressMap, sequentialOrder = false) {
    let deck = Object.entries(allKanjis).map(([kanji, data]) => {
        // Find max SRS level across all modes (qa, qb, qc, etc.)
        let maxSrsLevel = 0;
        const modes = ["qa", "qb", "qc", "qd", "qe", "qf", "qg", "qh"];
        
        const masteryLevels = modes.map(m => {
            // Log once per deck to check structure
            if (srsProgress && srsProgress[m] && srsProgress[m][kanji]) {
                const lvl = srsProgress[m][kanji].level || 0;
                if (lvl > maxSrsLevel) maxSrsLevel = lvl;
                return lvl;
            }
            return 0;
        });

        const code = masteryLevels.join("");

        return {
            kanji,
            ...data,
            level: filters.progress[kanji] || 1, // Default to level 1 (Unknown)
            srsLevel: maxSrsLevel,
            masteryCode: code,
            boxLevel: (boxProgressMap && boxProgressMap[data.boite]) ? (boxProgressMap[data.boite].qa || 0) : 0
        };
    });

    if (deck.length > 0 && srsProgress) {
        console.log("📊 Deck Prepared. Sample Mastery Data:", {
            kanji: deck[0].kanji,
            code: deck[0].masteryCode,
            hasSrs: Object.keys(srsProgress).length > 0
        });
    }

    // 1. Filter by Level (Checkbox logic)
    if (filters.selectedLevels && filters.selectedLevels.length > 0) {
        deck = deck.filter(card => filters.selectedLevels.includes(card.level));
    }

    // 2. Filter by Box
    if (filters.boxId && filters.boxId !== "all") {
        deck = deck.filter(card => String(card.boite) === String(filters.boxId));
    }

    // 3. Filter/Sort by SRS (Simplified: show specific SRS level if requested)
    if (filters.srsLevel && filters.srsLevel !== "all") {
        deck = deck.filter(card => String(card.srsLevel) === String(filters.srsLevel));
    }

    // Return deck (Shuffle only if NOT sequential)
    if (sequentialOrder) return deck;
    return deck.sort(() => Math.random() - 0.5);
}
