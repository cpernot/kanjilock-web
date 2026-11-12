"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { setBoxContext, getNextBoxId, initEngine, isInitialized, setRevengePool } from "@/lib/quizengine";
import { useRouter } from "next/navigation";
import { getSessionSummary } from "@/lib/quizSession";
import { useLanguage } from "@/lib/LanguageContext";

export default function SessionEndPage() {
    const { t } = useLanguage();
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

    const handleContinue = async () => {
        setRevengePool(null);
        if (summary?.boxId) {
            const { getSettings } = await import("@/lib/settings");
            const { getRecommendedBox } = await import("@/lib/quizengine");
            const settings = getSettings();
            
            let nextBox = null;
            if (settings.progressiveMode) {
                // Use the new Rule: lowest box of lower level (if all unlocked) 
                // or highest unlocked (if not all unlocked)
                nextBox = getRecommendedBox(true, summary.mode || "qa");
            } else {
                nextBox = getNextBoxId(summary.boxId);
            }

            if (nextBox) {
                setBoxContext(nextBox);
                localStorage.setItem("kanjilock_last_box_selection", nextBox);
            }
        }
        router.push("/quiz");
    };

    const handleReplay = () => {
        setRevengePool(null);
        const bId = (summary.boxId === "" || summary.boxId === null) ? "" : summary.boxId;
        localStorage.setItem("kanjilock_last_box_selection", bId);
        setBoxContext(bId || null);
        router.push("/quiz?replay=true");
    };

    const handleQuickRevenge = (kanjiList) => {
        const bId = (summary.boxId === "" || summary.boxId === null) ? "" : summary.boxId;
        localStorage.setItem("kanjilock_last_box_selection", bId);
        setBoxContext(bId || null);
        setRevengePool(kanjiList);
        router.push("/quiz?replay=true&revenge=true");
    };

    if (!summary) return <div>{t('common.loading')}... <Link href="/">{t('nav.home')}</Link></div>;

    const boxMsg = summary.boxRanking ? summary.boxRanking.message : "";
    const avgSec = summary.avgTimeMs ? (summary.avgTimeMs / 1000) : (summary.size > 0 ? (summary.totalTime / summary.size / 1000) : 0);

    // Compute Rank S/A/B/C
    const accuracyRatio = summary.size > 0 ? summary.correct / summary.size : 0;
    const speed100 = summary.scoreOn100 || 0;
    const rank = summary.rank || (
        accuracyRatio >= 1 && speed100 >= 95 ? "S" :
        accuracyRatio >= 0.9 && speed100 >= 80 ? "A" :
        accuracyRatio >= 0.75 && speed100 >= 60 ? "B" : "C"
    );

    const rankColors = {
        S: { bg: "linear-gradient(135deg, #f59e0b, #fde047)", text: "#0f172a", glow: "rgba(250, 204, 21, 0.6)" },
        A: { bg: "linear-gradient(135deg, #3b82f6, #60a5fa)", text: "#ffffff", glow: "rgba(59, 130, 246, 0.5)" },
        B: { bg: "linear-gradient(135deg, #10b981, #34d399)", text: "#ffffff", glow: "rgba(16, 185, 129, 0.4)" },
        C: { bg: "linear-gradient(135deg, #64748b, #94a3b8)", text: "#ffffff", glow: "rgba(100, 116, 139, 0.3)" }
    };
    const rStyle = rankColors[rank] || rankColors.C;

    // Near-Miss & Box Progress Calculation
    let nearMissText = null;
    let nextTargetProgressPct = 100;
    let nextTargetLabel = "";
    if (summary.boxRanking) {
        const curLvl = summary.boxRanking.level || 1;
        if (curLvl < 2 || speed100 < 80) {
            nextTargetLabel = "Level 2 (80/100)";
            nextTargetProgressPct = Math.min(100, Math.round((speed100 / 80) * 100));
            const diffPoints = 80 - speed100;
            const secNeeded = Math.max(0.1, (avgSec - 3.44)).toFixed(2);
            nearMissText = `🔥 ${t('quiz.nearMissLv2') || `Only ${diffPoints} pts (${secNeeded}s/item faster) to unlock Box Level 2!`}`;
        } else if (curLvl < 3 || speed100 < 100) {
            nextTargetLabel = "Level 3 ⚡ (100/100)";
            nextTargetProgressPct = Math.min(100, Math.round(speed100));
            const diffPoints = 100 - speed100;
            const secNeeded = Math.max(0.05, (avgSec - 1.80)).toFixed(2);
            nearMissText = `⚡ ${t('quiz.nearMissLv3') || `So close! Shave off ${secNeeded}s/kanji (${diffPoints} pts) for Level 3 Master!`}`;
        } else {
            nextTargetLabel = curLvl >= 4 ? "MAX LEVEL 4 🏆" : "Level 3 Mastered ⚡";
            nextTargetProgressPct = 100;
        }
    }

    // Missed or Slow Kanji for Quick Revenge
    const missedOrSlowKanjis = (summary.history || [])
        .filter(h => !h.correct || (h.rt_ms && h.rt_ms > 2800))
        .map(h => h.kanji);

    return (
        <div style={styles.container}>
            {/* Top Header & Arcade Grade Badge */}
            <div style={styles.headerRow}>
                <div>
                    <h2 style={{ margin: 0, textAlign: "left" }}>🎉 {t('quiz.summary')}</h2>
                    {summary.boxId && (
                        <div style={{ fontSize: "0.85rem", color: "#94a3b8", textAlign: "left", marginTop: "4px" }}>
                            {t('quiz.box')} {summary.boxId} {summary.isRevenge ? "• ⚡ Revenge" : ""}
                        </div>
                    )}
                </div>
                <div style={{
                    ...styles.gradeBadge,
                    background: rStyle.bg,
                    color: rStyle.text,
                    boxShadow: `0 0 20px ${rStyle.glow}`
                }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: "800", opacity: 0.85 }}>RANK</span>
                    <span style={{ fontSize: "1.9rem", fontWeight: "900", lineHeight: 1 }}>{rank}</span>
                </div>
            </div>

            {/* Personal Best & Streak Pills */}
            <div style={styles.badgesRow}>
                {summary.personalBest?.isNewRecord && (
                    <span style={styles.recordBadge}>
                        🏆 {t('quiz.newRecord') || 'NEW RECORD!'}
                        {summary.personalBest.pbDiffMs < 0 && ` (${(summary.personalBest.pbDiffMs / 1000).toFixed(2)}s/kanji)`}
                    </span>
                )}
                {!summary.personalBest?.isNewRecord && summary.personalBest?.pbDiffMs > 0 && (
                    <span style={styles.pbChaseBadge}>
                        🎯 +{(summary.personalBest.pbDiffMs / 1000).toFixed(2)}s from Personal Best
                    </span>
                )}
                {summary.maxStreak >= 3 && (
                    <span style={styles.streakSummaryBadge}>
                        🔥 {t('quiz.maxCombo') || 'Max Combo'}: {summary.maxStreak}x
                    </span>
                )}
                {summary.feverBonusKanji && (
                    <span style={styles.feverRewardBadge}>
                        ✨ Fever Bonus: {summary.feverBonusKanji} (+2 Lv!)
                    </span>
                )}
            </div>

            <div style={styles.stat}>
                <span style={styles.label}>{t('quiz.score')}:</span>
                <span style={styles.value}>✔️ {summary.correct} / {summary.size}</span>
            </div>
            <div style={styles.stat}>
                <span style={styles.label}>{t('quiz.time')}:</span>
                <span style={styles.value}>⏱ {(summary.totalTime / 1000).toFixed(1)} s ({avgSec.toFixed(2)}s/item)</span>
            </div>
            <div style={styles.stat}>
                <span style={styles.label}>{t('quiz.speed')}:</span>
                <span style={styles.value}>⚡ {summary.scoreOn100} / 100</span>
            </div>

            {summary.boxRanking && (
                <div style={styles.rankingBox}>
                    <div style={styles.rankBadge}>
                        {summary.boxRanking.level > summary.boxRanking.oldLevel ? "🎉 LEVEL UP!" : "Box Mastery"}
                    </div>
                    <div style={styles.transition}>
                        <span style={styles.oldLevel}>Lv.{summary.boxRanking.oldLevel}</span>
                        <span style={styles.arrow}>→</span>
                        <span style={styles.newLevel}>Lv.{summary.boxRanking.level}</span>
                    </div>
                    {boxMsg && <p style={styles.boxMsg}>{boxMsg}</p>}

                    {/* Progress bar toward next Box Level */}
                    <div style={styles.nextGoalWrap}>
                        <div style={styles.nextGoalHeader}>
                            <span>{nextTargetLabel}</span>
                            <span>{nextTargetProgressPct}%</span>
                        </div>
                        <div style={styles.nextGoalBarBg}>
                            <div style={{
                                ...styles.nextGoalBarFill,
                                width: `${nextTargetProgressPct}%`,
                                background: nextTargetProgressPct >= 100
                                    ? "linear-gradient(90deg, #f59e0b, #fde047)"
                                    : "linear-gradient(90deg, #3b82f6, #38bdf8)"
                            }} />
                        </div>
                        {nearMissText && (
                            <p style={styles.nearMissPrompt}>{nearMissText}</p>
                        )}
                    </div>
                </div>
            )}

            <div style={styles.actions}>
                <button onClick={handleContinue} style={{ ...styles.btn, border: 'none', cursor: 'pointer' }}>➡️ {t('quiz.continue')}</button>
                <button onClick={handleReplay} style={{ ...styles.btn, background: "#8b5cf6", border: 'none', cursor: 'pointer' }}>
                    🔁 {t('quiz.replay')}
                </button>
                {missedOrSlowKanjis.length >= 2 && (
                    <button
                        onClick={() => handleQuickRevenge(missedOrSlowKanjis)}
                        style={{ ...styles.btn, background: "linear-gradient(135deg, #ec4899, #f43f5e)", border: 'none', cursor: 'pointer' }}
                    >
                        ⚡ {t('quiz.quickRevenge') || `Revenge (${missedOrSlowKanjis.length})`}
                    </button>
                )}
                <Link href="/" style={{ ...styles.btn, background: "#475569" }}>
                    <img src="/icons/home1.png" alt="Home" style={styles.navIconImg} onError={(e) => e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/home.png"} />
                    <span style={styles.navLabel}>{t('nav.home')}</span>
                </Link>
            </div>

            {/* Detailed Kanji History */}
            <div style={styles.historyList}>
                <h4 style={{ color: "#94a3b8", margin: "30px 0 15px 0" }}>{t('quiz.details')}</h4>
                <div style={styles.grid}>
                    {summary.history.map((h, i) => {
                        const leveledUp = h.oldLevel && h.newLevel && h.newLevel > h.oldLevel;
                        const leveledDown = h.oldLevel && h.newLevel && h.newLevel < h.oldLevel;
                        return (
                            <div key={i}
                                onClick={() => {
                                    const msg = `Fais une phrase d'exemple en japonais avec le kanji "${h.kanji}" and explains its readings and meaning.`;
                                    window.dispatchEvent(new CustomEvent('askSensei', { detail: msg }));
                                }}
                                style={{
                                    ...styles.historyItem,
                                    borderColor: h.feverBonus
                                        ? "rgba(250, 204, 21, 0.85)"
                                        : (h.correct ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.45)"),
                                    boxShadow: h.feverBonus ? "0 0 12px rgba(250, 204, 21, 0.35)" : "none",
                                    cursor: "pointer"
                                }}
                            >
                                <span style={styles.kanjiChar}>{h.kanji}</span>
                                <span style={{
                                    ...styles.kanjiLevel,
                                    color: h.feverBonus ? "#fde047" : (leveledUp ? "#4ade80" : (leveledDown ? "#f87171" : "#94a3b8")),
                                    fontWeight: (leveledUp || h.feverBonus) ? "700" : "normal"
                                }}>
                                    {leveledUp || leveledDown
                                        ? `Lv.${h.oldLevel} → Lv.${h.newLevel}`
                                        : (h.newLevel ? `${t('flashcards.level')} ${h.newLevel}` : "---")}
                                    {h.feverBonus && " 🔥+2"}
                                    {!h.feverBonus && h.newLevel === 3 && " ⭐"}
                                    {!h.feverBonus && h.newLevel === 4 && " ⭐⭐⭐"}
                                </span>
                                {h.rt_ms && (
                                    <span style={{ fontSize: "0.7rem", color: h.rt_ms <= 1500 ? "#facc15" : "#64748b", marginTop: "2px" }}>
                                        {(h.rt_ms / 1000).toFixed(2)}s
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "540px", margin: "40px auto", textAlign: "center", border: "1px solid rgba(255,255,255,0.12)", padding: "30px", borderRadius: "16px", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(10px)" },
    headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
    gradeBadge: {
        width: "64px",
        height: "64px",
        borderRadius: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
    },
    badgesRow: {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        justifyContent: "center",
        marginBottom: "18px"
    },
    recordBadge: {
        background: "linear-gradient(135deg, #f59e0b, #eab308)",
        color: "#0f172a",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: "800"
    },
    pbChaseBadge: {
        background: "rgba(59, 130, 246, 0.15)",
        border: "1px solid rgba(59, 130, 246, 0.4)",
        color: "#93c5fd",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: "700"
    },
    streakSummaryBadge: {
        background: "rgba(249, 115, 22, 0.18)",
        border: "1px solid rgba(249, 115, 22, 0.45)",
        color: "#fdba74",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: "700"
    },
    feverRewardBadge: {
        background: "rgba(250, 204, 21, 0.18)",
        border: "1px solid rgba(250, 204, 21, 0.55)",
        color: "#fde047",
        padding: "4px 12px",
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: "800"
    },
    stat: { fontSize: "1.1rem", margin: "10px 0", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "6px" },
    label: { fontWeight: "bold", color: "#cbd5e1" },
    value: { fontWeight: "600" },
    actions: { marginTop: "26px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" },
    btn: {
        textDecoration: "none",
        padding: "10px 18px",
        background: "#2196F3",
        color: "white",
        borderRadius: "10px",
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
    rankingBox: { margin: "26px 0", padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", position: "relative" },
    rankBadge: { position: "absolute", top: "-10px", left: "20px", background: "#3b82f6", color: "white", padding: "2px 10px", borderRadius: "100px", fontSize: "0.7rem", fontWeight: "bold" },
    transition: { display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", margin: "10px 0" },
    oldLevel: { fontSize: "1.8rem", color: "#94a3b8", fontWeight: "bold" },
    newLevel: { fontSize: "2.6rem", color: "#3b82f6", fontWeight: "bold" },
    arrow: { fontSize: "1.5rem", color: "rgba(255,255,255,0.2)" },
    boxMsg: { fontSize: "0.9rem", color: "#cbd5e1", marginTop: "8px" },
    nextGoalWrap: {
        marginTop: "14px",
        paddingTop: "12px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        textAlign: "left"
    },
    nextGoalHeader: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.78rem",
        color: "#94a3b8",
        fontWeight: "700",
        marginBottom: "6px"
    },
    nextGoalBarBg: {
        width: "100%",
        height: "8px",
        background: "rgba(255,255,255,0.08)",
        borderRadius: "999px",
        overflow: "hidden"
    },
    nextGoalBarFill: {
        height: "100%",
        borderRadius: "999px",
        transition: "width 0.5s ease"
    },
    nearMissPrompt: {
        marginTop: "10px",
        marginBottom: 0,
        fontSize: "0.85rem",
        color: "#fde047",
        fontWeight: "600",
        textAlign: "center"
    },
    historyList: { marginTop: "20px", textAlign: "left" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: "10px" },
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
    kanjiLevel: { fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }
};
