"use client";
import React, { useState, useEffect } from 'react';

const SAMPLE_KANJI = [
  { k: "愛", m: "Love" },
  { k: "龍", m: "Dragon" },
  { k: "和", m: "Harmony" },
  { k: "夢", m: "Dream" },
  { k: "力", m: "Power" },
  { k: "海", m: "Ocean" },
  { k: "空", m: "Sky" },
  { k: "山", m: "Mountain" },
  { k: "心", m: "Heart" },
  { k: "光", m: "Light" },
  { k: "風", m: "Wind" },
  { k: "魂", m: "Soul" },
  { k: "道", m: "Way/Path" },
  { k: "信", m: "Believe" },
  { k: "友", m: "Friend" },
  { k: "静", m: "Quiet" },
  { k: "美", m: "Beauty" },
  { k: "輝", m: "Shine" },
  { k: "命", m: "Life" },
  { k: "永", m: "Eternity" }
];

export default function LoadingOverlay({ message = "Initializing..." }) {
  const [randomKanji, setRandomKanji] = useState([]);

  useEffect(() => {
    // Pick 3 random kanji
    const shuffled = [...SAMPLE_KANJI].sort(() => 0.5 - Math.random());
    setRandomKanji(shuffled.slice(0, 3));
  }, []);

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <h1 style={styles.title}>KanjiLock</h1>
        
        <div style={styles.kanjiRow}>
          {randomKanji.map((item, i) => (
            <div key={i} style={styles.kanjiCard}>
              <div style={styles.kanjiChar}>{item.k}</div>
              <div style={styles.kanjiMeaning}>{item.m}</div>
            </div>
          ))}
        </div>

        <div style={styles.infoBox}>
          <p style={styles.waitText}>
            <span style={{ fontSize: "1.2rem", color: "#3b82f6", fontWeight: "bold" }}>🚀 Server is waking up...</span><br/>
            Render and Vercel are spinning up the backend. This typically takes <b>1-2 minutes</b> during cold starts. 
            Once connected, your progress will sync instantly.
          </p>
          
          <div style={styles.divider} />
          
          <h3 style={styles.subtitle}>Did you know?</h3>
          <ul style={styles.list}>
            <li><b>SRS Learning:</b> KanjiLock uses Spaced Repetition to ensure you never forget.</li>
            <li><b>Mastery Levels:</b> Cards move from L1 to L4. L4 means you've mastered it!</li>
            <li><b>Custom Targets:</b> You can set daily or weekly goals in the Targets page.</li>
            <li><b>Progressive Mode:</b> New boxes unlock only when you master previous ones.</li>
          </ul>
        </div>

        <div style={styles.loader}>
          <div style={styles.spinner} />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: '#020617',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: '#fff',
    fontFamily: "'Inter', sans-serif"
  },
  content: { maxWidth: '500px', width: '100%', textAlign: 'center' },
  title: { fontSize: '3rem', fontWeight: '900', marginBottom: '40px', background: 'linear-gradient(135deg, #fff 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  kanjiRow: { display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' },
  kanjiCard: { 
    background: 'rgba(255,255,255,0.05)', 
    padding: '15px', 
    borderRadius: '20px', 
    border: '1px solid rgba(255,255,255,0.1)',
    width: '100px',
    animation: 'pulse 2s infinite ease-in-out'
  },
  kanjiChar: { fontSize: '2.5rem', marginBottom: '5px' },
  kanjiMeaning: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' },
  infoBox: { 
    background: 'rgba(30, 41, 59, 0.5)', 
    padding: '25px', 
    borderRadius: '24px', 
    border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'left',
    lineHeight: '1.6'
  },
  waitText: { fontSize: '0.95rem', color: '#cbd5e1', marginBottom: '15px' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.1)', margin: '15px 0' },
  subtitle: { fontSize: '1rem', color: '#fff', marginBottom: '10px' },
  list: { paddingLeft: '20px', color: '#94a3b8', fontSize: '0.85rem' },
  loader: { marginTop: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', color: '#94a3b8' },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
