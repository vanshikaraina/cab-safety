import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSafetyMode } from "../context/SafetyModeContext";
import { useRecording } from "../context/RecordingContext";
import "../styles/safetyMode.css";

const SafetyMode = () => {

  const navigate = useNavigate();

  const {
    seconds = 0,
    disableSafetyMode,
    showCheck,
    confirmSafe,
    reportIssue,
    batteryLevel
  } = useSafetyMode();

  const {
    isRecording,
    startRecording,
    stopRecording
  } = useRecording();

  const [confirmExit, setConfirmExit] = useState(false);

  const formatTime = (s) => {

    const mins = Math.floor(s / 60);
    const secs = s % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  };

  const handleStartMonitoring = () => {

    if (!isRecording) {
      startRecording();
    }

  };

  const handleTurnOff = () => {

    if (!confirmExit) {
      alert("Please confirm before turning off Safety Mode.");
      return;
    }

    stopRecording();

    disableSafetyMode();

    navigate("/safety-center");

  };

  return (

    <div className="safety-container">

      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h2 className="title">🛡 Safety Mode Active</h2>

      <div className="status-badge">
        {isRecording
          ? "🟢 Monitoring Active"
          : "🔴 Monitoring Paused"}
      </div>

      {!isRecording && (
        <button
          className="start-btn"
          onClick={handleStartMonitoring}
        >
          🎙 Start Monitoring
        </button>
      )}

      <div className="timer-card">
        <h1>{formatTime(seconds)}</h1>
        <p>Ride Duration</p>
      </div>

      {/* BATTERY STATUS */}

      <div className="battery-status">

        {batteryLevel !== null
          ? `🔋 Battery: ${batteryLevel}%`
          : "🔋 Battery unavailable"}

      </div>

      {isRecording && (
        <div className="recording-indicator">
          <span className="dot"></span>
          Recording Audio
        </div>
      )}

      {showCheck && (

        <div className="safety-check">

          <h3>⚠ Safety Check</h3>

          <p>Are you safe right now?</p>

          <div className="check-buttons">

            <button
              className="safe-btn"
              onClick={confirmSafe}
            >
              Yes I'm Safe
            </button>

            <button
              className="danger-btn"
              onClick={reportIssue}
            >
              Report Problem
            </button>

          </div>

          <small>Auto closing in 15 seconds</small>

        </div>

      )}

      <div className="safety-tips">

        <h4>Safety Tips</h4>

        <ul>
          <li>Share ride with trusted contact</li>
          <li>Stay aware of surroundings</li>
          <li>Use emergency button if needed</li>
        </ul>

      </div>

      <div className="confirm-box">

        <label>

          <input
            type="checkbox"
            checked={confirmExit}
            onChange={(e) => setConfirmExit(e.target.checked)}
          />

          {" "}I confirm I want to disable Safety Mode

        </label>

      </div>

      <button
        className="end-btn"
        onClick={handleTurnOff}
      >
        🔴 End Safety Mode
      </button>

    </div>

  );

};

export default SafetyMode;