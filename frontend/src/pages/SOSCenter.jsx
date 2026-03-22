// src/pages/SOSCenter.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import "../styles/SOScenter.css";

const API = "https://cab-safety.onrender.com/api";

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("token") ||
    null
  );
}
console.log("TOKEN:", getToken());

function authHeaders() {
  const token = getToken();
  if (!token) return {}; // 🚨 IMPORTANT
  return { Authorization: `Bearer ${token}` };
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <div className={`sos-status-badge ${active ? "sos-status-active" : "sos-status-idle"}`}>
      <span className="sos-status-dot" />
      {active ? "SOS Active" : "All Clear"}
    </div>
  );
}

// ── Contact card ───────────────────────────────────────────────
function ContactCard({ contact, onRemove }) {
  return (
    <div className="sos-contact-card">
      <div className="sos-contact-avatar">
        {contact.name?.charAt(0).toUpperCase() || "?"}
      </div>
      <div className="sos-contact-info">
        <p className="sos-contact-name">{contact.name}</p>
        <p className="sos-contact-phone">{contact.phone}</p>
        {contact.relation && (
          <span className="sos-contact-relation">{contact.relation}</span>
        )}
      </div>
      <button
        className="sos-contact-remove"
        onClick={() => onRemove(contact._id)}
        title="Remove contact"
      >
        ✕
      </button>
    </div>
  );
}

// ── Add contact modal ──────────────────────────────────────────
function AddContactModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", phone: "", relation: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const relations = ["Mother", "Father", "Spouse", "Friend", "Sibling", "Other"];
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10)
      return setError("Enter a valid 10-digit phone number.");
    setError("");
    setLoading(true);
    try {
      await onAdd(form);
      onClose();
    } catch (e) {
      setError(e.message || "Could not add contact.");
    }
    setLoading(false);
  };

  return (
    
    <div className="sos-modal-overlay" onClick={onClose}>
      <div className="sos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sos-modal-header">
          <h3>Add Emergency Contact</h3>
          <button className="sos-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sos-modal-body">
          <label className="sos-label">Full Name</label>
          <input
            className="sos-input"
            placeholder="e.g. Priya Sharma"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <label className="sos-label">Phone Number</label>
          <input
            className="sos-input"
            placeholder="e.g. 9876543210"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            type="tel"
          />

          <label className="sos-label">Relation</label>
          <div className="sos-relation-chips">
            {relations.map((r) => (
              <button
                key={r}
                className={`sos-chip ${form.relation === r ? "sos-chip-active" : ""}`}
                onClick={() => setForm({ ...form, relation: r })}
              >
                {r}
              </button>
            ))}
          </div>

          {error && <p className="sos-modal-error">⚠ {error}</p>}
        </div>

        <div className="sos-modal-footer">
          <button className="sos-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="sos-btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SOS Log row ────────────────────────────────────────────────
function LogRow({ log }) {
  const date = new Date(log.triggeredAt);
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const typeColors = {
    manual:    { bg: "#2d1f1f", border: "#7f1d1d", text: "#fca5a5", label: "Manual" },
    auto:      { bg: "#2d1a0a", border: "#7c2d12", text: "#fdba74", label: "Auto"   },
    stopped:   { bg: "#1e1e2d", border: "#3730a3", text: "#a5b4fc", label: "Stopped"},
    dismissed: { bg: "#1a1f1a", border: "#14532d", text: "#86efac", label: "Cleared"},
  };
  const style = typeColors[log.type] || typeColors.manual;

  return (
    <div className="sos-log-row">
      <div className="sos-log-left">
        <span
          className="sos-log-type"
          style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
        >
          {style.label}
        </span>
        <div className="sos-log-meta">
          <p className="sos-log-location">{log.locationLabel || log.location?.address || "Unknown location"}</p>
          <p className="sos-log-contacts">
            {log.contactsAlerted?.length
              ? `Alerted: ${log.contactsAlerted.join(", ")}`
              : "No contacts alerted"}
          </p>
        </div>
      </div>
      <div className="sos-log-right">
        <p className="sos-log-time">{timeStr}</p>
        <p className="sos-log-date">{dateStr}</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function SOSCenter() {
  const navigate = useNavigate();

  const [contacts, setContacts]         = useState([]);
  const [sosLog, setSosLog]             = useState([]);
  const [profile, setProfile]           = useState(null);
  const [sosActive, setSosActive]       = useState(false);
  const [sosMsg, setSosMsg]             = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [activeTab, setActiveTab]       = useState("contacts"); // contacts | log

  // ── Fetch data ───────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const token = getToken();

      if (!token) {
        setError("Please login again.");
        setLoading(false);
        return;
      }
      try {
        const [profileRes, logRes] = await Promise.all([
          axios.get(`${API}/profile`, { headers: authHeaders() }),
          axios.get(`${API}/sos/log`, { headers: authHeaders() }).catch(() => ({ data: [] })),
        ]);
        setProfile(profileRes.data);
        setContacts(profileRes.data.emergencyContacts || []);
        setSosLog(logRes.data || []);
      } catch (e) {
        setError("Could not load your profile. Please log in again.");
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── Add contact ──────────────────────────────────────────────
  const handleAddContact = async (form) => {
    const res = await axios.post(
      `${API}/profile/emergency-contacts`,
      form,
      { headers: authHeaders() }
    );
    setContacts(res.data.emergencyContacts || []);
  };

  // ── Remove contact ───────────────────────────────────────────
  const handleRemoveContact = async (contactId) => {
    if (!window.confirm("Remove this emergency contact?")) return;
    try {
      const res = await axios.delete(
        `${API}/profile/emergency-contacts/${contactId}`,
        { headers: authHeaders() }
      );
      setContacts(res.data.emergencyContacts || []);
    } catch {
      alert("Could not remove contact.");
    }
  };

  // ── Trigger SOS ──────────────────────────────────────────────
  const handleSOS = () => {
    if (contacts.length === 0) {
      setSosMsg("⚠ Add at least one emergency contact first.");
      setTimeout(() => setSosMsg(""), 4000);
      return;
    }
    setSosActive(true);
    setSosMsg("📡 Locating you and sending SOS…");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.post(
            `${API}/profile/sos`,
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { headers: authHeaders() }
          );
          const { contacts: alerted, location, userName } = res.data;
          const msg = `🚨 SOS from ${userName}! I need help. Location: ${location?.mapsLink}`;

          alerted.forEach((c, i) => {
            let p = c.phone.replace(/\D/g, "");
            if (p.startsWith("0")) p = "91" + p.slice(1);
            if (p.length === 10)   p = "91" + p;
            const url = `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
            if (i === 0) window.location.href = `whatsapp://send?phone=${p}&text=${encodeURIComponent(msg)}`;
            setTimeout(() => window.open(url, `_wa_${i}`), (i + 1) * 800);
          });

          setSosMsg(`✅ SOS sent to ${alerted.length} contact(s)`);
          const logRes = await axios.get(`${API}/sos/log`, { headers: authHeaders() }).catch(() => ({ data: [] }));
          setSosLog(logRes.data || []);
        } catch (e) {
          setSosMsg(e.response?.data?.message || "❌ SOS failed. Call 100 directly.");
        }
        setTimeout(() => { setSosActive(false); setSosMsg(""); }, 6000);
      },
      () => {
        setSosMsg("❌ Could not get location. Call 100 directly.");
        setTimeout(() => { setSosActive(false); setSosMsg(""); }, 4000);
      }
    );
  };

  // ─────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <Navbar />
      <div className="sos-page">
        <div className="sos-loading">
          <div className="sos-spinner" />
          <p>Loading SOS Center…</p>
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <div className="sos-page">
        <div className="sos-error">⚠ {error}</div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="sos-page">

        {/* ── Hero ── */}
        <div className="sos-hero">
          <div className="sos-hero-left">
            <StatusBadge active={sosActive} />
            <h1 className="sos-title">SOS Center</h1>
            <p className="sos-subtitle">
              Your emergency command hub. One tap to alert everyone who matters.
            </p>
            
          <button
            className="sos-fake-call-btn" 
            onClick={() => navigate("/fake-call")}
          >
            📞 Fake Call
          </button>

          </div>
          <div className="sos-hero-right">
            <button
              className={`sos-main-btn ${sosActive ? "sos-main-btn-active" : ""}`}
              onClick={handleSOS}
              disabled={sosActive}
            >
              <span className="sos-main-ring" />
              <span className="sos-main-ring sos-main-ring2" />
              <span className="sos-main-inner">
                <span className="sos-main-label">{sosActive ? "SENDING…" : "SOS"}</span>
                <span className="sos-main-sub">{sosActive ? "please wait" : "hold to send"}</span>
              </span>
            </button>
          </div>
        </div>

        {sosMsg && (
          <div className={`sos-toast ${sosMsg.startsWith("✅") ? "sos-toast-ok" : "sos-toast-warn"}`}>
            {sosMsg}
          </div>
        )}

        {/* ── Quick-dial strip ── */}
        <div className="sos-quickdial">
          <a href="tel:100"  className="sos-dial-btn sos-dial-police">
            <span className="sos-dial-icon">🚔</span>
            <span className="sos-dial-num">100</span>
            <span className="sos-dial-label">Police</span>
          </a>
          <a href="tel:102"  className="sos-dial-btn sos-dial-ambulance">
            <span className="sos-dial-icon">🚑</span>
            <span className="sos-dial-num">102</span>
            <span className="sos-dial-label">Ambulance</span>
          </a>
          <a href="tel:101"  className="sos-dial-btn sos-dial-fire">
            <span className="sos-dial-icon">🚒</span>
            <span className="sos-dial-num">101</span>
            <span className="sos-dial-label">Fire</span>
          </a>
          <a href="tel:1091" className="sos-dial-btn sos-dial-women">
            <span className="sos-dial-icon">👩</span>
            <span className="sos-dial-num">1091</span>
            <span className="sos-dial-label">Women</span>
          </a>
          <a href="tel:112"  className="sos-dial-btn sos-dial-emergency">
            <span className="sos-dial-icon">🆘</span>
            <span className="sos-dial-num">112</span>
            <span className="sos-dial-label">Emergency</span>
          </a>
        </div>

        {/* ── Tabs — only Contacts and History ── */}
        <div className="sos-tabs">
          {["contacts", "log"].map((tab) => (
            <button
              key={tab}
              className={`sos-tab ${activeTab === tab ? "sos-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "contacts" && "👥 Contacts"}
              {tab === "log"      && "📋 History"}
            </button>
          ))}
        </div>

        {/* ── Tab: Contacts ── */}
        {activeTab === "contacts" && (
          <div className="sos-tab-panel">
            <div className="sos-section-header">
              <div>
                <h2 className="sos-section-title">Emergency Contacts</h2>
                <p className="sos-section-desc">
                  These people will be alerted instantly when you send an SOS.
                </p>
              </div>
              <button
                className="sos-btn-primary"
                onClick={() => setShowAddModal(true)}
                disabled={contacts.length >= 5}
              >
                + Add
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="sos-empty">
                <div className="sos-empty-icon">👥</div>
                <p className="sos-empty-title">No contacts yet</p>
                <p className="sos-empty-desc">Add at least one person who should be alerted in an emergency.</p>
                <button className="sos-btn-primary" onClick={() => setShowAddModal(true)}>
                  Add Your First Contact
                </button>
              </div>
            ) : (
              <div className="sos-contacts-list">
                {contacts.map((c) => (
                  <ContactCard key={c._id} contact={c} onRemove={handleRemoveContact} />
                ))}
                {contacts.length < 5 && (
                  <button className="sos-add-more" onClick={() => setShowAddModal(true)}>
                    + Add another contact ({contacts.length}/5)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: History ── */}
        {activeTab === "log" && (
          <div className="sos-tab-panel">
            <div className="sos-section-header">
              <div>
                <h2 className="sos-section-title">SOS History</h2>
                <p className="sos-section-desc">All past alerts and events from your rides.</p>
              </div>
            </div>

            {sosLog.length === 0 ? (
              <div className="sos-empty">
                <div className="sos-empty-icon">📋</div>
                <p className="sos-empty-title">No SOS events</p>
                <p className="sos-empty-desc">Your alert history will appear here. Stay safe out there.</p>
              </div>
            ) : (
              <div className="sos-log-list">
                {sosLog.map((log, i) => <LogRow key={i} log={log} />)}
              </div>
            )}
          </div>
        )}

      </div>

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddContact}
        />
      )}
    </>
  );
}