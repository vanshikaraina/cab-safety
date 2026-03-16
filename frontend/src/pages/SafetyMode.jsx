import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSafetyMode } from "../context/SafetyModeContext";
import { useRecording } from "../context/RecordingContext";

const SafetyMode = () => {

  const navigate = useNavigate();

  const { seconds = 0, disableSafetyMode } = useSafetyMode();
  const { isRecording, startRecording, stopRecording } = useRecording();

  const [confirmExit, setConfirmExit] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [missedChecks, setMissedChecks] = useState(0);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  };

  // Auto start recording when safety mode page loads
  useEffect(() => {

    if (!isRecording) {
      startRecording();
    }

  }, []);

  // Trigger safety check every 60 seconds
  useEffect(() => {

    if (seconds > 0 && seconds % 60 === 0) {
      setShowCheck(true);
    }

  }, [seconds]);

  // Auto close safety check after 15 seconds
  useEffect(() => {

    if (showCheck) {

      const timer = setTimeout(() => {
        setShowCheck(false);
        setMissedChecks((prev) => prev + 1);
      }, 15000);

      return () => clearTimeout(timer);

    }

  }, [showCheck]);

  // Alert after 3 missed checks
  useEffect(() => {

    if (missedChecks >= 3) {
      alert("⚠️ Safety check missed 3 times. Emergency protocol should trigger.");
    }

  }, [missedChecks]);

  const handleSafe = () => {
    setShowCheck(false);
    setMissedChecks(0);
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

    <div style={{ padding:"80px 40px", color:"white" }}>

      <button
        onClick={() => navigate(-1)}
        style={{ marginBottom:"20px" }}
      >
        ← Back
      </button>

      <h2>🛡 Safety Mode Active</h2>

      <p style={{ marginTop:"20px" }}>
        Ride Time: <strong>{formatTime(seconds)}</strong>
      </p>

      <p style={{ marginTop:"10px" }}>
        Safety monitoring is active.
      </p>

      {showCheck && (

        <div
          style={{
            marginTop:"30px",
            padding:"20px",
            background:"#1e293b",
            borderRadius:"10px"
          }}
        >

          <p>Are you safe?</p>

          <button
            onClick={handleSafe}
            style={{ marginRight:"10px" }}
          >
            Yes
          </button>

          <button
            onClick={() => alert("Report issue triggered")}
          >
            Report Issue
          </button>

        </div>

      )}

      <div style={{ marginTop:"30px" }}>

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
        onClick={handleTurnOff}
        style={{
          marginTop:"20px",
          padding:"10px 16px",
          borderRadius:"8px",
          border:"none",
          cursor:"pointer"
        }}
      >
        Turn Off Safety Mode
      </button>

    </div>

  );

};

export default SafetyMode;