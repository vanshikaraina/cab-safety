import React, { useEffect, useState, useRef } from "react";
import { useVideoRecording } from "../hooks/useVideoRecording";

const MAX_SECONDS = 600; // 10 minutes auto-stop

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const VideoRecorderModal = ({ onClose }) => {
  const {
    isRecording,
    recordings,
    error,
    facingMode,
    videoPreviewRef,
    startRecording,
    stopRecording,
    flipCamera,
    downloadRecording,
  } = useVideoRecording();

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Auto-open camera preview on mount
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: true })
      .then((stream) => {
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      })
      .catch(() => {});

    return () => stopCamera();
  }, []);

  // Timer — starts/stops with recording
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_SECONDS) {
            handleStop(); // auto-stop at limit
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const stopCamera = () => {
    clearInterval(timerRef.current);
    if (videoPreviewRef.current?.srcObject) {
      videoPreviewRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoPreviewRef.current.srcObject = null;
    }
  };

  const handleStop = () => {
    stopRecording();
    setElapsed(0);
  };

  const handleClose = () => {
    handleStop();
    stopCamera();
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={handleClose}>✕</button>

        {/* Live preview */}
        <div style={{ position: "relative" }}>
          <video
            ref={videoPreviewRef}
            autoPlay
            muted
            playsInline
            style={styles.preview}
          />

          {/* Recording indicator + timer overlay */}
          {isRecording && (
            <div style={styles.timerBadge}>
              <span style={styles.redDot} />
              {formatTime(elapsed)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <button style={styles.flipBtn} onClick={flipCamera} title="Flip camera">
            🔄 {facingMode === "environment" ? "Rear" : "Front"}
          </button>

          <button
            style={{ ...styles.recBtn, background: isRecording ? "#ff3b30" : "#34c759" }}
            onClick={isRecording ? handleStop : startRecording}
          >
            {isRecording ? "⏹ Stop" : "⏺ Record"}
          </button>
        </div>

        {isRecording && (
          <p style={styles.limitHint}>Auto-stops at 10:00</p>
        )}

        {error && <p style={styles.error}>⚠️ {error}</p>}

        {/* Saved recordings */}
        {recordings.length > 0 && (
          <div style={styles.savedList}>
            <p style={styles.savedTitle}>Saved Recordings</p>
            {recordings.map((rec, i) => (
              <div key={i} style={styles.savedItem}>
                <span>📹 {rec.name}</span>
                <button style={styles.dlBtn} onClick={() => downloadRecording(rec)}>⬇ Save</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#1c1c1e", borderRadius: 20, padding: 20, width: "90%", maxWidth: 420, position: "relative", color: "#fff" },
  closeBtn: { position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" },
  preview: { width: "100%", borderRadius: 12, background: "#000", minHeight: 240, display: "block" },
  timerBadge: { position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 },
  redDot: { width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", display: "inline-block", animation: "pulse 1s infinite" },
  controls: { display: "flex", gap: 12, justifyContent: "center", marginTop: 16 },
  flipBtn: { padding: "10px 18px", borderRadius: 10, border: "1px solid #444", background: "#2c2c2e", color: "#fff", cursor: "pointer", fontSize: 14 },
  recBtn: { padding: "10px 24px", borderRadius: 10, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  limitHint: { textAlign: "center", fontSize: 12, color: "#8e8e93", marginTop: 8 },
  error: { color: "#ff453a", fontSize: 13, textAlign: "center", marginTop: 8 },
  savedList: { marginTop: 16, borderTop: "1px solid #333", paddingTop: 12 },
  savedTitle: { fontSize: 13, color: "#8e8e93", marginBottom: 8 },
  savedItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" },
  dlBtn: { background: "#0a84ff", border: "none", color: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 13 },
  closeBtn: { position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", zIndex: 10 },
};

export default VideoRecorderModal;