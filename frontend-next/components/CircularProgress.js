"use client";

export default function CircularProgress({ 
    percentage, 
    label, 
    color = "#2196F3", 
    size = 120, 
    strokeWidth = 10,
    subtitle = "" 
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: size,
            margin: "10px"
        }}>
            <div style={{ position: "relative", width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                    {/* Background Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        style={{
                            strokeDashoffset: offset,
                            transition: "stroke-dashoffset 0.5s ease-out",
                            strokeLinecap: "round"
                        }}
                    />
                </svg>
                {/* Center Text */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <span style={{ fontSize: size * 0.18, fontWeight: "bold", color: "#fff" }}>
                        {Math.round(percentage)}%
                    </span>
                    {subtitle && (
                        <span style={{ fontSize: size * 0.08, color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>
            {label && (
                <span style={{ 
                    marginTop: "8px", 
                    fontSize: "0.9rem", 
                    fontWeight: "500", 
                    color: "rgba(255,255,255,0.8)" 
                }}>
                    {label}
                </span>
            )}
        </div>
    );
}
