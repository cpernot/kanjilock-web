"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getPlayer_setting } from "@/lib/settings";

export default function AuthGuard({ children }) {
    const [player, setPlayer] = useState(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const p = getPlayer_setting();
        setPlayer(p);
        setLoading(false);
    }, [pathname]);

    // Normalize path to handle trailing slashes
    const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    const isPublic = normalizedPath === "/login"; 

    if (loading) return null;

    // If not logged in and trying to access a non-public page, show the gate
    if (!player && !isPublic) {
        return (
            <div style={styles.loginCard}>
                <h1 style={styles.title}>🔒 KanjiLock</h1>
                <p style={styles.text}>Please log in to access this feature and track your progress.</p>
                <button 
                    onClick={() => router.push("/login")} 
                    style={{ ...styles.startBtn, cursor: 'pointer', border: 'none' }}
                >
                    Login to Continue
                </button>
            </div>
        );
    }

    // Otherwise, allow the content to render
    return children;
}

const styles = {
    loginCard: { 
        marginTop: "60px", 
        background: "rgba(30, 41, 59, 0.4)", 
        padding: "40px", 
        borderRadius: "24px", 
        border: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center",
        maxWidth: "500px",
        margin: "60px auto",
        backdropFilter: "blur(12px)"
    },
    title: {
        fontSize: "2rem",
        color: "#fff",
        marginBottom: "15px"
    },
    text: {
        color: "#94a3b8",
        marginBottom: "30px",
        fontSize: "1.1rem"
    },
    startBtn: { 
        textDecoration: "none", 
        background: "#3b82f6", 
        padding: "14px 28px", 
        borderRadius: "14px", 
        color: "white", 
        fontWeight: "bold", 
        display: "inline-block", 
        transition: "all 0.2s",
        boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)"
    }
};
