// src/components/ShakeSOSCard.jsx
import React from "react";
import "../styles/ShakeSOSCard.css";

export default function ShakeSOSCard({
  armed,
  onToggle,
  shakeCount = 0,
  permissionState, // "unknown" | "prompt" | "granted" | "denied" | "unavailable"
  onRequestPermission,
}) {
  const isUnavailable = permissionState === "unavailable";
  const isDenied      = permissionState === "denied";
  const needsPrompt   = permissionState === "prompt";
  const isUnknown     = permissionState === "unknown";
  const canArm        = permissionState === "granted";

  // ── Toggle handler ───────────────────────────────────────────
  const handleToggle = async () => {
    if (armed) {
      onToggle(false);
      return;
    }

    if (needsPrompt || isUnknown) {
      const granted = await onRequestPermission();
      if (granted) onToggle(true);
      return;
    }

    if (canArm) onToggle(true);
  };

  // ── Permission-only button (iOS pre-grant) ───────────────────
  const handlePermissionBtn = async () => {
    await onRequestPermission();
  };

  // ── Dot fill status ──────────────────────────────────────────
  const dots = [1, 2, 3];

  return (
    <div
      className={[
        "ssc",
        armed         ? "ssc--armed"       : "",
        isUnavailable ? "ssc--unavailable" : "",
        isDenied      ? "ssc--denied"      : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Top row: icon + label + status chip ─────────────────── */}
      <div className="ssc__toprow">
        <div className={`ssc__iconwrap ${armed ? "ssc__iconwrap--armed" : ""}`}>
          <span className="ssc__icon">📳</span>
          {armed && <span className="ssc__iconring" />}
        </div>

        <div className="ssc__labels">
          <p className="ssc__title">Shake to SOS</p>
          <p className="ssc__sub">Shake 3× hard → alert sent</p>
        </div>

        {/* Status chip (right of header) */}
        {isUnavailable && <span className="ssc__chip ssc__chip--na">Not Supported</span>}
        {isDenied      && <span className="ssc__chip ssc__chip--denied">Denied</span>}
        {isUnknown     && <span className="ssc__chip ssc__chip--checking">Checking…</span>}
        {armed         && !isUnavailable && !isDenied && !isUnknown &&
          <span className="ssc__chip ssc__chip--live">● LIVE</span>}
      </div>

      {/* ── Progress dots (shown when device is capable) ─────────── */}
      {(canArm || needsPrompt) && (
        <div className="ssc__dots">
          {dots.map((n) => (
            <div
              key={n}
              className={[
                "ssc__dot",
                shakeCount >= n ? "ssc__dot--active" : "",
                armed           ? "ssc__dot--armed"  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {shakeCount >= n && <span className="ssc__dotpulse" />}
            </div>
          ))}
          <span className="ssc__dotlabel">
            {armed
              ? shakeCount > 0
                ? `${shakeCount}/3 — keep shaking!`
                : "Shake hard × 3"
              : needsPrompt
              ? "Allow motion first"
              : "Arm to activate"}
          </span>
        </div>
      )}

      {/* ── BIG ARM / DISARM BUTTON ──────────────────────────────── */}
      {!isUnavailable && !isDenied && !isUnknown && (
        <button
          className={`ssc__armBtn ${armed ? "ssc__armBtn--disarm" : "ssc__armBtn--arm"}`}
          onClick={handleToggle}
          aria-label={armed ? "Disarm shake SOS" : "Arm shake SOS"}
        >
          {armed ? (
            <>
              <span className="ssc__armBtn-icon">🛡️</span>
              <span className="ssc__armBtn-text">ARMED — Tap to Disarm</span>
            </>
          ) : needsPrompt ? (
            <>
              <span className="ssc__armBtn-icon">📱</span>
              <span className="ssc__armBtn-text">Allow Motion &amp; Arm</span>
            </>
          ) : (
            <>
              <span className="ssc__armBtn-icon">🔴</span>
              <span className="ssc__armBtn-text">Arm Shake SOS</span>
            </>
          )}
        </button>
      )}

      {/* ── iOS: separate permission button (before first grant) ─── */}
      {needsPrompt && !armed && (
        <button className="ssc__permBtn" onClick={handlePermissionBtn}>
          📱 Allow motion access only (iOS)
        </button>
      )}

      {/* ── Denied recovery ──────────────────────────────────────── */}
      {isDenied && (
        <p className="ssc__deniedNote">
          Motion access was denied.{" "}
          <strong>iOS: Settings → Safari → Motion &amp; Orientation Access</strong>,
          then reload this page.
        </p>
      )}

      {/* ── Unavailable ──────────────────────────────────────────── */}
      {isUnavailable && (
        <p className="ssc__unavailNote">
          Your browser doesn't support motion detection. Try{" "}
          <strong>Chrome on Android</strong> or <strong>Safari on iPhone</strong>.
        </p>
      )}

      {/* ── Armed tip ────────────────────────────────────────────── */}
      {armed && canArm && (
        <p className="ssc__tip">
          ✅ Keep this tab open — shake detection stays active even with screen locked.
        </p>
      )}
    </div>
  );
}