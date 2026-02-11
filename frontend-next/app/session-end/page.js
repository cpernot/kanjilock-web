"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSessionSummary } from "@/lib/quizSession";

export default function SessionEndPage() {
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        // Try getting from memory first, then fallback to storage if needed
        const s = getSessionSummary();
        if (s) {
            setSummary(s);
        } else {
            const stored = sessionStorage.getItem("lastSessionSummary");
            if (stored) setSummary(JSON.parse(stored));
        }
    }, []);

    if (!summary) return <div>No session data found. <Link href="/">Return Home</Link></div>;

    const boxMsg = summary.boxRanking ? summary.boxRanking.message : "";

    return (
        <div style={styles.container}>
            <h2>🎉 Session terminée</h2>
            <div style={styles.stat}>
                <span style={styles.label}>Score:</span>
                <span style={styles.value}>✔️ {summary.correct} / {summary.size}</span>
            </div>
            <div style={styles.stat}>
                <span style={styles.label}>Time:</span>
                <span style={styles.value}>⏱ {(summary.totalTime / 1000).toFixed(1)} s</span>
            </div>
            <div style={styles.stat}>
                <span style={styles.label}>Speed Score:</span>
                <span style={styles.value}>⚡ {summary.scoreOn100} / 100</span>
            </div>

            {boxMsg && (
                <div style={styles.alert}>
                    {boxMsg}
                </div>
            )}

            <div style={styles.actions}>
                <Link href="/quiz" style={styles.btn}>🔁 Replay</Link>
                <Link href="/" style={{ ...styles.btn, background: "#666" }}>🏠 Home</Link>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "500px", margin: "50px auto", textAlign: "center", border: "1px solid #ccc", padding: "30px", borderRadius: "10px" },
    stat: { fontSize: "1.2rem", margin: "10px 0", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "5px" },
    label: { fontWeight: "bold" },
    actions: { marginTop: "30px", display: "flex", gap: "10px", justifyContent: "center" },
    btn: { textDecoration: "none", padding: "10px 20px", background: "#2196F3", color: "white", borderRadius: "5px" },
    alert: { margin: "20px 0", padding: "15px", background: "#FFEB3B", borderRadius: "5px", color: "#333" }
};
