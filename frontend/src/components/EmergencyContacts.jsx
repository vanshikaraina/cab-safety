import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "https://cab-safety.onrender.com/api";

const getRelationEmoji = (relation) => {
  const map = {
    mother: "👩", father: "👨", sister: "👧", brother: "👦",
    wife: "💑", husband: "💑", friend: "🧑", doctor: "🩺",
  };
  return map[relation?.toLowerCase()] || "👤";
};

const styles = {
  container: {
    padding: "28px 24px",
    maxWidth: "480px",
    margin: "0 auto",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#0d0d0d",
    minHeight: "100vh",
  },
  title: {
    fontFamily: "'Sora', 'Segoe UI', sans-serif",
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "24px",
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  loadingState: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#888",
    fontSize: "0.95rem",
    padding: "40px 0",
    justifyContent: "center",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#555",
    fontSize: "0.95rem",
  },
  emptyIcon: {
    fontSize: "3rem",
    display: "block",
    marginBottom: "12px",
    opacity: 0.4,
  },
  contactsList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    padding: "18px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    transition: "border-color 0.2s ease, transform 0.15s ease",
  },
  avatar: {
    width: "46px",
    height: "46px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ff4d4d22, #ff4d4d44)",
    border: "1.5px solid #ff4d4d55",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    flexShrink: 0,
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: "'Sora', 'Segoe UI', sans-serif",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#f0f0f0",
    margin: "0 0 4px 0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  phone: {
    fontSize: "0.85rem",
    color: "#888",
    margin: "0 0 3px 0",
    letterSpacing: "0.3px",
  },
  relationBadge: {
    display: "inline-block",
    fontSize: "0.72rem",
    fontWeight: 500,
    color: "#ff4d4d",
    background: "#ff4d4d18",
    border: "1px solid #ff4d4d33",
    borderRadius: "20px",
    padding: "2px 10px",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginTop: "2px",
  },
  callLink: {
    textDecoration: "none",
    flexShrink: 0,
  },
  callBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "#ff4d4d",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "10px 16px",
    fontFamily: "'Sora', 'Segoe UI', sans-serif",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.3px",
    boxShadow: "0 4px 14px #ff4d4d33",
  },
};

// Injects keyframes + hover/animation classes once into <head>
const injectStyles = () => {
  if (document.getElementById("ec-styles")) return;
  const tag = document.createElement("style");
  tag.id = "ec-styles";
  tag.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
    @keyframes ecSlideIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ecPulse {
      0%,100% { opacity:0.3; transform:scale(0.8); }
      50%      { opacity:1;   transform:scale(1.2); }
    }
    .ec-card { animation: ecSlideIn 0.3s ease both; }
    .ec-card:hover { border-color: #ff4d4d44 !important; transform: translateY(-2px); }
    .ec-call-btn:hover { background: #ff3333 !important; transform: scale(1.05); box-shadow: 0 6px 20px #ff4d4d55 !important; }
    .ec-call-btn:active { transform: scale(0.97); }
    .ec-dot { width:8px; height:8px; background:#ff4d4d; border-radius:50%; animation: ecPulse 1.2s ease-in-out infinite; display:inline-block; }
    .ec-dot:nth-child(2){ animation-delay:.2s }
    .ec-dot:nth-child(3){ animation-delay:.4s }
  `;
  document.head.appendChild(tag);
};

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    injectStyles();
    const fetchContacts = async () => {
      try {
        const res = await axios.get(`${API}/profile`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        setContacts(res.data.emergencyContacts || []);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, []);

  if (loading)
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          <span className="ec-dot" />
          <span className="ec-dot" />
          <span className="ec-dot" />
          <span>Loading contacts...</span>
        </div>
      </div>
    );

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        <span>🚨</span> Emergency Contacts
      </h2>

      {contacts.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>👥</span>
          No contacts added yet
        </div>
      ) : (
        <div style={styles.contactsList}>
          {contacts.map((c, i) => (
            <div
              key={i}
              className="ec-card"
              style={{ ...styles.card, animationDelay: `${i * 0.05}s` }}
            >
              <div style={styles.avatar}>{getRelationEmoji(c.relation)}</div>

              <div style={styles.contactInfo}>
                <p style={styles.name}>{c.name}</p>
                <p style={styles.phone}>{c.phone}</p>
                {c.relation && (
                  <span style={styles.relationBadge}>{c.relation}</span>
                )}
              </div>

              <a href={`tel:${c.phone}`} style={styles.callLink}>
                <button className="ec-call-btn" style={styles.callBtn}>
                  📞 Call
                </button>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;