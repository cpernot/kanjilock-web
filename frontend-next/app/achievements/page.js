"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlayer_setting } from "@/lib/settings";
import { fetchTargetHistory, deleteTargetHistory } from "@/lib/targets";
import { useLanguage } from "@/lib/LanguageContext";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function Achievements() {
    const { t } = useLanguage();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [player, setPlayer] = useState("");

    useEffect(() => {
        const p = getPlayer_setting();
        if (p) {
            setPlayer(p);
            loadHistory(p);
        } else {
            setLoading(false);
        }
    }, []);

    async function loadHistory(p) {
        try {
            const data = await fetchTargetHistory(p, 50);
            setHistory(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm(t('common.confirmDelete') || "Delete this record?")) return;
        const success = await deleteTargetHistory(player, id);
        if (success) {
            setHistory(history.filter(item => item.id !== id));
        }
    }

    if (loading) return <LoadingOverlay message="Fetching achievements..." />;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <Link href="/" style={styles.backBtn}>← {t('common.back')}</Link>
                <h1 style={styles.title}>🏆 {t('settings.achievements')}</h1>
                <p style={styles.subtitle}>{player}'s Hall of Fame</p>
            </header>

            {history.length === 0 ? (
                <div style={styles.empty}>
                    <p>{t('settings.noHistory')}</p>
                </div>
            ) : (
                <div style={styles.grid}>
                    {history.map((item, idx) => (
                        <div key={item.id || idx} style={styles.card}>
                            <div style={styles.cardHeader}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={styles.periodBadge}>{t(`targets.${item.period_type}`)}</span>
                                    <span style={styles.date}>{new Date(item.period_end).toLocaleDateString()}</span>
                                </div>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    style={styles.deleteBtn}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                            
                            <div style={styles.stars}>
                                {[1, 2, 3, 4].map(i => (
                                    <span key={i} style={{ 
                                        opacity: i <= item.stars ? 1 : 0.2,
                                        fontSize: "1.8rem",
                                        filter: i <= item.stars ? "drop-shadow(0 0 5px #eab308)" : "none"
                                    }}>⭐</span>
                                ))}
                            </div>

                            <div style={styles.details}>
                                <div style={styles.detailRow}>
                                    <span>Type:</span>
                                    <span>{item.target_type === 'kanji' ? t('home.kanjiMastery') : t('home.boxMastery')}</span>
                                </div>
                                <div style={styles.achievedGrid}>
                                    {[1, 2, 3, 4].map(lvl => (
                                        <div key={lvl} style={{
                                            ...styles.lvlBadge,
                                            opacity: item.achieved[lvl] >= item.config[lvl] ? 1 : 0.5,
                                            border: item.achieved[lvl] >= item.config[lvl] ? "1px solid #eab308" : "1px solid rgba(255,255,255,0.1)"
                                        }}>
                                            L{lvl}: +{item.achieved[lvl] || 0}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { maxWidth: "800px", margin: "0 auto", padding: "20px" },
    header: { marginBottom: "30px", textAlign: "center" },
    backBtn: { color: "#3b82f6", textDecoration: "none", fontSize: "0.9rem", display: "block", marginBottom: "10px" },
    title: { fontSize: "2rem", fontWeight: "800", color: "#fff", marginBottom: "5px" },
    subtitle: { color: "#94a3b8", fontSize: "1rem" },
    empty: { textAlign: "center", padding: "50px", background: "rgba(30, 41, 59, 0.4)", borderRadius: "24px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
    card: { 
        background: "rgba(30, 41, 59, 0.4)", 
        borderRadius: "24px", 
        padding: "20px", 
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "15px"
    },
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" },
    periodBadge: { background: "#3b82f6", padding: "4px 10px", borderRadius: "8px", fontSize: "0.7rem", fontWeight: "bold" },
    date: { color: "#64748b", fontSize: "0.8rem" },
    deleteBtn: { 
        background: "transparent", 
        border: "none", 
        cursor: "pointer", 
        fontSize: "0.9rem", 
        opacity: 0.3, 
        transition: "opacity 0.2s",
        padding: "5px"
    },
    stars: { display: "flex", justifyContent: "center", gap: "5px" },
    details: { background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "12px" },
    detailRow: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "10px" },
    achievedGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" },
    lvlBadge: { padding: "5px", borderRadius: "6px", fontSize: "0.75rem", textAlign: "center", background: "rgba(255,255,255,0.05)" },
    btn: { display: "inline-block", marginTop: "20px", background: "#3b82f6", color: "#fff", padding: "10px 20px", borderRadius: "12px", textDecoration: "none", fontWeight: "bold" }
};
