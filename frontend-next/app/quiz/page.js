"use client";

import { useEffect, useState } from "react";
import { buildQuestion, recordAnswer, checkLocalAnswer, sendSession } from "@/lib/engine";

export default function QuizPage() {
  const [question, setQuestion] = useState(null);
  const [count, setCount] = useState(0);   
  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);

  useEffect(() => {
    loadNext();
  }, []);

  async function loadNext() {
    const q = await buildQuestion();
    setQuestion(q);
  }

  function handleAnswer(opt) {
    if (locked) return; // prevent double clicks
    setLocked(true);

    const correct = checkLocalAnswer(opt, question);
    if (correct) setScore(prev => prev + 1);

    recordAnswer({
      kanji: question.question,
      correct,
      mode: question.mode,
      speed_factor: 1.0
    });

    setFeedback({
      correct,
      correctAnswer: question.options.find(o => o === question.answer) || question.options[0]
    });

    setCount(prev => {
      const newCount = prev + 1;

      if (newCount >= 10) {
        sendSession();
        setSessionDone(true);
        return 0;
      }

      return newCount;
    });

    setTimeout(() => {
      setFeedback(null);
      setLocked(false);
      if (!sessionDone) {
    loadNext();
  }
    }, 1500);
  }

if (sessionDone) {
  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>🎉 Session Complete!</h2>
      <p>Score: {score} / 10</p>
      <p>Accuracy: {Math.round((score / 10) * 100)}%</p>
      <button onClick={() => {
        setSessionDone(false);
        setScore(0);
        loadNext();
      }}>
        Start New Session
      </button>
    </div>
  );
}

  if (!question) return <p>Loading...</p>;

  return (
    <div>
      <h2>{question.question}</h2>

      {question.options.map(opt => (
        <button key={opt} onClick={() => handleAnswer(opt)}>
          {opt}
        </button>
      ))}
      {feedback && (
  <div style={{ marginTop: "20px", fontSize: "20px" }}>
    {feedback.correct ? (
      <span style={{ color: "green" }}>✓ Correct!</span>
    ) : (
      <span style={{ color: "red" }}>
        ✗ Correct answer: {feedback.correctAnswer}
      </span>
    )}
  </div>
)}
    </div>
    
  );
}
