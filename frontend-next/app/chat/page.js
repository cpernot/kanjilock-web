"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import config from "@/lib/config";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useSearchParams } from "next/navigation";

function ChatContent() {
    const searchParams = useSearchParams();
    const [messages, setMessages] = useState([
        { role: "assistant", content: "Bonjour ! Je suis Sensei. Comment puis-je vous aider dans votre apprentissage du japonais aujourd'hui ?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [player, setPlayer] = useState(null);
    const messagesEndRef = useRef(null);
    const hasAutoSent = useRef(false);

    useEffect(() => {
        const p = localStorage.getItem("kanjilock_player");
        setPlayer(p);
        
        // Handle auto-query from URL
        const query = searchParams.get("q");
        if (query && !hasAutoSent.current) {
            hasAutoSent.current = true;
            // We need to wait a tiny bit to ensure state is ready if needed, 
            // but here we can just call the send logic
            handleSend(query);
        }
    }, [searchParams]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async (overrideInput = null) => {
        const messageToSend = overrideInput || input;
        if (!messageToSend.trim() || loading) return;

        const userMsg = { role: "user", content: messageToSend };
        setMessages(prev => [...prev, userMsg]);
        if (!overrideInput) setInput("");
        setLoading(true);

        try {
            const currentPlayer = player || localStorage.getItem("kanjilock_player");
            const res = await fetch(`${config.apiBaseUrl}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    player: currentPlayer || "Guest",
                    message: messageToSend,
                    history: messages.slice(-5) // Send last 5 for context
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => [...prev, { role: "assistant", content: data.reply || data.response }]);
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Désolé, je rencontre une petite difficulté technique. Veuillez réessayer plus tard." }]);
            }
        } catch (e) {
            console.error("Chat error", e);
            setMessages(prev => [...prev, { role: "assistant", content: "Erreur de connexion au Sensei." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <img src="/icons/unlock2.png" alt="Chat" style={styles.headerIcon} />
                <h1 style={styles.title}>Sensei Chat</h1>
            </div>

            <div style={styles.chatBox}>
                <div style={styles.messages}>
                    {messages.map((m, i) => (
                        <div key={i} style={{
                            ...styles.message,
                            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                            background: m.role === "user" ? "#3b82f6" : "rgba(255,255,255,0.05)",
                            borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px"
                        }}>
                            {m.content}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ ...styles.message, alignSelf: "flex-start", background: "rgba(255,255,255,0.05)", borderRadius: "20px 20px 20px 4px", display: "flex", gap: "4px" }}>
                            <span style={styles.dot}>.</span><span style={styles.dot}>.</span><span style={styles.dot}>.</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div style={styles.inputArea}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Posez votre question à Sensei..."
                        style={styles.input}
                        disabled={loading}
                    />
                    <button onClick={() => handleSend()} style={styles.sendBtn} disabled={loading}>
                        {loading ? "..." : "✈️"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<LoadingOverlay message="Initialisation du Sensei..." />}>
            <ChatContent />
        </Suspense>
    );
}

const styles = {
    container: { maxWidth: "800px", margin: "0 auto", padding: "40px 20px", height: "calc(100vh - 150px)", display: "flex", flexDirection: "column" },
    header: { display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "30px" },
    headerIcon: { width: "40px", height: "40px", filter: "brightness(0) invert(1)" },
    title: { fontSize: "2rem", fontWeight: "800", color: "#fff", margin: 0 },
    chatBox: { flex: 1, background: "rgba(30, 41, 59, 0.4)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden" },
    messages: { flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "15px" },
    message: { maxWidth: "80%", padding: "12px 18px", fontSize: "0.95rem", lineHeight: "1.5", color: "#fff" },
    inputArea: { padding: "20px", background: "rgba(15, 23, 42, 0.5)", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "10px" },
    input: { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px 15px", color: "#fff", outline: "none" },
    sendBtn: { background: "#3b82f6", color: "white", border: "none", borderRadius: "12px", width: "50px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold" },
    dot: { animation: "blink 1.4s infinite both" }
};
