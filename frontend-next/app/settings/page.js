"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSettings, saveSettings } from "@/lib/settings";

export default function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [player, setPlayer] = useState("");

    useEffect(() => {
        setSettings(getSettings());
        const p = localStorage.getItem("kanjilock_player");
        if (p) setPlayer(p);
    }, []);

    function handleSave() {
        saveSettings(settings);
        localStorage.setItem("kanjilock_player", player);
        alert("Settings saved!");
    }

    if (!settings) return <div>Loading...</div>;

    return (
        <div style={styles.container}>
            <div style={{ marginBottom: "10px", textAlign: "left" }}>
                <Link href="/">← Back to Home</Link>
            </div>
            <h1>⚙️ Settings</h1>

            <div style={styles.formGroup}>
                <label>Player Name:</label>
                <input
                    type="text"
                    value={player}
                    onChange={e => setPlayer(e.target.value)}
                    style={styles.input}
                />
            </div>

            <div style={styles.formGroup}>
                <label>Session Size:</label>
                <input
                    type="number"
                    value={settings.sessionSize}
                    onChange={e => setSettings({ ...settings, sessionSize: parseInt(e.target.value) })}
                    style={styles.input}
                />
            </div>

            <div style={styles.formGroup}>
                <label>Max Time (ms):</label>
                <input
                    type="number"
                    value={settings.maxTimeMs}
                    onChange={e => setSettings({ ...settings, maxTimeMs: parseInt(e.target.value) })}
                    style={styles.input}
                />
            </div>

            <button onClick={handleSave} style={styles.btn}>Save</button>
        </div>
    );
}

const styles = {
    container: { maxWidth: "600px", margin: "0 auto", padding: "20px", textAlign: "center" },
    formGroup: { marginBottom: "20px", textAlign: "left" },
    input: { width: "100%", padding: "10px", marginTop: "5px" },
    btn: { padding: "10px 20px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer" }
};
