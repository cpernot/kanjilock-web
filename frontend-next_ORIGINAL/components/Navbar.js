"use client";
import Link from "next/link";
import { getPlayer, clearPlayer } from "@/lib/player";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [player, setPlayerState] = useState(null);

  useEffect(() => {
    setPlayerState(getPlayer());
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
            <Link href="/compose">Compose</Link>
            <Link href="/stats">Stats</Link>
            <Link href="/ranking">Ranking</Link>
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
    background: "#111",
    color: "white",
  },
  left: { fontWeight: "bold", fontSize: "18px" },
  right: { display: "flex", gap: "15px", alignItems: "center" },
  logo: { color: "white", textDecoration: "none" },
  player: { opacity: 0.8 },
  logout: { background: "red", color: "white", border: "none", padding: "5px 10px" },
};
