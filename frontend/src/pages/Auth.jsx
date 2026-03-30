import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/auth.css";

function Auth() {

  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const mode = params.get("mode");

  const [isLogin, setIsLogin] = useState(mode !== "signup");
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    contactNumber: "",
    email: "",
    password: ""
  });

  // Ping server on page load to wake up Render cold start
  useEffect(() => {
    axios.get("https://cab-safety.onrender.com/api/health").catch(() => {});
  }, []);

  const rules = {
    length:    /.{8,}/,
    lowercase: /[a-z]/,
    uppercase: /[A-Z]/,
    number:    /[0-9]/,
    special:   /[!@#$%^&*(),.?":{}|<>]/
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPasswordStatus = () => ({
    length:    rules.length.test(formData.password),
    lowercase: rules.lowercase.test(formData.password),
    uppercase: rules.uppercase.test(formData.password),
    number:    rules.number.test(formData.password),
    special:   rules.special.test(formData.password)
  });

  const getPasswordStrength = (status) => {
    const passed = Object.values(status).filter(Boolean).length;
    if (passed <= 2) return { label: "Weak",   cls: "weak",   pct: 25 };
    if (passed <= 4) return { label: "Medium", cls: "medium", pct: 65 };
    return              { label: "Strong",  cls: "strong", pct: 100 };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await axios.post(
          "https://cab-safety.onrender.com/api/auth/login",
          { email: formData.email, password: formData.password }
        );
        localStorage.setItem("token", res.data.token);
        navigate("/dashboard");
      } else {
        await axios.post(
          "https://cab-safety.onrender.com/api/auth/signup",
          formData
        );
        setShowSignupPopup(true);
      }
    } catch (error) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const status   = getPasswordStatus();
  const strength = getPasswordStrength(status);

  const ruleList = [
    { key: "length",    label: "At least 8 characters" },
    { key: "lowercase", label: "Lowercase letter" },
    { key: "uppercase", label: "Uppercase letter" },
    { key: "number",    label: "Number" },
    { key: "special",   label: "Special character" },
  ];

  return (
    <div className="auth-container">

      {/* Background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      {/* Back button */}
      <button className="auth-back" onClick={() => navigate("/")}>
        ← Back to Home
      </button>

      <div className="auth-box">

        {/* Logo */}
        <div className="auth-logo" onClick={() => navigate("/")}>
          <span>🛡</span> SafeRide
        </div>

        {/* Heading */}
        <h2 className="auth-title">
          {isLogin ? "Welcome back" : "Create account"}
        </h2>
        <p className="auth-subtitle">
          {isLogin
            ? "Sign in to your SafeRide account"
            : "Fill in your details to get started"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">

          {!isLogin && (
            <>
              <div className="field-row">
                <div className="field-group">
                  <label>First Name</label>
                  <input
                    name="firstName"
                    type="text"
                    placeholder="Riya"
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    placeholder="Sharma"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label>Age <span className="optional">(optional)</span></label>
                  <input
                    name="age"
                    type="number"
                    placeholder="25"
                    onChange={handleChange}
                  />
                </div>
                <div className="field-group">
                  <label>Contact Number</label>
                  <input
                    name="contactNumber"
                    type="tel"
                    placeholder="+91 9876543210"
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="field-group">
            <label>Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="you@example.com"
              onChange={handleChange}
              required
            />
          </div>

          <div className="field-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={isLogin ? "Enter your password" : "Min. 8 characters"}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {/* Strength bar — signup only */}
            {!isLogin && formData.password && (
              <div className="strength-section">
                <div className="strength-bar-wrap">
                  <div className="strength-bar">
                    <div
                      className={`strength-fill ${strength.cls}`}
                      style={{ width: `${strength.pct}%` }}
                    />
                  </div>
                  <span className={`strength-label ${strength.cls}`}>
                    {strength.label}
                  </span>
                </div>
                <div className="rule-list">
                  {ruleList.map(({ key, label }) => (
                    <span key={key} className={`rule-item ${status[key] ? "pass" : "fail"}`}>
                      {status[key] ? "✓" : "•"} {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <span className="btn-spinner" />
              : isLogin ? "Sign In →" : "Create Account →"
            }
          </button>

        </form>

        {/* Switch mode */}
        <p className="auth-switch">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? " Sign Up" : " Login"}
          </span>
        </p>

      </div>

      {/* Signup success popup */}
      {showSignupPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <div className="popup-icon">🎉</div>
            <h3>Account Created!</h3>
            <p>Your SafeRide account is ready. Please sign in to continue.</p>
            <button
              className="popup-btn"
              onClick={() => {
                setShowSignupPopup(false);
                setIsLogin(true);
              }}
            >
              Continue to Login →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Auth;