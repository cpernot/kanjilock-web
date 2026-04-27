"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import config from "@/lib/config";
import { getPlayer_setting, fetchRemoteSettings } from "@/lib/settings";
import { getMode, MODES_LIST } from "@/lib/modeManager";
import { MODES } from "@/lib/quizModes";
import { fetchBoxCounts } from "@/lib/targets";
import { loadFlashcardProgress } from "@/lib/flashcards";
import ContributionGraph from "@/components/ContributionGraph";

export default function StatsPage() {
    const [stats, setStats] = useState(null);
    const [boxStats, setBoxStats] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
    const [flashStats, setFlashStats] = useState({ 1: 0, 2: 0, 3: 0, 4: 0 });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMode, setSelectedMode] = useState(null);
    const [timeRange, setTimeRange] = useState("all");
    const activeModeRef = useRef(null);

    useEffect(() => {
        const currentMode = getMode();
        setSelectedMode(currentMode);
    }, []);

    useEffect(() => {
        if (selectedMode) {
            loadStats(selectedMode, timeRange);
        }
    }, [selectedMode, timeRange]);

    async function loadStats(mode, range) {
        activeModeRef.current = mode;
        setLoading(true);
        const player = getPlayer_setting();
        if (!player) return;

        try {
            // 0. Fetch settings for baselines
            const s = await fetchRemoteSettings(player);
            setSettings(s);

            // 1. Fetch general kanji stats
            const res = await fetch(`${config.apiBaseUrl}/stats?mode=${mode}&player=${encodeURIComponent(player)}&time_range=${range}`);
            if (res.ok) {
                const data = await res.json();
                if (activeModeRef.current === mode) {
                    setStats(data);
                }
            }
            // ... (fetch box counts and flashcard progress remain the same)
            // 2. Fetch box-specific stats for this mode
            const boxes = await fetchBoxCounts(player, mode);
            setBoxStats(boxes);

            // 3. Load Flashcard stats (Local)
            const flashProgress = loadFlashcardProgress();
            const fCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
            Object.values(flashProgress).forEach(lvl => {
                if (fCounts[lvl] !== undefined) fCounts[lvl]++;
            });
            setFlashStats(fCounts);

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
    const summary = stats?.summary || {};

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Statistics</h1>
                <p style={styles.subtitle}>Track your Japanese mastery</p>
            </div>

            <div style={styles.filterSection}>
                <div style={styles.filterRow}>
                    <div style={{ ...styles.glassCard, padding: "15px 30px" }}>
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

                    <div style={{ ...styles.glassCard, padding: "15px 30px" }}>
                        <label style={{ marginRight: "15px", color: "#94a3b8", fontWeight: "600" }}>Time Range</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            style={styles.select}
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryRow}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{summary.total_answers || 0}</div>
                    <div style={styles.summaryLabel}>Total Answers</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{summary.total_sessions || 0}</div>
                    <div style={styles.summaryLabel}>Sessions completed</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>
                        {Object.keys(dailyData).length}
                    </div>
                    <div style={styles.summaryLabel}>Days Active</div>
                </div>
            </div>

            <div style={styles.mainGrid}>
                {/* 1. SRS Levels */}
                <div style={styles.glassCard}>
                    <h3 style={styles.cardTitle}>SRS Mastery</h3>
                    <div style={styles.barChart}>
                        {[1, 2, 3, 4].map(level => {
                            const count = srsData[level] || 0;
                            const baseline = (timeRange !== 'all') ? (settings?.targets?.kanji_baselines?.[level] || 0) : 0;
                            const gained = Math.max(0, count - baseline);

                            const totalHeight = Math.min((count / 200) * 100, 100);
                            const newPct = count > 0 ? (gained / count) * 100 : 0;
                            const oldPct = 100 - newPct;

                            return (
                                <div key={level} style={styles.barGroup}>
                                    <div style={styles.barContainer}>
                                        <div style={{
                                            ...styles.bar,
                                            height: `${totalHeight}%`,
                                            display: "flex",
                                            flexDirection: "column",
                                            overflow: "hidden",
                                            background: "transparent"
                                        }}>
                                            <div style={{
                                                height: `${newPct}%`,
                                                background: getLevelColor(level, timeRange === 'all' ? 'base' : 'pastel'),
                                                width: "100%",
                                                transition: "all 0.5s ease"
                                            }} />
                                            <div style={{
                                                height: `${oldPct}%`,
                                                background: getLevelColor(level, timeRange === 'all' ? 'base' : 'dark'),
                                                width: "100%",
                                                transition: "all 0.5s ease"
                                            }} />
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
                            const baseline = (timeRange !== 'all') ? (settings?.targets?.baselines?.[level] || 0) : 0;
                            const gained = Math.max(0, count - baseline);

                            const totalHeight = Math.min((count / 10) * 100, 100);
                            const newPct = count > 0 ? (gained / count) * 100 : 0;
                            const oldPct = 100 - newPct;

                            return (
                                <div key={level} style={styles.barGroup}>
                                    <div style={styles.barContainer}>
                                        <div style={{
                                            ...styles.bar,
                                            height: `${totalHeight}%`,
                                            display: "flex",
                                            flexDirection: "column",
                                            overflow: "hidden",
                                            background: "transparent"
                                        }}>
                                            <div style={{
                                                height: `${newPct}%`,
                                                background: getLevelColor(level, timeRange === 'all' ? 'base' : 'pastel'),
                                                width: "100%",
                                                transition: "all 0.5s ease"
                                            }} />
                                            <div style={{
                                                height: `${oldPct}%`,
                                                background: getLevelColor(level, timeRange === 'all' ? 'base' : 'dark'),
                                                width: "100%",
                                                transition: "all 0.5s ease"
                                            }} />
                                            {count > 0 && <span style={styles.barValue}>{count}</span>}
                                        </div>
                                    </div>
                                    <div style={styles.barLabel}>Lvl {level}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Flashcard Mastery */}
                <div style={styles.glassCard}>
                    <h3 style={styles.cardTitle}>Flashcard Mastery</h3>
                    <div style={styles.barChart}>
                        {[1, 2, 3, 4].map(level => {
                            const count = flashStats[level] || 0;
                            const height = Math.min((count / 20) * 100, 100);
                            const labels = { 1: "Unk.", 2: "Rev.", 3: "Good", 4: "Mast." };
                            return (
                                <div key={level} style={styles.barGroup}>
                                    <div style={styles.barContainer}>
                                        <div style={{
                                            ...styles.bar,
                                            height: `${height}%`,
                                            background: getLevelColor(level, 'base')
                                        }}>
                                            {count > 0 && <span style={styles.barValue}>{count}</span>}
                                        </div>
                                    </div>
                                    <div style={styles.barLabel}>{labels[level]}</div>
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

const getLevelColor = (lvl, type = 'base') => {
    const colors = {
        1: { base: "#3b82f6", dark: "#1e3a8a", pastel: "#60a5fa" }, // Blue
        2: { base: "#8b5cf6", dark: "#4c1d95", pastel: "#a78bfa" }, // Purple
        3: { base: "#ec4899", dark: "#831843", pastel: "#f472b6" }, // Pink
        4: { base: "#10b981", dark: "#064e3b", pastel: "#34d399" }  // Green
    };
    const c = colors[parseInt(lvl)] || { base: "#475569", dark: "#1e293b", pastel: "#94a3b8" };
    return c[type] || c.base;
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
    filterRow: {
        display: "flex",
        gap: "20px",
        flexWrap: "wrap"
    },
    summaryRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "20px",
        marginBottom: "30px"
    },
    summaryCard: {
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "20px",
        padding: "20px",
        textAlign: "center"
    },
    summaryValue: {
        fontSize: "1.8rem",
        fontWeight: "800",
        color: "#3b82f6",
        marginBottom: "5px"
    },
    summaryLabel: {
        fontSize: "0.8rem",
        color: "#94a3b8",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "1px"
    },
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

