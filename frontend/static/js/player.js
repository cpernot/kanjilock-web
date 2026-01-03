const PLAYER_KEY = "kanjilock_player";

export function getPlayer() {
  return localStorage.getItem(PLAYER_KEY);
}

export function setPlayer(name) {
  localStorage.setItem(PLAYER_KEY, name.trim());
}

export function clearPlayer() {
  localStorage.removeItem(PLAYER_KEY);
}
