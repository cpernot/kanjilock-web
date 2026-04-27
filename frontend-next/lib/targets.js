import { getSettings, saveSettings, saveRemoteSettings } from "./settings";
import config from "./config";

/**
 * Checks if a target period (day, week, month) has reset.
 */
export function checkPeriodReset(settings) {
    if (!settings.targets?.lastBaselineUpdate) return true;

    const now = new Date();
    const last = new Date(settings.targets.lastBaselineUpdate);
    const period = settings.targets.period || "week";

    if (period === "day") {
        return now.toDateString() !== last.toDateString();
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
    try {
        const [boxRes, statsRes] = await Promise.all([
            fetch(`${config.apiBaseUrl}/box-progress/${encodeURIComponent(player)}`),
            fetch(`${config.apiBaseUrl}/stats?player=${encodeURIComponent(player)}${mode ? `&mode=${mode}` : ''}`)
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
            const data = await statsRes.json();
            const srs = data.srs_levels || {};
            [1, 2, 3, 4].forEach(lvl => {
                kanjiCounts[lvl] = srs[lvl] || 0;
            });
        }

        return { boxes: boxCounts, kanji: kanjiCounts };
    } catch (e) {
        console.error("Fetch stats counts error", e);
    }
    return { boxes: { 1: 0, 2: 0, 3: 0, 4: 0 }, kanji: { 1: 0, 2: 0, 3: 0, 4: 0 } };
}

// Keep the old name for compatibility if needed, but alias it
export const fetchBoxCounts = async (player, mode) => (await fetchStatsCounts(player, mode)).boxes;

/**
 * Updates the current baselines using the passed counts.
 */
export async function updateBaselines(player, currentStats) {
    const settings = getSettings(player);
    if (!settings.targets) return;

    settings.targets.baselines = { ...currentStats.boxes };
    settings.targets.kanji_baselines = { ...currentStats.kanji };
    settings.targets.lastBaselineUpdate = new Date().toISOString();

    await saveRemoteSettings(player, settings);
}

/**
 * Calculates current progress given current counts.
 */
export function calculateProgress(settings, currentCounts) {
    if (!settings.targets) return {};

    const progress = {};
    const levels = [1, 2, 3, 4];

    levels.forEach(lvl => {
        // Handle both numeric and string keys (Supabase JSON uses strings)
        const targetValue = (settings.targets.levels[lvl] || settings.targets.levels[String(lvl)]) || 0;
        const baselineValue = (settings.targets.baselines[lvl] || settings.targets.baselines[String(lvl)]) || 0;
        const currentCount = (currentCounts[lvl] || currentCounts[String(lvl)]) || 0;

        // Incremental gain since period start
        const gained = Math.max(0, currentCount - baselineValue);

        progress[lvl] = {
            current: gained,
            target: targetValue,
            percent: targetValue > 0 ? Math.min(100, (gained / targetValue) * 100) : 100
        };
    });

    return progress;
}
