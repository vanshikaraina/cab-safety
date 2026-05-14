import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "https://cab-safety.onrender.com/api";

const getRelationEmoji = (relation) => {
  const map = {
    mother: "👩", parent: "👨", sister: "👧", sibling: "👦",
    wife: "💑", husband: "💑", friend: "🤝", doctor: "🩺",
  };
  return map[relation?.toLowerCase()] || "👤";
};

const injectStyles = () => {
  if (document.getElementById("ec-scoped-styles")) return;
  const tag = document.createElement("style");
  tag.id = "ec-scoped-styles";
  tag.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=DM+Sans:wght@400;500;600&display=swap');

    .ec-container {
      padding: 72px 24px 60px;
      max-width: 520px;
      margin: 0 auto;
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(160deg, #080c14 0%, #0d1520 55%, #111827 100%);
      min-height: 100vh;
      color: #e2e8f0;
    }

    .ec-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: none;
      font-size: 14px;
      font-weight: 500;
      color: #64748b;
      cursor: pointer;
      margin-bottom: 28px;
      padding: 4px 0;
      transition: color 0.18s, transform 0.18s;
      font-family: 'DM Sans', sans-serif;
    }
    .ec-back-btn:hover { color: #cbd5e1; transform: translateX(-3px); }

    .ec-header { margin-bottom: 32px; }

    .ec-title {
      font-family: 'Syne', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 4px;
    }

    .ec-subtitle {
      font-size: 13px;
      color: #475569;
      margin: 0;
    }

    .ec-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #fca5a5;
      font-size: 12px;
      font-weight: 600;
      border-radius: 20px;
      padding: 2px 10px;
      margin-left: 10px;
      vertical-align: middle;
    }

    /* Loading */
    .ec-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #475569;
      font-size: 14px;
      padding: 80px 0;
    }

    @keyframes ec-pulse {
      0%, 100% { opacity: 0.2; transform: scale(0.75); }
      50%       { opacity: 1;   transform: scale(1.2); }
    }
    .ec-dot {
      width: 7px; height: 7px;
      background: #ef4444;
      border-radius: 50%;
      animation: ec-pulse 1.2s ease-in-out infinite;
      display: inline-block;
    }
    .ec-dot:nth-child(2) { animation-delay: 0.2s; }
    .ec-dot:nth-child(3) { animation-delay: 0.4s; }

    /* Empty */
    .ec-empty {
      text-align: center;
      padding: 80px 20px;
      color: #334155;
    }
    .ec-empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; opacity: 0.35; }
    .ec-empty-text { font-size: 14px; }

    /* List */
    .ec-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Card */
    @keyframes ec-slideIn {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ec-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 16px 18px;
      animation: ec-slideIn 0.3s ease both;
      transition: background 0.18s, border-color 0.18s, transform 0.15s, box-shadow 0.15s;
    }
    .ec-card:hover {
      background: rgba(255,255,255,0.055);
      border-color: rgba(239, 68, 68, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    /* Avatar */
    .ec-avatar {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.1);
      border: 1.5px solid rgba(239, 68, 68, 0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    /* Info */
    .ec-info { flex: 1; min-width: 0; }

    .ec-name {
      font-weight: 600;
      font-size: 15px;
      color: #f1f5f9;
      margin: 0 0 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ec-phone {
      font-size: 13px;
      color: #64748b;
      margin: 0 0 6px;
      letter-spacing: 0.3px;
    }

    .ec-relation {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 20px;
      padding: 2px 9px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    /* Call button */
    .ec-call-link { text-decoration: none; flex-shrink: 0; }

    .ec-call-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(239, 68, 68, 0.12);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      padding: 10px 16px;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s, border-color 0.18s, transform 0.15s, box-shadow 0.15s;
    }
    .ec-call-btn:hover {
      background: rgba(239, 68, 68, 0.22);
      border-color: rgba(239, 68, 68, 0.5);
      transform: scale(1.04);
      box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
    }
    .ec-call-btn:active { transform: scale(0.97); }

    @media (max-width: 480px) {
      .ec-container { padding: 56px 16px 48px; }
      .ec-call-btn { padding: 9px 12px; font-size: 12px; }
    }
  `;
  document.head.appendChild(tag);
};

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      <div className="ec-container">
        <div className="ec-loading">
          <span className="ec-dot" />
          <span className="ec-dot" />
          <span className="ec-dot" />
          <span>Loading contacts...</span>
        </div>
      </div>
    );

  return (
    <div className="ec-container">
      <button className="ec-back-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="ec-header">
        <h2 className="ec-title">
          Emergency Contacts
          {contacts.length > 0 && (
            <span className="ec-count-badge">{contacts.length}</span>
          )}
        </h2>
        <p className="ec-subtitle">Your trusted people in an emergency</p>
      </div>

      {contacts.length === 0 ? (
        <div className="ec-empty">
          <span className="ec-empty-icon">👥</span>
          <span className="ec-empty-text">No contacts added yet</span>
        </div>
      ) : (
        <div className="ec-list">
          {contacts.map((c, i) => (
            <div
              key={i}
              className="ec-card"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="ec-avatar">{getRelationEmoji(c.relation)}</div>

              <div className="ec-info">
                <p className="ec-name">{c.name}</p>
                <p className="ec-phone">{c.phone}</p>
                {c.relation && (
                  <span className="ec-relation">{c.relation}</span>
                )}
              </div>

              <a href={`tel:${c.phone}`} className="ec-call-link">
                <button className="ec-call-btn">📞 Call</button>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmergencyContacts;