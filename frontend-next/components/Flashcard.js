"use client";
import React, { useState } from 'react';

const Flashcard = ({ card, onEvaluate }) => {
    const [flipped, setFlipped] = useState(false);

    if (!card) return null;

    const handleFlip = () => setFlipped(!flipped);

    // Mastery colors (1: Unknown, 2: Review, 3: Good, 4: Mastered)
    const levelColors = {
        1: "#ef4444", // Red
        2: "#f59e0b", // Orange/Amber
        3: "#3b82f6", // Blue
        4: "#10b981"  // Green
    };

    const cardLevel = card.level || 1;
    const accentColor = levelColors[cardLevel];

    return (
        <div style={styles.container}>
            <div 
                style={{
                    ...styles.cardInner,
                    transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
                onClick={handleFlip}
            >
                {/* FRONT SIDE */}
                <div style={{ ...styles.cardFace, ...styles.cardFront, border: `2px solid ${accentColor}22` }}>
                    <div style={{ ...styles.levelIndicator, background: accentColor }}>
                        {cardLevel === 4 ? "Mastered" : `Level ${cardLevel}`}
                    </div>
                    <div style={styles.kanjiMain}>{card.kanji}</div>
                    <div style={styles.compoundBox}>
                        <div style={styles.compoundTxt}>{card.mot}</div>
                    </div>
                    <div style={styles.hint}>Click to flip</div>
                </div>

                {/* BACK SIDE */}
                <div style={{ ...styles.cardFace, ...styles.cardBack, border: `2px solid ${accentColor}44` }}>
                    <div style={styles.detailsHeader}>Details</div>
                    
                    <div style={styles.detailSection}>
                        <div style={styles.detailTitle}>Kanji</div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailVal}>{card.romaji}</span>
                            <span style={styles.detailSep}>•</span>
                            <span style={styles.detailVal}>{card.signification}</span>
                        </div>
                    </div>

                    <div style={styles.detailSection}>
                        <div style={styles.detailTitle}>Compound ({card.mot})</div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailVal}>{card.lecture_mot}</span>
                            <span style={styles.detailSep}>•</span>
                            <span style={styles.detailVal}>{card.signification_mot}</span>
                        </div>
                    </div>

                    <div style={styles.hint}>Click to flip back</div>
                </div>
            </div>

            {/* RADIAL / BUTTON EVALUATION MENU (shows when flipped) */}
            {flipped && (
                <div style={styles.evalContainer}>
                    <button onClick={() => onEvaluate(1)} style={{ ...styles.evalBtn, background: levelColors[1] }}>Unknown</button>
                    <button onClick={() => onEvaluate(2)} style={{ ...styles.evalBtn, background: levelColors[2] }}>Review</button>
                    <button onClick={() => onEvaluate(3)} style={{ ...styles.evalBtn, background: levelColors[3] }}>Good</button>
                    <button onClick={() => onEvaluate(4)} style={{ ...styles.evalBtn, background: levelColors[4] }}>Mastered</button>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        perspective: "1000px",
        width: "320px",
        height: "450px",
        margin: "0 auto",
        position: "relative"
    },
    cardInner: {
        width: "100%",
        height: "100%",
        transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        transformStyle: "preserve-3d",
        cursor: "pointer",
        position: "relative"
    },
    cardFace: {
        position: "absolute",
        width: "100%",
        height: "100%",
        backfaceVisibility: "hidden",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(30, 41, 59, 0.7)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        padding: "20px",
        boxSizing: "border-box"
    },
    cardFront: {
        zIndex: 2
    },
    cardBack: {
        transform: "rotateY(180deg)",
        textAlign: "left",
        justifyContent: "flex-start",
        paddingTop: "40px"
    },
    levelIndicator: {
        position: "absolute",
        top: "20px",
        right: "20px",
        padding: "4px 12px",
        borderRadius: "100px",
        fontSize: "0.7rem",
        fontWeight: "bold",
        color: "#fff",
        textTransform: "uppercase"
    },
    kanjiMain: {
        fontSize: "6rem",
        fontFamily: "'Noto Serif JP', serif",
        color: "#fff",
        marginBottom: "20px"
    },
    compoundBox: {
        background: "rgba(255,255,255,0.05)",
        padding: "10px 20px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.1)"
    },
    compoundTxt: {
        fontSize: "1.5rem",
        color: "#cbd5e1",
        letterSpacing: "2px"
    },
    hint: {
        position: "absolute",
        bottom: "20px",
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase",
        letterSpacing: "1px"
    },
    detailsHeader: {
        fontSize: "1.2rem",
        fontWeight: "bold",
        color: "#fff",
        marginBottom: "30px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        width: "100%",
        paddingBottom: "10px"
    },
    detailSection: {
        marginBottom: "25px",
        width: "100%"
    },
    detailTitle: {
        fontSize: "0.7rem",
        textTransform: "uppercase",
        color: "#94a3b8",
        letterSpacing: "1.5px",
        marginBottom: "8px"
    },
    detailRow: {
        display: "flex", // Fixed missing brace and quote
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap"
    },
    detailVal: {
        fontSize: "1.1rem",
        color: "#f1f5f9",
        fontWeight: "500"
    },
    detailSep: {
        color: "rgba(255,255,255,0.2)"
    },
    evalContainer: {
        position: "absolute",
        bottom: "-100px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "10px",
        width: "100%",
        justifyContent: "center",
        animation: "slideUp 0.3s ease-out"
    },
    evalBtn: {
        border: "none",
        padding: "10px 12px",
        borderRadius: "12px",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "0.75rem",
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    }
};

export default Flashcard;
