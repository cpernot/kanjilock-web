"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchRemoteSettings, saveRemoteSettings } from "@/lib/settings";
import { fetchStatsCounts, updateBaselines } from "@/lib/targets";
import { invalidateDashboardCache } from "@/lib/dashboardCache";
import { useLanguage } from "@/lib/LanguageContext";

export default function TargetsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [settings, setSettings] = useState(null);
    const [fullStats, setFullStats] = useState({ boxes: { 1: 0, 2: 0, 3: 0, 4: 0 }, kanji: { 1: 0, 2: 0, 3: 0, 4: 0 } });
    const [player, setPlayer] = useState("");
    const [selectedId, setSelectedId] = useState("main");

    useEffect(() => {
        const p = localStorage.getItem("kanjilock_player");
        if (p) {
            setPlayer(p);
            fetchRemoteSettings(p).then(data => {
                if (data) {
                    setSettings(data);
                    if (data.targets?.activeId) setSelectedId(data.targets.activeId);
                }
            });
            fetchStatsCounts(p).then(setFullStats);
        }
    }, []);

    async function save() {
        if (!settings) return;
        // Automatically reset baselines when saving new targets as per request
        await updateBaselines(player, fullStats, selectedId, settings);
        invalidateDashboardCache();
        router.push("/");
    }

    function removeTarget(id) {
        if (id === "main") return; // Prevent deleting main target
        if (!window.confirm(t('targets.confirmDelete') || "Delete this target?")) return;
        
        const newSettings = { ...settings };
        delete newSettings.targets.definitions[id];
        
        // If we deleted the active target, switch back to main
        if (selectedId === id) setSelectedId("main");
        
        setSettings(newSettings);
    }

    function addSubTarget() {
        const id = `sub_${Object.keys(settings.targets.definitions).length}`;
        const newTarget = {
            id: id,
            period: "day",
            type: "kanji",
            levels: { 1: 2, 2: 1, 3: 0, 4: 0 },
            lastBaselineUpdate: null,
            baselines: { ...fullStats.boxes },
            kanji_baselines: { ...fullStats.kanji }
        };
        const newSettings = { ...settings };
        newSettings.targets.definitions[id] = newTarget;
        setSettings(newSettings);
        setSelectedId(id);
    }

    if (!settings || !settings.targets || !settings.targets.definitions) return <div style={styles.loading}>{t('common.loading')}</div>;

    const currentTarget = settings.targets.definitions[selectedId];
    if (!currentTarget) return <div style={styles.loading}>Target Not Found</div>;
    const tType = currentTarget.type || "kanji";

    return (
        <div style={styles.container}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <h1 style={{ ...styles.title, margin: 0 }}>{t('targets.title')}</h1>
            </div>

            {/* Target Selector */}
            <div style={styles.targetRow}>
                {Object.keys(settings.targets.definitions).map(id => (
                    <div key={id} style={{ position: "relative" }}>
                        <button 
                            onClick={() => setSelectedId(id)}
                            style={{
                                ...styles.idBtn,
                                background: selectedId === id ? "#2196F3" : "rgba(255,255,255,0.05)",
                                color: selectedId === id ? "#fff" : "#94a3b8",
                                paddingRight: id !== "main" ? "30px" : "15px"
                            }}
                        >
                            {id === "main" ? (t('targets.mainTarget') || "Main Goal") : id.toUpperCase().replace("_", " ")}
                        </button>
                        
                        {id !== "main" && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeTarget(id); }}
                                style={styles.deleteBtn}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
                <button onClick={addSubTarget} style={styles.addBtn}>+ {t('common.add') || "Add"}</button>
            </div>

            <div style={styles.card}>
                <div style={styles.section}>
                    <label style={styles.label}>{t('targets.type')}</label>
                    <div style={styles.toggleRow}>
                        <button
                            onClick={() => {
                                const next = { ...currentTarget, type: "kanji" };
                                const newSettings = { ...settings };
                                newSettings.targets.definitions[selectedId] = next;
                                setSettings(newSettings);
                            }}
                            style={{ ...styles.toggleBtn, background: tType === "kanji" ? "#2196F3" : "#1e293b", opacity: tType === "kanji" ? 1 : 0.6 }}
                        >
                            {t('targets.kanjiLearned')}
                        </button>
                        <button
                            onClick={() => {
                                const next = { ...currentTarget, type: "box", levels: { 1: 1, 2: 1, 3: 0, 4: 0 } };
                                const newSettings = { ...settings };
                                newSettings.targets.definitions[selectedId] = next;
                                setSettings(newSettings);
                            }}
                            style={{ ...styles.toggleBtn, background: tType === "box" ? "#2196F3" : "#1e293b", opacity: tType === "box" ? 1 : 0.6 }}
                        >
                            {t('targets.boxesMastered')}
                        </button>
                    </div>
                </div>

                <div style={styles.section}>
                    <label style={styles.label}>{t('targets.frequency')}</label>
                    <select
                        value={currentTarget.period}
                        onChange={e => {
                            const next = { ...currentTarget, period: e.target.value };
                            const newSettings = { ...settings };
                            newSettings.targets.definitions[selectedId] = next;
                            setSettings(newSettings);
                        }}
                        style={styles.select}
                    >
                        <option value="day">{t('targets.daily')}</option>
                        <option value="week">{t('targets.weekly')}</option>
                        <option value="month">{t('targets.monthly')}</option>
                    </select>
                </div>

                <div style={styles.grid}>
                    {[1, 2, 3, 4].map(lvl => (
                        <div key={lvl} style={styles.goalItem}>
                            <label style={styles.goalLabel}>{t('targets.level')} {lvl}</label>
                            <input
                                type="number"
                                value={currentTarget.levels[lvl]}
                                onChange={e => {
                                    const nextLevels = { ...currentTarget.levels, [lvl]: parseInt(e.target.value) || 0 };
                                    const next = { ...currentTarget, levels: nextLevels };
                                    const newSettings = { ...settings };
                                    newSettings.targets.definitions[selectedId] = next;
                                    setSettings(newSettings);
                                }}
                                style={styles.input}
                            />
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: "30px", display: "flex", gap: "10px" }}>
                    <button onClick={save} style={{ ...styles.btn, flex: 2 }}>{t('targets.saveClose')}</button>
                    <button onClick={() => router.push("/")} style={{ ...styles.btn, flex: 1, background: "var(--accent-red)" }}>{t('common.cancel')}</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { maxWidth: "600px", margin: "0 auto", padding: "20px" },
    loading: { textAlign: "center", padding: "100px", color: "var(--text-secondary)" },
    title: { fontSize: "1.8rem", fontWeight: "800", color: "var(--text-primary)" },
    targetRow: { display: "flex", gap: "10px", marginBottom: "15px", overflowX: "auto", paddingBottom: "5px" },
    idBtn: { padding: "8px 15px", border: "none", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" },
    addBtn: { padding: "8px 15px", border: "1px dashed rgba(255,255,255,0.2)", background: "transparent", color: "#94a3b8", borderRadius: "10px", fontSize: "0.8rem", cursor: "pointer" },
    card: { background: "var(--bg-card)", padding: "20px", borderRadius: "24px", border: "1px solid var(--border-color)" },
    section: { marginBottom: "20px" },
    label: { display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "10px", fontWeight: "600" },
    toggleRow: { display: "flex", gap: "10px" },
    toggleBtn: { flex: 1, padding: "12px", border: "none", borderRadius: "12px", color: "white", cursor: "pointer", transition: "all 0.2s" },
    select: { width: "100%", padding: "12px", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: "12px", color: "var(--text-primary)", outline: "none" },
    grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" },
    goalItem: { display: "flex", flexDirection: "column" },
    goalLabel: { fontSize: "0.7rem", color: "var(--text-secondary)", marginBottom: "8px", textAlign: "center" },
    input: { width: "100%", boxSizing: "border-box", padding: "12px 8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: "12px", color: "var(--text-primary)", textAlign: "center", outline: "none" },
    btn: { padding: "14px", border: "none", borderRadius: "12px", color: "white", fontWeight: "bold", background: "var(--accent-blue)", cursor: "pointer" },
    deleteBtn: {
        position: "absolute",
        top: "50%",
        right: "8px",
        transform: "translateY(-50%)",
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        background: "rgba(239, 68, 68, 0.2)",
        color: "#ef4444",
        border: "none",
        fontSize: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s"
    }
};
