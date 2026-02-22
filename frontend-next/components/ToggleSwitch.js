"use client";
import React from "react";
import "./ToggleSwitch.css";

const ToggleSwitch = ({ checked, onChange, labelOn = "オン", labelOff = "オフ" }) => {
    return (
        <div
            className={`toggle-container ${checked ? "checked" : ""}`}
            onClick={() => onChange(!checked)}
        >
            <span className="toggle-label">{checked ? labelOn : labelOff}</span>
            <div className="toggle-switch"></div>
            <input
                type="checkbox"
                className="toggle-checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                aria-hidden="true"
            />
        </div>
    );
};

export default ToggleSwitch;
