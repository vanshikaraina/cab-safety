// src/pages/SOSCenter.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

import VolumeSOSCard    from "../components/VolumeSOSCard";
import ShakeSOSCard     from "../components/ShakeSOSCard";
import CountdownSOSCard from "../components/CountdownSOSCard";
import LiveLocationCard from "../components/LiveLocationCard";
import SOSGestureButton from "../components/SOSGestureButton";

import useVolumeButtonSOS from "../hooks/useVolumeButtonSOS";
import useShakeSOS        from "../hooks/useShakeSOS";
import useCountdownSOS    from "../hooks/useCountdownSOS";

import "../styles/SOScenter.css";

const API = "https://cab-safety.onrender.com/api";

function getToken() {
  return (
    localStorage.getItem("token")     ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt")       ||
    sessionStorage.getItem("token")   ||
    null
  );
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ active, anyArmed }) {
  if (active)   return <div className="sos-status-badge sos-status-active"><span className="sos-status-dot"/>SOS Active</div>;
  if (anyArmed) return <div className="sos-status-badge sos-status-armed"><span className="sos-status-dot"/>Guards Armed</div>;
  return              <div className="sos-status-badge sos-status-idle"><span className="sos-status-dot"/>All Clear</div>;
}

// ── SOS confirmation overlay ───────────────────────────────────
function SOSConfirmation({ trigger, onDismiss }) {
  if (!trigger) return null;
  return (
    <div className="sos-confirm-overlay">
      <div className="sos-confirm-box">
        <div className="sos-confirm-icon">🆘</div>
        <h3 className="sos-confirm-title">SOS Sent!</h3>
        <p className="sos-confirm-sub">
          Triggered via <strong>{trigger}</strong>.<br />Your contacts are being alerted.
        </p>
        <button className="sos-confirm-dismiss" onClick={onDismiss}>Got it</button>
      </div>
    </div>
  );
}

// ── Contact card ───────────────────────────────────────────────
function ContactCard({ contact, onRemove }) {
  return (
    <div className="sos-contact-card">
      <div className="sos-contact-avatar">{contact.name?.charAt(0).toUpperCase() || "?"}</div>
      <div className="sos-contact-info">
        <p className="sos-contact-name">{contact.name}</p>
        <p className="sos-contact-phone">{contact.phone}</p>
        {contact.relation && <span className="sos-contact-relation">{contact.relation}</span>}
      </div>
      <button className="sos-contact-remove" onClick={() => onRemove(contact._id)} title="Remove">✕</button>
    </div>
  );
}

// ── Add contact modal ──────────────────────────────────────────
function AddContactModal({ onClose, onAdd }) {
  const [form, setForm]       = useState({ name: "", phone: "", relation: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const relations             = ["Mother", "Father", "Spouse", "Friend", "Sibling", "Other"];

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10)
      return setError("Enter a valid 10-digit phone number.");
    setError(""); setLoading(true);
    try { await onAdd(form); onClose(); }
    catch (e) { setError(e.message || "Could not add contact."); }
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
          <input className="sos-input" placeholder="e.g. Priya Sharma" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label className="sos-label">Phone Number</label>
          <input className="sos-input" placeholder="e.g. 9876543210" type="tel" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label className="sos-label">Relation</label>
          <div className="sos-relation-chips">
            {relations.map((r) => (
              <button key={r}
                className={`sos-chip ${form.relation === r ? "sos-chip-active" : ""}`}
                onClick={() => setForm({ ...form, relation: r })}>{r}</button>
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

// ── Log row ────────────────────────────────────────────────────
function LogRow({ log }) {
  const date    = new Date(log.triggeredAt);
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const TYPE = {
    manual:    { bg: "#2d1f1f", border: "#7f1d1d", text: "#fca5a5", label: "Manual"    },
    auto:      { bg: "#2d1a0a", border: "#7c2d12", text: "#fdba74", label: "Auto"      },
    stopped:   { bg: "#1e1e2d", border: "#3730a3", text: "#a5b4fc", label: "Stopped"   },
    dismissed: { bg: "#1a1f1a", border: "#14532d", text: "#86efac", label: "Cleared"   },
    volume:    { bg: "#1a1a2d", border: "#312e81", text: "#c4b5fd", label: "Volume"    },
    shake:     { bg: "#2d2a0a", border: "#92400e", text: "#fde68a", label: "Shake"     },
    crash:     { bg: "#2d0a0a", border: "#991b1b", text: "#fecaca", label: "Crash"     },
    countdown: { bg: "#0a2d1a", border: "#065f46", text: "#6ee7b7", label: "Countdown" },
    fake_call: { bg: "#0a1f2d", border: "#0e4062", text: "#7dd3fc", label: "Fake Call" },
  };
  const s = TYPE[log.type] || TYPE.manual;

  return (
    <div className="sos-log-row">
      <div className="sos-log-left">
        <span className="sos-log-type"
          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
          {s.label}
        </span>
        <div className="sos-log-meta">
          <p className="sos-log-location">{log.locationLabel || log.location?.address || "Unknown location"}</p>
          <p className="sos-log-contacts">
            {log.contactsAlerted?.length ? `Alerted: ${log.contactsAlerted.join(", ")}` : "No contacts alerted"}
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

// ── Main ──────────────────────────────────────────────────────
export default function SOSCenter() {
  const navigate = useNavigate();

  const [contacts, setContacts]         = useState([]);
  const [sosLog, setSosLog]             = useState([]);
  const [sosActive, setSosActive]       = useState(false);
  const [sosMsg, setSosMsg]             = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [activeTab, setActiveTab]       = useState("contacts");
  const [sosConfirm, setSosConfirm]     = useState(null);
  const [sosCancelled, setSosCancelled] = useState(false);

  // ── Feature states ───────────────────────────────────────────
  const [volumeArmed, setVolumeArmed] = useState(false);
  const [shakeArmed,  setShakeArmed]  = useState(false);
  const [volPresses,  setVolPresses]  = useState(0);
  const [shakeCount,  setShakeCount]  = useState(0);
  const [cdTotal,     setCdTotal]     = useState(10);

  const anyArmed = volumeArmed || shakeArmed;

  // Use a ref so handleSOS always reads the latest value
  const sosCancelledRef = useRef(false);

  // ── Fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (!getToken()) { setError("Please login again."); setLoading(false); return; }
      try {
        const [pRes, lRes] = await Promise.all([
          axios.get(`${API}/profile`, { headers: authHeaders() }),
          axios.get(`${API}/sos/log`, { headers: authHeaders() }).catch(() => ({ data: [] })),
        ]);
        setContacts(pRes.data.emergencyContacts || []);
        setSosLog(lRes.data || []);
      } catch { setError("Could not load your profile. Please log in again."); }
      setLoading(false);
    };
    load();
  }, []);

  // ── Core SOS sender ───────────────────────────────────────────
  const handleSOS = useCallback((source = "manual") => {
    if (source === "manual" && contacts.length === 0) {
      setSosMsg("⚠ Add at least one emergency contact first.");
      setTimeout(() => setSosMsg(""), 4000);
      return;
    }

    // Reset cancel flag
    sosCancelledRef.current = false;
    setSosCancelled(false);
    setSosActive(true);
    setSosMsg("📡 Locating you and sending SOS…");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        // If user cancelled before location came back, stop here
        if (sosCancelledRef.current) return;

        try {
          const res = await axios.post(
            `${API}/profile/sos`,
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { headers: authHeaders() }
          );

          // Check again after API call
          if (sosCancelledRef.current) return;

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

          // Persist the event
          await axios.post(`${API}/sos/log`, {
            type: source,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            contactsAlerted: alerted.map((c) => c.name || c.phone),
          }, { headers: authHeaders() }).catch(() => {});

          const lRes = await axios.get(`${API}/sos/log`, { headers: authHeaders() }).catch(() => ({ data: [] }));
          setSosLog(lRes.data || []);

          // Show confirmation for non-manual triggers
          if (source !== "manual") {
            setSosConfirm(
              source === "shake"     ? "Phone Shake × 3"   :
              source === "volume"    ? "Volume Button × 3" :
              source === "countdown" ? "Countdown Timer"   :
              source
            );
          }
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
  }, [contacts]);

  // ── Cancel SOS handler ────────────────────────────────────────
  const handleCancelSOS = () => {
    sosCancelledRef.current = true;
    setSosCancelled(true);
    setSosActive(false);
    setSosMsg("🛑 SOS cancelled.");
    setTimeout(() => setSosMsg(""), 3000);
  };

  // ── Hooks ─────────────────────────────────────────────────────
  const { isMobileUnsupported } = useVolumeButtonSOS({
    armed:      volumeArmed,
    onTrigger:  () => handleSOS("volume"),
    onProgress: setVolPresses,
  });

  const { requestPermission: reqShakePerm, permissionState: shakePerm } = useShakeSOS({
    armed:      shakeArmed,
    onTrigger:  () => handleSOS("shake"),
    onProgress: setShakeCount,
  });

  const { start: startCd, cancel: cancelCd, active: cdActive, secondsLeft } = useCountdownSOS({
    onTrigger: () => handleSOS("countdown"),
  });

  const handleStartCd = (secs) => { setCdTotal(secs); startCd(secs); };

  // ── Contacts CRUD ─────────────────────────────────────────────
  const handleAddContact = async (form) => {
    const res = await axios.post(`${API}/profile/emergency-contacts`, form, { headers: authHeaders() });
    setContacts(res.data.emergencyContacts || []);
  };
  const handleRemoveContact = async (id) => {
    if (!window.confirm("Remove this emergency contact?")) return;
    try {
      const res = await axios.delete(`${API}/profile/emergency-contacts/${id}`, { headers: authHeaders() });
      setContacts(res.data.emergencyContacts || []);
    } catch { alert("Could not remove contact."); }
  };
  const handleClearLog = async () => {
    if (!window.confirm("Clear all SOS history?")) return;
    try { await axios.delete(`${API}/sos/log`, { headers: authHeaders() }); setSosLog([]); }
    catch { alert("Could not clear history."); }
  };

  // ─────────────────────────────────────────────────────────────
  if (loading) return (<><Navbar /><div className="sos-page"><div className="sos-loading"><div className="sos-spinner"/><p>Loading SOS Center…</p></div></div></>);
  if (error)   return (<><Navbar /><div className="sos-page"><div className="sos-error">⚠ {error}</div></div></>);

  return (
    <>
      <Navbar />
      <div className="sos-page">

        <SOSConfirmation trigger={sosConfirm} onDismiss={() => setSosConfirm(null)} />

        {/* ── Hero ── */}
        <div className="sos-hero">
          <div className="sos-hero-left">
            <StatusBadge active={sosActive} anyArmed={anyArmed} />
            <h1 className="sos-title">SOS Center</h1>
            <p className="sos-subtitle">Your emergency command hub. One tap to alert everyone who matters.</p>
            <button className="sos-fake-call-btn" onClick={() => navigate("/fake-call")}>📞 Fake Call</button>
          </div>
          <div className="sos-hero-right">
            <button
              className={`sos-main-btn ${sosActive ? "sos-main-btn-active" : ""}`}
              onClick={() => handleSOS("manual")}
              disabled={sosActive}
            >
              <span className="sos-main-ring" />
              <span className="sos-main-ring sos-main-ring2" />
              <span className="sos-main-inner">
                <span className="sos-main-label">{sosActive ? "SENDING…" : "SOS"}</span>
                <span className="sos-main-sub">{sosActive ? "please wait" : "tap to send"}</span>
              </span>
            </button>
          </div>
        </div>

        {/* ── Toast with Stop SOS button ── */}
        {sosMsg && (
          <div className={`sos-toast ${sosMsg.startsWith("✅") ? "sos-toast-ok" : "sos-toast-warn"}`}>
            <span>{sosMsg}</span>
            {sosActive && (
              <button className="sos-stop-btn" onClick={handleCancelSOS}>
                🛑 Stop SOS
              </button>
            )}
          </div>
        )}

        {/* ── Countdown active top banner ── */}
        {cdActive && (
          <div className="sos-countdown-banner">
            <span>⏱ SOS sending in <strong>{secondsLeft}s</strong></span>
            <button className="sos-countdown-cancel" onClick={cancelCd}>Cancel — I'm Safe</button>
          </div>
        )}

        {/* ── Quick dial ── */}
        <div className="sos-quickdial">
          {[["🚔","100","Police"],["🚑","102","Ambulance"],["🚒","101","Fire"],["👩","1091","Women"],["🆘","112","Emergency"]].map(
            ([icon,num,label]) => (
              <a key={num} href={`tel:${num}`} className={`sos-dial-btn sos-dial-${label.toLowerCase()}`}>
                <span className="sos-dial-icon">{icon}</span>
                <span className="sos-dial-num">{num}</span>
                <span className="sos-dial-label">{label}</span>
              </a>
            )
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="sos-tabs">
          {["contacts","features","log"].map((tab) => (
            <button key={tab}
              className={`sos-tab ${activeTab === tab ? "sos-tab-active" : ""}`}
              onClick={() => setActiveTab(tab)}>
              {tab === "contacts" && "👥 Contacts"}
              {tab === "features" && (<>⚡ Features{anyArmed && <span className="sos-tab-armed-dot"/>}</>)}
              {tab === "log"      && "📋 History"}
            </button>
          ))}
        </div>

        {/* ── Contacts tab ── */}
        {activeTab === "contacts" && (
          <div className="sos-tab-panel">
            <div className="sos-section-header">
              <div>
                <h2 className="sos-section-title">Emergency Contacts</h2>
                <p className="sos-section-desc">These people will be alerted instantly when you send an SOS.</p>
              </div>
              <button className="sos-btn-primary" onClick={() => setShowAddModal(true)} disabled={contacts.length >= 5}>
                + Add
              </button>
            </div>
            {contacts.length === 0 ? (
              <div className="sos-empty">
                <div className="sos-empty-icon">👥</div>
                <p className="sos-empty-title">No contacts yet</p>
                <p className="sos-empty-desc">Add at least one person who should be alerted in an emergency.</p>
                <button className="sos-btn-primary" onClick={() => setShowAddModal(true)}>Add Your First Contact</button>
              </div>
            ) : (
              <div className="sos-contacts-list">
                {contacts.map((c) => <ContactCard key={c._id} contact={c} onRemove={handleRemoveContact} />)}
                {contacts.length < 5 && (
                  <button className="sos-add-more" onClick={() => setShowAddModal(true)}>
                    + Add another contact ({contacts.length}/5)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Features tab ── */}
        {activeTab === "features" && (
          <div className="sos-tab-panel">
            <div className="sos-section-header">
              <div>
                <h2 className="sos-section-title">SOS Guards</h2>
                <p className="sos-section-desc">Multiple ways to trigger SOS without unlocking your screen.</p>
              </div>
            </div>

            <div className="sos-features-notice">
              <span>ℹ️</span>
              <p>
                These guards work while this browser tab is <strong>open</strong> (you can lock
                your screen — the tab stays alive). They cannot run when the browser is fully closed.
                For best protection, keep this page open during your ride.
              </p>
            </div>

            <ShakeSOSCard
              armed={shakeArmed}
              onToggle={setShakeArmed}
              shakeCount={shakeCount}
              permissionState={shakePerm}
              onRequestPermission={reqShakePerm}
            />

            <CountdownSOSCard
              active={cdActive}
              secondsLeft={secondsLeft}
              totalSeconds={cdTotal}
              onStart={handleStartCd}
              onCancel={cancelCd}
            />

            <LiveLocationCard />

            <VolumeSOSCard
              armed={volumeArmed}
              onToggle={setVolumeArmed}
              pressCount={volPresses}
              isMobileUnsupported={isMobileUnsupported}
            />

            <div className="sos-feature-card" onClick={() => navigate("/fake-call")}>
              <div className="sos-feature-icon">📞</div>
              <div className="sos-feature-info">
                <p className="sos-feature-title">Fake Call</p>
                <p className="sos-feature-desc">Simulate an incoming call to escape an uncomfortable situation</p>
              </div>
              <span className="sos-feature-arrow">›</span>
            </div>
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === "log" && (
          <div className="sos-tab-panel">
            <div className="sos-section-header">
              <div>
                <h2 className="sos-section-title">SOS History</h2>
                <p className="sos-section-desc">All past alerts, sorted newest first.</p>
              </div>
              {sosLog.length > 0 && (
                <button className="sos-btn-ghost sos-btn-danger" onClick={handleClearLog}>Clear All</button>
              )}
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
        <AddContactModal onClose={() => setShowAddModal(false)} onAdd={handleAddContact} />
      )}

      <SOSGestureButton onSOSTriggered={handleSOS} />
    </>
  );
}