"use client";
import Link from "next/link";
import { getPlayer, clearPlayer } from "@/lib/player";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [player, setPlayerState] = useState(null);

  useEffect(() => {
    // Initial check
    const checkPlayer = () => setPlayerState(getPlayer());
    checkPlayer();

    // Listen for changes (e.g. from other tabs or local login)
    window.addEventListener("storage", checkPlayer);

    // Custom event for same-page updates
    window.addEventListener("playerLogin", checkPlayer);

    return () => {
      window.removeEventListener("storage", checkPlayer);
      window.removeEventListener("playerLogin", checkPlayer);
    };
  }, []);

  function logout() {
    clearPlayer();
    window.location.href = "/login";
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link href="/" style={styles.logo}>KanjiLock</Link>
      </div>

      <div style={styles.right}>
        {player ? (
          <>
            <Link href="/quiz">Quiz</Link>
            <Link href="/flashcards">Flashcards</Link>
            <Link href="/targets">Targets</Link>
            <Link href="/ranking">Ranking</Link>
            <Link href="/stats">Stats</Link>
            <Link href="/pricing" style={{ color: "#FFD700", fontWeight: "bold" }}>Join Elite</Link>
            <span style={styles.player}>👤 {player}</span>
            <button onClick={logout} style={styles.logout}>Logout</button>
          </>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 20px",
    paddingTop: "calc(15px + env(safe-area-inset-top))", // Extra room for iOS notch
    background: "#111",
    color: "white",
    fontSize: "14px",
    flexWrap: "wrap",
    gap: "10px",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 10px rgba(0,0,0,0.5)"
  },
  left: { fontWeight: "bold", fontSize: "20px" },
  right: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end"
  },
  logo: { color: "white", textDecoration: "none" },
  player: { opacity: 0.8, fontSize: "12px" },
  logout: { background: "red", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px" },
};
