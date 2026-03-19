import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/navbar.css";
import { FaLocationDot } from "react-icons/fa6";
import { shareLiveLocation } from "../utils/locationShare";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
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

  const handleNavigate = (path) => {
    navigate(path);
    setMenuOpen(false); // ✅ always close menu after click
  };

  return (
    <>
      <nav className="navbar">
        
        <div className="nav-logo" onClick={() => handleNavigate("/")}>
          SafeRide
        </div>

        {/* Hamburger */}
        <div
          className="hamburger"
          onClick={() => setMenuOpen((prev) => !prev)} // ✅ safer toggle
        >
          ☰
        </div>

        <div className={`nav-links ${menuOpen ? "open" : ""}`}>

          <button
            className={isActive("/dashboard") ? "active" : ""}
            onClick={() => handleNavigate("/dashboard")}
          >
            Dashboard
          </button>

          <button
            className="nav-location-btn"
            onClick={() => {
              shareLiveLocation(showToast);
              setMenuOpen(false); // ✅ fix: close menu here too
            }}
          >
            <FaLocationDot />
          </button>

          <button
            className={isActive("/start-ride") ? "active" : ""}
            onClick={() => handleNavigate("/start-ride")}
          >
            Start Ride
          </button>

          <button
            className={isActive("/safety-center") ? "active" : ""}
            onClick={() => handleNavigate("/safety-center")}
          >
            Safety
          </button>

          <button
            className={isActive("/profile") ? "active" : ""}
            onClick={() => handleNavigate("/profile")}
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