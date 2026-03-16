import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";
import { FaLocationDot } from "react-icons/fa6";
import { shareLiveLocation } from "../utils/locationShare";

function Navbar() {

  const navigate = useNavigate();
  const location = useLocation();

  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const isActive = (path) => location.pathname === path;

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  return (
    <>
      <nav className="navbar">

        <div className="nav-logo" onClick={() => navigate("/")}>
          SafeRide
        </div>

        <div className="nav-links">

          <button
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className="nav-location-btn"
            onClick={() => shareLiveLocation(showToast)}
            title="Share Live Location"
          >
            <FaLocationDot />
          </button>

          <button
            className={isActive("/start-ride") ? "active" : ""}
            onClick={() => navigate("/start-ride")}
          >
            Start Ride
          </button>

          <button
            className={isActive("/safety-center") ? "active" : ""}
            onClick={() => navigate("/safety-center")}
          >
            Safety
          </button>

          <button
            className={isActive("/profile") ? "active" : ""}
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>

        </div>

      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

export default Navbar;