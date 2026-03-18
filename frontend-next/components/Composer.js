"use client";
import { useEffect, useState } from "react";
import { getComposeQuestionLocal, checkComposeAnswer } from "../lib/quizengine";
import { getPlayer_setting } from "../lib/settings";
import config from "../lib/config";

export default function Composer() {
    const [qData, setQData] = useState(null);
    const [selectedWords, setSelectedWords] = useState([]);
    const [result, setResult] = useState(null);
    const [appSettings, setAppSettings] = useState(null);

    useEffect(() => {
        const { getSettings } = require("../lib/settings");
        setAppSettings(getSettings());
        loadQuestion();
    }, []);

    function loadQuestion() {
        // initEngine must be called at app level, we assume it's loaded
        const data = getComposeQuestionLocal();
        if (!data) {
            // Handle no data or empty
            return;
        }
        setQData(data);
        setSelectedWords([]);
        setResult(null);
    }

    function toggleWord(word) {
        if (result) return; // locked if result shown

        if (selectedWords.includes(word)) {
            setSelectedWords(selectedWords.filter(w => w !== word));
        } else {
            setSelectedWords([...selectedWords, word]);
        }
    }

    function submit() {
        const res = checkComposeAnswer(qData, selectedWords);
        setResult(res);

        if (appSettings?.soundEnabled !== false) {
            if (res.success) {
                new Audio("/sounds/success.wav").play().catch(() => { });
            } else {
                new Audio("/sounds/BOMB.WAV").play().catch(() => { });
            }
        }
    }

    function next() {
        loadQuestion();
    }

    if (!qData) return <div>Loading Composition Data... (Ensure initEngine is run)</div>;

    return (
        <div style={styles.container}>
            <h2>Compose: {qData.signification}</h2>
            <div style={styles.kanjiContainer}>
                {/* Placeholder for the Kanji we are trying to guess? 
                     Actually in the original logic, we see the signification and must pick words 
                     that compose the Kanji description or similar. 
                     Wait, looking at original 'getComposeQuestionLocal':
                     q: signification
                     a: words from 'comp_words'
                  */}
                <div style={styles.bigKanji}>?</div>
            </div>

            <div style={styles.pool}>
                {qData.options.map((word, i) => {
                    const isSelected = selectedWords.includes(word);
                    return (
                        <button
                            key={i}
                            onClick={() => toggleWord(word)}
                            style={{
                                ...styles.chip,
                                background: isSelected ? "#2196F3" : "#e0e0e0",
                                color: isSelected ? "white" : "black"
                            }}
                        >
                            {word}
                        </button>
                    )
                })}
            </div>

            <div style={styles.actions}>
                {!result ? (
                    <button onClick={submit} style={styles.submitBtn}>Valider</button>
                ) : (
                    <button onClick={next} style={styles.nextBtn}>Suivant</button>
                )}
            </div>

            {result && (
                <div style={{
                    ...styles.resultBox,
                    backgroundColor: result.success ? "rgba(76, 175, 80, 0.95)" : "rgba(244, 67, 54, 0.95)"
                }}>
                    <h3>{result.success ? "✓ Correct" : "✗ Incorrect"}</h3>
                    <p style={{ fontSize: "2rem", margin: "10px 0", fontWeight: "bold" }}>{result.kanji}</p>
                    <p style={{ margin: "5px 0" }}>{result.correct.join(" + ")}</p>
                    
                    {result.extras && (
                        <div style={{ textAlign: "left", fontSize: "0.9rem", marginTop: "15px", width: "100%", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "10px" }}>
                            {Object.entries(result.extras).map(([key, value]) => {
                                if (!value || key === "boite") return null;
                                const labels = {
                                    signification: "Sens",
                                    romaji: "Romaji",
                                    mot: "Exemple",
                                    signification_mot: "Sens (Ex)",
                                    lecture_mot: "Lecture",
                                    kanji: "Kanji"
                                };
                                return (
                                    <div key={key} style={{ marginBottom: "4px" }}>
                                        <b style={{ color: "rgba(255,255,255,0.7)" }}>{labels[key] || key}</b>: {value}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { maxWidth: "600px", margin: "0 auto", padding: "20px", textAlign: "center" },
    bigKanji: { fontSize: "4rem", margin: "20px 0", color: "#ccc" },
    pool: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" },
    chip: { padding: "10px 15px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "1rem" },
    actions: { marginTop: "30px" },
    submitBtn: { padding: "10px 20px", fontSize: "1.2rem", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
    nextBtn: { padding: "10px 20px", fontSize: "1.2rem", background: "#2196F3", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" },
    resultBox: { marginTop: "20px", padding: "15px", borderRadius: "8px", color: "white" }
};
