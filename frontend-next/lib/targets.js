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
 * Fetches the count of boxes at each level (1-4).
 * A box's level is determined by the maximum level reached in any of its modes (or a specific mode if provided).
 */
export async function fetchBoxCounts(player, mode = null) {
    if (!player) return { 1: 0, 2: 0, 3: 0, 4: 0 };
    try {
        const res = await fetch(`${config.apiBaseUrl}/box-progress/${encodeURIComponent(player)}`);
        if (res.ok) {
            const data = await res.json(); // { "box_id": { "qa": 2, "qb": 1 } }
            const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };

            Object.values(data).forEach(modes => {
                const level = mode ? (modes[mode] || 0) : Math.max(...Object.values(modes), 0);
                if (level >= 1 && level <= 4) {
                    counts[level]++;
                }
            });
            return counts;
        }
    } catch (e) {
        console.error("Fetch box counts error", e);
    }
    return { 1: 0, 2: 0, 3: 0, 4: 0 };
}

/**
 * Updates the current baselines using the passed counts.
 */
export async function updateBaselines(player, currentCounts) {
    const settings = getSettings(player);
    if (!settings.targets) return;

    settings.targets.baselines = { ...currentCounts };
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
        const targetValue = settings.targets.levels[lvl] || 0;
        const baselineValue = settings.targets.baselines[lvl] || 0;
        const currentCount = currentCounts[lvl] || 0;

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
