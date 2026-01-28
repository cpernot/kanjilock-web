// Handles current quiz mode (like your old modeManager.js)

const MODE_KEY = "kanjilock_mode";

export function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function getMode() {
  return localStorage.getItem(MODE_KEY) || "reading"; 
  // default mode if none selected
}
