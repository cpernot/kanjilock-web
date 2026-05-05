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
  progressiveMode: true,
  soundEnabled: false,
  showProgressBar: true,
  sequentialOrder: true,
  allGood: true,
  targets: {
    activeId: "main",
    definitions: {
      "main": {
        id: "main",
        period: "week", // day, week, month
        type: "box",  // kanji, box
        levels: { 1: 5, 2: 3, 3: 2, 4: 1 },
        lastBaselineUpdate: null,
        baselines: { 1: 0, 2: 0, 3: 0, 4: 0 },
        kanji_baselines: { 1: 0, 2: 0, 3: 0, 4: 0 }
      }
    }
  }
};

import config from "./config";

export function getSettings(playerOverride = null) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const player = playerOverride || getPlayer_setting();
  const key = player ? `kanjilock_settings_${player}` : "kanjilock_settings";
  const stored = localStorage.getItem(key);
  
  if (!stored) return { ...DEFAULT_SETTINGS };
  
  let settings = JSON.parse(stored);
  
  // Migration: If targets is in old format, move it to definitions.main
  if (settings.targets && !settings.targets.definitions) {
    const oldTargets = settings.targets;
    settings.targets = {
      activeId: "main",
      definitions: {
        "main": {
          id: "main",
          ...oldTargets
        }
      }
    };
  }

  return { ...DEFAULT_SETTINGS, ...settings };
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
    const res = await fetch(`${config.apiBaseUrl}/settings/${encodeURIComponent(player)}`, {
      cache: 'no-store' // Force fresh fetch
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        saveSettings(data, player);
        // Important: Return via getSettings to apply migration logic
        return getSettings(player);
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
