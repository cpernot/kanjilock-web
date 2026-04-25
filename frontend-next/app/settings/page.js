"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSettings, saveSettings, fetchRemoteSettings, saveRemoteSettings } from "@/lib/settings";
import { useRouter } from "next/navigation";

import ToggleSwitch from "@/components/ToggleSwitch";

export default function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [player, setPlayer] = useState("");
    const router = useRouter();

    useEffect(() => {
        const p = localStorage.getItem("kanjilock_player");
        if (p) {
            setPlayer(p);
            fetchRemoteSettings(p).then(data => {
                if (data) setSettings(data);
            });
        } else {
            setSettings(getSettings());
        }
    }, []);

    async function handleSaveAndClose() {
        await saveRemoteSettings(player, settings);
        router.push("/");
    }

    function handleDiscardAndClose() {
        router.push("/");
    }

    if (!settings) return <div style={styles.loading}>Loading...</div>;

    return (
        <div style={styles.container}>


            <h1 style={styles.title}>⚙️ Settings</h1>

            <div style={styles.card}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Player Name</label>
                    <input
                        type="text"
                        value={player}
                        onChange={e => setPlayer(e.target.value)}
                        style={styles.input}
                        placeholder="Enter player name"
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Session Size</label>
                    <input
                        type="number"
                        value={settings.sessionSize}
                        onChange={e => setSettings({ ...settings, sessionSize: parseInt(e.target.value) })}
                        style={styles.input}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Max Time (ms)</label>
                    <input
                        type="number"
                        value={settings.maxTimeMs}
                        onChange={e => setSettings({ ...settings, maxTimeMs: parseInt(e.target.value) })}
                        style={styles.input}
                    />
                </div>

                <div style={styles.toggleGroup}>
                    <div style={styles.toggleItem}>
                        <span style={styles.toggleDesc}>Auto Dismiss Answer</span>
                        <ToggleSwitch
                            checked={settings.autoDismissAnswer}
                            onChange={val => setSettings({ ...settings, autoDismissAnswer: val })}
                        />
                    </div>

                    <div style={styles.toggleItem}>
                        <span style={styles.toggleDesc}>Progressive Mode</span>
                        <ToggleSwitch
                            checked={settings.progressiveMode}
                            onChange={val => setSettings({ ...settings, progressiveMode: val })}
                        />
                    </div>

                    <div style={styles.toggleItem}>
                        <span style={styles.toggleDesc}>Enable Sounds</span>
                        <ToggleSwitch
                            checked={settings.soundEnabled}
                            onChange={val => setSettings({ ...settings, soundEnabled: val })}
                        />
                    </div>
                    
                    <div style={styles.toggleItem}>
                        <span style={styles.toggleDesc}>Show Progress Bar</span>
                        <ToggleSwitch
                            checked={settings.showProgressBar}
                            onChange={val => setSettings({ ...settings, showProgressBar: val })}
                        />
                    </div>

                    <div style={styles.toggleItem}>
                        <span style={styles.toggleDesc}>Sequential Order (No Random)</span>
                        <ToggleSwitch
                            checked={settings.sequentialOrder}
                            onChange={val => setSettings({ ...settings, sequentialOrder: val })}
                        />
                    </div>
                </div>

                <button onClick={handleSaveAndClose} style={styles.btn}>Save & Close</button>

                <div style={{ marginTop: "40px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "20px" }}>
                    <button 
                        onClick={handleDiscardAndClose} 
                        style={styles.discardBtn}
                    >
                        ✖ Discard & Close
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    discardBtn: {
        width: "100%",
        padding: "12px",
        background: "rgba(148, 163, 184, 0.1)",
        color: "#94a3b8",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: "12px",
        fontSize: "0.9rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s"
    },
    container: {
        maxWidth: "500px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "'Inter', sans-serif"
    },
    loading: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontSize: "1.2rem",
        color: "#94a3b8"
    },
    nav: { marginBottom: "30px" },
    backLink: {
        color: "#94a3b8",
        fontSize: "0.9rem",
        transition: "color 0.2s"
    },
    title: {
        fontSize: "2rem",
        marginBottom: "30px",
        textAlign: "center",
        fontWeight: "700",
        background: "linear-gradient(to right, #fff, #94a3b8)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
    },
    card: {
        background: "rgba(30, 41, 59, 0.5)",
        backdropFilter: "blur(10px)",
        padding: "30px",
        borderRadius: "20px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
    },
    formGroup: { marginBottom: "24px" },
    label: {
        display: "block",
        marginBottom: "8px",
        fontSize: "0.9rem",
        color: "#94a3b8",
        fontWeight: "500"
    },
    input: {
        width: "100%",
        padding: "12px 16px",
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: "12px",
        color: "white",
        fontSize: "1rem",
        outline: "none",
        transition: "border-color 0.2s"
    },
    toggleGroup: {
        marginTop: "30px",
        marginBottom: "30px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    },
    toggleItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)"
    },
    toggleDesc: {
        fontSize: "1rem",
        color: "#e2e8f0"
    },
    btn: {
        width: "100%",
        padding: "14px",
        background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
        color: "white",
        border: "none",
        borderRadius: "12px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
    }
};

