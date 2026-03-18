"use client";
import React from 'react';

const ContributionGraph = ({ data = {} }) => {
    // Generate dates for the last 12 months
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Adjust to the start of the week (Sunday)
    const startDate = new Date(oneYearAgo);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks = [];
    let currentDay = new Date(startDate);

    // Create 53 weeks (to cover a full year + overlap)
    for (let w = 0; w < 53; w++) {
        const week = [];
        for (let d = 0; d < 7; d++) {
            const dateStr = currentDay.toISOString().split('T')[0];
            week.push({
                date: dateStr,
                count: data[dateStr] || 0,
                isToday: dateStr === today.toISOString().split('T')[0],
                isPast: currentDay <= today && currentDay >= oneYearAgo
            });
            currentDay.setDate(currentDay.getDate() + 1);
        }
        weeks.push(week);
    }

    const getColor = (count) => {
        if (count === 0) return "rgba(255, 255, 255, 0.05)";
        if (count < 5) return "#0e4429";
        if (count < 10) return "#006d32";
        if (count < 20) return "#26a641";
        return "#39d353";
    };

    const monthLabels = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
        const firstDayOfMonth = new Date(week[0].date);
        const month = firstDayOfMonth.getMonth();
        if (month !== lastMonth) {
            monthLabels.push({ label: firstDayOfMonth.toLocaleString('default', { month: 'short' }), index: i });
            lastMonth = month;
        }
    });

    return (
        <div style={styles.outerContainer}>
            <div style={styles.monthLabels}>
                {monthLabels.map((m, i) => (
                    <span key={i} style={{ ...styles.monthLabel, left: `${m.index * 14}px` }}>
                        {m.label}
                    </span>
                ))}
            </div>

            <div style={styles.graphContainer}>
                <div style={styles.dayLabels}>
                    <span></span>
                    <span>Mon</span>
                    <span></span>
                    <span>Wed</span>
                    <span></span>
                    <span>Fri</span>
                    <span></span>
                </div>

                <div style={styles.weeksContainer}>
                    {weeks.map((week, wi) => (
                        <div key={wi} style={styles.week}>
                            {week.map((day, di) => (
                                <div
                                    key={di}
                                    title={`${day.date}: ${day.count} contributions`}
                                    style={{
                                        ...styles.cell,
                                        background: day.isPast ? getColor(day.count) : "transparent",
                                        border: day.isToday ? "1px solid #fff" : "none"
                                    }}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.footer}>
                <span>Less</span>
                <div style={{ ...styles.cell, background: "rgba(255,255,255,0.05)" }} />
                <div style={{ ...styles.cell, background: "#0e4429" }} />
                <div style={{ ...styles.cell, background: "#006d32" }} />
                <div style={{ ...styles.cell, background: "#26a641" }} />
                <div style={{ ...styles.cell, background: "#39d353" }} />
                <span>More</span>
            </div>
        </div>
    );
};

const styles = {
    outerContainer: {
        display: "inline-block",
        padding: "20px",
        background: "rgba(15, 23, 42, 0.6)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        color: "#94a3b8",
        fontSize: "0.75rem",
        overflowX: "auto",
        maxWidth: "100%"
    },
    monthLabels: {
        display: "flex",
        height: "20px",
        position: "relative",
        marginBottom: "5px",
        marginLeft: "30px"
    },
    monthLabel: {
        position: "absolute",
    },
    graphContainer: {
        display: "flex",
        gap: "8px"
    },
    dayLabels: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "98px", // 7 * 14px
        paddingRight: "5px",
        textAlign: "right",
        width: "30px"
    },
    weeksContainer: {
        display: "flex",
        gap: "3px"
    },
    week: {
        display: "flex",
        flexDirection: "column",
        gap: "3px"
    },
    cell: {
        width: "11px",
        height: "11px",
        borderRadius: "2px"
    },
    footer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "4px",
        marginTop: "15px",
        fontSize: "0.7rem"
    }
};

export default ContributionGraph;
