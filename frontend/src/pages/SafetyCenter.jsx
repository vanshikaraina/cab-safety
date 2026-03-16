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
    if(!safetyMode){
    enableSafetyMode();
    showToast("🛡 Safety Mode enabled");
    }

    navigate("/safety-mode");
  };

  const handleContacts = () => {
    showToast("👨‍👩‍👧 Open Emergency Contacts");
  };

  const handleSOS = () => {
    showToast("🚨 Emergency SOS triggered");
  };

  return (
    <div className="safety-container">

      <button
        className="page-back-button"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <h2 className="safety-title">Safety Center</h2>

      <div className="safety-grid">

        <button className="safety-card safety-sos" onClick={handleSOS}>
          <span className="safety-icon">🚨</span>
          <div className="safety-text">
            <span className="safety-label">Emergency SOS</span>
            <span className="safety-desc">Trigger emergency alert</span>
          </div>
        </button>

        <button
          className="safety-card"
          onClick={() => shareLiveLocation(showToast)}
        >
          <span className="safety-icon">📍</span>
          <div className="safety-text">
            <span className="safety-label">Share Live Location</span>
            <span className="safety-desc">Let contacts track your location</span>
          </div>
        </button>

        <button className="safety-card" onClick={handleContacts}>
          <span className="safety-icon">👨‍👩‍👧</span>
          <div className="safety-text">
            <span className="safety-label">Emergency Contacts</span>
            <span className="safety-desc">Manage trusted contacts</span>
          </div>
        </button>

        {/* RECORD AUDIO BUTTON */}

        <button
          className="safety-card"
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

          <span className="safety-icon">
            {isRecording ? "⏹" : "🎙"}
          </span>

          <div className="safety-text">

            <span className="safety-label">
              {isRecording ? "Stop Recording" : "Record Audio"}
            </span>

            <span className="safety-desc">
              Capture safety evidence
            </span>

          </div>

        </button>

        <button
          className="safety-card"
          onClick={() => navigate("/recordings")}
        >
          <span className="safety-icon">🎧</span>
          <div className="safety-text">
            <span className="safety-label">View Recordings</span>
            <span className="safety-desc">Listen to saved audio</span>
          </div>
        </button>

        <button className="safety-card" onClick={handleSafetyMode}>
          <span className="safety-icon">🛡</span>
          <div className="safety-text">
            <span className="safety-label">Safety Mode</span>
            <span className="safety-desc">Enable safety monitoring</span>
          </div>
        </button>

      </div>

      {toast && <div className="toast">{toast}</div>}

    </div>
  );
};

export default SafetyCenter;