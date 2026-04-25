"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPlayer } from "@/lib/player";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [player, setPlayerState] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    const checkPlayer = () => setPlayerState(getPlayer());
    checkPlayer();
    window.addEventListener("storage", checkPlayer);
    window.addEventListener("playerLogin", checkPlayer);
    return () => {
      window.removeEventListener("storage", checkPlayer);
      window.removeEventListener("playerLogin", checkPlayer);
    };
  }, []);

  if (!player && pathname === "/login") return null;

  return (
    <>
      {/* Top Header */}
      <header style={styles.topBar}>
        <Link href="/" style={styles.logo}>
          <span style={styles.logoLock}>Kanji</span>Lock
        </Link>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/pricing" style={styles.settingsBtn} title="Pricing">
            <span style={styles.icon}>💎</span>
          </Link>
          <Link href="/settings" style={styles.settingsBtn} title="Settings">
            <span style={styles.icon}>⚙️</span>
          </Link>
          <button 
            onClick={() => {
                localStorage.removeItem("kanjilock_player");
                window.dispatchEvent(new Event("playerLogin"));
                window.location.href = "/login";
            }} 
            style={styles.logoutBtn} 
            title="Logout"
          >
            <span style={styles.icon}>🚪</span>
          </button>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav style={styles.bottomNav}>
        <div style={styles.navContainer}>
          <Link href="/" style={{ ...styles.navItem, ...(pathname === "/" ? styles.active : {}) }}>
            <span style={styles.navIcon}>🏠</span>
            <span style={styles.navLabel}>Home</span>
          </Link>
          
          <Link href="/quiz" style={{ ...styles.navItem, ...(pathname === "/quiz" ? styles.active : {}) }}>
            <span style={styles.navIcon}>🎯</span>
            <span style={styles.navLabel}>Quiz</span>
          </Link>

          <Link href="/flashcards" style={{ ...styles.navItem, ...(pathname === "/flashcards" ? styles.active : {}) }}>
            <span style={styles.navIcon}>📇</span>
            <span style={styles.navLabel}>Cards</span>
          </Link>

          <Link href="/targets" style={{ ...styles.navItem, ...(pathname === "/targets" ? styles.active : {}) }}>
            <span style={styles.navIcon}>🏁</span>
            <span style={styles.navLabel}>Targets</span>
          </Link>
        </div>
      </nav>
    </>
  );
}

const styles = {
  topBar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "60px",
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 20px",
    zIndex: 1000,
    paddingTop: "env(safe-area-inset-top)"
  },
  logo: {
    fontSize: "1.4rem",
    fontWeight: "800",
    color: "#fff",
    textDecoration: "none",
    letterSpacing: "-0.5px"
  },
  logoLock: {
    color: "#3b82f6"
  },
  settingsBtn: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.05)",
    textDecoration: "none",
    fontSize: "1.2rem",
    transition: "all 0.2s",
    border: "none",
    cursor: "pointer",
    color: "#fff"
  },
  logoutBtn: {
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    textDecoration: "none",
    fontSize: "1.2rem",
    transition: "all 0.2s",
    cursor: "pointer",
    color: "#ef4444"
  },
  bottomNav: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 40px)",
    maxWidth: "400px",
    height: "70px",
    background: "rgba(30, 41, 59, 0.85)",
    backdropFilter: "blur(20px)",
    borderRadius: "24px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    boxSizing: "border-box"
  },
  navContainer: {
    display: "flex",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center"
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    gap: "4px",
    opacity: 0.5,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    padding: "8px 12px",
    borderRadius: "16px"
  },
  active: {
    opacity: 1,
    background: "rgba(59, 130, 246, 0.15)",
    color: "#3b82f6"
  },
  navIcon: {
    fontSize: "1.4rem"
  },
  navLabel: {
    fontSize: "0.65rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#fff"
  }
};
