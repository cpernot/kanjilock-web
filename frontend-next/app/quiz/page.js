"use client";
import Quiz from "@/components/Quiz";
import Link from "next/link";

export default function QuizPage() {
  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <Link href="/">← Back to Home</Link>
      </div>
      <Quiz />
    </div>
  );
}
