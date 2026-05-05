import { getSettings, saveSettings, saveRemoteSettings } from "./settings";
import config from "./config";

/**
 * Checks if the current target period has passed.
 */
export function checkPeriodReset(settings, targetId = null) {
    const id = targetId || settings.targets?.activeId || "main";
    const target = settings.targets?.definitions?.[id];
    if (!target) return false;

    const last = target.lastBaselineUpdate ? new Date(target.lastBaselineUpdate) : null;
    if (!last) return true;

    const now = new Date();
    const period = target.period;

    if (period === "day") {
        return now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
    }

    if (period === "week") {
        const getMonday = (d) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff)).toDateString();
        };
        return getMonday(now) !== getMonday(last);
    }

    if (period === "month") {
        return now.getMonth() !== last.getMonth() || now.getFullYear() !== last.getFullYear();
    }

    return false;
}

/**
 * Fetches the count of boxes and kanji at each level (1-4).
 */
export async function fetchStatsCounts(player, mode = null) {
    if (!player) return { boxes: { 1: 0, 2: 0, 3: 0, 4: 0 }, kanji: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    const statsUrl = `${config.apiBaseUrl}/stats?player=${encodeURIComponent(player)}${mode ? `&mode=${mode}` : ''}`;
    const boxUrl = `${config.apiBaseUrl}/box-progress/${encodeURIComponent(player)}`;
    
    console.log(`📡 Fetching stats: ${statsUrl}`);
    console.log(`📡 Fetching boxes: ${boxUrl}`);

    try {
        const [boxRes, statsRes] = await Promise.all([
            fetch(boxUrl, { cache: 'no-store' }),
            fetch(statsUrl, { cache: 'no-store' })
        ]);

        const boxCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
        const kanjiCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

        if (boxRes.ok) {
            const data = await boxRes.json();
            Object.values(data).forEach(modes => {
                let level = 0;
                if (mode) {
                    level = modes[mode] || 0;
                } else {
                    const coreModes = Object.entries(modes)
                        .filter(([m]) => m !== "qh" && m !== "qg")
                        .map(([, l]) => l);
                    if (coreModes.length > 0) level = Math.max(...coreModes);
                }
                if (level >= 1 && level <= 4) boxCounts[level]++;
            });
        }

        if (statsRes.ok) {
            const stats = await statsRes.json();
            if (stats.srs_levels) {
                Object.keys(stats.srs_levels).forEach(k => {
                    const lvl = parseInt(k);
                    if (lvl >= 1 && lvl <= 4) kanjiCounts[lvl] = stats.srs_levels[k];
                });
            }
        }

        return { boxes: boxCounts, kanji: kanjiCounts };
    } catch (e) {
        console.error("fetchStatsCounts error", e);
        return { boxes: { 1: 0, 2: 0, 3: 0, 4: 0 }, kanji: { 1: 0, 2: 0, 3: 0, 4: 0 } };
    }
}

// Keep the old name for compatibility if needed, but alias it
export const fetchBoxCounts = async (player, mode) => (await fetchStatsCounts(player, mode)).boxes;

/**
 * Updates the current baselines for a specific target.
 */
export async function updateBaselines(player, currentStats, targetId = null, settingsOverride = null) {
    const settings = settingsOverride || getSettings(player);
    if (!settings.targets) return;

    const id = targetId || settings.targets.activeId || "main";
    const target = settings.targets.definitions?.[id];
    if (!target) return;

    // --- 1. Archive current progress to history ---
    try {
        const periodStart = target.lastBaselineUpdate;
        if (periodStart) {
            const baselines = target.type === "kanji"
                ? (target.kanji_baselines || target.baselines || {})
                : (target.baselines || {});

            const achieved = {};
            [1, 2, 3, 4].forEach(lvl => {
                let current = 0;
                if (target.type === "kanji") {
                    current = currentStats.kanji?.[lvl] || 0;
                } else {
                    current = currentStats.boxes?.[lvl] || 0;
                }
                const base = baselines[lvl] || baselines[String(lvl)] || 0;
                achieved[lvl] = Math.max(0, current - base);
            });

            const snapshot = {
                target_id: id,
                period_start: periodStart,
                period_end: new Date().toISOString(),
                target_type: target.type || "kanji",
                period_type: target.period || "week",
                config: target.levels || {},
                achieved: achieved
            };

            await fetch(`${config.apiBaseUrl}/target-history/${encodeURIComponent(player)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(snapshot)
            });
        }
    } catch (e) {
        console.error("Failed to archive target history", e);
    }

    // --- 2. Set new baselines ---
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);

    // Handle both old format (direct counts) and new unified format ({boxes, kanji})
    const boxes = currentStats.boxes || (currentStats[1] !== undefined ? currentStats : {});
    const kanji = currentStats.kanji || (currentStats[1] !== undefined ? currentStats : {});

    target.baselines = { ...boxes };
    target.kanji_baselines = { ...kanji };
    target.lastBaselineUpdate = todayAtMidnight.toISOString();

    await saveRemoteSettings(player, settings);
}

/**
 * Fetches the target achievement history.
 */
export async function fetchTargetHistory(player, limit = 50) {
    if (!player) return [];
    try {
        const res = await fetch(`${config.apiBaseUrl}/target-history/${encodeURIComponent(player)}?limit=${limit}`, {
            cache: 'no-store'
        });
        if (res.ok) return await res.json();
    } catch (e) {
        console.error("Fetch target history error", e);
    }
    return [];
}

/**
 * Deletes a specific history record.
 */
export async function deleteTargetHistory(player, historyId) {
    if (!player || !historyId) return false;
    try {
        const res = await fetch(`${config.apiBaseUrl}/target-history/${encodeURIComponent(player)}/${encodeURIComponent(historyId)}`, {
            method: "DELETE"
        });
        return res.ok;
    } catch (e) {
        console.error("Delete target history error", e);
        return false;
    }
}

/**
 * Calculates current progress for a specific target.
 */
export function calculateProgress(settings, currentCounts, targetId = null) {
    const id = targetId || settings.targets?.activeId || "main";
    const target = settings.targets?.definitions?.[id];
    if (!target) return {};

    const progress = {};
    const baselines = target.type === "kanji"
        ? (target.kanji_baselines || target.baselines || {})
        : (target.baselines || {});

    [1, 2, 3, 4].forEach(lvl => {
        let currentTotal = 0;
        if (target.type === "kanji") {
            currentTotal = currentCounts.kanji?.[lvl] || 0;
        } else {
            currentTotal = currentCounts.boxes?.[lvl] || 0;
        }
        
        const baselineValue = baselines[lvl] || baselines[String(lvl)] || 0;
        const gained = Math.max(0, currentTotal - baselineValue);
        const goal = target.levels[lvl] || 0;

        progress[lvl] = {
            current: gained,
            target: goal,
            percent: goal > 0 ? Math.min(100, (gained / goal) * 100) : 100
        };
    });
    return progress;
}

/**
 * Calculates time elapsed in the current target period.
 */
export function calculatePeriodAdvancement(settings, targetId = null) {
    const id = targetId || settings.targets?.activeId || "main";
    const target = settings.targets?.definitions?.[id];
    if (!target || !target.lastBaselineUpdate) return 0;

    const start = new Date(target.lastBaselineUpdate);
    const now = new Date();
    const elapsedMs = now - start;

    let totalMs = 1;
    const period = target.period;
    if (period === "day") totalMs = 24 * 60 * 60 * 1000;
    else if (period === "week") totalMs = 7 * 24 * 60 * 60 * 1000;
    else if (period === "month") {
        const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        const currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
        totalMs = nextMonth - currentMonth;
    }

    return Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
}
