import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

function Landing() {

  const navigate = useNavigate();

  return (
    <div className="landing-container">

      <nav className="navbar">
        <h2 className="logo">SafeRide</h2>

        <div className="nav-buttons">
          <button onClick={() => navigate("/auth?mode=login")}>Login</button>
          <button onClick={() => navigate("/auth?mode=signup")}>Signup</button>
        </div>
      </nav>

      <section className="hero">

        <h1>Cab Safety System</h1>

        <p>
          A smart platform designed to make cab rides safer using
          real-time monitoring, safety alerts, and emergency assistance.
        </p>

        <button
          className="cta"
          onClick={() => navigate("/auth?mode=signup")}
        >
          Get Started
        </button>

      </section>

      <footer className="footer">
        <p>© 2026 SafeRide | Cab Safety System</p>
      </footer>

    </div>
  );
}

export default Landing;