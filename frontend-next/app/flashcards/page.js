"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { initEngine, getStaticData, getBoxProgress, getUserProgress, currentBoxFilter } from "@/lib/quizengine";
import { getPlayer_setting } from "@/lib/settings";
import { loadFlashcardProgress, saveFlashcardEvaluation, prepareDeck } from "@/lib/flashcards";
import Flashcard from "@/components/Flashcard";

export default function FlashcardsPage() {
    const [deck, setDeck] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        selectedLevels: [1, 2, 3], // Default: show Unknown, Review, Almost OK
        boxId: "all",
        srsLevel: "all"
    });
    const [availableBoxes, setAvailableBoxes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        setup();
    }, []);

    async function setup() {
        const player = getPlayer_setting();
        if (!player) return;

        await initEngine(player);
        
        const data = getStaticData();
        const boxes = Array.from(new Set(Object.values(data).map(k => String(k.boite)))).sort();
        setAvailableBoxes(boxes);
        
        refreshDeck();
    }

    function refreshDeck() {
        setLoading(true);
        const player = getPlayer_setting();
        const allKanjis = getStaticData();
        const srsProgress = getUserProgress();
        const boxProgress = getBoxProgress();
        const flashProgress = loadFlashcardProgress();

        const newDeck = prepareDeck(allKanjis, {
            ...filters,
            progress: flashProgress
        }, srsProgress, boxProgress);

        setDeck(newDeck);
        setCurrentIndex(0);
        setLoading(false);
    }

    const handleEvaluate = (level) => {
        const currentCard = deck[currentIndex];
        if (!currentCard) return;

        // 1. Save evaluation
        saveFlashcardEvaluation(currentCard.kanji, level);

        // 2. Update local deck state visually (optional, just for color)
        const updatedDeck = [...deck];
        updatedDeck[currentIndex].level = level;
        setDeck(updatedDeck);

        // 3. Move to next card after a short delay
        setTimeout(() => {
            if (currentIndex < deck.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                // End of deck, maybe reshuffle?
                alert("End of deck! Reshuffling...");
                refreshDeck();
            }
        }, 500);
    };

    const toggleLevel = (lvl) => {
        const newLevels = filters.selectedLevels.includes(lvl)
            ? filters.selectedLevels.filter(l => l !== lvl)
            : [...filters.selectedLevels, lvl];
        setFilters({ ...filters, selectedLevels: newLevels });
    };

    if (loading) return (
        <div style={styles.container}>
            <div style={styles.loader}>Shuffling Cards...</div>
        </div>
    );

    const currentCard = deck[currentIndex];

    return (
        <div style={styles.container}>
            <div style={styles.navBar}>
                <div />
                <button onClick={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
                    {showFilters ? "Close Filters" : "Filters ⚙️"}
                </button>
            </div>

            {showFilters && (
                <div style={styles.filterPanel}>
                    <div style={styles.filterGroup}>
                        <div style={styles.filterTitle}>Flashcard Levels</div>
                        <div style={styles.checkboxRow}>
                            {[1, 2, 3, 4].map(lvl => (
                                <label key={lvl} style={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        checked={filters.selectedLevels.includes(lvl)}
                                        onChange={() => toggleLevel(lvl)}
                                    />
                                    Level {lvl}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={styles.filterGrid}>
                        <div style={styles.filterGroup}>
                            <div style={styles.filterTitle}>Box Filter</div>
                            <select 
                                value={filters.boxId} 
                                onChange={(e) => setFilters({...filters, boxId: e.target.value})}
                                style={styles.select}
                            >
                                <option value="all">All Boxes</option>
                                {availableBoxes.map(b => <option key={b} value={b}>Box {b}</option>)}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <div style={styles.filterTitle}>SRS Filter</div>
                            <select 
                                value={filters.srsLevel} 
                                onChange={(e) => setFilters({...filters, srsLevel: e.target.value})}
                                style={styles.select}
                            >
                                <option value="all">Any SRS Status</option>
                                <option value="0">New / Unseen</option>
                                <option value="1">Apprentice</option>
                                <option value="2">Guru</option>
                                <option value="3">Master</option>
                                <option value="4">Enlightened</option>
                            </select>
                        </div>
                    </div>

                    <button onClick={() => { refreshDeck(); setShowFilters(false); }} style={styles.applyBtn}>
                        Apply & Start Session
                    </button>
                </div>
            )}



            <div style={styles.cardArea}>
                {currentCard ? (
                    <Flashcard 
                        key={`${currentCard.kanji}-${currentIndex}`} // Key forces unmount/reset flip state
                        card={currentCard} 
                        onEvaluate={handleEvaluate} 
                    />
                ) : (
                    <div style={styles.emptyMsg}>
                        <h3>No cards match your filters!</h3>
                        <p>Try selecting more levels or a different box.</p>
                        <button onClick={() => setShowFilters(true)} style={styles.applyBtn}>Adjust Filters</button>
                    </div>
                )}
            </div>

            {currentCard && (
                <div style={styles.manualNav}>
                    <button 
                        onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} 
                        disabled={currentIndex === 0}
                        style={styles.navBtn}
                    >
                        Previous
                    </button>
                    <button 
                        onClick={() => setCurrentIndex(Math.min(deck.length - 1, currentIndex + 1))} 
                        disabled={currentIndex === deck.length - 1}
                        style={styles.navBtn}
                    >
                        Next
                    </button>
                </div>
            )}

            <div style={styles.progressHeader}>
                Card {currentIndex + 1} of {deck.length}
                <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${((currentIndex + 1) / deck.length) * 100}%` }} />
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        background: "#020617",
        color: "#fff",
        padding: "5px 20px",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    navBar: {
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px"
    },
    backLink: { color: "#3b82f6", textDecoration: "none", fontWeight: "600" },
    filterBtn: { 
        background: "rgba(255,255,255,0.05)", 
        border: "1px solid rgba(255,255,255,0.1)", 
        color: "#fff", 
        padding: "8px 16px", 
        borderRadius: "12px",
        cursor: "pointer"
    },
    filterPanel: {
        width: "100%",
        maxWidth: "600px",
        background: "rgba(30, 41, 59, 0.8)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        padding: "20px",
        marginBottom: "15px",
        border: "1px solid rgba(255,255,255,0.1)",
        boxSizing: "border-box"
    },
    filterGroup: { marginBottom: "20px" },
    filterTitle: { fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" },
    checkboxRow: { display: "flex", flexWrap: "wrap", gap: "15px" },
    checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", cursor: "pointer" },
    filterGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
    select: { 
        width: "100%", 
        background: "#0f172a", 
        color: "#fff", 
        border: "1px solid rgba(255,255,255,0.1)", 
        padding: "10px", 
        borderRadius: "10px" 
    },
    applyBtn: { 
        width: "100%", 
        padding: "12px", 
        background: "linear-gradient(135deg, #3b82f6, #2563eb)", 
        border: "none", 
        color: "#fff", 
        fontWeight: "bold", 
        borderRadius: "12px", 
        cursor: "pointer",
        marginTop: "10px"
    },
    progressHeader: {
        width: "100%",
        maxWidth: "320px",
        marginBottom: "20px",
        fontSize: "0.85rem",
        color: "#94a3b8",
        textAlign: "center"
    },
    progressBar: {
        width: "100%",
        height: "6px",
        background: "rgba(255,255,255,0.05)",
        borderRadius: "10px",
        marginTop: "8px",
        overflow: "hidden"
    },
    progressFill: {
        height: "100%",
        background: "#3b82f6",
        transition: "width 0.3s ease"
    },
    cardArea: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        minHeight: "400px",
        paddingTop: "0px"
    },
    manualNav: {
        display: "flex",
        gap: "20px",
        marginTop: "20px",
        marginBottom: "10px"
    },
    navBtn: {
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#94a3b8",
        padding: "8px 20px",
        borderRadius: "10px",
        cursor: "pointer",
        transition: "all 0.2s"
    },
    loader: { fontSize: "1.2rem", marginTop: "100px", color: "#64748b" },
    emptyMsg: { textAlign: "center", color: "#94a3b8" }
};
