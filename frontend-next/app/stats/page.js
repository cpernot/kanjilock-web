"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import config from "@/lib/config";
import { getPlayer_setting } from "@/lib/settings";
import { getMode, MODES_LIST } from "@/lib/modeManager";
import { MODES } from "@/lib/quizModes";
import { fetchBoxCounts } from "@/lib/targets";
import ContributionGraph from "@/components/ContributionGraph";

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [boxStats, setBoxStats] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
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
            // Fetch general kanji stats
            const res = await fetch(`${config.apiBaseUrl}/stats?mode=${mode}&player=${encodeURIComponent(player)}`);
            if (res.ok) {
                const data = await res.json();
                if (activeModeRef.current === mode) {
                    setStats(data);
                }
            }

            // Fetch box-specific stats for this mode
            const boxes = await fetchBoxCounts(player, mode);
            setBoxStats(boxes);

        } catch (e) {
            console.error("Stats error", e);
        } finally {
            if (activeModeRef.current === mode) {
                setLoading(false);
            }
        }
    }

    if (!selectedMode || loading) return (
        <div style={{ ...styles.container, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
            <div style={{ color: "#fff", fontSize: "1.2rem" }}>Loading Statistics...</div>
        </div>
    );

    const srsData = stats?.srs_levels || {};
    const dailyData = stats?.daily_stats || {};

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <Link href="/" style={styles.backLink}>← Dashboard</Link>
                <h1 style={styles.title}>Statistics</h1>
                <p style={styles.subtitle}>Track your Japanese mastery</p>
            </div>

            <div style={styles.filterSection}>
                <div style={styles.glassCard}>
                    <label style={{ marginRight: "15px", color: "#94a3b8", fontWeight: "600" }}>Quiz Mode</label>
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
            </div>

            <div style={styles.mainGrid}>
                {/* 1. SRS Levels (Kanjis) */}
                <div style={styles.glassCard}>
                    <h3 style={styles.cardTitle}>SRS Progression (Kanjis)</h3>
                    <div style={styles.barChart}>
                        {[1, 2, 3, 4].map(level => {
                            const count = srsData[level] || 0;
                            const height = Math.min((count / 50) * 100, 100);
                            return (
                                <div key={level} style={styles.barGroup}>
                                    <div style={styles.barContainer}>
                                        <div style={{
                                            ...styles.bar,
                                            height: `${height}%`,
                                            background: getLevelColor(level)
                                        }}>
                                            {count > 0 && <span style={styles.barValue}>{count}</span>}
                                        </div>
                                    </div>
                                    <div style={styles.barLabel}>Lvl {level}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Box Levels */}
                <div style={styles.glassCard}>
                    <h3 style={styles.cardTitle}>Box Mastery</h3>
                    <div style={styles.barChart}>
                        {[1, 2, 3, 4].map(level => {
                            const count = boxStats[level] || 0;
                            const height = Math.min((count / 10) * 100, 100);
                            return (
                                <div key={level} style={styles.barGroup}>
                                    <div style={styles.barContainer}>
                                        <div style={{
                                            ...styles.bar,
                                            height: `${height}%`,
                                            background: getLevelColor(level)
                                        }}>
                                            {count > 0 && <span style={styles.barValue}>{count}</span>}
                                        </div>
                                    </div>
                                    <div style={styles.barLabel}>Lvl {level}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={styles.fullWidthSection}>
                <div style={styles.glassCard}>
                    <h3 style={styles.cardTitle}>Activity Heatmap</h3>
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                        <ContributionGraph data={dailyData} />
                    </div>
                    {Object.keys(dailyData).length === 0 && (
                        <p style={{ color: "#64748b", marginTop: "20px" }}>No activity recorded yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

const getLevelColor = (lvl) => {
    switch (parseInt(lvl)) {
        case 1: return "#3b82f6"; // Blue
        case 2: return "#8b5cf6"; // Purple
        case 3: return "#ec4899"; // Pink
        case 4: return "#10b981"; // Green (Master)
        default: return "#475569";
    }
};

const styles = {
    container: {
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "40px 20px",
        background: "#020617",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Inter', sans-serif"
    },
    header: { marginBottom: "40px", textAlign: "left" },
    backLink: {
        textDecoration: "none",
        color: "#3b82f6",
        fontSize: "0.9rem",
        fontWeight: "600",
        marginBottom: "20px",
        display: "inline-block"
    },
    title: { fontSize: "2.5rem", fontWeight: "800", marginBottom: "8px" },
    subtitle: { color: "#64748b", fontSize: "1.1rem" },
    filterSection: { marginBottom: "30px" },
    glassCard: {
        background: "rgba(30, 41, 59, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "24px",
        padding: "30px",
        height: "100%"
    },
    select: {
        background: "rgba(15, 23, 42, 0.8)",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "10px 15px",
        borderRadius: "12px",
        outline: "none",
        cursor: "pointer"
    },
    mainGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px",
        marginBottom: "20px"
    },
    fullWidthSection: { marginBottom: "20px" },
    cardTitle: { fontSize: "1.1rem", color: "#94a3b8", marginBottom: "25px", fontWeight: "600", textAlign: "left" },
    barChart: {
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end",
        height: "180px",
        paddingBottom: "10px"
    },
    barGroup: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        width: "60px"
    },
    barContainer: {
        height: "150px",
        width: "32px",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "100px",
        display: "flex",
        alignItems: "flex-end",
        overflow: "visible",
        position: "relative"
    },
    bar: {
        width: "100%",
        borderRadius: "100px",
        transition: "height 1s ease-out",
        position: "relative"
    },
    barValue: {
        position: "absolute",
        top: "-25px",
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: "0.8rem",
        fontWeight: "bold",
        color: "#fff"
    },
    barLabel: { fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }
};

