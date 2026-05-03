/**
 * SRS and Box Ranking Logic for KanjiLock
 */

import config from "../config";
import { getPlayer_setting } from "../settings";

export const WEIGHTS = { 1: 5, 2: 3, 3: 1, 4: 0.2 };

export function chooseWeightedKanji(srs, staticData, pool) {
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

export async function updateBoxRanking(boxId, sessionStats, mode, boxProgress) {
    if (!boxId) return null;
    boxId = String(boxId);
    mode = mode || "qa";

    const player = getPlayer_setting();
    const now = new Date();
    
    // Ensure nested structure exists
    if (!boxProgress[boxId]) boxProgress[boxId] = {};

    // Load current progress or default
    let current = boxProgress[boxId][mode] || { level: 0, last_attempt: null };

    // LEVEL CALCULATION RULES
    let newLevel = 1;
    let message = "Niveau 1 Validé !";
    const speedScore = sessionStats.scoreOn100;

    // Level 2: Speed Score >= 80
    if (speedScore >= 80) {
        newLevel = 2;
        message = "Niveau 2 : Score Rapide (80+) !";
    }

    // Level 3: Speed Score = 100
    if (speedScore >= 100) {
        newLevel = 3;
        message = "Niveau 3 : Éclair (Score 100) !";

        // Level 4: Confirmation (5 days later)
        if (current.last_attempt) {
            const lastDate = new Date(current.last_attempt);
            const diffTime = Math.abs(now - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (current.level >= 3 && diffDays >= 5) {
                newLevel = 4;
                message = "🏆 NIVEAU 4 : MAÎTRE DU SCEAU !";
            } else if (current.level >= 3) {
                message = `Niveau 3 confirmé. Revenez dans ${5 - diffDays} jours pour le Niv. 4.`;
            }
        }
    }

    // Keep highest level
    if (newLevel > current.level) {
        current.level = newLevel;
    }
    current.last_attempt = now.toISOString();

    // SAVE 1: LocalStorage (caller handles this)
    boxProgress[boxId][mode] = current;

    // SAVE 2: Supabase / Backend
    const progressData = {
        user_id: player,
        boite: isNaN(boxId) ? String(boxId) : parseInt(boxId),
        mode: mode,
        level: current.level,
        last_attempt: now.toISOString()
    };

    try {
        console.log(`📡 Syncing box ${boxId} level ${current.level} to server...`);
        const response = await fetch(`${config.apiBaseUrl}/box-progress/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(progressData)
        });

        const result = await response.json();
        if (!response.ok || result.status === "error") {
            throw new Error(result.message || "Unknown server error");
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
