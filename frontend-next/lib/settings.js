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

  vibration: true
};

export function getSettings() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const stored = localStorage.getItem("kanjilock_settings");
  return stored
    ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    : { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem("kanjilock_settings", JSON.stringify(settings));
}

const PLAYER_KEY = "kanjilock_player";

export function getPlayer_setting() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PLAYER_KEY);
}

// Note: Player setting is handled in player.js usually,
// but we keep consistent exports with old system where possible.
