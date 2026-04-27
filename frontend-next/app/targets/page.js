"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSettings, fetchRemoteSettings, saveRemoteSettings } from "@/lib/settings";
import { fetchStatsCounts, updateBaselines } from "@/lib/targets";

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


            <h1 style={styles.title}>🎯 Set Learning Targets</h1>

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
                    <button onClick={setBaselines} style={{ ...styles.btn, flex: 1, background: "#475569" }}>Reset Period</button>
                    <button onClick={() => router.back()} style={{ ...styles.btn, flex: 1, background: "#ef4444" }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "600px", margin: "0 auto", padding: "5px 20px" },
    loading: { textAlign: "center", padding: "100px", color: "#94a3b8" },
    nav: { marginBottom: "20px" },
    backLink: { color: "#94a3b8", textDecoration: "none" },
    title: { fontSize: "2rem", fontWeight: "800", color: "#fff", marginBottom: "15px", textAlign: "center" },
    card: { background: "rgba(30, 41, 59, 0.4)", padding: "10px", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)" },
    section: { marginBottom: "15px" },
    label: { display: "block", color: "#94a3b8", fontSize: "0.9rem", marginBottom: "12px", fontWeight: "600" },
    toggleRow: { display: "flex", gap: "10px" },
    toggleBtn: { flex: 1, padding: "12px", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", transition: "all 0.2s" },
    select: { width: "100%", padding: "12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#fff" },
    grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", maxWidth: "400px", margin: "0 auto" },
    goalItem: { display: "flex", flexDirection: "column" },
    goalLabel: { fontSize: "0.7rem", color: "#94a3b8", marginBottom: "8px", textAlign: "center" },
    input: { width: "100%", boxSizing: "border-box", padding: "10px 8px", background: "#0f172a", border: "1px solid #334155", borderRadius: "12px", color: "#fff", textAlign: "center" },
    btn: { padding: "14px", border: "none", borderRadius: "12px", color: "white", fontWeight: "bold", background: "#2196F3", cursor: "pointer" }
};
