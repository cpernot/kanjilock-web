"use client";
import { useEffect, useState } from "react";
// import { initEngine, getNextQuestion, checkLocalAnswer, updateEngineAfterAnswer } from "@/lib/engine";
import { buildQuestion} from "@/lib/engine";
import { startSession, recordAnswer, getSessionSummary } from "@/lib/session";
import { getMode } from "@/lib/modes";

export default function QuizPage() {
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);

  // useEffect(() => {
  //   async function start() {
  //     await initEngine();
  //     startSession();
  //     loadQuestion();
  //   }
  //   start();
  // }, []);

  useEffect(() => {
  async function start() {
    const q = await buildQuestion();
    setQuestion(q);
  }
  start();
}, []);

  function loadQuestion() {
    const q = getNextQuestion(getMode());
    setQuestion(q);
    setResult(null);
  }

  function answer(choice) {
    const data = checkLocalAnswer(question, choice, 0);
    updateEngineAfterAnswer(question.kanji, data.correct, getMode());
    recordAnswer({ correct: data.correct, rt_ms: 0, kanji: question.kanji, mode: getMode() });
    setResult(data);

    setTimeout(loadQuestion, data.correct ? 1000 : 2500);
  }

  if (!question) return <p>Loading...</p>;

  return (
    <div>
      <h2>{question.question}</h2>

      {question.options.map(opt => (
        <button key={opt} onClick={() => answer(opt)}>
          {opt}
        </button>
      ))}

      {result && (
        <div>
          {result.correct ? "✓ 正解" : `✗ Bonne réponse: ${result.bonne}`}
        </div>
      )}
    </div>
  );
}
