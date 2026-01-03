import {  setMode } from "./modeManager.js";
import { initQuiz } from "./multi_quiz.js";

export function initIntrus() {
  console.log("Intrus init");
  initQuiz();          // réutilise la logique quiz
}
