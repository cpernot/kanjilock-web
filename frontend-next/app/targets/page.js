"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSettings, fetchRemoteSettings, saveRemoteSettings } from "@/lib/settings";
import { fetchStatsCounts, updateBaselines } from "@/lib/targets";
import { invalidateDashboardCache } from "@/lib/dashboardCache";

export default function TargetsPage() {
    const router = useRouter();
    const [settings, setSettings] = useState(null);
    const [fullStats, setFullStats] = useState({ boxes: { 1: 0, 2: 0, 3: 0, 4: 0 }, kanji: { 1: 0, 2: 0, 3: 0, 4: 0 } });
    const [player, setPlayer] = useState("");

    useEffect(() => {
        const p = localStorage.getItem("kanjilock_player");
        if (p) {
            setPlayer(p);
            fetchRemoteSettings(p).then(data => {
                if (data) setSettings(data);
            });
            fetchStatsCounts(p).then(setFullStats);
        }
    }, []);

    async function save() {
        if (!settings) return;
        await saveRemoteSettings(player, settings);
        invalidateDashboardCache();
        router.back();
    }

    async function setBaselines() {
        if (!confirm("This will reset your current progress to 0 for the new period. Continue?")) return;
        await updateBaselines(player, fullStats);
        const data = await fetchRemoteSettings(player);
        setSettings(data);
        alert("Baselines updated!");
    }

    if (!settings || !settings.targets) return <div style={styles.loading}>Loading...</div>;

    const tType = settings.targets.type || "kanji";

    return (
        <div style={styles.container}>


            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "30px" }}>
                <img src="/icons/target2.png" alt="Target" style={{ width: "40px", height: "40px" }} />
                <h1 style={{ ...styles.title, margin: 0 }}>Set Learning Targets</h1>
            </div>
            <div style={styles.card}>
                <div style={styles.section}>
                    <label style={styles.label}>Target Type</label>
                    <div style={styles.toggleRow}>
                        <button
                            onClick={() => {
                                const newLevels = {};
                                Object.keys(settings.targets.levels).forEach(lvl => {
                                    newLevels[lvl] = settings.targets.levels[lvl] * 10;
                                });
                                setSettings({ ...settings, targets: { ...settings.targets, type: "kanji", levels: newLevels } });
                            }}
                            style={{ ...styles.toggleBtn, background: tType === "kanji" ? "#2196F3" : "#1e293b", opacity: tType === "kanji" ? 1 : 0.6 }}
                        >
                            Kanjis Learned
                        </button>
                        <button
                            onClick={() => {
                                const newLevels = {};
                                Object.keys(settings.targets.levels).forEach(lvl => {
                                    newLevels[lvl] = Math.max(1, Math.floor(settings.targets.levels[lvl] / 10));
                                });
                                setSettings({ ...settings, targets: { ...settings.targets, type: "box", levels: newLevels } });
                            }}
                            style={{ ...styles.toggleBtn, background: tType === "box" ? "#2196F3" : "#1e293b", opacity: tType === "box" ? 1 : 0.6 }}
                        >
                            Boxes Mastered
                        </button>
                    </div>
                </div>

                <div style={styles.section}>
                    <label style={styles.label}>Frequency</label>
                    <select
                        value={settings.targets.period}
                        onChange={e => setSettings({ ...settings, targets: { ...settings.targets, period: e.target.value } })}
                        style={styles.select}
                    >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                    </select>
                </div>

                <div style={styles.grid}>
                    {[1, 2, 3, 4].map(lvl => (
                        <div key={lvl} style={styles.goalItem}>
                            <label style={styles.goalLabel}>Level {lvl}</label>
                            <input
                                type="number"
                                value={settings.targets.levels[lvl]}
                                onChange={e => {
                                    const nextLevels = { ...settings.targets.levels, [lvl]: parseInt(e.target.value) };
                                    setSettings({ ...settings, targets: { ...settings.targets, levels: nextLevels } });
                                }}
                                style={styles.input}
                            />
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
                    <button onClick={save} style={{ ...styles.btn, flex: 2 }}>Save & Close</button>
                    <button onClick={setBaselines} style={{ ...styles.btn, flex: 1, background: "var(--accent-gray)" }}>Reset Period</button>
                    <button onClick={() => router.back()} style={{ ...styles.btn, flex: 1, background: "var(--accent-red)" }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "600px", margin: "0 auto", padding: "5px 20px" },
    loading: { textAlign: "center", padding: "100px", color: "var(--text-secondary)" },
    nav: { marginBottom: "20px" },
    backLink: { color: "var(--text-secondary)", textDecoration: "none" },
    title: { fontSize: "2rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "15px", textAlign: "center" },
    card: { background: "var(--bg-card)", padding: "10px", borderRadius: "24px", border: "1px solid var(--border-color)" },
    section: { marginBottom: "15px" },
    label: { display: "block", color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "12px", fontWeight: "600" },
    toggleRow: { display: "flex", gap: "10px" },
    toggleBtn: { flex: 1, padding: "12px", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", transition: "all 0.2s" },
    select: { width: "100%", padding: "12px", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: "12px", color: "var(--text-primary)" },
    grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", maxWidth: "400px", margin: "0 auto" },
    goalItem: { display: "flex", flexDirection: "column" },
    goalLabel: { fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "8px", textAlign: "center" },
    input: { width: "100%", boxSizing: "border-box", padding: "10px 8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: "12px", color: "var(--text-primary)", textAlign: "center" },
    btn: { padding: "14px", border: "none", borderRadius: "12px", color: "white", fontWeight: "bold", background: "var(--accent-blue)", cursor: "pointer" }
};
