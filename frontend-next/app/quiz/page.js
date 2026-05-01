"use client";
import { Suspense } from "react";
import Quiz from "@/components/Quiz";

export default function QuizPage() {
  return (
    <div>
      <Suspense fallback={<div>Loading Quiz...</div>}>
        <Quiz />
      </Suspense>
    </div>
  );
}
