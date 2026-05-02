"use client";
import { useEffect, useState } from "react";

export default function SplashScreen() {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        setMounted(true);
        // Ensure the splash stays at least long enough to avoid flickering
        const timer = setTimeout(() => {
            setVisible(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className={`splash-container ${!mounted ? '' : ''}`}>
            <div className="splash-logo">KanjiLock</div>
            <div className="spinner-loader"></div>
            <p style={{ marginTop: '20px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '500' }}>
                Initializing KanjiLock ...
            </p>
        </div>
    );
}
