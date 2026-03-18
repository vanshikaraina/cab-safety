import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

const API = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

// ✅ helper for clean time
function formatTime(date) {
  const d = new Date(date);
  const now = new Date();

  const isToday = d.toDateString() === now.toDateString();

  return isToday
    ? `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString() +
        ", " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AllRides() {
  const [rides, setRides] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API}/dashboard`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      .then((res) => {
        setRides(res.data.recentRides);
      });
  }, []);

  return (
    <>
      <Navbar />

      <div className="db-container">
        <button
          className="db-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>

        <h2 className="db-section-title">All Rides</h2>

        <div className="db-rides">
          {rides.length === 0 ? (
            <p className="db-empty">No rides yet 🚀</p>
          ) : (
            rides.map((ride) => (
              <div key={ride._id} className="db-ride-card">

                {/* Top */}
                <div className="db-ride-top">
                  <span className="db-ride-icon">
                    {ride.vehicleType === "car"
                      ? "🚗"
                      : ride.vehicleType === "scooter"
                      ? "🛵"
                      : "🏍️"}
                  </span>
                </div>

                {/* Info */}
                <div className="db-ride-info">

                  <p className="db-ride-dest">
                    {ride.destinationName || "Unknown destination"}
                  </p>

                  <p className="db-ride-meta">
                    🚗 {ride.vehicleType?.toUpperCase() || "RIDE"}
                  </p>

                  <p className="db-ride-meta truncate">
                    📍 {ride.startLocationName || `${ride.startLocation?.lat?.toFixed(3)}, ${ride.startLocation?.lng?.toFixed(3)}`}
                  </p>

                  <p className="db-ride-meta">
                    📏 {ride.actualDistance || 0} / {ride.distance || 0} km
                  </p>

                  <p className="db-ride-meta">
                    ⏱ {ride.actualTime || 0} min · {ride.expectedTime || 0} min
                  </p>

                  <p className="db-ride-time">
                    🕒 {formatTime(ride.startTime)}
                  </p>
                </div>

                {/* Button */}
                {ride.status === "ACTIVE" && (
                  <button
                    className="db-rejoin-btn"
                    onClick={() => navigate(`/tracking/${ride._id}`)}
                  >
                    Resume Ride
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}