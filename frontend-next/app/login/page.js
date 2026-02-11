"use client";
import { useState, useEffect } from "react";
import { getPlayer, setPlayer } from "@/lib/player";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    const existing = getPlayer();
    if (existing) {
      router.push("/quiz"); // already logged in
    }
  }, []);

  function handleLogin() {
    if (!name.trim()) return alert("Enter a name");
    setPlayer(name.trim());
    // Trigger the custom event for the Navbar
    window.dispatchEvent(new Event("playerLogin"));
    // Full redirect to ensure app-wide state sync
    window.location.href = "/quiz";
  }

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1>KanjiLock</h1>
      <p>Enter your player name</p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        style={{ padding: "10px", fontSize: "16px" }}
      />

      <br /><br />

      <button onClick={handleLogin} style={{ padding: "10px 20px" }}>
        Start
      </button>
    </div>
  );
}
