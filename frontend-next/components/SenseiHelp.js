"use client";
import { useState, useRef, useEffect } from "react";
import config from "../lib/config";

const TIPS = [
    // --- Existing Optimized Tips ---
    { title: "Box Mastery", text: "Levels 1-4. Levels only increase. We use Math.max to ensure your best performance is saved.", icon: "📦" },
    { title: "First-Try Success", text: "Only correct answers on the FIRST attempt increase your level. Reinjected successes do not promote.", icon: "🎯" },
    { title: "All-Good Penalty", text: "In All-Good mode, any mistake results in an immediate -1 level penalty (clamped to Level 1).", icon: "⚠️" },
    { title: "Reinjection Queue", text: "Failed Kanji in All-Good mode are added to a queue and reappear at the end of the session.", icon: "🔄" },
    { title: "Progressive Mode", text: "Defaults to your highest unlocked box, ensuring you always tackle your latest challenge.", icon: "🚀" },
    { title: "Speed Score (2s)", text: "Answer in ≤ 2s for 100 points. After that, the score decays by ~1 point every 80ms.", icon: "⚡" },
    { title: "Mastery Code", text: "The 8-digit code (e.g., 10300100) shows your SRS level for modes qa to qh in sequence.", icon: "📊" },
    { title: "Sensei's Examples", text: "Click on any compound word on a flashcard to ask me for a Japanese example sentence.", icon: "💡" },

    // --- New Tips from lib/tips.js (Categorized) ---
    { title: "Daily Habit", text: "Spaced Repetition (SRS) is most effective when you study a little bit every day.", icon: "🧘" },
    { title: "Radical Hints", text: "Kanji are often composed of smaller pieces called 'radicals' that hint at their meaning.", icon: "🧩" },
    { title: "Heisig Method", text: "Focus on creating imaginative stories for each kanji to aid long-term memory.", icon: "📖" },
    { title: "Recognition First", text: "Don't worry about perfect stroke order at first; focus on recognition and meaning.", icon: "👀" },
    { title: "Context is King", text: "Learning vocabulary words alongside kanji makes the readings much easier to remember.", icon: "✍️" },
    { title: "Mental Visualization", text: "Try to visualize the kanji in your mind before looking at the answer.", icon: "🧠" },
    { title: "Auditroy Memory", text: "Try saying the readings out loud to engage your auditory memory during study.", icon: "🗣️" },
    { title: "Handwriting", text: "Writing kanji by hand can help reinforce your visual and motor memory.", icon: "🖌️" },
    { title: "Box 4 Mastery", text: "A Box level of 4 means you are a true Master. You've reached the end of the SRS cycle!", icon: "👑" },
    { title: "Sequential Order", text: "You can toggle 'Sequential Order' in Settings if you prefer a fixed study path.", icon: "⚙️" },
    { title: "Session Size", text: "Customize the 'Session Size' in your Settings to fit your daily schedule.", icon: "📏" },
    { title: "Auto-Dismiss", text: "Auto-dismissing answers can significantly speed up your study sessions.", icon: "⏩" },
    { title: "Haptic Feedback", text: "Vibration feedback can be toggled on or off in the Settings menu.", icon: "📳" },
    { title: "Global Ranking", text: "The 'Ranking' page lets you compare your mastery with other players worldwide.", icon: "🏆" },
    { title: "Sensei Breakdown", text: "The 'Sensei' button during a quiz provides a detailed breakdown of the kanji structure.", icon: "🤖" },
    { title: "Eye Comfort", text: "KanjiLock uses a glassmorphism dark mode to reduce eye strain during long sessions.", icon: "🌙" },
    { title: "Joyo Kanji", text: "There are over 2,000 'Joyo' kanji taught in schools; we help you master the most frequent ones.", icon: "🏫" },
    { title: "Perfect Session", text: "A 'Perfect Session' with no mistakes is often the fastest way to advance to higher boxes.", icon: "✨" },
    { title: "Mastery Window", text: "Confirm your Level 3 mastery after a few days of rest to reach the final Level 4.", icon: "⏳" },
    { title: "Habit Stacking", text: "Setting a specific time for study each day helps build a lasting and effortless habit.", icon: "⏰" },
    { title: "Motivation", text: "Targets help you stay motivated by setting clear, achievable weekly or daily goals.", icon: "🏁" },
    { title: "The Journey", text: "Enjoy the journey! Learning kanji is a marathon, not a sprint. Consistency is everything.", icon: "🏃" },
];

const QUICK_START_STEPS = [
    { icon: "/icons/target1.png", title: "Set Your Goals", text: "Visit the Targets page to define your daily and weekly mastery objectives." },
    { icon: "⚙️", title: "Tailor the Experience", text: "Adjust quiz modes, progression speed, and interface preferences in Settings." },
    { icon: "/icons/card1.png", title: "Master the Decks", text: "Review Flashcards regularly. Watch the 8-digit code to track mode-specific mastery." },
    { icon: "/icons/quiz1.png", title: "Practice Regularly", text: "Launch Quizzes to challenge yourself. Remember: only first-try successes promote levels!" },
    { icon: "/icons/graph1.png", title: "Analyze Performance", text: "Use the Stats dashboard to monitor your mastery trends and response speed." },
    { icon: "/icons/unlock2.png", title: "Consult UnLock", text: "Whenever you're stuck, just ask me! I'm here to explain rules and Japanese nuances." },
];

export default function SenseiHelp() {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(null); // 'quickStart' or 'tips'
    const [tips, setTips] = useState(TIPS);
    const [messages, setMessages] = useState([
        { role: "sensei", text: "Bonjour ! Je suis UnLock. Pose-moi une question sur le jeu ou tes progrès !" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping, isChatOpen]);

    useEffect(() => {
        const handleTogglePanel = () => setIsPanelOpen(prev => !prev);
        const handleAsk = (e) => {
            const msg = e.detail;
            if (msg) {
                setIsChatOpen(true);
                handleSend(msg);
            }
        };
        window.addEventListener("toggleSensei", handleTogglePanel);
        window.addEventListener("askSensei", handleAsk);
        return () => {
            window.removeEventListener("toggleSensei", handleTogglePanel);
            window.removeEventListener("askSensei", handleAsk);
        };
    }, []);

    useEffect(() => {
        if (isPanelOpen) {
            setTips([...TIPS].sort(() => Math.random() - 0.5));
        }
    }, [isPanelOpen]);

    const handleSend = async (customMsg = null) => {
        const userMsg = typeof customMsg === "string" ? customMsg : input.trim();
        if (!userMsg) return;

        if (typeof customMsg !== "string") setInput("");
        setMessages(prev => [...prev, { role: "user", text: userMsg }]);
        setIsTyping(true);

        try {
            const player = typeof window !== 'undefined' ? localStorage.getItem("kanjilock_player") || "Anonymous" : "Anonymous";
            const res = await fetch(`${config.apiBaseUrl}/chat/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, player: player })
            });
            if (!res.ok) throw new Error("Failed to reach Sensei");
            const data = await res.json();
            setMessages(prev => [...prev, {
                role: "sensei",
                text: data.response || data.reply || "Désolé, je n'ai pas pu répondre.",
                thought: data.thought || ""
            }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: "sensei", text: "Désolé, je n'ai pas pu me connecter... (Erreur API)" }]);
        } finally {
            setIsTyping(false);
        }
    };

    const openChatFromPanel = () => {
        setIsPanelOpen(false);
        setIsChatOpen(true);
    };

    return (
        <>
            {/* Red Bubble Trigger (Persistent) */}
            <div style={styles.bubbleWrapper}>
                <button onClick={() => setIsChatOpen(!isChatOpen)} style={styles.bubble}>
                    {isChatOpen ? "✕" : <img src="/icons/unlock2.png" alt="Sensei" style={styles.bubbleIcon} />}
                </button>
            </div>

            {/* Chat Window */}
            {isChatOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.chatHeader}>
                        <div style={styles.status}></div>
                        <span>UnLock AI</span>
                        <button onClick={() => setIsChatOpen(false)} style={styles.closeChatBtn}>✕</button>
                    </div>
                    <div ref={scrollRef} style={styles.chatMessages}>
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                display: "flex",
                                flexDirection: "column",
                                maxWidth: "85%",
                                gap: "4px"
                            }}>
                                <div style={{
                                    ...styles.message,
                                    background: m.role === "user" ? "#3b82f6" : "rgba(255,255,255,0.05)",
                                    border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",
                                    borderBottomRightRadius: m.role === "user" ? "4px" : "16px",
                                    borderBottomLeftRadius: m.role === "sensei" ? "4px" : "16px",
                                }}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && <div style={styles.typing}>UnLock réfléchit...</div>}
                    </div>
                    <div style={styles.chatInputArea}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Pose une question..."
                            style={styles.chatInput}
                        />
                        <button onClick={handleSend} style={styles.chatSendBtn}>➔</button>
                    </div>
                </div>
            )}

            {/* Help Panel ("UnLock your Potentials") */}
            {isPanelOpen && (
                <div style={styles.overlay} onClick={() => setIsPanelOpen(false)}>
                    <div style={styles.panel} onClick={e => e.stopPropagation()}>
                        <div style={styles.header}>
                            <div style={styles.headerTitle}>
                                <div style={styles.status}></div>
                                <span>Optimize your adventure</span>
                            </div>
                            <button onClick={() => setIsPanelOpen(false)} style={styles.closeBtn}>✕</button>
                        </div>

                        <div style={styles.panelContent}>
                            {/* Quick Start Section */}
                            <div style={styles.collapsiblePanel}>
                                <button
                                    style={styles.panelToggle}
                                    onClick={() => setActiveSection(activeSection === 'quickStart' ? null : 'quickStart')}
                                >
                                    <span>🚀 Quick Start Guide</span>
                                    <span>{activeSection === 'quickStart' ? "▼" : "▶"}</span>
                                </button>
                                {activeSection === 'quickStart' && (
                                    <div style={styles.panelBody}>
                                        {QUICK_START_STEPS.map((step, i) => (
                                            <div key={i} style={styles.stepRow}>
                                                <div style={styles.stepIconWrapper}>
                                                    {step.icon.startsWith('/') ? <img src={step.icon} style={styles.stepImg} /> : <span>{step.icon}</span>}
                                                </div>
                                                <div>
                                                    <div style={styles.stepTitle}>{step.title}</div>
                                                    <div style={styles.stepText}>{step.text}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Tips Section */}
                            <div style={styles.collapsiblePanel}>
                                <button
                                    style={styles.panelToggle}
                                    onClick={() => setActiveSection(activeSection === 'tips' ? null : 'tips')}
                                >
                                    <span>💡 Pro Tips</span>
                                    <span>{activeSection === 'tips' ? "▼" : "▶"}</span>
                                </button>
                                {activeSection === 'tips' && (
                                    <div style={styles.panelBody}>
                                        {tips.map((tip, i) => (
                                            <div key={i} style={styles.tipCard}>
                                                <span style={{ fontSize: '1.2rem' }}>{tip.icon}</span>
                                                <div>
                                                    <div style={styles.stepTitle}>{tip.title}</div>
                                                    <div style={styles.stepText}>{tip.text}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Ask UnLock Section (Not Collapsible) */}
                            <div style={styles.staticPanel} onClick={openChatFromPanel}>
                                <div style={styles.staticHeader}>
                                    <img src="/icons/unlock2.png" style={styles.staticImg} />
                                    <span>Ask UnLock Anything</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '1.2rem' }}>➔</span>
                                </div>
                                <div style={styles.stepText}>
                                    Need help with game rules or Japanese nuances? Open the chat to speak with our AI sensei.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const styles = {
    bubbleWrapper: {
        position: "fixed",
        bottom: "100px",
        right: "20px",
        zIndex: 4000,
    },
    bubble: {
        width: "60px",
        height: "60px",
        borderRadius: "30px",
        background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
        color: "white",
        fontSize: "1.5rem",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 10px 25px rgba(239, 68, 68, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s",
    },
    bubbleIcon: { width: "35px", height: "35px", objectFit: "contain", filter: "brightness(0) invert(1)" },

    chatWindow: {
        position: "fixed",
        bottom: "180px",
        right: "20px",
        width: "320px",
        height: "450px",
        background: "#0f172a",
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        zIndex: 4001,
        animation: "slideUp 0.3s ease-out",
    },
    chatHeader: { padding: "15px 20px", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", gap: "10px", color: "#fff", fontWeight: "bold", fontSize: "0.9rem" },
    status: { width: "8px", height: "8px", borderRadius: "4px", background: "#22c55e", boxShadow: "0 0 8px #22c55e" },
    closeChatBtn: { marginLeft: "auto", background: "none", border: "none", color: "#64748b", cursor: "pointer" },
    chatMessages: { flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" },
    message: { padding: "12px 16px", borderRadius: "16px", fontSize: "0.85rem", lineHeight: "1.4", color: "#f1f5f9" },
    typing: { fontSize: "0.75rem", color: "#64748b", fontStyle: "italic", marginLeft: "20px" },
    chatInputArea: { padding: "15px", background: "rgba(255,255,255,0.03)", display: "flex", gap: "10px" },
    chatInput: { flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 12px", color: "#fff", outline: "none" },
    chatSendBtn: { background: "#3b82f6", color: "#fff", border: "none", borderRadius: "10px", width: "35px", cursor: "pointer" },

    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)", zIndex: 3000, display: "flex", justifyContent: "flex-end" },
    panel: { width: "100%", maxWidth: "400px", height: "100%", background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(20px)", boxShadow: "-10px 0 30px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", animation: "slideIn 0.3s ease-out" },
    header: { padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" },
    headerTitle: { display: "flex", alignItems: "center", gap: "10px", fontSize: "1.1rem", fontWeight: "bold", color: "#fff" },
    closeBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" },
    panelContent: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "15px" },

    collapsiblePanel: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" },
    panelToggle: { width: "100%", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: "#fff", fontWeight: "bold", fontSize: "0.95rem", cursor: "pointer" },
    panelBody: { padding: "0 20px 20px 20px", display: "flex", flexDirection: "column", gap: "18px", maxHeight: "400px", overflowY: "auto" },

    stepRow: { display: "flex", gap: "15px", alignItems: "flex-start" },
    stepIconWrapper: { width: "24px", height: "24px", display: "flex", justifyContent: "center", alignItems: "center" },
    stepImg: { width: "24px", height: "24px", objectFit: "contain", filter: "brightness(0) invert(1)" },
    stepTitle: { fontSize: "0.85rem", fontWeight: "bold", color: "#fff", marginBottom: "3px" },
    stepText: { fontSize: "0.75rem", color: "#94a3b8", lineHeight: "1.4" },

    tipCard: { display: "flex", gap: "15px", alignItems: "flex-start" },

    staticPanel: { padding: "20px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", borderRadius: "16px", cursor: "pointer", transition: "all 0.2s" },
    staticHeader: { display: "flex", alignItems: "center", gap: "12px", color: "#3b82f6", fontWeight: "bold", marginBottom: "10px" },
    staticImg: { width: "22px", height: "22px", filter: "brightness(0) invert(1)" }
};
