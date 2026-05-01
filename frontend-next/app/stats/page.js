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
    const [timeRange, setTimeRange] = useState("week");
    const [masteryView, setMasteryView] = useState("kanji"); // 'kanji' or 'box'
    const activeModeRef = useRef(null);
    const historyScrollRef = useRef(null);

    // Auto-scroll history to the right
    useEffect(() => {
        if (!loading && historyScrollRef.current) {
            // Use a slightly longer timeout to ensure full layout after loading screen is gone
            const timer = setTimeout(() => {
                if (historyScrollRef.current) {
                    historyScrollRef.current.scrollLeft = historyScrollRef.current.scrollWidth;
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [loading, stats, timeRange, masteryView]);

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
            // 0. Fetch settings for baselines
            const s = await fetchRemoteSettings(player);
            setSettings(s);

            // 1. Fetch general kanji stats (now includes all summaries)
            const res = await fetch(`${config.apiBaseUrl}/stats?mode=${mode}&player=${encodeURIComponent(player)}`);
            if (res.ok) {
                const data = await res.json();
                if (activeModeRef.current === mode) {
                    setStats(data);
                }
            }
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
    // Use 'all' summary for the top cards, regardless of filter
    const totalSummary = stats?.summaries?.["all"] || {};

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Statistics</h1>
            </div>

            <div style={styles.filterSection}>
                <div style={{ ...styles.glassCard, padding: "8px 15px", display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <select
                            value={selectedMode}
                            onChange={(e) => setSelectedMode(e.target.value)}
                            style={{ ...styles.select, padding: "6px 12px" }}
                        >
                            {MODES_LIST.map(m => (
                                <option key={m} value={m}>
                                    {MODES[m]?.label || m}
                                </option>
                            ))}
                        </select>

                        <div style={styles.viewToggle}>
                            <button
                                onClick={() => setMasteryView("kanji")}
                                style={{ ...styles.toggleBtn, ...(masteryView === "kanji" ? styles.toggleBtnActive : {}) }}
                            >Kanji</button>
                            <button
                                onClick={() => setMasteryView("box")}
                                style={{ ...styles.toggleBtn, ...(masteryView === "box" ? styles.toggleBtnActive : {}) }}
                            >Box</button>
                        </div>
                    </div>

                    <div style={styles.viewToggle}>
                        {[
                            { id: "today", label: "Day" },
                            { id: "week", label: "Week" },
                            { id: "month", label: "Month" },
                            { id: "all", label: "Year" }
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => setTimeRange(btn.id)}
                                style={{ ...styles.toggleBtn, ...(timeRange === btn.id ? styles.toggleBtnActive : {}) }}
                            >{btn.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mastery History Graph - NOW ON TOP */}
            <div style={styles.fullWidthSection}>
                <div style={styles.glassCard}>
                    <h3 style={styles.cardTitle}>Mastery Trend</h3>
                    <div style={styles.historyChartContainer} ref={historyScrollRef}>
                        <div style={styles.historyBars}>
                            {(() => {
                                const historyType = timeRange === 'all' ? 'year' : (timeRange === 'today' ? 'day' : timeRange);
                                const points = stats?.history?.[masteryView]?.[historyType] || [];

                                // Dynamic Max Value based on actual data
                                const maxDataVal = points.reduce((acc, pt) => {
                                    const total = Object.values(pt.levels).reduce((a, b) => Number(a) + Number(b), 0);
                                    return Math.max(acc, total);
                                }, 0);

                                // Round up to a nice number for the scale
                                const getNiceMax = (m) => {
                                    if (m <= 10) return 10;
                                    if (m <= 50) return 50;
                                    if (m <= 100) return 100;
                                    if (m <= 200) return 200;
                                    if (m <= 500) return 500;
                                    return Math.ceil(m / 500) * 500;
                                };
                                const maxVal = getNiceMax(maxDataVal);

                                return points.map((pt, idx) => {
                                    const total = Object.values(pt.levels).reduce((a, b) => Number(a) + Number(b), 0);
                                    const height = total > 0 ? (total / maxVal) * 100 : 0;

                                    return (
                                        <div key={idx} style={styles.historyBarGroup}>
                                            <div style={styles.historyBarContainer}>
                                                <div style={{
                                                    ...styles.historyBar,
                                                    height: `${height}%`,
                                                }}>
                                                    {[4, 3, 2, 1].map(lvl => {
                                                        const count = Number(pt.levels[lvl] || pt.levels[String(lvl)] || 0);
                                                        if (count === 0) return null;
                                                        const pct = total > 0 ? (count / total) * 100 : 0;
                                                        return (
                                                            <div key={lvl} style={{
                                                                height: `${pct}%`,
                                                                background: getLevelColor(lvl, 'base'),
                                                                width: "100%",
                                                                borderBottom: "1px solid rgba(0,0,0,0.1)"
                                                            }} title={`Lvl ${lvl}: ${count}`} />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div style={styles.historyLabel}>{pt.label}</div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Y-Axis - NOW ON THE RIGHT AND STICKY */}
                        <div style={{
                            ...styles.yAxis,
                            height: "180px", // Match historyBarContainer height
                            borderRight: "none",
                            borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
                            paddingRight: 0,
                            paddingLeft: "10px",
                            position: "sticky",
                            right: 0,
                            background: "var(--bg-card)",
                            zIndex: 10
                        }}>
                            {(() => {
                                const historyType = timeRange === 'all' ? 'year' : (timeRange === 'today' ? 'day' : timeRange);
                                const points = stats?.history?.[masteryView]?.[historyType] || [];
                                const maxDataVal = points.reduce((acc, pt) => {
                                    const total = Object.values(pt.levels).reduce((a, b) => Number(a) + Number(b), 0);
                                    return Math.max(acc, total);
                                }, 0);
                                const getNiceMax = (m) => {
                                    if (m <= 10) return 10;
                                    if (m <= 50) return 50;
                                    if (m <= 100) return 100;
                                    if (m <= 200) return 200;
                                    if (m <= 500) return 500;
                                    return Math.ceil(m / 500) * 500;
                                };
                                const maxVal = getNiceMax(maxDataVal);

                                return [1, 0.75, 0.5, 0.25, 0].map(pct => (
                                    <div key={pct} style={{ ...styles.yAxisLabel, textAlign: "left" }}>
                                        {Math.round(maxVal * pct)}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryRow}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{totalSummary.total_answers || 0}</div>
                    <div style={styles.summaryLabel}>Answers</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{totalSummary.total_sessions || 0}</div>
                    <div style={styles.summaryLabel}>Sessions</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{totalSummary.days_active || 0}</div>
                    <div style={styles.summaryLabel}>Days</div>
                </div>
            </div>

            {(() => {
                // Calculate Scale Maxes for various charts
                const getScaleMax = (m, defaultMax = 10) => {
                    if (m <= 0) return defaultMax;
                    if (m <= 5) return 5;
                    if (m <= 10) return 10;
                    if (m <= 25) return 25;
                    if (m <= 50) return 50;
                    if (m <= 100) return 100;
                    if (m <= 250) return 250;
                    if (m <= 500) return 500;
                    if (m <= 1000) return 1000;
                    return Math.ceil(m / 500) * 500;
                };

                const currentMaxKanji = Math.max(...Object.values(srsData).map(v => Number(v)), 0);
                const kanjiScaleMax = getScaleMax(currentMaxKanji, 200);

                const currentMaxBox = Math.max(...Object.values(boxStats).map(v => Number(v)), 0);
                const boxScaleMax = getScaleMax(currentMaxBox, 10);

                const currentMaxFlash = Math.max(...Object.values(flashStats).map(v => Number(v)), 0);
                const flashScaleMax = getScaleMax(currentMaxFlash, 20);

                const masteryScaleMax = masteryView === "kanji" ? kanjiScaleMax : boxScaleMax;

                return (
                    <div style={styles.mainGrid}>
                        {/* Unified Mastery Card */}
                        <div style={{ ...styles.glassCard, gridColumn: "span 2" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
                                <h3 style={{ ...styles.cardTitle, margin: 0 }}>
                                    {masteryView === "kanji" ? "Kanji SRS Mastery" : "Box Mastery"}
                                </h3>
                            </div>

                            <div style={styles.chartWithAxis}>
                                {/* Y-Axis Graduation */}
                                <div style={styles.yAxis}>
                                    {[1, 0.75, 0.5, 0.25, 0].map(pct => (
                                        <div key={pct} style={styles.yAxisLabel}>
                                            {Math.round(masteryScaleMax * pct)}
                                        </div>
                                    ))}
                                </div>

                                <div style={styles.barChart}>
                                    {[1, 2, 3, 4].map(level => {
                                        const count = (masteryView === "kanji" ? srsData[level] : boxStats[level]) || 0;
                                        const baseline = (timeRange !== 'all') ?
                                            ((masteryView === "kanji" ? settings?.targets?.kanji_baselines?.[level] : settings?.targets?.baselines?.[level]) || 0)
                                            : 0;
                                        const gained = Math.max(0, count - baseline);

                                        const totalHeight = Math.min((count / masteryScaleMax) * 100, 100);
                                        const newPct = count > 0 ? (gained / count) * 100 : 0;
                                        const oldPct = 100 - newPct;

                                        return (
                                            <div key={level} style={styles.barGroup}>
                                                <div style={styles.barContainer}>
                                                    {/* Grid lines */}
                                                    <div style={styles.gridLines}>
                                                        <div style={styles.gridLine} /><div style={styles.gridLine} /><div style={styles.gridLine} />
                                                    </div>
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
                        </div>

                        {/* Flashcard Mastery */}
                        <div style={{ ...styles.glassCard, gridColumn: "span 2" }}>
                            <h3 style={styles.cardTitle}>Flashcard Mastery</h3>
                            <div style={styles.chartWithAxis}>
                                {/* Y-Axis Graduation */}
                                <div style={styles.yAxis}>
                                    {[1, 0.75, 0.5, 0.25, 0].map(pct => (
                                        <div key={pct} style={styles.yAxisLabel}>
                                            {Math.round(flashScaleMax * pct)}
                                        </div>
                                    ))}
                                </div>
                                <div style={styles.barChart}>
                                    {[1, 2, 3, 4].map(level => {
                                        const count = flashStats[level] || 0;
                                        const height = Math.min((count / flashScaleMax) * 100, 100);
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
                    </div>
                );
            })()}


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
        </div >
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
        padding: "5px",
        background: "var(--bg-main)",
        minHeight: "100vh",
        color: "var(--text-primary)",
        fontFamily: "'Inter', sans-serif"
    },
    header: { marginBottom: "15px", textAlign: "left" },
    backLink: {
        textDecoration: "none",
        color: "var(--accent-blue)",
        fontSize: "0.9rem",
        fontWeight: "600",
        marginBottom: "10px",
        display: "inline-block"
    },
    title: { fontSize: "2rem", fontWeight: "800", marginBottom: "4px" },
    subtitle: { color: "var(--text-secondary)", fontSize: "1rem" },
    filterSection: { marginBottom: "15px" },
    filterRow: {
        display: "flex",
        gap: "20px",
        flexWrap: "wrap"
    },
    summaryRow: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px",
        marginBottom: "15px"
    },
    summaryCard: {
        background: "linear-gradient(135deg, var(--bg-card) 0%, rgba(15, 23, 42, 0.4) 100%)",
        border: "1px solid var(--border-color)",
        borderRadius: "20px",
        padding: "10px 5px",
        textAlign: "center",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
    },
    summaryValue: {
        fontSize: "1.2rem",
        fontWeight: "800",
        color: "var(--accent-blue)",
        marginBottom: "2px"
    },
    summaryLabel: {
        fontSize: "0.7rem",
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "1px"
    },
    glassCard: {
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "24px",
        padding: "20px",
        height: "100%"
    },
    select: {
        background: "var(--input-bg)",
        color: "var(--text-primary)",
        border: "1px solid var(--input-border)",
        padding: "10px 15px",
        borderRadius: "12px",
        outline: "none",
        cursor: "pointer"
    },
    mainGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "25px",
        marginBottom: "40px"
    },
    fullWidthSection: { marginBottom: "30px" },
    cardTitle: { fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "25px", fontWeight: "600", textAlign: "left" },
    barChart: {
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end",
        height: "180px",
        paddingBottom: "0px",
        flex: 1,
        minWidth: 0
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
        color: "var(--text-primary)"
    },
    barLabel: { fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: "500" },
    viewToggle: {
        display: "flex",
        background: "rgba(15, 23, 42, 0.4)",
        padding: "4px",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.05)"
    },
    toggleBtn: {
        padding: "6px 16px",
        fontSize: "0.8rem",
        fontWeight: "600",
        borderRadius: "8px",
        border: "none",
        background: "transparent",
        color: "#94a3b8",
        cursor: "pointer",
        transition: "all 0.2s"
    },
    toggleBtnActive: {
        background: "#3b82f6",
        color: "#fff",
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
    },
    chartWithAxis: {
        display: "flex",
        gap: "10px",
        height: "200px",
        marginTop: "30px", // More room for barValue
        alignItems: "flex-end"
    },
    yAxis: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "150px",
        paddingRight: "10px",
        borderRight: "1px solid rgba(255, 255, 255, 0.05)",
        minWidth: "35px",
        marginBottom: "28px" // Aligns '0' with the bottom of the barContainer (above labels)
    },
    yAxisLabel: {
        fontSize: "0.7rem",
        color: "#64748b",
        textAlign: "right"
    },
    gridLines: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pointerEvents: "none"
    },
    gridLine: {
        height: "1px",
        background: "rgba(255, 255, 255, 0.03)",
        width: "100%"
    },
    historyChartContainer: {
        display: "flex",
        gap: "10px",
        height: "250px",
        marginTop: "20px",
        overflowX: "auto",
        paddingBottom: "10px"
    },
    historyBars: {
        display: "flex",
        gap: "15px",
        alignItems: "flex-end",
        height: "200px",
        paddingRight: "20px"
    },
    historyBarGroup: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: "40px",
        flex: 1
    },
    historyBarContainer: {
        height: "180px",
        width: "100%",
        maxWidth: "60px",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "4px",
        display: "flex",
        alignItems: "flex-end",
        position: "relative"
    },
    historyBar: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "4px"
    },
    historyLabel: {
        fontSize: "0.7rem",
        color: "#64748b",
        marginTop: "10px",
        whiteSpace: "nowrap"
    }
};

