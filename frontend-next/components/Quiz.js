"use client";
import { useEffect, useState, useRef } from "react";
import { getNextQuestion, checkLocalAnswer, updateEngineAfterAnswer, updateBoxRanking, currentBoxFilter, setBoxContext, getAvailableBoxes, getVisibleBoxes, getBoxKanjiCount, getBoxLevel, resetEngineSession, isInitialized } from "../lib/quizengine";
import { startSession, recordAnswer, getSessionSummary, isSessionFinished, updateSessionSummary, getSession } from "../lib/quizSession";
import { getMode, setMode as saveMode } from "../lib/modeManager";
import { getPlayer_setting } from "../lib/settings";
import config from "../lib/config";
import { useRouter, useSearchParams } from "next/navigation";
import { MODES } from "../lib/quizModes";
import LoadingOverlay from "./LoadingOverlay";
import { invalidateDashboardCache } from "../lib/dashboardCache";
import { useLanguage } from "@/lib/LanguageContext";

export default function Quiz({ forcedMode = null }) {
    const { t } = useLanguage();
    const [question, setQuestion] = useState(null);
    const [result, setResult] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isCompiling, setIsCompiling] = useState(false);

    // UI State for dropdowns
    const [selectedMode, setSelectedMode] = useState("qa");
    const [selectedBox, setSelectedBox] = useState("");
    const [boxes, setBoxes] = useState([]);
    const [appSettings, setAppSettings] = useState(null);
    const [selectedComposeChoices, setSelectedComposeChoices] = useState([]);

    // Game State
    const [isPlaying, setIsPlaying] = useState(false);

    const timerRef = useRef(null);
    const startTimeRef = useRef(null); // Track when the current question started (for RT)
    const pauseTimeRef = useRef(null); // Track when we paused
    const elapsedBeforePauseRef = useRef(0); // Track accumulated time before pause

    const router = useRouter();
    const searchParams = useSearchParams();
    const barRef = useRef(null);
    const containerRef = useRef(null);
    const finishingRef = useRef(false); // Prevent double finishing

    // Dynamic background effect
    useEffect(() => {
        if (!containerRef.current) return;

        if (!selectedBox || selectedBox === "") {
            containerRef.current.style.backgroundImage = "";
            containerRef.current.style.backgroundColor = "";
            containerRef.current.style.color = ""; // Reset to default
            return;
        }

        const SUPABASE_URL = "https://wbeoqdtafvyscmncalzc.supabase.co";
        const baseDir = `${SUPABASE_URL}/storage/v1/object/public/box-backgrounds/`;

        // Match legacy logic: digits -> svg, others -> png
        const isDigit = /^\d/.test(selectedBox);
        const extension = isDigit ? "svg" : "png";
        const imageUrl = `${baseDir}box_${selectedBox}.${extension}`;

        containerRef.current.style.backgroundImage = `url('${imageUrl}')`;
        containerRef.current.style.backgroundSize = "contain";
        containerRef.current.style.backgroundPosition = "center";
        containerRef.current.style.backgroundRepeat = "no-repeat";
        containerRef.current.style.backgroundBlendMode = "overlay";
        containerRef.current.style.backgroundColor = "rgba(255, 255, 255, 0.85)";
        containerRef.current.style.color = "#0f172a"; // Match app background for contrast
    }, [selectedBox]);

    useEffect(() => {
        // Initial Setup
        initialize();
        return () => {
            stopTimer(); // cleanup on unmount
        };
    }, []);

    // Watch for mode/box changes to reset
    useEffect(() => {
        if (!forcedMode) {
            startNewSession();
        }
    }, [selectedMode, selectedBox]);

    useEffect(() => {
        if (appSettings) {
            const visible = getVisibleBoxes(appSettings.progressiveMode, selectedMode);
            setBoxes(visible);

            console.log(`📦 Box Sync [${selectedMode}]: Unlocked boxes:`, visible);

            // If in progressive mode and current box is not in visible list, or just switching modes,
            // we might want to default to the highest unlocked box.
            // EXCEPTION: qg mode ALWAYS uses All Boxes.
            if (appSettings.progressiveMode && selectedMode !== "qg" && !visible.includes(selectedBox) && visible.length > 0) {
                const defaultBox = visible[visible.length - 1];
                console.log(`🎯 Auto-selecting highest unlocked: ${defaultBox}`);
                setSelectedBox(defaultBox);
                setBoxContext(defaultBox);
            }
        }
    }, [selectedMode, appSettings?.progressiveMode]);

    async function initialize() {
        const player = getPlayer_setting();
        let initialMode = selectedMode;
        if (!forcedMode) {
            initialMode = getMode();
            setSelectedMode(initialMode);
        }

        if (player) {
            // Loading library
            const mod = await import("../lib/quizengine");
            await mod.initEngine(player);

            // Set settings (cached)
            const { getSettings, fetchRemoteSettings } = await import("../lib/settings");
            const settings = getSettings();
            setAppSettings(settings);

            const visible = mod.getVisibleBoxes(settings.progressiveMode, initialMode);
            setBoxes(visible);

            console.log("⚙️ Quiz Init Settings:", settings);
            console.log("📦 Visible boxes at start:", visible);

            // Restore last selection
            const lastBox = localStorage.getItem("kanjilock_last_box_selection");
            
            // PRIORITY LOGIC:
            // 1. If Progressive Mode is ON, always default to the HIGHEST unlocked box (visible.at(-1))
            // 2. Otherwise, use lastBox if valid
            // 3. Fallback to empty (All Boxes)
            let boxToSelect = "";
            if (settings.progressiveMode && initialMode !== "qg" && visible.length > 0) {
                boxToSelect = visible[visible.length - 1];
                console.log(`🚀 Progressive Mode: Auto-advancing to newest box: ${boxToSelect}`);
            } else if (lastBox !== null && (lastBox === "" || visible.includes(lastBox))) {
                boxToSelect = lastBox;
            }

            setSelectedBox(boxToSelect);
            mod.setBoxContext(boxToSelect === "" ? null : boxToSelect);

            // REPLAY LOGIC: If we are replaying, we want to stick to the box we just finished
            const isReplay = searchParams.get("replay") === "true";
            
            // Sync from remote (async)
            fetchRemoteSettings(player).then(remoteSettings => {
                if (remoteSettings) {
                    setAppSettings(remoteSettings);
                    const updatedVisible = mod.getVisibleBoxes(remoteSettings.progressiveMode, initialMode);
                    setBoxes(updatedVisible);
                    // Update box selection after remote sync
                    const lastBox = localStorage.getItem("kanjilock_last_box_selection");
                    let db = "";
                    
                    // Priority: 
                    // 1. Replay mode -> use lastBox
                    // 2. Progressive mode -> use highest unlocked
                    // 3. Last box -> use lastBox
                    if (isReplay && lastBox !== null && (lastBox === "" || updatedVisible.includes(lastBox))) {
                        db = lastBox;
                        console.log(`🔁 Replay Mode: Sticking to box: ${db}`);
                    } else if (remoteSettings.progressiveMode && initialMode !== "qg" && updatedVisible.length > 0) {
                        db = updatedVisible[updatedVisible.length - 1];
                    } else if (lastBox !== null && (lastBox === "" || updatedVisible.includes(lastBox))) {
                        db = lastBox;
                    }

                    if (db !== selectedBox) {
                        setSelectedBox(db);
                        mod.setBoxContext(db === "" ? null : db);
                    }
                }
            });
        }
        setIsLoading(false);
    }

    function startNewSession(forceStart = false) {
        let size = null;
        if (selectedBox && selectedBox !== "") {
            size = getBoxKanjiCount(selectedBox);
        }
        
        resetEngineSession();
        startSession(size, selectedBox);
        setQuestion(null);
        setResult(null);
        setIsProcessing(false);
        elapsedBeforePauseRef.current = 0;

        if (isPlaying || forceStart) {
            loadQuestion();
        }
    }

    // Handlers
    function handleModeChange(e) {
        const newMode = e.target.value;
        setSelectedMode(newMode);
        saveMode(newMode);
        
        // Force Global Box for Box Selection Mode (qg)
        if (newMode === "qg") {
            setSelectedBox("");
            setBoxContext(null);
        }
        
        setIsPlaying(false);
    }

    function handleBoxChange(e) {
        const val = e.target.value;
        setSelectedBox(val);
        setBoxContext(val === "" ? null : val);
        setIsPlaying(false);
        // Persist the choice to handle dropdown ordering
        localStorage.setItem("kanjilock_last_box_selection", val);
    }

    function togglePause() {
        if (isPlaying) {
            // PAUSE
            setIsPlaying(false);
            stopTimerControl();
            // Calculate elapsed time until now so we don't lose it
            if (startTimeRef.current) {
                elapsedBeforePauseRef.current += Date.now() - startTimeRef.current;
            }
        } else {
            // RESUME / START
            setIsPlaying(true);
            if (!question) {
                // First start
                startNewSession(true);
            } else {
                // Resuming
                startTimeRef.current = Date.now();
                resumeTimerControl();
            }
        }
    }

    async function loadQuestion() {
        const isComposeMode = (question?.mode === "qh" || question?.mode === "qg");
        setIsProcessing(false);
        setResult(null);
        setSelectedComposeChoices([]); // Reset for qh/qg
        elapsedBeforePauseRef.current = 0; // Reset question timer

        // Timer animation reset
        resetTimerVisuals();

        startTimeRef.current = Date.now();
        startTimerControl();

        // FIX: Use updated mode directly from state (or forced)
        // Note: In React state might be stale in closures, but since we rely on dependency in useEffect 
        // to call startNewSession which calls loadQuestion, selectedMode should be up to date.
        // However, to be absolutely safe, we pass it or read from current scope if this is triggered from render.
        const mode = forcedMode || selectedMode;

        const data = getNextQuestion(mode, appSettings?.progressiveMode, appSettings?.sequentialOrder);

        if (data.done) {
            setQuestion(null);
            setIsPlaying(false);
            alert(data.message || "No questions available.");
            return;
        }

        setQuestion(data);
    }

    // --- TIMER LOGIC ---

    function startTimerControl() {
        if (timerRef.current) clearTimeout(timerRef.current);
        const remaining = 5000 - elapsedBeforePauseRef.current;
        if (remaining <= 0) {
            playSound("BOMB.WAV");
            return;
        }

        // CSS Animation
        if (barRef.current) {
            // Convert remaining to percentage
            const pct = (remaining / 5000) * 100;
            barRef.current.style.transition = "none";
            barRef.current.style.width = `${pct}%`;
            void barRef.current.offsetWidth;

            requestAnimationFrame(() => {
                if (barRef.current) {
                    barRef.current.style.transition = `width ${remaining}ms linear`;
                    barRef.current.style.width = "0%";
                }
            });
        }

        timerRef.current = setTimeout(() => {
            playSound("BOMB.WAV");
        }, remaining);
    }

    function resumeTimerControl() {
        startTimerControl();
    }

    function stopTimerControl() {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (barRef.current) {
            const computedWidth = getComputedStyle(barRef.current).width;
            barRef.current.style.transition = "none";
            barRef.current.style.width = computedWidth;
        }
    }

    // Legacy naming alias
    const stopTimer = stopTimerControl;

    function resetTimerVisuals() {
        if (barRef.current) {
            barRef.current.style.transition = "none";
            barRef.current.style.width = "100%";
            void barRef.current.offsetWidth;
        }
    }

    function playSound(name) {
        if (appSettings?.soundEnabled === false) return;
        const audio = new Audio(`/sounds/${name}`);
        audio.play().catch(e => console.error("Sound play failed", e));
    }

    async function handleAnswer(choice) {
        if (isProcessing) return;
        setIsProcessing(true);
        stopTimerControl();

        // Calculate total RT (elapsed before + current segment)
        const currentSegment = Date.now() - startTimeRef.current;
        const rt_ms = elapsedBeforePauseRef.current + currentSegment;

        const data = checkLocalAnswer(question, choice, rt_ms);

        const mode = forcedMode || selectedMode;
        const newState = updateEngineAfterAnswer(question.kanji, data.correct, mode);

        setResult(data);
        playSound(data.correct ? "success.wav" : "BOMB.WAV");

        // Record Answer
        const finished = recordAnswer({
            correct: data.correct,
            rt_ms: rt_ms,
            kanji: question.kanji,
            mode: mode,
            newLevel: newState?.level
        });

        if (finished) {
            // If session is finished, don't allow loading another question
            setIsPlaying(false); 
            // Give the user time to see the last answer before showing compilation overlay
            setTimeout(async () => {
                setIsCompiling(true); 
                await finishSession(mode);
            }, 2500);
        } else {
            // Check settings for autoDismiss
            if (appSettings?.autoDismissAnswer !== false) {
                setTimeout(() => {
                    loadQuestion();
                }, data.correct ? 1000 : 2500);
            }
        }
    }

    async function finishSession(mode) {
        if (finishingRef.current) return;
        finishingRef.current = true;
        
        setIsCompiling(true);
        invalidateDashboardCache();
        const summary = getSessionSummary();
        const player = getPlayer_setting();

        // Evaluate Box Mastery only for core modes (not qh/qg)
        const isCoreMode = (mode !== "qh" && mode !== "qg");
        
        if (selectedBox && isCoreMode) {
            const oldLevel = getBoxLevel(selectedBox, mode);
            const ranking = await updateBoxRanking(selectedBox, summary, mode);
            const boxRanking = {
                ...ranking,
                oldLevel: oldLevel
            };
            summary.boxRanking = boxRanking;
            updateSessionSummary({ boxRanking }); // Sync back to session manager
        }

        const payload = {
            player: player,
            mode: mode,
            box: summary.boxId, // Include box context
            boxRanking: summary.boxRanking, // Needed for mastery trend graphs
            session_size: summary.size,
            correct: summary.correct,
            wrong: summary.wrong,
            total_time_ms: summary.totalTime,
            score_global: summary.scoreOn100,
            answers: summary.history
        };

        try {
            await fetch(`${config.apiBaseUrl}/session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("Save session error", e);
        }

        sessionStorage.setItem("lastSessionSummary", JSON.stringify(summary));
        router.push("/session-end");
    }

    // MODES_OPTS defined with explicit order requested by user
    const MODES_OPTS = ["qa", "qb", "qc", "qe", "qd", "qj", "qf", "qi", "qg", "qh"];

    if (isLoading) {
        if (!isInitialized) {
            return <LoadingOverlay message="Synchronizing Kanji Database..." />;
        }
        return (
            <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={styles.spinner}>⏳</div>
                <p style={{ marginLeft: '10px', color: '#94a3b8' }}>{t('common.loading')}</p>
            </div>
        );
    }

    if (!question && isPlaying) return <div style={styles.container}>{t('common.loading')}</div>;

    // Initial Screen or Paused Screen if no question shown?
    // If not isPlaying and !question -> Initial State
    // If not isPlaying and question -> Paused State

    return (
        <div ref={containerRef} style={styles.container}>
            {/* Compiling Overlay */}
            {isCompiling && (
                <div style={styles.compilingOverlay}>
                    <div style={styles.spinner}>⏳</div>
                    <h3 style={{ color: '#fff' }}>{t('quiz.summary')}...</h3>
                    <p style={{ color: '#94a3b8' }}>{t('common.loading')}</p>
                </div>
            )}

            {/* Controls - Only show if not forced mode */}
            {!forcedMode && (
                <div style={styles.controls}>
                    <select value={selectedMode} onChange={handleModeChange} style={styles.select}>
                        {MODES_OPTS.map(m => (
                            <option key={m} value={m}>
                                {MODES[m]?.label || m}
                            </option>
                        ))}
                    </select>

                    <select 
                        value={selectedBox} 
                        onChange={handleBoxChange} 
                        style={styles.select}
                        disabled={selectedMode === "qg"}
                    >
                        {(() => {
                            const lastSelection = typeof window !== 'undefined' ? localStorage.getItem("kanjilock_last_box_selection") : "";
                            const sortedBoxes = [...boxes].reverse();
                            const allBoxesOption = (
                                <option key="all-boxes" value="">{t('quiz.allBoxes')}</option>
                            );

                            if (lastSelection === "") {
                                // All Boxes was last selected -> Put at top
                                return [allBoxesOption, ...sortedBoxes.map(b => (
                                    <option key={b} value={b}>
                                        {getBoxLevel(b, selectedMode) === 4 ? "⭐ " : ""}Box {b} (Niv. {getBoxLevel(b, selectedMode)})
                                    </option>
                                ))];
                            } else {
                                // Specific box was last selected -> Put All Boxes at bottom
                                return [...sortedBoxes.map(b => (
                                    <option key={b} value={b}>
                                        {getBoxLevel(b, selectedMode) === 4 ? "⭐ " : ""}{t('quiz.box')} {b} (Niv. {getBoxLevel(b, selectedMode)})
                                    </option>
                                )), allBoxesOption];
                            }
                        })()}
                    </select>
                </div>
            )}

            {/* Start/Pause Control */}
            <div style={{ marginBottom: "20px" }}>
                <button onClick={togglePause} style={isPlaying ? styles.pauseBtn : styles.startBtn}>
                    {isPlaying ? "⏸ Pause" : (question ? `▶️ ${t('common.start')}` : `▶️ ${t('common.start')}`)}
                </button>
            </div>

            {/* Content only visible if Playing or (Paused but showing question?) 
                User probably wants to see question even if paused? 
                Usually pausing hides the question to prevent cheating. 
                Let's hide question if paused.
            */}

            {(!isPlaying && question) && (
                <div style={{ padding: "50px", background: "#eee", borderRadius: "8px" }}>
                    <h3>{t('quiz.paused')}</h3>
                </div>
            )}

            {isPlaying && question && (
                <>
                    {/* Session Progress Bar */}
                    {appSettings?.showProgressBar !== false && (
                        <div style={styles.sessionProgressContainer}>
                            <div 
                                style={{
                                    ...styles.sessionProgressFill,
                                    width: `${((getSession()?.current || 0) / (getSession()?.size || 1)) * 100}%`
                                }}
                            ></div>
                            <span style={styles.sessionProgressText}>
                                {getSession()?.current || 0} / {getSession()?.size || 0}
                            </span>
                        </div>
                    )}

                    {/* Timer Bar */}
                    <div style={styles.timerContainer}>
                        <div ref={barRef} style={styles.timerFill}></div>
                    </div>

                    <h2 style={styles.question}>{question.question}</h2>

                    {/* Options */}
                    <div style={(question.mode === "qh" || question.mode === "qg") ? styles.pool : styles.grid}>
                        {question.options.map((opt, i) => {
                            if (question.mode === "qh" || question.mode === "qg") {
                                const isSelected = selectedComposeChoices.includes(opt);
                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedComposeChoices(selectedComposeChoices.filter(c => c !== opt));
                                            } else {
                                                setSelectedComposeChoices([...selectedComposeChoices, opt]);
                                            }
                                        }}
                                        style={{
                                            ...styles.chip,
                                            background: isSelected ? "#2196F3" : "rgba(0, 0, 0, 0.5)",
                                            color: isSelected ? "white" : "#94a3b8",
                                            borderColor: isSelected ? "#38bdf8" : "rgba(255,255,255,0.1)"
                                        }}
                                        disabled={isProcessing}
                                    >
                                        {opt}
                                    </button>
                                );
                            }
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(opt)}
                                    style={styles.button}
                                    disabled={isProcessing}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>

                    {(question.mode === "qh" || question.mode === "qg") && (
                        <div style={{ marginTop: "20px" }}>
                            <button
                                onClick={() => handleAnswer(selectedComposeChoices)}
                                style={styles.submitBtn}
                                disabled={isProcessing || selectedComposeChoices.length === 0}
                            >
                                {t('quiz.validate')}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Result Overlay */}
            {result && (
                <div
                    onClick={() => {
                        // Only load next if NOT finished
                        if (isSessionFinished()) {
                           // Option to force transition or just wait for timer
                           finishSession(forcedMode || selectedMode);
                        } else {
                           loadQuestion();
                        }
                    }}
                    style={{
                        ...styles.resultBox,
                        backgroundColor: result.correct ? "rgba(76, 175, 80, 0.95)" : "rgba(244, 67, 54, 0.95)",
                        cursor: "pointer"
                    }}
                >
                    <div style={styles.resultQuestion}>{question?.question}</div>
                    
                    {/* Correct Answer Prominent */}
                    <div style={{ fontSize: question?.mode === "qh" ? "1.5rem" : "2rem", margin: "10px 0", color: "#fff", fontWeight: "bold" }}>
                        {question?.mode === "qh" && <span style={{fontSize: "0.9rem", opacity: 0.8, display: "block"}}>Composition :</span>}
                        {Array.isArray(result.bonne) ? result.bonne.join(" + ") : result.bonne}
                    </div>

                    <h3 style={{ margin: "10px 0" }}>{result.correct ? "✓ Correct" : "✗ Wrong"}</h3>
                    
                    {result.extras && (
                        <div style={styles.extras}>
                            {Object.entries(result.extras).map(([key, value]) => {
                                if (!value || key === "boite") return null;
                                const labels = {
                                    signification: t('quiz.labels.sens'),
                                    romaji: t('quiz.labels.romaji'),
                                    mot: t('quiz.labels.example'),
                                    signification_mot: t('quiz.labels.exSens'),
                                    lecture_mot: t('quiz.labels.reading'),
                                    kanji: t('quiz.labels.kanji')
                                };
                                return (
                                    <div key={key} style={{ marginBottom: "4px" }}>
                                        <b style={{ color: "rgba(255,255,255,0.7)" }}>{labels[key] || key}</b>: {value}
                                    </div>
                                );
                            })}
                            {result.extras.boite && (
                                <div style={{ marginTop: "8px", fontSize: "0.8rem", opacity: 0.8 }}>
                                    Boîte {result.extras.boite}
                                </div>
                            )}
                        </div>
                    )}

                    {appSettings?.autoDismissAnswer === false && (
                        <div style={{ marginTop: "15px", fontSize: "0.8rem", opacity: 0.8 }}>
                            Tap to continue
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
        padding: "20px",
        position: "relative"
    },
    controls: {
        marginBottom: "20px",
        display: "flex",
        justifyContent: "center",
        gap: "10px",
        flexWrap: "wrap"
    },
    select: {
        padding: "8px",
        fontSize: "1rem",
        borderRadius: "5px"
    },
    startBtn: {
        padding: "10px 30px",
        fontSize: "1.2rem",
        background: "#4CAF50",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer"
    },
    pauseBtn: {
        padding: "10px 30px",
        fontSize: "1.2rem",
        background: "#FF9800",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer"
    },
    timerContainer: {
        width: "100%",
        height: "10px",
        background: "#ddd",
        borderRadius: "5px",
        overflow: "hidden",
        marginBottom: "20px"
    },
    timerFill: {
        height: "100%",
        background: "#2196F3",
        width: "100%"
    },
    question: {
        fontSize: "3rem",
        marginBottom: "30px"
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px"
    },
    button: {
        padding: "20px",
        fontSize: "1.2rem",
        cursor: "pointer",
        borderRadius: "8px",
        border: "1px solid #ccc"
    },
    resultBox: {
        padding: "20px",
        color: "white",
        borderRadius: "12px",
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "85%",
        maxWidth: "400px",
        zIndex: 100,
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(5px)"
    },
    resultQuestion: {
        fontSize: "2.5rem",
        fontWeight: "bold",
        marginBottom: "10px",
        borderBottom: "1px solid rgba(255,255,255,0.3)",
        paddingBottom: "5px",
        width: "100%"
    },
    extras: {
        marginTop: "10px",
        textAlign: "left",
        fontSize: "0.9rem",
        width: "100%"
    },
    pool: {
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        justifyContent: "center",
        padding: "10px"
    },
    chip: {
        padding: "12px 20px",
        fontSize: "1rem",
        cursor: "pointer",
        borderRadius: "100px",
        border: "2px solid",
        transition: "all 0.2s",
        fontFamily: "'Inter', sans-serif"
    },
    submitBtn: {
        padding: "12px 40px",
        fontSize: "1.1rem",
        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
        color: "white",
        border: "none",
        borderRadius: "12px",
        fontWeight: "600",
        cursor: "pointer",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
    },
    compilingOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(8px)'
    },
    spinner: {
        fontSize: '4rem',
        marginBottom: '20px',
        animation: 'spin 2s linear infinite'
    },
    sessionProgressContainer: {
        width: "100%",
        height: "20px",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: "10px",
        overflow: "hidden",
        marginBottom: "20px",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.1)"
    },
    sessionProgressFill: {
        height: "100%",
        background: "linear-gradient(to right, #4caf50, #81c784)",
        transition: "width 0.4s ease-out",
        borderRadius: "10px"
    },
    sessionProgressText: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "0.75rem",
        fontWeight: "bold",
        color: "rgba(255,255,255,0.9)",
        textShadow: "0 1px 2px rgba(0,0,0,0.5)"
    }
};
