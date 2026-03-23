// src/components/LiveLocationCard.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/LiveLocationCard.css";

export default function LiveLocationCard() {
  const [sharing, setSharing] = useState(false);
  const [coords, setCoords]   = useState(null);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);
  const watchRef              = useRef(null);

  const mapsLink = coords
    ? `https://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}`
    : null;

  const startSharing = () => {
    setError("");
    if (!navigator.geolocation) { setError("Geolocation not supported."); return; }
    setSharing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Could not get location. Check browser permissions."),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopSharing = () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setSharing(false);
    setCoords(null);
  };

  const copyLink = async () => {
    if (!mapsLink) return;
    try {
      await navigator.clipboard.writeText(mapsLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { setError("Could not copy — try sharing instead."); }
  };

  const shareLink = async () => {
    if (!mapsLink) return;
    if (navigator.share) {
      await navigator.share({ title: "My Live Location", url: mapsLink }).catch(() => {});
    } else {
      copyLink();
    }
  };

  useEffect(() => () => stopSharing(), []);

  return (
    <div className={`loc-card ${sharing ? "loc-card-active" : ""}`}>

      <div className="loc-header">
        <div className="loc-icon-wrap">
          <span className="loc-icon">📍</span>
          {sharing && <span className="loc-live-dot" />}
        </div>
        <div className="loc-info">
          <p className="loc-title">Live Location</p>
          <p className="loc-desc">
            {sharing && coords
              ? "Tracking — share your location link"
              : "Share your real-time location with trusted contacts"}
          </p>
        </div>
        <button
          className={`loc-toggle-btn ${sharing ? "loc-toggle-stop" : "loc-toggle-start"}`}
          onClick={sharing ? stopSharing : startSharing}
        >
          {sharing ? "Stop" : "Start"}
        </button>
      </div>

      {error && <p className="loc-error">⚠ {error}</p>}

      {sharing && !coords && !error && (
        <p className="loc-loading">📡 Getting your location…</p>
      )}

      {sharing && coords && (
        <div className="loc-actions">
          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="loc-preview">
            📌 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            <span className="loc-preview-open">Open Maps ›</span>
          </a>
          <div className="loc-btns">
            <button className="loc-btn loc-btn-copy" onClick={copyLink}>
              {copied ? "✅ Copied!" : "📋 Copy Link"}
            </button>
            <button className="loc-btn loc-btn-share" onClick={shareLink}>
              📤 Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}