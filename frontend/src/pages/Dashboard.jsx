//Dashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/Dashboard.css";

const API = "https://cab-safety.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatTime(mins) {
  if (!mins) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) { navigate("/auth"); return; }

    axios.get(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Failed to load dashboard."); setLoading(false); });
  }, [navigate]);

  if (loading) return (
    <>
      <Navbar />
      <div className="db-container db-loading">
        <div className="db-spinner" />
        <p>Loading your dashboard…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <div className="db-container db-loading">
        <p style={{ color: "#fca5a5" }}>{error}</p>
      </div>
    </>
  );

  const { user, stats, recentRides } = data;
  const isNight = new Date().getHours() >= 22 || new Date().getHours() < 5;

  return (
    <>
      <Navbar />
      <div className="db-container">

        {/* ── Welcome Banner ── */}
        <div className="db-banner">
          <div className="db-banner-left">
            <p className="db-greeting">{getGreeting()},</p>
            <h1 className="db-name">{user.firstName} {user.lastName} 👋</h1>
            <p className="db-sub">
              {stats.activeRide
                ? "⚡ You have an active ride in progress"
                : isNight
                  ? "🌙 Stay safe tonight. Night rider mode is " + (user.nightRider ? "on" : "off") + "."
                  : "Ready for your next ride? Stay safe out there."}
            </p>
          </div>
          <div className="db-avatar">
            {user.profilePhoto
              ? <img src={user.profilePhoto} alt="avatar" />
              : <div className="db-avatar-letter">
                {user.firstName?.[0]?.toUpperCase() || "?"}
              </div>
            }
          </div>
        </div>

        {/* ── Active Ride Banner ── */}
        {stats.activeRide && (
          <div className="db-active-banner">
            <div className="db-active-dot" />
            <span>Ride in progress</span>
            <button onClick={() => navigate(`/tracking/${stats.activeRide}`)}>
              Rejoin →
            </button>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="db-stats">
          <div className="db-stat-card db-stat-blue">
            <div className="db-stat-icon">🏁</div>
            <div className="db-stat-value">{stats.totalRides}</div>
            <div className="db-stat-label">Total Rides</div>
          </div>
          <div className="db-stat-card db-stat-green">
            <div className="db-stat-icon">📏</div>
            <div className="db-stat-value">{stats.totalDistance} <span>km</span></div>
            <div className="db-stat-label">Distance Covered</div>
          </div>
          <div className="db-stat-card db-stat-purple">
            <div className="db-stat-icon">⏱️</div>
            <div className="db-stat-value">{formatTime(stats.totalTime)}</div>
            <div className="db-stat-label">Time on Road</div>
          </div>
          <div className="db-stat-card db-stat-orange">
            <div className="db-stat-icon">🛡️</div>
            <div className="db-stat-value">
              {stats.totalRides > 0 ? "Safe" : "—"}
            </div>
            <div className="db-stat-label">Ride Status</div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="db-section">
          <h2 className="db-section-title">Quick Actions</h2>
          <div className="db-actions">
            <button className="db-action-card db-action-primary" onClick={() => navigate("/start-ride")}>
              <span className="db-action-icon">🚀</span>
              <span className="db-action-label">Start New Ride</span>
              <span className="db-action-arrow">→</span>
            </button>
            <button className="db-action-card" onClick={() => navigate("/profile")}>
              <span className="db-action-icon">👤</span>
              <span className="db-action-label">My Profile</span>
              <span className="db-action-arrow">→</span>
            </button>
            <button className="db-action-card" onClick={() => navigate("/safety-center")}>
              <span className="db-action-icon">🛡️</span>
              <span className="db-action-label">Safety Center</span>
              <span className="db-action-arrow">→</span>
            </button>
            <button className="db-action-card db-action-sos" onClick={() => navigate("/profile#sos")}>
              <span className="db-action-icon">🆘</span>
              <span className="db-action-label">SOS</span>
              <span className="db-action-arrow">→</span>
            </button>
          </div>
        </div>

        {/* ── Recent Rides ── */}
        <div className="db-section">
          <h2 className="db-section-title">Recent Rides</h2>

          {recentRides.length === 0 ? (
            <div className="db-empty">
              <p>🏍️ No rides yet. Start your first ride!</p>
              <button className="db-start-btn" onClick={() => navigate("/start-ride")}>
                Start Ride
              </button>
            </div>
          ) : (
            <>
              <div className="db-rides">
                {recentRides.slice(0, 2).map((ride, i) => (
                  <div key={ride._id} className="db-ride-card" style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="db-ride-icon">
                      {ride.vehicleType === "car" ? "🚗"
                        : ride.vehicleType === "scooter" ? "🛵"
                          : "🏍️"}
                    </div>

                    <div className="db-ride-info">
                      <p className="db-ride-dest">
                        {ride.destinationName || "Unknown destination"}
                      </p>

                      <p className="db-ride-meta">
                        {ride.distance ? `${ride.distance} km` : "—"}
                        {ride.expectedTime ? ` · ${ride.expectedTime} min` : ""}
                        {" · "}{timeAgo(ride.createdAt)}
                      </p>
                    </div>

                    <div className={`db-ride-status ${ride.status === "COMPLETED"
                      ? "completed"
                      : ride.status === "ACTIVE"
                        ? "active"
                        : "cancelled"
                      }`}>
                      {ride.status === "COMPLETED"
                        ? "✓ Done"
                        : ride.status === "ACTIVE"
                          ? "⚡ Live"
                          : "✕ Cancelled"}
                    </div>

                    {ride.status === "ACTIVE" && (
                      <button
                        className="db-rejoin-btn"
                        onClick={() => navigate(`/tracking/${ride._id}`)}
                      >
                        Rejoin
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {recentRides.length > 2 && (
                <div className="db-view-more">
                  <button
                    className="db-view-rides-btn"
                    onClick={() => navigate("/rides")}
                  >
                    View All Rides →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Safety Tip ── */}
        <div className="db-tip">
          <span className="db-tip-icon">💡</span>
          <p>
            <strong>Safety tip:</strong> Always add emergency contacts before starting a night ride.
            {" "}<span className="db-tip-link" onClick={() => navigate("/profile")}>Add contacts →</span>
          </p>
        </div>

      </div>
    </>
  );
}