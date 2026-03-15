/* ============================
   SETTINGS – NEXT.JS LIB
   ============================ */

export const DEFAULT_SETTINGS = {
  sessionSize: 5,
  maxTimeMs: 5000,

  speedThresholds: {
    fast: 3000,
    medium: 5000
  },

  speedScores: {
    fast: 10,
    medium: 6,
    slow: 3
  },

  sounds: {
    success: "success.wav",
    timeout: "BOMB.WAV"
  },

  vibration: true,
  autoDismissAnswer: true,
  progressiveMode: false,
  soundEnabled: true,
  targets: {
    period: "week", // day, week, month
    type: "kanji",  // kanji, box
    levels: { 1: 50, 2: 30, 3: 20, 4: 10 },
    lastBaselineUpdate: null,
    baselines: { 1: 0, 2: 0, 3: 0, 4: 0 }
  }
};

import config from "./config";

export function getSettings(playerOverride = null) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const player = playerOverride || getPlayer_setting();
  const key = player ? `kanjilock_settings_${player}` : "kanjilock_settings";
  const stored = localStorage.getItem(key);
  return stored
    ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    : { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings, playerOverride = null) {
  if (typeof window === 'undefined') return;
  const player = playerOverride || getPlayer_setting();
  const key = player ? `kanjilock_settings_${player}` : "kanjilock_settings";
  localStorage.setItem(key, JSON.stringify(settings));
}

export async function fetchRemoteSettings(player) {
  if (!player) return null;
  try {
    const res = await fetch(`${config.apiBaseUrl}/settings/${encodeURIComponent(player)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        saveSettings(data, player);
        return data;
      }
    }
  } catch (e) {
    console.error("Fetch settings error", e);
  }
  return getSettings(player);
}

export async function saveRemoteSettings(player, settings) {
  if (!player) return;
  saveSettings(settings, player);
  try {
    await fetch(`${config.apiBaseUrl}/settings/${encodeURIComponent(player)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
  } catch (e) {
    console.error("Save remote settings error", e);
  }
}

const PLAYER_KEY = "kanjilock_player";

export function getPlayer_setting() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLAYER_KEY);
}

// Note: Player setting is handled in player.js usually,
// but we keep consistent exports with old system where possible.
