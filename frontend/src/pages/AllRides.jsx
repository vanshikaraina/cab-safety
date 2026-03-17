import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";

const API = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

export default function AllRides() {
  const [rides, setRides] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/dashboard`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }).then(res => {
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
          {rides.map((ride, i) => (
            <div key={ride._id} className="db-ride-card">

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
                  📍 From: {ride.startLocationName || `${ride.startLocation?.lat?.toFixed(3)}, ${ride.startLocation?.lng?.toFixed(3)}`}
                </p>

                <p className="db-ride-meta">
                  📏 {ride.actualDistance || ride.distance || "—"} km
                  {" · "}
                  ⏱ {ride.actualTime || ride.expectedTime || "—"} min
                </p>

                <p className="db-ride-meta">
                  🕒 {new Date(ride.startTime).toLocaleString()}
                </p>
              </div>

              <button
                className="db-rejoin-btn"
                onClick={() => navigate(`/tracking/${ride._id}`)}
              >
                View Ride
              </button>

            </div>
          ))}
        </div>
      </div>
    </>
  );
}