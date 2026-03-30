import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

const features = [
  {
    icon: "📍",
    title: "Live Location Tracking",
    desc: "Real-time GPS tracking shared with your trusted contacts throughout your ride.",
  },
  {
    icon: "🚨",
    title: "One-Tap SOS",
    desc: "Instantly alert emergency contacts and authorities with a single tap.",
  },
  {
    icon: "🛡️",
    title: "Ride Verification",
    desc: "Verify driver identity and cab details before you even step inside.",
  },
  {
    icon: "📞",
    title: "Emergency Contacts",
    desc: "Auto-notify your family with your location when something feels off.",
  },
];

const stats = [
  { value: "50K+", label: "Rides Secured" },
  { value: "99.8%", label: "Uptime" },
  { value: "< 3s", label: "SOS Response" },
  { value: "4.9★", label: "User Rating" },
];

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">

      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🛡</span>
          SafeRide
        </div>
        <div className="nav-buttons">
          <button className="btn-outline" onClick={() => navigate("/auth?mode=login")}>Login</button>
          <button className="btn-solid" onClick={() => navigate("/auth?mode=signup")}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="badge">🚀 Now available in your city</div>

        <h1>
          Your safety,<br />
          <span className="highlight">always first.</span>
        </h1>

        <p>
          A smart cab safety platform with real-time monitoring,
          emergency alerts, and instant assistance — because every ride should feel safe.
        </p>

        <div className="hero-actions">
          <button className="cta" onClick={() => navigate("/auth?mode=signup")}>
            Start for Free
            <span className="cta-arrow">→</span>
          </button>
          <button className="cta-ghost" onClick={() => navigate("/auth?mode=login")}>
            Already a member?
          </button>
        </div>

        {/* Floating trust pill */}
        <div className="trust-pill">
          <span className="trust-avatars">👩 👨 👧 👦</span>
          <span>Trusted by <strong>50,000+</strong> riders</span>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="stats-strip">
        {stats.map((s, i) => (
          <div className="stat-item" key={i}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="section-label">WHY SAFERIDE</div>
        <h2 className="section-title">Built for your peace of mind</h2>

        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-banner">
        <div className="cta-banner-inner">
          <h2>Ready for safer rides?</h2>
          <p>Join thousands who ride with confidence every day.</p>
          <button className="cta cta-dark" onClick={() => navigate("/auth?mode=signup")}>
            Create Free Account →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <span className="logo-icon">🛡</span> SafeRide
        </div>
        <p>© 2026 SafeRide | Cab Safety System. All rights reserved.</p>
      </footer>

    </div>
  );
}

export default Landing;