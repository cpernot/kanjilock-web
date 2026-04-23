"use client";
import { useState, useRef, useEffect } from "react";
import config from "../lib/config";

export default function SenseiChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: "sensei", text: "Bonjour ! Je suis SenseiLock. Comment puis-je t'aider aujourd'hui ?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput("");
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
            setMessages(prev => [...prev, { role: "sensei", text: data.response || data.reply || "Désolé, je n'ai pas pu répondre." }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: "sensei", text: "Oh, mon cerveau de robot est un peu fatigué... (Erreur de connexion)" }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div style={styles.chatWrapper}>
            {/* Bubble */}
            <button onClick={() => setIsOpen(!isOpen)} style={styles.bubble}>
                {isOpen ? "✖" : "🏮"}
            </button>

            {/* Window */}
            {isOpen && (
                <div style={styles.window}>
                    <div style={styles.header}>
                        <div style={styles.status}></div>
                        <span>SenseiLock AI</span>
                    </div>

                    <div ref={scrollRef} style={styles.messageList}>
                        {messages.map((m, i) => (
                            <div key={i} style={{
                                ...styles.message,
                                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                background: m.role === "user" ? "#3b82f6" : "rgba(255,255,255,0.05)",
                                border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",
                                borderBottomRightRadius: m.role === "user" ? "4px" : "16px",
                                borderBottomLeftRadius: m.role === "sensei" ? "4px" : "16px",
                            }}>
                                {m.text}
                            </div>
                        ))}
                        {isTyping && (
                            <div style={{ ...styles.message, alignSelf: "flex-start", background: "rgba(255,255,255,0.02)", fontStyle: "italic", fontSize: "0.8rem", color: "#94a3b8" }}>
                                Sensei réfléchit...
                            </div>
                        )}
                    </div>

                    <div style={styles.inputArea}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="Pose une question..."
                            style={styles.input}
                        />
                        <button onClick={handleSend} style={styles.sendBtn}>➔</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    chatWrapper: {
        position: "fixed",
        bottom: "30px",
        right: "30px",
        zIndex: 2000,
        fontFamily: "'Inter', sans-serif"
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
        transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "&:hover": { transform: "scale(1.1)" }
    },
    window: {
        position: "absolute",
        bottom: "80px",
        right: "0",
        width: "320px",
        height: "450px",
        background: "#0f172a",
        borderRadius: "24px",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        animation: "slideIn 0.3s ease-out"
    },
    header: {
        padding: "15px 20px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        color: "#fff",
        fontWeight: "bold",
        fontSize: "0.9rem"
    },
    status: {
        width: "8px",
        height: "8px",
        borderRadius: "4px",
        background: "#22c55e",
        boxShadow: "0 0 8px #22c55e"
    },
    messageList: {
        flex: 1,
        padding: "20px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
    },
    message: {
        padding: "12px 16px",
        borderRadius: "16px",
        maxWidth: "85%",
        fontSize: "0.9rem",
        lineHeight: "1.4",
        color: "#f1f5f9"
    },
    inputArea: {
        padding: "15px",
        background: "rgba(255,255,255,0.03)",
        display: "flex",
        gap: "10px"
    },
    input: {
        flex: 1,
        background: "rgba(0,0,0,0.2)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "10px",
        padding: "8px 12px",
        color: "#fff",
        fontSize: "0.85rem",
        outline: "none"
    },
    sendBtn: {
        background: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "8px 12px",
        cursor: "pointer",
        fontWeight: "bold"
    }
};
