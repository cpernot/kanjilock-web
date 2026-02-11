"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import config from "@/lib/config";

export default function RankingPage() {
    const [ranking, setRanking] = useState([]);
    const [range, setRange] = useState("global");

    useEffect(() => {
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
            <div style={{ marginBottom: "10px", textAlign: "left" }}>
                <Link href="/">← Back to Home</Link>
            </div>
            <h1>🏆 Ranking</h1>

            <div style={styles.controls}>
                <button onClick={() => setRange("global")} style={range === "global" ? styles.activeBtn : styles.btn}>All Time</button>
                <button onClick={() => setRange("month")} style={range === "month" ? styles.activeBtn : styles.btn}>This Month</button>
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Player</th>
                        <th>Score</th>
                        <th>Correct</th>
                    </tr>
                </thead>
                <tbody>
                    {ranking.map((p, i) => (
                        <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{p.player}</td>
                            <td>{p.score}</td>
                            <td>{p.correct}</td>
                        </tr>
                    ))}
                    {ranking.length === 0 && (
                        <tr><td colSpan="4">No Data</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

const styles = {
    container: { maxWidth: "800px", margin: "0 auto", padding: "20px", textAlign: "center" },
    controls: { marginBottom: "20px" },
    btn: { padding: "10px 20px", margin: "0 5px", background: "#eee", border: "none", cursor: "pointer" },
    activeBtn: { padding: "10px 20px", margin: "0 5px", background: "#2196F3", color: "white", border: "none", cursor: "pointer" },
    table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" }
};
