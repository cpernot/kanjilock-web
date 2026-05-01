"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { setBoxContext, getNextBoxId, initEngine, isInitialized } from "@/lib/quizengine";
import { useRouter } from "next/navigation";
import { getSessionSummary } from "@/lib/quizSession";

export default function SessionEndPage() {
    const [summary, setSummary] = useState(null);
    const router = useRouter();

    useEffect(() => {
        // Try getting from memory first, then fallback to storage if needed
        const s = getSessionSummary();
        if (s) {
            setSummary(s);
        } else {
            const stored = sessionStorage.getItem("lastSessionSummary");
            if (stored) setSummary(JSON.parse(stored));
        }

        // Ensure engine is ready for "Continue" logic
        if (!isInitialized) {
            initEngine();
        }
    }, []);

    const handleContinue = () => {
        if (summary?.boxId) {
            const nextBox = getNextBoxId(summary.boxId);
            if (nextBox) {
                setBoxContext(nextBox);
                localStorage.setItem("kanjilock_last_box_selection", nextBox);
            }
        }
        router.push("/quiz");
    };

    const handleReplay = () => {
        const bId = (summary.boxId === "" || summary.boxId === null) ? "" : summary.boxId;
        localStorage.setItem("kanjilock_last_box_selection", bId);
        setBoxContext(bId || null);
        router.push("/quiz?replay=true");
    };

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

            {summary.boxRanking && (
                <div style={styles.rankingBox}>
                    <div style={styles.rankBadge}>Level Update</div>
                    <div style={styles.transition}>
                        <span style={styles.oldLevel}>{summary.boxRanking.oldLevel}</span>
                        <span style={styles.arrow}>→</span>
                        <span style={styles.newLevel}>{summary.boxRanking.level}</span>
                    </div>
                    {boxMsg && <p style={styles.boxMsg}>{boxMsg}</p>}
                </div>
            )}

            <div style={styles.actions}>
                <button onClick={handleContinue} style={{ ...styles.btn, border: 'none', cursor: 'pointer' }}>➡️ Continue</button>
                <button onClick={handleReplay} style={{ ...styles.btn, background: "#8b5cf6", border: 'none', cursor: 'pointer' }}>
                    🔁 Replay
                </button>
                <Link href="/" style={{ ...styles.btn, background: "#475569" }}>
                    <img src="/icons/home1.png" alt="Home" style={styles.navIconImg} onError={(e) => e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/home.png"} />
                    <span style={styles.navLabel}>Home</span>
                </Link>
            </div>

            {/* Detailed Kanji History */}
            <div style={styles.historyList}>
                <h4 style={{ color: "#94a3b8", margin: "30px 0 15px 0" }}>Détails par Kanji</h4>
                <div style={styles.grid}>
                    {summary.history.map((h, i) => (
                        <div key={i} style={{
                            ...styles.historyItem,
                            borderColor: h.correct ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"
                        }}>
                            <span style={styles.kanjiChar}>{h.kanji}</span>
                            <span style={styles.kanjiLevel}>
                                {h.newLevel ? `Niv. ${h.newLevel}` : "---"}
                                {h.newLevel === 3 && " ⭐"}
                                {h.newLevel === 4 && " ⭐⭐⭐"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "500px", margin: "50px auto", textAlign: "center", border: "1px solid #ccc", padding: "30px", borderRadius: "10px" },
    stat: { fontSize: "1.2rem", margin: "10px 0", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "5px" },
    label: { fontWeight: "bold" },
    actions: { marginTop: "30px", display: "flex", gap: "10px", justifyContent: "center" },
    btn: {
        textDecoration: "none",
        padding: "10px 20px",
        background: "#2196F3",
        color: "white",
        borderRadius: "10px", // Updated to match premium look
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: "600"
    },
    navIconImg: {
        width: "18px",
        height: "18px",
        objectFit: "contain",
        filter: "brightness(0) invert(1)"
    },
    navLabel: {
        fontSize: "0.9rem",
        fontWeight: "600"
    },
    alert: { margin: "20px 0", padding: "15px", background: "#FFEB3B", borderRadius: "5px", color: "#333" },
    rankingBox: { margin: "30px 0", padding: "20px", background: "rgba(30, 41, 59, 0.4)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", position: "relative" },
    rankBadge: { position: "absolute", top: "-10px", left: "20px", background: "#3b82f6", color: "white", padding: "2px 10px", borderRadius: "100px", fontSize: "0.7rem", fontWeight: "bold" },
    transition: { display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", margin: "10px 0" },
    oldLevel: { fontSize: "2rem", color: "#94a3b8", fontWeight: "bold" },
    newLevel: { fontSize: "3rem", color: "#3b82f6", fontWeight: "bold" },
    arrow: { fontSize: "1.5rem", color: "rgba(255,255,255,0.2)" },
    boxMsg: { fontSize: "0.9rem", color: "#cbd5e1", marginTop: "10px" },
    historyList: { marginTop: "20px", textAlign: "left" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" },
    historyItem: {
        padding: "10px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "10px",
        border: "1px solid",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    kanjiChar: { fontSize: "1.5rem", fontWeight: "bold" },
    kanjiLevel: { fontSize: "0.8rem", color: "#94a3b8" }
};
