export const getPlayer = () => localStorage.getItem("kanjilock_player");
export const setPlayer = (p) => localStorage.setItem("kanjilock_player", p);
export const clearPlayer = () => localStorage.removeItem("kanjilock_player");
