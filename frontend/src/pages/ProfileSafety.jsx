import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/profileSafety.css";

const API = "https://cab-safety.onrender.com/api";

const VEHICLE_OPTIONS = [
  { value: "bike",    label: "🏍️ Bike" },
  { value: "scooter", label: "🛵 Scooter" },
  { value: "car",     label: "🚗 Car" },
  { value: "other",   label: "🚌 Other" },
];

const RELATION_OPTIONS = ["Parent", "Sibling", "Friend", "Partner", "Colleague", "Other"];

function getToken() {
  return typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;
}

function formatForWhatsApp(raw) {
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("0")) p = "91" + p.slice(1);
  if (p.length === 10)   p = "91" + p;
  return p;
}

function formatForSMS(raw) {
  let p = raw.replace(/\D/g, "");
  if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  if (p.startsWith("0")) p = p.slice(1);
  return p;
}

function sendToContact(contact, message, index) {
  const delay    = index * 500;
  const waPhone  = formatForWhatsApp(contact.phone);
  const smsPhone = formatForSMS(contact.phone);
  const encoded  = encodeURIComponent(message);

  setTimeout(() => {
    window.open(`https://wa.me/${waPhone}?text=${encoded}`, "_blank");

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = `sms:${smsPhone}?body=${encoded}`;
    document.body.appendChild(iframe);
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, delay);
}

export default function ProfileSafety() {
  const navigate = useNavigate();
  const fileRef  = useRef();

  const [profile, setProfile] = useState({
    firstName: "", middleName: "", lastName: "",
    age: "", contactNumber: "", email: "",
    vehicleType: "bike", nightRider: false,
    notifications: true, profilePhoto: ""
  });

  // ── Edit mode for profile ─────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("profileSaved") !== "true"
        : true
  );

  // ── Edit mode for contacts ────────────────────────────────────────────────
  const [isEditingContacts, setIsEditingContacts] = useState(
    () =>
      typeof window !== "undefined"
        ? localStorage.getItem("contactsSaved") !== "true"
        : true
  );

  const [pwForm, setPwForm]       = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError]     = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const [contacts, setContacts] = useState([
    { name: "", phone: "", relation: "" },
    { name: "", phone: "", relation: "" },
    { name: "", phone: "", relation: "" },
  ]);

  const [activeSection, setActiveSection] = useState("profile");
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");
  const [sosActive, setSosActive] = useState(false);
  const [sosMsg, setSosMsg]       = useState("");

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { navigate("/auth"); return; }
    axios.get(`${API}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      const u = res.data;
      setProfile({
        firstName:     u.firstName     || "",
        middleName:    u.middleName    || "",
        lastName:      u.lastName      || "",
        age:           u.age           || "",
        contactNumber: u.contactNumber || "",
        email:         u.email         || "",
        vehicleType:   u.vehicleType   || "bike",
        nightRider:    u.nightRider    || false,
        notifications: u.notifications !== false,
        profilePhoto:  u.profilePhoto  || ""
      });
      if (u.emergencyContacts?.length > 0) {
        const filled = [...u.emergencyContacts];
        while (filled.length < 3) filled.push({ name: "", phone: "", relation: "" });
        setContacts(filled);
      }
    }).catch(() => navigate("/auth"));
  }, []);

  const saveProfile = async () => {
    setSaving(true); setSaveMsg("");
    try {
      await axios.put(`${API}/profile/update`, profile, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSaveMsg("✅ Profile saved successfully");
      setIsEditing(false);
      localStorage.setItem("profileSaved", "true");
    } catch {
      setSaveMsg("❌ Failed to save profile");
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const changePassword = async () => {
    setPwError(""); setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirm) { setPwError("New passwords do not match"); return; }
    if (pwForm.newPassword.length < 6) { setPwError("Password must be at least 6 characters"); return; }
    try {
      await axios.put(`${API}/profile/change-password`,
        { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setPwSuccess("✅ Password changed successfully");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password");
    }
    setTimeout(() => { setPwError(""); setPwSuccess(""); }, 4000);
  };

  const saveContacts = async () => {
    setSaving(true); setSaveMsg("");
    const filled = contacts.filter(c => c.name.trim() && c.phone.trim());
    try {
      await axios.put(`${API}/profile/emergency-contacts`,
        { contacts: filled },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setSaveMsg("✅ Emergency contacts saved");
      // Switch to view mode and remember it
      setIsEditingContacts(false);
      localStorage.setItem("contactsSaved", "true");
    } catch { setSaveMsg("❌ Failed to save contacts"); }
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const triggerSOS = async () => {
    setSosActive(true);
    setSosMsg("📡 Getting your location...");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await axios.post(`${API}/profile/sos`,
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const { contacts: sosContacts, location, userName } = res.data;
        const msg = `🚨 SOS from ${userName}! I need help. My location: ${location.mapsLink}`;
        sosContacts.forEach((c, i) => sendToContact(c, msg, i));
        setSosMsg(`✅ SMS + WhatsApp sent to ${sosContacts.length} contact(s)`);
      } catch (err) {
        setSosMsg(err.response?.data?.message || "❌ SOS failed. Call 100 directly.");
      }
      setTimeout(() => { setSosActive(false); setSosMsg(""); }, 5000);
    }, () => {
      setSosMsg("❌ Could not get location. Call 100 directly.");
      setTimeout(() => { setSosActive(false); setSosMsg(""); }, 4000);
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile(p => ({ ...p, profilePhoto: reader.result }));
    reader.readAsDataURL(file);
  };

  const updateContact = (i, field, value) => {
    setContacts(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  };

  const sections = [
    { id: "profile",  label: "👤 Profile" },
    { id: "security", label: "🔒 Security" },
    { id: "contacts", label: "📞 Contacts" },
    { id: "sos",      label: "🆘 SOS" },
  ];

  const contactsSavedBefore =
  typeof window !== "undefined" &&
  localStorage.getItem("contactsSaved") === "true";
  return (
    <>
      <Navbar />
      <div className="ps-container">

        {/* ── Header ── */}
        <div className="ps-header">
          <div className="ps-avatar-wrap" onClick={() => fileRef.current.click()}>
            {profile.profilePhoto
              ? <img src={profile.profilePhoto} alt="avatar" className="ps-avatar-img" />
              : <div className="ps-avatar-placeholder">
                  {profile.firstName ? profile.firstName[0].toUpperCase() : "?"}
                </div>
            }
            <div className="ps-avatar-edit">✏️</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
          </div>

          <div className="ps-header-info">
            <h2>{profile.firstName} {profile.lastName}</h2>
            <p>{profile.email}</p>
            <span className="ps-vehicle-badge">
              {VEHICLE_OPTIONS.find(v => v.value === profile.vehicleType)?.label || "🏍️ Bike"}
            </span>
            {!isEditing && activeSection === "profile" && (
              <button
                className="ps-edit-profile-btn"
                onClick={() => {
                  setIsEditing(true);
                  setActiveSection("profile");
                }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          <button className="ps-home-btn" onClick={() => navigate("/")}>🏠 Home</button>
        </div>

        {/* ── Nav ── */}
        <div className="ps-nav">
          {sections.map(s => (
            <button
              key={s.id}
              className={`ps-nav-btn ${activeSection === s.id ? "active" : ""}`}
              onClick={() => setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {saveMsg && <div className="ps-toast">{saveMsg}</div>}

        {/* ══ PROFILE ══ */}
        {activeSection === "profile" && (
          <div className="ps-section">
            <h3 className="ps-section-title">Personal Information</h3>
            <div className="ps-grid">
              <div className="ps-field">
                <label>First Name *</label>
                {isEditing
                  ? <input value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))} />
                  : <p className="ps-field-value">{profile.firstName || "—"}</p>
                }
              </div>
              <div className="ps-field">
                <label>Middle Name</label>
                {isEditing
                  ? <input value={profile.middleName} onChange={e => setProfile(p => ({ ...p, middleName: e.target.value }))} />
                  : <p className="ps-field-value">{profile.middleName || "—"}</p>
                }
              </div>
              <div className="ps-field">
                <label>Last Name *</label>
                {isEditing
                  ? <input value={profile.lastName} onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))} />
                  : <p className="ps-field-value">{profile.lastName || "—"}</p>
                }
              </div>
              <div className="ps-field">
                <label>Age</label>
                {isEditing
                  ? <input type="number" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} />
                  : <p className="ps-field-value">{profile.age || "—"}</p>
                }
              </div>
              <div className="ps-field">
                <label>Phone Number *</label>
                {isEditing
                  ? <input value={profile.contactNumber} onChange={e => setProfile(p => ({ ...p, contactNumber: e.target.value }))} />
                  : <p className="ps-field-value">{profile.contactNumber || "—"}</p>
                }
              </div>
              <div className="ps-field">
                <label>Email</label>
                <p className="ps-field-value ps-disabled">{profile.email || "—"}</p>
              </div>
            </div>

            <h3 className="ps-section-title" style={{ marginTop: "32px" }}>Ride Preferences</h3>
            <div className="ps-field">
              <label>Vehicle Type</label>
              {isEditing
                ? (
                  <div className="ps-vehicle-options">
                    {VEHICLE_OPTIONS.map(v => (
                      <button
                        key={v.value}
                        className={`ps-vehicle-btn ${profile.vehicleType === v.value ? "active" : ""}`}
                        onClick={() => setProfile(p => ({ ...p, vehicleType: v.value }))}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )
                : <p className="ps-field-value">
                    {VEHICLE_OPTIONS.find(v => v.value === profile.vehicleType)?.label || "—"}
                  </p>
              }
            </div>

            <div className="ps-toggles">
              <div className="ps-toggle-row">
                <div>
                  <p className="ps-toggle-label">🌙 Night Rider Mode</p>
                  <p className="ps-toggle-sub">Extra safety alerts for rides after 10pm</p>
                </div>
                {isEditing
                  ? (
                    <div className={`ps-toggle ${profile.nightRider ? "on" : ""}`}
                      onClick={() => setProfile(p => ({ ...p, nightRider: !p.nightRider }))}>
                      <div className="ps-toggle-thumb" />
                    </div>
                  )
                  : <span className="ps-field-value">{profile.nightRider ? "On" : "Off"}</span>
                }
              </div>
              <div className="ps-toggle-row">
                <div>
                  <p className="ps-toggle-label">🔔 Notifications</p>
                  <p className="ps-toggle-sub">Ride updates and safety alerts</p>
                </div>
                {isEditing
                  ? (
                    <div className={`ps-toggle ${profile.notifications ? "on" : ""}`}
                      onClick={() => setProfile(p => ({ ...p, notifications: !p.notifications }))}>
                      <div className="ps-toggle-thumb" />
                    </div>
                  )
                  : <span className="ps-field-value">{profile.notifications ? "On" : "Off"}</span>
                }
              </div>
            </div>

            {isEditing && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "8px" }}>
                <button className="ps-save-btn" onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </button>
                {localStorage.getItem("profileSaved") === "true" && (
                  <button
                    className="ps-cancel-btn"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ SECURITY ══ */}
        {activeSection === "security" && (
          <div className="ps-section">
            <h3 className="ps-section-title">Change Password</h3>
            <div className="ps-field">
              <label>Current Password</label>
              <input type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password" />
            </div>
            <div className="ps-field" style={{ marginTop: "14px" }}>
              <label>New Password</label>
              <input type="password" value={pwForm.newPassword}
                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                placeholder="Min 6 characters" />
            </div>
            <div className="ps-field" style={{ marginTop: "14px" }}>
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat new password" />
            </div>
            {pwError   && <p className="ps-error">{pwError}</p>}
            {pwSuccess && <p className="ps-success">{pwSuccess}</p>}
            <button className="ps-save-btn" onClick={changePassword}>Change Password</button>
            <div className="ps-logout-wrap">
              <button className="ps-logout-btn" onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("profileSaved");
                localStorage.removeItem("contactsSaved");
                navigate("/auth");
              }}>
                🚪 Logout
              </button>
            </div>
          </div>
        )}

        {/* ══ CONTACTS ══ */}
        {activeSection === "contacts" && (
          <div className="ps-section">
            {/* Title row with inline Edit button when saved */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "8px" }}>
              <h3 className="ps-section-title" style={{ margin: 0 }}>Emergency Contacts</h3>
              {!isEditingContacts && contactsSavedBefore && (
                <button
                  className="ps-edit-profile-btn"
                  onClick={() => setIsEditingContacts(true)}
                >
                  ✏️ Edit Contacts
                </button>
              )}
            </div>
            <p className="ps-section-sub">
              Add up to 3 trusted people. SOS will send them both an SMS and a WhatsApp message with your location.
              Enter numbers as 10 digits (e.g. 9876543210) or with country code (+91 9876543210).
            </p>

            {contacts.map((c, i) => (
              <div key={i} className="ps-contact-card">
                <div className="ps-contact-num">Contact {i + 1}</div>
                <div className="ps-grid">
                  <div className="ps-field">
                    <label>Name</label>
                    {isEditingContacts
                      ? <input value={c.name} onChange={e => updateContact(i, "name", e.target.value)} placeholder="Full name" />
                      : <p className="ps-field-value">{c.name || "—"}</p>
                    }
                  </div>
                  <div className="ps-field">
                    <label>Phone</label>
                    {isEditingContacts
                      ? <input value={c.phone} onChange={e => updateContact(i, "phone", e.target.value)} placeholder="9876543210" />
                      : <p className="ps-field-value">{c.phone || "—"}</p>
                    }
                  </div>
                  <div className="ps-field">
                    <label>Relation</label>
                    {isEditingContacts
                      ? (
                        <select value={c.relation} onChange={e => updateContact(i, "relation", e.target.value)}>
                          <option value="">Select relation</option>
                          {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )
                      : <p className="ps-field-value">{c.relation || "—"}</p>
                    }
                  </div>
                </div>
              </div>
            ))}

            {/* Save / Cancel — only shown while editing */}
            {isEditingContacts && (
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
                <button className="ps-save-btn" onClick={saveContacts} disabled={saving}>
                  {saving ? "Saving…" : "Save Contacts"}
                </button>
                {contactsSavedBefore && (
                  <button
                    className="ps-cancel-btn"
                    onClick={() => setIsEditingContacts(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}

            <h3 className="ps-section-title" style={{ marginTop: "36px" }}>🇮🇳 Emergency Helplines</h3>
            <div className="ps-helplines">
              {[
                { label: "Police",         number: "100",  icon: "🚔" },
                { label: "Ambulance",      number: "108",  icon: "🚑" },
                { label: "Women Helpline", number: "1091", icon: "👩" },
                { label: "Disaster Mgmt",  number: "108",  icon: "🆘" },
              ].map(h => (
                <a key={h.label} href={`tel:${h.number}`} className="ps-helpline-card">
                  <span className="ps-helpline-icon">{h.icon}</span>
                  <span className="ps-helpline-label">{h.label}</span>
                  <span className="ps-helpline-num">{h.number}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ══ SOS ══ */}
        {activeSection === "sos" && (
          <div className="ps-section ps-sos-section">
            <h3 className="ps-section-title">🆘 Emergency SOS</h3>
            <p className="ps-section-sub">
              Tap the button below to instantly send your GPS location to all emergency contacts via <strong>SMS + WhatsApp</strong> simultaneously.
            </p>
            <div className="ps-sos-wrap">
              <button
                className={`ps-sos-btn ${sosActive ? "active" : ""}`}
                onClick={triggerSOS}
                disabled={sosActive}
              >
                <span className="ps-sos-ring" />
                <span className="ps-sos-ring ps-sos-ring2" />
                SOS
              </button>
            </div>
            {sosMsg && <div className="ps-sos-msg">{sosMsg}</div>}
            <div className="ps-sos-info">
              <div className="ps-sos-info-item"><span>📍</span><p>Sends your exact GPS location</p></div>
              <div className="ps-sos-info-item"><span>💬</span><p>Sends WhatsApp message</p></div>
              <div className="ps-sos-info-item"><span>📱</span><p>Sends SMS (works without internet)</p></div>
              <div className="ps-sos-info-item"><span>👥</span><p>Notifies all {contacts.filter(c => c.name).length} saved contacts</p></div>
            </div>
            <div className="ps-helplines" style={{ marginTop: "24px" }}>
              <a href="tel:100"  className="ps-helpline-card"><span>🚔</span><span>Police</span><span>100</span></a>
              <a href="tel:108"  className="ps-helpline-card"><span>🚑</span><span>Ambulance</span><span>108</span></a>
              <a href="tel:1091" className="ps-helpline-card"><span>👩</span><span>Women</span><span>1091</span></a>
            </div>
          </div>
        )}

      </div>
    </>
  );
}