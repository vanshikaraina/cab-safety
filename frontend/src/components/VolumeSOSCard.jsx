// src/components/VolumeSOSCard.jsx
import React from "react";
import "../styles/VolumeSOSCard.css";

export default function VolumeSOSCard({ armed, onToggle, pressCount = 0, isMobileUnsupported }) {
  return (
    <div className={`vsос-card ${armed && !isMobileUnsupported ? "vsос-card-armed" : ""} ${isMobileUnsupported ? "vsос-card-disabled" : ""}`}>

      <div className="vsос-header">
        <div className="vsос-icon-wrap">
          <span className="vsос-icon">🔉</span>
        </div>
        <div className="vsос-info">
          <p className="vsос-title">Volume Button SOS</p>
          <p className="vsос-desc">Press Volume Down 3× fast to send SOS</p>
        </div>

        {isMobileUnsupported ? (
          <span className="vsос-unsupported-badge">Desktop Only</span>
        ) : (
          <button
            className={`vsос-toggle ${armed ? "vsос-toggle-on" : "vsос-toggle-off"}`}
            onClick={() => onToggle(!armed)}
            aria-label={armed ? "Disarm" : "Arm"}
          >
            <span className="vsос-toggle-knob" />
          </button>
        )}
      </div>

      {/* Mobile: clear explanation */}
      {isMobileUnsupported && (
        <div className="vsос-mobile-notice">
          <p className="vsос-notice-heading">⚠️ Not supported on mobile browsers</p>
          <p className="vsос-notice-body">
            Android and iOS block volume key events from all web apps at the OS level —
            this is a system security restriction that cannot be bypassed.
            <br /><br />
            <strong>Use Shake SOS instead</strong> — it works on all mobile devices and is
            actually more reliable in an emergency.
          </p>
        </div>
      )}

      {/* Desktop: live press feedback steps */}
      {!isMobileUnsupported && (
        <>
          <div className="vsос-steps">
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <div className={`vsос-step ${armed ? "vsос-step-armed" : ""} ${pressCount >= n ? "vsос-step-pressed" : ""}`}>
                  <span className="vsос-step-num">{pressCount >= n ? "✓" : n}</span>
                  <span className="vsос-step-label">Vol Down</span>
                </div>
                {n < 3 && <span className="vsос-step-arrow">›</span>}
              </React.Fragment>
            ))}
            <span className="vsос-step-arrow">›</span>
            <div className={`vsос-step vsос-step-result ${armed ? "vsос-step-armed" : ""}`}>
              <span className="vsос-step-num">🆘</span>
              <span className="vsос-step-label">SOS Sent</span>
            </div>
          </div>

          <div className={`vsос-status ${armed ? "vsос-status-armed" : "vsос-status-idle"}`}>
            <span className="vsос-status-dot" />
            <span className="vsос-status-text">
              {armed
                ? pressCount > 0
                  ? `${pressCount}/3 presses detected — keep going!`
                  : "Armed — listening for Volume Down × 3"
                : "Disarmed — toggle to activate"}
            </span>
          </div>

          {armed && (
            <p className="vsос-note">
              ⚡ Works while this tab is open on desktop. Keep the window visible for best results.
            </p>
          )}
        </>
      )}
    </div>
  );
}