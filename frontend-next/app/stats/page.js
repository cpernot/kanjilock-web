"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import config from "@/lib/config";
import { getPlayer_setting } from "@/lib/settings";
import { getMode, MODES_LIST } from "@/lib/modeManager";
import { MODES } from "@/lib/quizModes";

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMode, setSelectedMode] = useState(null);
    const activeModeRef = useRef(null);

    useEffect(() => {
        const currentMode = getMode();
        setSelectedMode(currentMode);
    }, []);

    useEffect(() => {
        if (selectedMode) {
            loadStats(selectedMode);
        }
    }, [selectedMode]);

    async function loadStats(mode) {
        activeModeRef.current = mode;
        setLoading(true);
        const player = getPlayer_setting();
        if (!player) return;

        try {
            const res = await fetch(`${config.apiBaseUrl}/stats?mode=${mode}&player=${encodeURIComponent(player)}`);
            if (res.ok) {
                const data = await res.json();
                if (activeModeRef.current === mode) {
                    setStats(data);
                }
            }
        } catch (e) {
            console.error("Stats error", e);
        } finally {
            if (activeModeRef.current === mode) {
                setLoading(false);
            }
        }
    }

    if (!selectedMode || loading) return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading Stats...</div>;
    if (!stats) return <div style={{ textAlign: "center", marginTop: "50px" }}>No stats available.</div>;

    const srsData = stats.srs_levels || {};
    const dailyData = stats.daily_stats || {};

    return (
        <div style={styles.container}>
            <div style={{ marginBottom: "10px", textAlign: "left" }}>
                <Link href="/">← Back to Home</Link>
            </div>
            <h1>📊 Statistics</h1>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ marginRight: "10px" }}>Quiz Mode:</label>
                <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    style={styles.select}
                >
                    {MODES_LIST.map(m => (
                        <option key={m} value={m}>
                            {MODES[m]?.label || m}
                        </option>
                    ))}
                </select>
            </div>

            <div style={styles.section}>
                <h3>SRS Levels</h3>
                <div style={styles.barChart}>
                    {Object.entries(srsData).map(([level, count]) => (
                        <div key={level} style={styles.barGroup}>
                            <div style={{ height: "100px", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                                <div style={{
                                    width: "40px",
                                    height: `${Math.min((count / 50) * 100, 100)}%`,
                                    background: "#4CAF50"
                                }}></div>
                            </div>
                            <div>{count}</div>
                            <div>L{level}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <h3>Activity Heatmap</h3>
                <div style={styles.heatmap}>
                    {Object.entries(dailyData).sort().map(([date, count]) => (
                        <div key={date} title={`${date}: ${count}`} style={{
                            ...styles.cell,
                            background: `rgba(0, 128, 0, ${Math.min(0.2 + (count / 20), 1)})`
                        }}></div>
                    ))}
                    {Object.keys(dailyData).length === 0 && <p>No activity yet.</p>}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "800px", margin: "0 auto", padding: "20px", textAlign: "center", color: "#0f172a" },
    section: { marginBottom: "40px", padding: "20px", background: "#f9f9f9", borderRadius: "8px" },
    barChart: { display: "flex", justifyContent: "center", gap: "20px", alignItems: "flex-end", height: "150px" },
    barGroup: { display: "flex", flexDirection: "column", gap: "5px" },
    heatmap: { display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" },
    cell: { width: "15px", height: "15px", borderRadius: "2px" },
    select: { padding: "8px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "1rem" }
};
