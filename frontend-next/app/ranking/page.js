"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import config from "@/lib/config";
import { useLanguage } from "@/lib/LanguageContext";

export default function RankingPage() {
    const { t } = useLanguage();
    const [ranking, setRanking] = useState([]);
    const [period, setPeriod] = useState("all");
    const [box, setBox] = useState("all");
    const [quizMode, setQuizMode] = useState("all");
    const [availableBoxes, setAvailableBoxes] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [loading, setLoading] = useState(true);

    const MODES_OPTS = ["qa", "qb", "qc", "qe", "qd", "qj", "qf", "qi", "qg", "qh"];

    useEffect(() => {
        const p = localStorage.getItem("kanjilock_player");
        setCurrentPlayer(p);
        fetchBoxes();
    }, []);

    useEffect(() => {
        loadRanking();
    }, [period, box, quizMode]);

    async function fetchBoxes() {
        try {
            const res = await fetch(`${config.apiBaseUrl}/available-boxes`);
            if (res.ok) {
                const data = await res.json();
                setAvailableBoxes(data.map(String));
            }
        } catch (e) {
            console.error("Fetch boxes error", e);
        }
    }

    async function loadRanking() {
        setLoading(true);
        let url = `${config.apiBaseUrl}/ranking?period=${period}&box=${box}&mode=${quizMode}`;
        
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setRanking(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error("Ranking fetch error", e);
        } finally {
            setLoading(false);
        }
    }

    const formatTime = (ms) => {
        if (!ms || ms === 0) return "---";
        const seconds = (ms / 1000).toFixed(1);
        return `${seconds}s`;
    };

    return (
        <div style={styles.container}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "30px" }}>
                <img src="/icons/ranking1.png" alt="Ranking" style={{ width: "40px", height: "40px", filter: "brightness(0) invert(1)" }} />
                <h1 style={{ ...styles.title, margin: 0 }}>{t('ranking.title')}</h1>
            </div>

            <div style={styles.controls}>
                <div style={styles.filterGroup}>
                    <label style={styles.label}>{t('ranking.period')}:</label>
                    <select 
                        value={period} 
                        onChange={(e) => setPeriod(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">{t('ranking.allTime')}</option>
                        <option value="month">{t('ranking.month')}</option>
                        <option value="week">{t('ranking.week')}</option>
                        <option value="today">{t('ranking.today')}</option>
                    </select>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.label}>{t('quiz.mode')}:</label>
                    <select 
                        value={quizMode} 
                        onChange={(e) => setQuizMode(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">{t('common.all')}</option>
                        {MODES_OPTS.map(m => (
                            <option key={m} value={m}>{t(`quiz.modes.${m}`)}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.filterGroup}>
                    <label style={styles.label}>{t('quiz.box')}:</label>
                    <select 
                        value={box} 
                        onChange={(e) => setBox(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">{t('quiz.allBoxes')}</option>
                        {availableBoxes.map(b => (
                            <option key={b} value={b}>{t('quiz.box')} {b}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={styles.card}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.theadRow}>
                            <th style={styles.th}>{t('ranking.rank')}</th>
                            <th style={styles.th}>{t('ranking.player')}</th>
                            <th style={styles.th}>{box === "all" ? t('ranking.totalScore') : t('ranking.speedScore')}</th>
                            <th style={styles.th}>{t('ranking.date')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={styles.noData}>{t('common.loading')}...</td></tr>
                        ) : ranking.map((p, i) => {
                            const isCurrent = p.player === currentPlayer;
                            const scoreValue = box === "all" ? p.score : p.speed;
                            
                            return (
                                <tr key={i} style={{ 
                                    ...styles.tr, 
                                    background: isCurrent ? "rgba(33, 150, 243, 0.2)" : "transparent",
                                    borderLeft: isCurrent ? "4px solid #2196F3" : "none"
                                }}>
                                    <td style={styles.td}>{i + 1}</td>
                                    <td style={{ ...styles.td, fontWeight: isCurrent ? "bold" : "normal" }}>
                                        {p.player} {isCurrent && ` (${t('ranking.you')})`}
                                    </td>
                                    <td style={{ ...styles.td, color: "#3b82f6", fontWeight: "bold" }}>
                                        {scoreValue?.toLocaleString() || 0}
                                    </td>
                                    <td style={styles.td}>{p.date || "---"}</td>
                                </tr>
                            );
                        })}
                        {!loading && ranking.length === 0 && (
                            <tr><td colSpan="4" style={styles.noData}>{t('ranking.noData')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "1000px", margin: "0 auto", padding: "40px 20px" },
    title: { fontSize: "2.5rem", fontWeight: "800", color: "#fff", marginBottom: "30px", textAlign: "center" },
    controls: { 
        display: "flex", 
        justifyContent: "center", 
        gap: "20px", 
        marginBottom: "30px",
        flexWrap: "wrap" 
    },
    filterGroup: {
        display: "flex",
        alignItems: "center",
        gap: "10px"
    },
    label: {
        color: "#94a3b8",
        fontWeight: "600",
        fontSize: "0.9rem"
    },
    select: {
        padding: "10px 15px",
        borderRadius: "12px",
        background: "rgba(30, 41, 59, 0.8)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.1)",
        cursor: "pointer",
        outline: "none",
        fontSize: "0.9rem",
        minWidth: "150px"
    },
    card: { 
        background: "rgba(30, 41, 59, 0.4)", 
        borderRadius: "24px", 
        padding: "10px", 
        border: "1px solid rgba(255,255,255,0.1)",
        overflowX: "auto"
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "600px" },
    theadRow: { borderBottom: "1px solid rgba(255,255,255,0.1)" },
    th: { padding: "20px", color: "#94a3b8", fontWeight: "600", textAlign: "left", fontSize: "0.85rem" },
    tr: { transition: "background 0.2s" },
    td: { padding: "20px", color: "#fff", fontSize: "0.95rem" },
    noData: { padding: "40px", color: "#94a3b8", textAlign: "center" }
};
