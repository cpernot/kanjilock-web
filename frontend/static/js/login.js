import { setPlayer } from "./player.js";
import { navigate } from "./spa.js";

export function initLogin() {
  const input = document.getElementById("playerInput");
  const btn = document.getElementById("loginBtn");

  btn.onclick = () => {
    const name = input.value.trim();
    if (!name) return alert("Entre un pseudo 🙂");

    setPlayer(name);
    navigate("/"); // ou /quiz-page
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") btn.click();
  });
}