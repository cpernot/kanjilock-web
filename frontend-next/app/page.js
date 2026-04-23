"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlayer_setting, getSettings, fetchRemoteSettings } from "@/lib/settings";
import { initEngine } from "@/lib/quizengine";
import { checkPeriodReset, calculateProgress, updateBaselines, fetchBoxCounts } from "@/lib/targets";
import CircularProgress from "@/components/CircularProgress";
import LoadingOverlay from "@/components/LoadingOverlay";
import config from "@/lib/config";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);
  const [progressData, setProgressData] = useState({});
  const [targetType, setTargetType] = useState("kanji");
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
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
      let settings = await fetchRemoteSettings(p);
      if (!settings) settings = getSettings(p);

      const type = settings.targets?.type || "kanji";
      const freq = settings.targets?.period || "week";
      setTargetType(type);
      setPeriod(freq);

      // 3. Fetch Current Counts
      let currentCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
      if (type === "kanji") {
        const res = await fetch(`${config.apiBaseUrl}/stats?player=${encodeURIComponent(p)}`);
        if (res.ok) {
          const stats = await res.json();
          // Assuming stats returns { 1: count, 2: count, ... }
          currentCounts = stats;
        }
      } else {
        currentCounts = await fetchBoxCounts(p);
      }

      // 4. Check Period Reset
      if (checkPeriodReset(settings)) {
        await updateBaselines(p, currentCounts);
        // Re-fetch settings after baseline update
        settings = await fetchRemoteSettings(p);
      }

      // 5. Calculate Progress
      const prog = calculateProgress(settings, currentCounts);
      setProgressData(prog);

    } catch (e) {
      console.error("Home load error", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingOverlay message="Initializing Dashboard..." />;

  if (!player) {
    return (
      <div style={styles.loginCard}>
        <h1>🔒 KanjiLock</h1>
        <p>Please log in to track your mastery journey.</p>
        <Link href="/login" style={styles.startBtn}>Login to Continue</Link>
      </div>
    )
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
        <h1 style={styles.title}>Welcome, {player}</h1>
        <div style={styles.subtitle}>
          <span style={styles.periodBadge}>{period.toUpperCase()}</span>
          <span style={styles.progLabel}>Your {targetType === "kanji" ? "Kanji" : "Box"} Progression</span>
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
              size={80}
            />
          ))}
        </div>
      </div>

      <div style={styles.menuGrid}>
        <Link href="/quiz" style={{ ...styles.menuBtn, background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}>
          Quiz
        </Link>
        <Link href="/targets" style={styles.menuBtn}>
          Targets
        </Link>
        <Link href="/ranking" style={styles.menuBtn}>
          Ranking
        </Link>
        <Link href="/stats" style={styles.menuBtn}>
          Stats
        </Link>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <Link href="/settings" style={styles.settingsBtn}>
          ⚙️ Settings
        </Link>
      </div>

      <p style={styles.quote}>
        "L'affaire est toute simple, tout le secret tient en deux mots : <b>constance et continuité</b>"
      </p>
    </div>
  );
}

const styles = {
  container: { maxWidth: "700px", margin: "0 auto", padding: "40px 20px", textAlign: "center" },
  loading: { display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", fontSize: "1.2rem", color: "#94a3b8" },
  loginCard: { marginTop: "100px", background: "rgba(30, 41, 59, 0.4)", padding: "40px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)" },
  header: { marginBottom: "40px" },
  title: { fontSize: "1.8rem", fontWeight: "800", color: "#fff" },
  subtitle: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginTop: "10px" },
  progLabel: { color: "#94a3b8", fontSize: "0.9rem", fontWeight: "600" },
  periodBadge: { padding: "4px 10px", background: "#2196F3", borderRadius: "8px", fontSize: "0.65rem", fontWeight: "900", color: "#fff" },
  dashboardSection: { background: "rgba(30, 41, 59, 0.3)", borderRadius: "24px", padding: "20px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "30px" },
  progressGrid: {
    display: "flex",
    justifyContent: "space-between",
    gap: "5px",
    maxWidth: "500px",
    margin: "0 auto"
  },
  menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" },
  menuBtn: { textDecoration: "none", background: "#1e293b", padding: "18px", borderRadius: "16px", color: "#fff", fontWeight: "bold", fontSize: "1rem", border: "1px solid rgba(255,255,255,0.05)", transition: "all 0.2s" },
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
