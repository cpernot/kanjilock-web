"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlayer_setting } from "@/lib/settings";
import { initEngine } from "@/lib/quizengine";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    // Preload engine data
    const p = getPlayer_setting();
    if (p) {
      setPlayer(p);
      initEngine(p).then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading Engine...</div>;

  if (!player) {
    return (
      <div style={{ textAlign: "center" }}>
        <h1>Welcome to KanjiLock</h1>
        <p>Please log in first.</p>
        <Link href="/login" style={styles.btn}>Go to Login</Link>
      </div>
    )
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h1>🔒 Kanji Lock</h1>
      <p style={{ fontStyle: "italic", maxWidth: "600px", margin: "0 auto 30px" }}>
        "L'affaire est toute simple, tout le secret tient en deux mots : <b>constance et continuité</b>"
      </p>

      <div style={styles.menu}>
        <Link href="/quiz" style={styles.btn}>▶️ Start Quiz</Link>
        <Link href="/intrus" style={styles.btn}>▶️ Find the Intruder</Link>
        <Link href="/compose" style={styles.btn}>▶️ Kanji Compose</Link>
        <Link href="/stats" style={styles.btn}>▶️ Statistics</Link>
        <Link href="/ranking" style={styles.btn}>▶️ Rankings</Link>
      </div>

      <div style={{ marginTop: "30px" }}>
        <b>Player:</b> {player} <br />
        <Link href="/settings" style={{ fontSize: "0.9rem", color: "#666" }}>Settings</Link>
      </div>
    </div>
  );
}

const styles = {
  menu: { display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" },
  btn: {
    textDecoration: "none",
    background: "#eee",
    padding: "15px 30px",
    borderRadius: "8px",
    width: "250px",
    color: "#333",
    fontWeight: "bold",
    fontSize: "1.1rem",
    display: "inline-block"
  }
};
