import React from "react";
import "../styles/VolumeSOSCard.css";

export default function VolumeSOSCard({
  armed,
  onToggle,
  pressCount = 0,
  isMobileUnsupported,
}) {
  return (
    <div
      className={`vsos-card ${
        armed && !isMobileUnsupported ? "vsos-card-armed" : ""
      } ${isMobileUnsupported ? "vsos-card-disabled" : ""}`}
    >
      <div className="vsos-header">
        <div className="vsos-icon-wrap">
          <span className="vsos-icon">🔉</span>
        </div>

        <div className="vsos-info">
          <p className="vsos-title">Volume Button SOS</p>
          <p className="vsos-desc">
            Press Volume Down, V, or ↓ key 3× fast to send SOS
          </p>
        </div>

        {isMobileUnsupported ? (
          <span className="vsos-unsupported-badge">Desktop Only</span>
        ) : (
          <button
            className={`vsos-toggle ${
              armed ? "vsos-toggle-on" : "vsos-toggle-off"
            }`}
            onClick={() => onToggle(!armed)}
            aria-label={armed ? "Disarm" : "Arm"}
          >
            <span className="vsos-toggle-knob" />
          </button>
        )}
      </div>

      {isMobileUnsupported && (
        <div className="vsos-mobile-notice">
          <p className="vsos-notice-heading">
            ⚠️ Not supported on mobile browsers
          </p>
          <p className="vsos-notice-body">
            Android and iOS block volume key events from web apps.
          </p>
        </div>
      )}

      {!isMobileUnsupported && (
        <>
          <div className="vsos-steps">
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <div
                  className={`vsos-step ${
                    armed ? "vsos-step-armed" : ""
                  } ${pressCount >= n ? "vsos-step-pressed" : ""}`}
                >
                  <span className="vsos-step-num">
                    {pressCount >= n ? "✓" : n}
                  </span>
                  <span className="vsos-step-label">Key Press</span>
                </div>

                {n < 3 && <span className="vsos-step-arrow">›</span>}
              </React.Fragment>
            ))}

            <span className="vsos-step-arrow">›</span>

            <div
              className={`vsos-step vsos-step-result ${
                armed ? "vsos-step-armed" : ""
              }`}
            >
              <span className="vsos-step-num">🆘</span>
              <span className="vsos-step-label">SOS Sent</span>
            </div>
          </div>

          <div
            className={`vsos-status ${
              armed ? "vsos-status-armed" : "vsos-status-idle"
            }`}
          >
            <span className="vsos-status-dot" />
            <span className="vsos-status-text">
              {armed
                ? pressCount > 0
                  ? `${pressCount}/3 presses detected — keep going!`
                  : "Armed — press Volume Down, V, or ↓ key 3×"
                : "Disarmed — toggle to activate"}
            </span>
          </div>

          {armed && (
            <p className="vsos-note">
              ⚡ If your laptop blocks volume keys, press V or ↓ three times.
            </p>
          )}
        </>
      )}
    </div>
  );
}