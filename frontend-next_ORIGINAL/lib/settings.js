/* ============================
   SETTINGS – FRONTEND
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
  const stored = localStorage.getItem("kanjilock_settings");
  return stored
    ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    : { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings) {
  localStorage.setItem("kanjilock_settings", JSON.stringify(settings));
}

const PLAYER_KEY = "kanjilock_player";



export function resetPlayer() {
  localStorage.removeItem(PLAYER_KEY);
  console.log("RESET pseudo: ");
}



