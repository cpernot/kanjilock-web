"use client";
import Link from "next/link";

export default function PricingPage() {
    const plans = [
        {
            name: "Free",
            price: "$0",
            features: [
                "Local Progress Tracking",
                "Basic SRS Access",
                "Standard Quiz Modes",
                "Community Discord"
            ],
            color: "#94a3b8",
            btnText: "Current Plan"
        },
        {
            name: "Ninja",
            price: "$5",
            features: [
                "Everything in Free",
                "Remote Storage Sync",
                "Custom Priority Targets",
                "Detailed Statistics",
                "Ad-free Experience"
            ],
            color: "#38bdf8",
            highlight: true,
            btnText: "Level Up"
        },
        {
            name: "Shogun",
            price: "$12",
            features: [
                "Everything in Ninja",
                "AI-Powered Learning Paths",
                "Exclusive Visual Themes",
                "Priority Support",
                "Signature Profile Badge"
            ],
            color: "#FFD700",
            btnText: "Master It All"
        }
    ];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Unlock Your Kanji Potential</h1>
                <p style={styles.subtitle}>Choose the path that fits your learning journey</p>
            </div>

            <div style={styles.grid}>
                {plans.map((plan, i) => (
                    <div key={i} style={{
                        ...styles.card,
                        borderColor: plan.highlight ? plan.color : "rgba(255,255,255,0.1)",
                        transform: plan.highlight ? "scale(1.05)" : "none"
                    }}>
                        {plan.highlight && <div style={{ ...styles.badge, background: plan.color }}>Recommended</div>}
                        <h2 style={{ ...styles.planName, color: plan.color }}>{plan.name}</h2>
                        <div style={styles.price}>{plan.price}<span style={styles.perMonth}>/mo</span></div>

                        <ul style={styles.featureList}>
                            {plan.features.map((f, fi) => (
                                <li key={fi} style={styles.featureItem}>
                                    <span style={{ color: plan.color, marginRight: "10px" }}>✓</span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <button style={{
                            ...styles.btn,
                            background: plan.highlight ? plan.color : "transparent",
                            border: `2px solid ${plan.color}`,
                            color: plan.highlight ? "#0f172a" : plan.color
                        }}>
                            {plan.btnText}
                        </button>
                    </div>
                ))}
            </div>


        </div>
    );
}

const styles = {
    container: {
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "60px 20px",
        fontFamily: "'Inter', sans-serif",
        color: "#fff"
    },
    header: { textAlign: "center", marginBottom: "60px" },
    title: { fontSize: "3rem", fontWeight: "800", marginBottom: "16px", background: "linear-gradient(to right, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
    subtitle: { fontSize: "1.2rem", color: "#94a3b8" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px", alignItems: "start" },
    card: {
        background: "rgba(30, 41, 59, 0.4)",
        backdropFilter: "blur(10px)",
        borderRadius: "24px",
        padding: "40px",
        border: "1px solid",
        position: "relative",
        transition: "all 0.3s ease",
        display: "flex",
        flexDirection: "column"
    },
    badge: { position: "absolute", top: "-12px", right: "20px", padding: "4px 12px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: "bold", color: "#0f172a" },
    planName: { fontSize: "1.5rem", fontWeight: "bold", marginBottom: "10px" },
    price: { fontSize: "2.5rem", fontWeight: "700", marginBottom: "30px" },
    perMonth: { fontSize: "1rem", color: "#94a3b8", marginLeft: "4px" },
    featureList: { listStyle: "none", padding: 0, margin: "0 0 40px 0", textAlign: "left" },
    featureItem: { marginBottom: "12px", fontSize: "0.95rem", color: "#cbd5e1", display: "flex", alignItems: "start" },
    btn: { padding: "14px", borderRadius: "12px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer", transition: "all 0.2s" },
    footer: { marginTop: "60px", textAlign: "center" },
    backLink: { color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem" }
};
