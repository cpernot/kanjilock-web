"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlayer_setting, getSettings, fetchRemoteSettings, saveRemoteSettings } from "@/lib/settings";
import { initEngine, isInitialized } from "@/lib/quizengine";
import { checkPeriodReset, calculateProgress, updateBaselines, fetchStatsCounts, calculatePeriodAdvancement, fetchTargetHistory } from "@/lib/targets";
import CircularProgress from "@/components/CircularProgress";
import LoadingOverlay from "@/components/LoadingOverlay";
import { getDashboardCache, setDashboardCache, invalidateDashboardCache } from "@/lib/dashboardCache";
import config from "@/lib/config";
import { useLanguage } from "@/lib/LanguageContext";

export default function Home() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [targetType, setTargetType] = useState("kanji");
  const [period, setPeriod] = useState("week");
  const [periodAdvancement, setPeriodAdvancement] = useState(0);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Check cache first for instant load
    const cached = getDashboardCache();
    if (cached) {
      setPlayer(cached.player);
      setProgressData(cached.progressData);
      setTargetType(cached.targetType);
      setPeriod(cached.period);
      setPeriodAdvancement(cached.periodAdvancement || 0);
      setLoading(false);
      // We still run loadHomeData in background to ensure it's fresh
      loadHomeData(true);
    } else {
      loadHomeData();
    }
  }, []);

  async function loadHomeData(isBackground = false) {
    const p = getPlayer_setting();
    if (!p) {
      setLoading(false);
      return;
    }
    setPlayer(p);

    try {
      // 1. Init engine
      await initEngine(p);

      // 2. Load Settings
      let currentSettings = await fetchRemoteSettings(p);
      if (!currentSettings) currentSettings = getSettings(p);
      setSettings(currentSettings);

      const activeId = currentSettings.targets?.activeId || "main";
      const target = currentSettings.targets?.definitions?.[activeId];
      if (!target) return;

      const type = target.type || "kanji";
      const freq = target.period || "week";
      setTargetType(type);
      setPeriod(freq);

      // 3. Fetch Current Counts
      const currentCounts = await fetchStatsCounts(p);
      console.log("📊 currentCounts fetched:", currentCounts);

      // 4. Check Period Reset
      if (checkPeriodReset(currentSettings, activeId)) {
        console.log(`🕒 Period reset detected for ${activeId}, updating baselines...`);
        await updateBaselines(p, currentCounts, activeId, currentSettings);
        currentSettings = await fetchRemoteSettings(p);
        setSettings(currentSettings);
      }

      // 5. Calculate Progress
      const progress = calculateProgress(currentSettings, currentCounts, activeId);
      console.log("📈 Progress calculated:", progress);
      setProgressData(progress);

      const advancement = calculatePeriodAdvancement(currentSettings, activeId);
      setPeriodAdvancement(advancement);

      // 6. Fetch Recent History
      const history = await fetchTargetHistory(p, 7);

      // Save to cache
      setDashboardCache({
        player: p,
        progressData: progress,
        targetType: type,
        period: freq,
        periodAdvancement: advancement,
        history: history
      });

    } catch (e) {
      console.error("Home load error", e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }

  async function changeTarget(id) {
    const p = getPlayer_setting();
    const settings = getSettings(p);
    if (!settings.targets?.definitions[id]) return;
    
    settings.targets.activeId = id;
    await saveRemoteSettings(p, settings);
    invalidateDashboardCache();
    loadHomeData();
  }

  if (loading) {
    if (!isInitialized) {
      return <LoadingOverlay message="Synchronizing Kanji Database..." />;
    }
    return (
      <div style={styles.loading}>
        <div style={{ ...styles.spinner, marginRight: '10px' }}>⏳</div>
        {t('common.loading')}
      </div>
    );
  }

  const levelColors = {
    1: "#3b82f6", // Blue
    2: "#eab308", // Yellow/Gold
    3: "#f97316", // Orange
    4: "#22c55e"  // Green
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>{t('home.welcome').replace('{player}', player)}</h1>
        
        {/* Target Switcher */}
        <div style={styles.targetSwitcher}>
          <select 
            value={settings?.targets?.activeId || "main"}
            onChange={(e) => changeTarget(e.target.value)}
            style={styles.targetSelect}
          >
            {Object.keys(settings?.targets?.definitions || {}).map(id => (
              <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)} Goal</option>
            ))}
          </select>
        </div>

        <div style={styles.subtitle}>
          <span style={styles.periodBadge}>{t(`targets.${period}`)}</span>
          <span style={styles.progLabel}> {targetType === "kanji" ? t('home.kanjiMastery') : t('home.boxMastery')}</span>
        </div>

        {/* Achievement Stars */}
        <div style={styles.starsRow}>
           {[1, 2, 3, 4].map(i => {
             const isAchieved = progressData[i]?.percent >= 100;
             return (
               <span key={i} style={{ 
                 opacity: isAchieved ? 1 : 0.2, 
                 fontSize: "1.5rem", 
                 filter: isAchieved ? "drop-shadow(0 0 5px #eab308)" : "none",
                 transition: "all 0.5s ease",
                 margin: "0 2px"
               }}>⭐</span>
             );
           })}
        </div>

        {/* Period Advancement Bar */}
        <div style={styles.advancementWrapper}>
          <div style={styles.advancementBar}>
            <div style={{ ...styles.advancementFill, width: `${periodAdvancement}%` }}></div>
          </div>
          <div style={styles.advancementText}>
            {t('home.timeElapsed')}: {Math.round(periodAdvancement)}%
          </div>
        </div>
      </header>



      <div style={styles.progressGrid}>
        {[1, 2, 3, 4].map(lvl => (
          <CircularProgress
            key={lvl}
            percentage={progressData[lvl]?.percent || 0}
            label={`L${lvl}`}
            subtitle={`${progressData[lvl]?.current || 0}/${progressData[lvl]?.target || 0}`}
            color={levelColors[lvl]}
            size={100}
          />
        ))}
      </div>

      {/* History Dots Row */}
      {getDashboardCache()?.history?.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.historyLabel}>{t('settings.history')}</div>
          <div style={styles.historyDots}>
            {getDashboardCache().history.map((h, i) => (
              <div key={i} title={`${h.period_type}: ${h.stars} stars`} style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: h.stars >= 4 ? "#eab308" : h.stars > 0 ? "#3b82f6" : "rgba(255,255,255,0.1)",
                boxShadow: h.stars >= 4 ? "0 0 8px #eab308" : "none"
              }} />
            ))}
          </div>
        </div>
      )}

      <div style={styles.menuGrid}>
        <Link href="/ranking" style={styles.menuBtn}>
          <div style={styles.menuBtnContent}>
            <img src="/icons/ranking1.png" alt="Ranking" style={styles.menuIcon} onError={(e) => e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/podium.png"} />
            <span>{t('home.ranking')}</span>
          </div>
        </Link>
        <Link href="/stats" style={styles.menuBtn}>
          <div style={styles.menuBtnContent}>
            <img src="/icons/graph1.png" alt="Stats" style={styles.menuIcon} onError={(e) => e.target.src = "https://img.icons8.com/ios-filled/50/ffffff/bar-chart.png"} />
            <span>{t('nav.stats')}</span>
          </div>
        </Link>
        <Link href="/achievements" style={styles.menuBtnWide}>
           <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
             <span>🏆 {t('settings.achievements')}</span>
           </div>
        </Link>
      </div>

      <p style={styles.quote}>
        "L'affaire est toute simple, tout le secret tient en deux mots : <b>constance et continuité</b>", FÉDOR DOSTOÏEVSKI (L’Adolescent, 1875)
      </p>
    </div>
  );
}

const styles = {
  container: { maxWidth: "700px", margin: "0 auto", padding: "5px 20px", textAlign: "center" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", fontSize: "1.2rem", color: "#94a3b8" },
  loginCard: { marginTop: "100px", background: "rgba(30, 41, 59, 0.4)", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)" },
  header: { marginBottom: "15px" },
  title: { fontSize: "1.8rem", fontWeight: "800", color: "#fff" },
  subtitle: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "5px" },
  progLabel: { color: "#94a3b8", fontSize: "0.9rem", fontWeight: "600" },
  periodBadge: { padding: "4px 10px", background: "#2196F3", borderRadius: "8px", fontSize: "0.65rem", fontWeight: "900", color: "#fff" },
  advancementWrapper: { maxWidth: "300px", margin: "15px auto 0 auto" },
  advancementBar: { height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" },
  advancementFill: { height: "100%", background: "#2196F3", transition: "width 0.5s ease-out" },
  advancementText: { fontSize: "0.7rem", color: "#64748b", marginTop: "5px", fontWeight: "600" },
  dashboardSection: { background: "rgba(30, 41, 59, 0.3)", borderRadius: "24px", padding: "10px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "20px" },
  progressGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    maxWidth: "240px",
    marginLeft: "auto",
    marginRight: "auto",
    marginTop: "10px",
    marginBottom: "10px"
  },
  menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" },
  menuBtn: { textDecoration: "none", background: "#1e293b", padding: "18px", borderRadius: "16px", color: "#fff", fontWeight: "bold", fontSize: "1rem", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s" },
  menuBtnWide: { gridColumn: "span 2", textDecoration: "none", background: "linear-gradient(135deg, #3b82f6, #2563eb)", padding: "15px", borderRadius: "16px", color: "#fff", fontWeight: "bold", fontSize: "1rem", border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.2s", boxShadow: "0 4px 15px rgba(37, 99, 235, 0.3)" },
  menuBtnContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  menuIcon: { width: "24px", height: "24px", objectFit: "contain", filter: "brightness(0) invert(1)" },
  starsRow: { display: "flex", justifyContent: "center", gap: "5px", margin: "10px 0" },
  targetSwitcher: { margin: "10px 0" },
  targetSelect: { 
    background: "rgba(30, 41, 59, 0.5)", 
    color: "#fff", 
    border: "1px solid rgba(255,255,255,0.1)", 
    padding: "5px 15px", 
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer"
  },
  historySection: { marginBottom: "20px", background: "rgba(30, 41, 59, 0.2)", padding: "12px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.03)" },
  historyLabel: { fontSize: "0.7rem", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px" },
  historyDots: { display: "flex", justifyContent: "center", gap: "8px" },
  settingsBtn: {
    textDecoration: "none",
    background: "rgba(255,255,255,0.05)",
    padding: "12px 24px",
    borderRadius: "12px",
    color: "#94a3b8",
    fontSize: "0.9rem",
    display: "inline-block",
    border: "1px solid rgba(255,255,255,0.1)",
    transition: "all 0.2s"
  },
  startBtn: { textDecoration: "none", background: "#3b82f6", padding: "12px 24px", borderRadius: "12px", color: "white", fontWeight: "bold", display: "inline-block", marginTop: "20px" },
  quote: { fontStyle: "italic", fontSize: "0.9rem", color: "#64748b", maxWidth: "400px", margin: "0 auto" }
};
