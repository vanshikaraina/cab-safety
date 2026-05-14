import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/safety.css";
import { shareLiveLocation } from "../utils/locationShare";
import { useRecording } from "../context/RecordingContext.jsx";
import { useSafetyMode } from "../context/SafetyModeContext";

const SafetyCenter = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const { isRecording, startRecording, stopRecording } = useRecording();
  const { enableSafetyMode, safetyMode } = useSafetyMode();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSafetyMode = () => {
    if (!safetyMode) {
      enableSafetyMode();
      showToast("🛡 Safety Mode enabled");
    }
    navigate("/safety-mode");
  };

  const handleContacts = () => navigate("/emergency-contacts");

  const handleSOS = () => showToast("🚨 Emergency SOS triggered");

  return (
    <div className="sc-container">
      <button className="sc-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="sc-header">
        <h2 className="sc-title">Safety Center</h2>
        <p className="sc-subtitle">Your personal emergency toolkit</p>
      </div>

      {/* SOS — full width prominent */}
      <button className="sc-sos-btn" onClick={handleSOS}>
        <span className="sc-sos-icon">🚨</span>
        <div className="sc-sos-text">
          <span className="sc-sos-label">Emergency SOS</span>
          <span className="sc-sos-desc">Trigger emergency alert immediately</span>
        </div>
        <span className="sc-sos-arrow">›</span>
      </button>

      {/* 2-col grid for the rest */}
      <div className="sc-grid">
        <button className="sc-card" onClick={() => shareLiveLocation(showToast)}>
          <span className="sc-card-icon">📍</span>
          <span className="sc-card-label">Share Location</span>
          <span className="sc-card-desc">Let contacts track you</span>
        </button>

        <button className="sc-card" onClick={handleContacts}>
          <span className="sc-card-icon">👨‍👩‍👧</span>
          <span className="sc-card-label">Contacts</span>
          <span className="sc-card-desc">Manage trusted people</span>
        </button>

        <button
          className={`sc-card ${isRecording ? "sc-card--active" : ""}`}
          onClick={() => {
            if (isRecording) {
              stopRecording();
              showToast("Recording stopped");
            } else {
              startRecording();
              showToast("Recording started");
            }
          }}
        >
          <span className="sc-card-icon">{isRecording ? "⏹" : "🎙"}</span>
          <span className="sc-card-label">{isRecording ? "Stop Rec." : "Record Audio"}</span>
          <span className="sc-card-desc">Capture evidence</span>
        </button>

        <button className="sc-card" onClick={() => navigate("/recordings")}>
          <span className="sc-card-icon">🎧</span>
          <span className="sc-card-label">Recordings</span>
          <span className="sc-card-desc">Listen to saved audio</span>
        </button>

        <button className="sc-card sc-card--wide" onClick={handleSafetyMode}>
          <span className="sc-card-icon">🛡</span>
          <span className="sc-card-label">Safety Mode</span>
          <span className="sc-card-desc">Enable safety monitoring</span>
        </button>
      </div>

      {toast && (
        <div className="sc-toast">
          {toast}
        </div>
      )}
    </div>
  );
};

export default SafetyCenter;