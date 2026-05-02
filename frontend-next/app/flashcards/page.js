"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { initEngine, getStaticData, getBoxProgress, getUserProgress, currentBoxFilter, getAvailableBoxes, isInitialized } from "@/lib/quizengine";
import { getPlayer_setting, getSettings } from "@/lib/settings";
import { loadFlashcardProgress, saveFlashcardEvaluation, prepareDeck } from "@/lib/flashcards";
import Flashcard from "@/components/Flashcard";
import { useLanguage } from "@/lib/LanguageContext";

export default function FlashcardsPage() {
    const { t } = useLanguage();
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
    const [appSettings, setAppSettings] = useState(null);

    useEffect(() => {
        setup();
    }, []);

    async function setup() {
        const player = getPlayer_setting();
        if (!player) return;

        await initEngine(player);
        
        const boxes = getAvailableBoxes();
        setAvailableBoxes(boxes);

        const settings = getSettings(player);
        setAppSettings(settings);
        
        refreshDeck(settings);
    }

    function refreshDeck(settingsOverride = null) {
        setLoading(true);
        const player = getPlayer_setting();
        const allKanjis = getStaticData();
        const srsProgress = getUserProgress();
        const boxProgress = getBoxProgress();
        const flashProgress = loadFlashcardProgress();
        const settings = settingsOverride || appSettings;

        const newDeck = prepareDeck(allKanjis, {
            ...filters,
            progress: flashProgress
        }, srsProgress, boxProgress, settings?.sequentialOrder);

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
                alert(t('flashcards.noMatch'));
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

    if (loading) {
        if (!isInitialized) {
            return (
                <div style={styles.container}>
                    <div style={styles.loader}>Synchronizing Kanji Database...</div>
                </div>
            );
        }
        return (
            <div style={styles.container}>
                <div style={styles.loader}>{t('common.loading')}...</div>
            </div>
        );
    }

    const currentCard = deck[currentIndex];

    return (
        <div style={styles.container}>
            <div style={styles.navBar}>
                <div />
                <button onClick={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
                    {showFilters ? t('flashcards.closeFilters') : `${t('flashcards.filters')} ⚙️`}
                </button>
            </div>

            {showFilters && (
                <div style={styles.filterPanel}>
                    <div style={styles.filterGroup}>
                        <div style={styles.filterTitle}>{t('flashcards.level')}</div>
                        <div style={styles.checkboxRow}>
                            {[1, 2, 3, 4].map(lvl => (
                                <label key={lvl} style={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox" 
                                        checked={filters.selectedLevels.includes(lvl)}
                                        onChange={() => toggleLevel(lvl)}
                                    />
                                    {t('flashcards.level')} {lvl}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={styles.filterGrid}>
                        <div style={styles.filterGroup}>
                            <div style={styles.filterTitle}>{t('flashcards.boxFilter')}</div>
                            <select 
                                value={filters.boxId} 
                                onChange={(e) => setFilters({...filters, boxId: e.target.value})}
                                style={styles.select}
                            >
                                <option value="all">{t('quiz.allBoxes')}</option>
                                {availableBoxes.map(b => <option key={b} value={b}>{t('quiz.box')} {b}</option>)}
                            </select>
                        </div>

                        <div style={styles.filterGroup}>
                            <div style={styles.filterTitle}>{t('flashcards.srsFilter')}</div>
                            <select 
                                value={filters.srsLevel} 
                                onChange={(e) => setFilters({...filters, srsLevel: e.target.value})}
                                style={styles.select}
                            >
                                <option value="all">{t('flashcards.srs.all')}</option>
                                <option value="0">{t('flashcards.srs.unseen')}</option>
                                <option value="1">{t('flashcards.srs.apprentice')}</option>
                                <option value="2">{t('flashcards.srs.guru')}</option>
                                <option value="3">{t('flashcards.srs.master')}</option>
                                <option value="4">{t('flashcards.srs.enlightened')}</option>
                            </select>
                        </div>
                    </div>

                    <button onClick={() => { refreshDeck(); setShowFilters(false); }} style={styles.applyBtn}>
                        {t('flashcards.applyStart')}
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
                        <h3>{t('flashcards.noMatch')}</h3>
                        <p>{t('flashcards.tryDifferent')}</p>
                        <button onClick={() => setShowFilters(true)} style={styles.applyBtn}>{t('flashcards.adjust')}</button>
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
                        {t('common.prev')}
                    </button>
                    <button 
                        onClick={() => setCurrentIndex(Math.min(deck.length - 1, currentIndex + 1))} 
                        disabled={currentIndex === deck.length - 1}
                        style={styles.navBtn}
                    >
                        {t('common.next')}
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
