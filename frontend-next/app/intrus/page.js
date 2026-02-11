"use client";
import Quiz from "@/components/Quiz";
import Link from "next/link";

export default function IntrusPage() {
    return (
        <div>
            <div style={{ marginBottom: "10px" }}>
                <Link href="/">← Back to Home</Link>
            </div>
            <h1 style={{ textAlign: "center" }}>🔍 Find the Intruder</h1>
            <Quiz forcedMode="intrus" />
        </div>
    );
}
