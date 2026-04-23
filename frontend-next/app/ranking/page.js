"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import config from "@/lib/config";

export default function RankingPage() {
    const [ranking, setRanking] = useState([]);
    const [range, setRange] = useState("global");
    const [currentPlayer, setCurrentPlayer] = useState(null);

    useEffect(() => {
        const p = localStorage.getItem("kanjilock_player");
        setCurrentPlayer(p);
        loadRanking(range);
    }, [range]);

    async function loadRanking(r) {
        let url = `${config.apiBaseUrl}/ranking/global`;
        if (r === "month") {
            const now = new Date();
            const ym = now.toISOString().slice(0, 7);
            url = `${config.apiBaseUrl}/ranking/month/${ym}`;
        }

        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) setRanking(data);
                else setRanking([]);
            }
        } catch (e) {
            console.error("Ranking fetch error", e);
        }
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>🏆 Leaderboard</h1>

            <div style={styles.controls}>
                <button 
                    onClick={() => setRange("global")} 
                    style={range === "global" ? styles.activeBtn : styles.btn}
                >
                    All Time
                </button>
                <button 
                    onClick={() => setRange("month")} 
                    style={range === "month" ? styles.activeBtn : styles.btn}
                >
                    This Month
                </button>
            </div>

            <div style={styles.card}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.theadRow}>
                            <th style={styles.th}>Rank</th>
                            <th style={styles.th}>Player</th>
                            <th style={styles.th}>Score</th>
                            <th style={styles.th}>Correct</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranking.map((p, i) => {
                            const isCurrent = p.player === currentPlayer;
                            return (
                                <tr key={i} style={{ 
                                    ...styles.tr, 
                                    background: isCurrent ? "rgba(33, 150, 243, 0.2)" : "transparent",
                                    borderLeft: isCurrent ? "4px solid #2196F3" : "none"
                                }}>
                                    <td style={styles.td}>{i + 1}</td>
                                    <td style={{ ...styles.td, fontWeight: isCurrent ? "bold" : "normal" }}>
                                        {p.player} {isCurrent && " (You)"}
                                    </td>
                                    <td style={styles.td}>{p.score.toLocaleString()}</td>
                                    <td style={styles.td}>{p.correct.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                        {ranking.length === 0 && (
                            <tr><td colSpan="4" style={styles.noData}>No Data Available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "800px", margin: "0 auto", padding: "40px 20px" },
    title: { fontSize: "2.5rem", fontWeight: "800", color: "#fff", marginBottom: "30px", textAlign: "center" },
    controls: { display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px" },
    btn: { 
        padding: "12px 24px", 
        borderRadius: "12px", 
        background: "rgba(30, 41, 59, 0.5)", 
        color: "#94a3b8", 
        border: "1px solid rgba(255,255,255,0.1)", 
        cursor: "pointer",
        fontWeight: "600",
        transition: "all 0.2s"
    },
    activeBtn: { 
        padding: "12px 24px", 
        borderRadius: "12px", 
        background: "#2196F3", 
        color: "white", 
        border: "none", 
        cursor: "pointer",
        fontWeight: "700",
        boxShadow: "0 4px 15px rgba(33, 150, 243, 0.3)"
    },
    card: { 
        background: "rgba(30, 41, 59, 0.4)", 
        borderRadius: "24px", 
        padding: "10px", 
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden"
    },
    table: { width: "100%", borderCollapse: "collapse" },
    theadRow: { borderBottom: "1px solid rgba(255,255,255,0.1)" },
    th: { padding: "20px", color: "#94a3b8", fontWeight: "600", textAlign: "left", fontSize: "0.9rem" },
    tr: { transition: "background 0.2s" },
    td: { padding: "20px", color: "#fff", fontSize: "1rem" },
    noData: { padding: "40px", color: "#94a3b8", textAlign: "center" }
};
