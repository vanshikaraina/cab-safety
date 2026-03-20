//navbar.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";
import { FaLocationDot } from "react-icons/fa6";
import { shareLiveLocation } from "../utils/locationShare";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const isActive = (path) => location.pathname === path;

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/auth");
  };

  const handleNav = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">

        {/* Logo */}
        <div className="nav-logo" onClick={() => handleNav("/")}>
          SafeRide
        </div>

        {/* Hamburger — visible on mobile only */}
        <button
          className={`nav-toggle${menuOpen ? " open" : ""}`}
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Nav links */}
        <div className={`nav-links${menuOpen ? " open" : ""}`}>

          <button
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => handleNav("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className="nav-location-btn"
            onClick={() => {
              shareLiveLocation(showToast);
              setMenuOpen(false);
            }}
            title="Share Live Location"
          >
            <FaLocationDot />
          </button>

          <button
            className={isActive("/start-ride") ? "active" : ""}
            onClick={() => handleNav("/start-ride")}
          >
            Start Ride
          </button>

          <button
            className={isActive("/safety-center") ? "active" : ""}
            onClick={() => handleNav("/safety-center")}
          >
            Safety
          </button>

          <button
            className={`nav-sos-btn ${isActive("/sos") ? "active" : ""}`}
            onClick={() => handleNav("/sos")}
            title="SOS Center"
          >
            🆘 SOS
          </button>

          <button
            className={isActive("/profile") ? "active" : ""}
            onClick={() => handleNav("/profile")}
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