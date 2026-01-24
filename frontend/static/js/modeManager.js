const MODE_KEY = "kanjilock_mode";
const DEFAULT_MODE = "qa";
const QUIZ_MODES = ["qa", "qb", "qc", "qd","qe", "qf", "qg"];

/* ============================
   GET MODE
   ============================ */
export function getMode() {
  const saved = localStorage.getItem(MODE_KEY);
  if (QUIZ_MODES.includes(saved)) {
    return saved;
  }
  return DEFAULT_MODE;
}

/* ============================
   SET MODE
   ============================ */
export function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);

  const select = document.getElementById("modeSelect");
  if (select && QUIZ_MODES.includes(mode)) {
    select.value = mode;
  }

  window.dispatchEvent(
    new CustomEvent("modechange", { detail: { mode } })
  );
}

/* ============================
   INIT MODE (à appeler après chargement HTML)
   ============================ */
export function initMode() {
  console.log("get modeready");  
  const mode = getMode();
  syncSelect(mode);
  console.log("get mode: ", mode);  
  const select = document.getElementById("modeSelect");
  if (select) {
    select.addEventListener("change", () => {
      setMode(select.value);
    });
  }
}

/* ============================
   UI HELPERS
   ============================ */
function syncSelect(mode) {
  const select = document.getElementById("modeSelect");
  if (select && QUIZ_MODES.includes(mode)) {
    select.value = mode;
  }
}
