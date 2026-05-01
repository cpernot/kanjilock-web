"use client";
import { useState, useEffect, useRef } from "react";
import { getPlayer, setPlayer } from "@/lib/player";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => {
    const existing = getPlayer();
    if (existing) {
      router.push("/quiz"); // already logged in
      return;
    }
    // Auto-focus on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  function handleLogin() {
    if (!name.trim()) return alert("Enter a name");
    setPlayer(name.trim());
    // Trigger the custom event for the Navbar
    window.dispatchEvent(new Event("playerLogin"));
    // Full redirect to ensure app-wide state sync
    router.push("/quiz");
  }

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1>KanjiLock</h1>
      <p>Enter your player name</p>

      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoFocus
        style={{ padding: "10px", fontSize: "16px" }}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      />

      <br /><br />

      <button onClick={handleLogin} style={{ padding: "10px 20px" }}>
        Start
      </button>
    </div>
  );
}
