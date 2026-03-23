// src/components/CountdownSOSCard.jsx
import React, { useState } from "react";
import "../styles/CountdownSOSCard.css";

const PRESETS = [5, 10, 15, 30, 60];

export default function CountdownSOSCard({ active, secondsLeft, onStart, onCancel, totalSeconds }) {
  const [selected, setSelected] = useState(10);

  const pct   = active && totalSeconds ? secondsLeft / totalSeconds : 1;
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * pct;
  const urgent = active && secondsLeft <= 3;

  return (
    <div className={`cd-card ${active ? "cd-card-active" : ""} ${urgent ? "cd-card-urgent" : ""}`}>

      <div className="cd-header">
        <div className="cd-icon-wrap">
          <span className="cd-icon">⏱</span>
        </div>
        <div className="cd-info">
          <p className="cd-title">Countdown SOS</p>
          <p className="cd-desc">Auto-sends SOS if you don't cancel in time</p>
        </div>

        {/* Countdown ring — only visible when active */}
        {active && (
          <div className="cd-ring-wrap">
            <svg width="64" height="64" viewBox="0 0 68 68">
              <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(239,68,68,0.12)" strokeWidth="5" />
              <circle
                cx="34" cy="34" r={r} fill="none"
                stroke={urgent ? "#ef4444" : "#f97316"}
                strokeWidth="5"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform="rotate(-90 34 34)"
                style={{ transition: "stroke-dasharray 0.9s linear" }}
              />
            </svg>
            <span className={`cd-ring-num ${urgent ? "cd-ring-urgent" : ""}`}>{secondsLeft}</span>
          </div>
        )}
      </div>

      {/* Preset picker — only when not active */}
      {!active && (
        <>
          <p className="cd-label">Send SOS in…</p>
          <div className="cd-presets">
            {PRESETS.map((s) => (
              <button
                key={s}
                className={`cd-preset ${selected === s ? "cd-preset-active" : ""}`}
                onClick={() => setSelected(s)}
              >
                {s < 60 ? `${s}s` : "1 min"}
              </button>
            ))}
          </div>
          <button className="cd-start-btn" onClick={() => onStart(selected)}>
            ⏱ Start {selected < 60 ? `${selected}s` : "1 min"} Countdown
          </button>
        </>
      )}

      {/* Cancel — only when active */}
      {active && (
        <div className="cd-active-body">
          <p className={`cd-active-msg ${urgent ? "cd-active-msg-urgent" : ""}`}>
            {urgent
              ? "⚠️ SOS sending NOW — tap cancel immediately if you're safe!"
              : `SOS will be sent in ${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} unless you cancel.`}
          </p>
          <button className="cd-cancel-btn" onClick={onCancel}>
            ✅ I'm Safe — Cancel
          </button>
        </div>
      )}
    </div>
  );
}