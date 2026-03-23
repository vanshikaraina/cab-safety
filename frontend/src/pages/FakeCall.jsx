// src/pages/FakeCall.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/api`;

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("token") ||
    null
  );
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// ── Danger keywords ────────────────────────────────────────────
const DANGER_KEYWORDS = [
  "help", "danger", "unsafe", "scared", "afraid", "threat", "attack",
  "hurt", "emergency", "sos", "save me", "follow", "following",
  "kidnap", "harass", "threatening", "please help", "in trouble"
];

function containsDanger(text) {
  const lower = text.toLowerCase();
  return DANGER_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Personas ───────────────────────────────────────────────────
const PERSONAS = [
  {
    id: "friend",
    label: "Friend",
    emoji: "👫",
    name: "Riya",
    avatar: "R",
    color: "#6366f1",
    systemPrompt: `You are Riya, a close friend of the user. You're on a phone call with them.
Keep replies SHORT (1-3 sentences max) — like real spoken conversation.
Sound casual, warm, use Indian English naturally (yaar, haan, arrey etc).
Ask natural follow-up questions. If they say they're in danger or need help, sound alarmed and ask where they are urgently.
Never break character. Never say you're an AI.`
  },
  {
    id: "family",
    label: "Family",
    emoji: "👨‍👩‍👧",
    name: "Mom",
    avatar: "M",
    color: "#ec4899",
    systemPrompt: `You are the user's mother. You're on a phone call with them.
Keep replies SHORT (1-3 sentences max) — like real spoken conversation.
Sound caring, warm, slightly protective. Use Indian English naturally.
Ask how they're doing, where they are. If they say they're in danger, sound very worried and tell them to call police immediately.
Never break character. Never say you're an AI.`
  },
  {
    id: "support",
    label: "Cab Support",
    emoji: "🚖",
    name: "Cab Support",
    avatar: "S",
    color: "#f59e0b",
    systemPrompt: `You are a professional cab company customer support agent named Arjun.
Keep replies SHORT (1-3 sentences max) — like real spoken conversation.
Sound professional and helpful. Reference the user's ride naturally.
If they say they're in danger or feel unsafe, immediately say you're tracking their location and sending help, and ask them to stay on the line.
Never break character. Never say you're an AI.`
  },
  {
    id: "custom",
    label: "Custom",
    emoji: "✏️",
    name: "",
    avatar: "?",
    color: "#10b981",
    systemPrompt: ``
  }
];

// ── Format timer ───────────────────────────────────────────────
function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ── Main Component ─────────────────────────────────────────────
export default function FakeCall() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("pick"); // pick | ringing | call
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [customName, setCustomName] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [timer, setTimer] = useState(0);
  const [sosSent, setSosSent] = useState(false);
  const [sosStatus, setSosStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const timerRef      = useRef(null);
  const chatEndRef    = useRef(null);
  const inputRef      = useRef(null);
  const recognitionRef  = useRef(null);
  const transcriptRef   = useRef("");

  // ── Check speech support ─────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSpeechSupported(false);
  }, []);

  // scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  // timer
  useEffect(() => {
    if (screen === "call") {
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [screen]);

  // ── Speech Recognition ───────────────────────────────────────
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      transcriptRef.current = "";
    };
    recognition.onresult = (event) => {
      const current = Array.from(event.results).map((r) => r[0].transcript).join("");
      setTranscript(current);
      transcriptRef.current = current;
    };
    recognition.onend = () => {
      setIsListening(false);
      const finalText = transcriptRef.current.trim();
      if (finalText) {
        sendMessageText(finalText, true);
        setTranscript("");
        transcriptRef.current = "";
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setTranscript("");
      transcriptRef.current = "";
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => recognitionRef.current?.stop();

  // ── Auto SOS ─────────────────────────────────────────────────
  const triggerAutoSOS = async () => {
    if (sosSent) return;
    setSosSent(true);
    setSosStatus("🚨 Danger detected — sending SOS...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await axios.post(
            `${API}/profile/sos`,
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            { headers: authHeaders() }
          );
          setSosStatus("✅ SOS sent to your emergency contacts!");
        } catch {
          setSosStatus("⚠ SOS failed — call 100 directly!");
        }
      },
      () => setSosStatus("⚠ Location unavailable — call 100 directly!")
    );
  };

  // ── Start call ───────────────────────────────────────────────
  const startCall = async (persona) => {
    setScreen("ringing");
    setSelectedPersona(persona);
    await new Promise((r) => setTimeout(r, 2500));
    setScreen("call");
    const opening = await getAIReply(persona, [], "<<call_started>>");
    setMessages([{ role: "ai", text: opening }]);
  };

  // ── Get AI reply ─────────────────────────────────────────────
  const getAIReply = async (persona, history, userText) => {
    try {
      const builtHistory = history.map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));

      if (userText !== "<<call_started>>") {
        builtHistory.push({ role: "user", content: userText });
      }

      const systemPrompt =
        persona.id === "custom"
          ? `You are ${persona.name}, a close contact of the user on a phone call. Keep replies SHORT (1-3 sentences). Sound natural. If they mention danger, sound alarmed and tell them to call police. Never say you're an AI.`
          : persona.systemPrompt;

      const openingInstruction =
        userText === "<<call_started>>"
          ? [{ role: "user", content: "You just called me. Say a natural opening greeting." }]
          : builtHistory;

      const response = await fetch(`${API}/call-ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: openingInstruction, system: systemPrompt }),
      });

      const data = await response.json();
      // Support { reply } from our backend proxy
      return data.reply || data.content?.[0]?.text || "Sorry, I couldn't hear you.";
    } catch {
      return "Sorry, I missed that. Can you repeat?";
    }
  };

  // ── Core send ────────────────────────────────────────────────
  const sendMessageText = async (text, fromVoice = false) => {
    if (!text || aiTyping) return;
    const userMsg = { role: "user", text, fromVoice };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      fireAIReply(next, text);
      return next;
    });
    if (containsDanger(text)) triggerAutoSOS();
  };

  const fireAIReply = async (currentMessages, text) => {
    setAiTyping(true);
    const reply = await getAIReply(selectedPersona, currentMessages, text);
    setAiTyping(false);
    setMessages((prev) => [...prev, { role: "ai", text: reply }]);
    inputRef.current?.focus();
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessageText(text, false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const endCall = () => {
    clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    navigate("/sos");
  };

  // ─────────────────────────────────────────────────────────────
  // SCREEN: PICK PERSONA
  // ─────────────────────────────────────────────────────────────
  if (screen === "pick") {
    return (
      <div style={s.page}>
        <div style={s.pickCard}>
          <button style={s.backBtn} onClick={() => navigate("/sos")}>← Back</button>
          <div style={s.pickIcon}>📞</div>
          <h1 style={s.pickTitle}>Fake Call</h1>
          <p style={s.pickSubtitle}>
            Start a realistic conversation to stay safe in uncomfortable situations.
            Speak or type — danger words trigger SOS automatically.
          </p>
          <p style={s.pickLabel}>Who's calling you?</p>
          <div style={s.personaGrid}>
            {PERSONAS.filter((p) => p.id !== "custom").map((p) => (
              <button
                key={p.id}
                style={{ ...s.personaBtn, borderColor: p.color }}
                onClick={() => startCall(p)}
              >
                <span style={s.personaEmoji}>{p.emoji}</span>
                <span style={{ ...s.personaName, color: p.color }}>{p.label}</span>
                <span style={s.personaSubname}>{p.name}</span>
              </button>
            ))}
          </div>
          <div style={s.customSection}>
            <p style={s.pickLabel}>Or enter a custom name</p>
            <div style={s.customRow}>
              <input
                style={s.customInput}
                placeholder="e.g. Rahul, Office, Priya..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customName.trim()) {
                    const custom = { ...PERSONAS.find((p) => p.id === "custom"), name: customName.trim(), avatar: customName.trim().charAt(0).toUpperCase() };
                    startCall(custom);
                  }
                }}
              />
              <button
                style={{ ...s.customBtn, opacity: customName.trim() ? 1 : 0.4, cursor: customName.trim() ? "pointer" : "not-allowed" }}
                disabled={!customName.trim()}
                onClick={() => {
                  const custom = { ...PERSONAS.find((p) => p.id === "custom"), name: customName.trim(), avatar: customName.trim().charAt(0).toUpperCase() };
                  startCall(custom);
                }}
              >
                Call
              </button>
            </div>
          </div>
          <div style={s.dangerNote}>
            🛡 Say or type "help", "danger", "unsafe" etc. and SOS is sent automatically to your emergency contacts.
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: RINGING
  // ─────────────────────────────────────────────────────────────
  if (screen === "ringing") {
    const p = selectedPersona;
    return (
      <div style={s.ringPage}>
        <div style={s.ringContent}>
          <p style={s.ringLabel}>Incoming Call</p>
          <div style={{ position: "relative", marginBottom: 24 }}>
            <div style={s.ringPulse1} />
            <div style={s.ringPulse2} />
            <div style={{ ...s.ringAvatar, background: p?.color }}>{p?.avatar}</div>
          </div>
          <h2 style={s.ringName}>{p?.name}</h2>
          <p style={s.ringSubtitle}>{p?.label}</p>
          <div style={s.ringDots}>
            <span style={{ ...s.ringDot, animationDelay: "0s" }} />
            <span style={{ ...s.ringDot, animationDelay: "0.3s" }} />
            <span style={{ ...s.ringDot, animationDelay: "0.6s" }} />
          </div>
          <div style={s.ringBtns}>
            <button style={s.declineBtn} onClick={() => navigate("/sos")}>
              <span style={s.ringBtnIcon}>✕</span>
              <span style={s.ringBtnLabel}>Decline</span>
            </button>
            <button style={s.acceptBtn}>
              <span style={s.ringBtnIcon}>📞</span>
              <span style={s.ringBtnLabel}>Connecting…</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SCREEN: CALL / CHAT
  // ─────────────────────────────────────────────────────────────
  const p = selectedPersona;
  return (
    <div style={s.callPage}>
      <div style={s.callHeader}>
        <div style={{ ...s.callAvatar, background: p?.color }}>{p?.avatar}</div>
        <div style={s.callHeaderInfo}>
          <p style={s.callName}>{p?.name}</p>
          <p style={s.callTimer}>{formatTime(timer)}</p>
        </div>
        <div style={s.callHeaderRight}>
          {sosSent && <span style={s.sosBadge}>🚨 SOS</span>}
          <button style={s.endBtn} onClick={endCall}>End Call</button>
        </div>
      </div>

      {sosStatus && (
        <div style={{ ...s.sosBanner, background: sosStatus.startsWith("✅") ? "#052e16" : "#450a0a", borderColor: sosStatus.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
          {sosStatus}
        </div>
      )}

      <div style={s.chatArea}>
        {messages.map((msg, i) => (
          <div key={i} style={{ ...s.msgRow, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "ai" && <div style={{ ...s.msgAvatar, background: p?.color }}>{p?.avatar}</div>}
            <div style={{ ...s.bubble, background: msg.role === "user" ? "#1d4ed8" : "#1e293b", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px" }}>
              {msg.fromVoice && <span style={{ fontSize: 11, opacity: 0.6, marginRight: 5 }}>🎤</span>}
              {msg.text}
            </div>
          </div>
        ))}

        {isListening && transcript && (
          <div style={{ ...s.msgRow, justifyContent: "flex-end" }}>
            <div style={{ ...s.bubble, background: "#1e3a8a", borderRadius: "18px 18px 4px 18px", opacity: 0.7, fontStyle: "italic" }}>
              🎤 {transcript}…
            </div>
          </div>
        )}

        {aiTyping && (
          <div style={{ ...s.msgRow, justifyContent: "flex-start" }}>
            <div style={{ ...s.msgAvatar, background: p?.color }}>{p?.avatar}</div>
            <div style={s.typingBubble}>
              <span style={s.typingDot} />
              <span style={{ ...s.typingDot, animationDelay: "0.2s" }} />
              <span style={{ ...s.typingDot, animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {isListening && (
        <div style={s.listeningHint}>🔴 Listening… speak now, tap ⏹ when done</div>
      )}

      <div style={s.inputArea}>
        <input
          ref={inputRef}
          style={{ ...s.chatInput, opacity: isListening ? 0.4 : 1 }}
          placeholder={isListening ? "🎤 Listening..." : "Type a message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isListening}
        />
        <button
          style={{ ...s.sendBtn, opacity: input.trim() && !aiTyping && !isListening ? 1 : 0.3, cursor: input.trim() && !aiTyping && !isListening ? "pointer" : "not-allowed" }}
          onClick={sendMessage}
          disabled={!input.trim() || aiTyping || isListening}
        >
          ➤
        </button>
        {speechSupported && (
          <button
            style={{ ...s.micBtn, background: isListening ? "#dc2626" : "#1e293b", border: `2px solid ${isListening ? "#ef4444" : "#334155"}`, transform: isListening ? "scale(1.12)" : "scale(1)" }}
            onClick={isListening ? stopListening : startListening}
            disabled={aiTyping}
            title={isListening ? "Stop" : "Speak"}
          >
            {isListening ? "⏹" : "🎤"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Inline styles (friend's originals, unchanged) ──────────────
const s = {
  page: { minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Segoe UI', sans-serif" },
  pickCard: { background: "#0f1117", border: "1px solid #1e2230", borderRadius: 20, padding: "36px 28px", maxWidth: 480, width: "100%", position: "relative" },
  backBtn: { position: "absolute", top: 20, left: 20, background: "none", border: "none", color: "#64748b", fontSize: 14, cursor: "pointer" },
  pickIcon: { fontSize: 48, textAlign: "center", marginBottom: 12 },
  pickTitle: { color: "#f1f5f9", fontSize: 26, fontWeight: 700, textAlign: "center", margin: "0 0 8px" },
  pickSubtitle: { color: "#64748b", fontSize: 13, textAlign: "center", lineHeight: 1.6, margin: "0 0 28px" },
  pickLabel: { color: "#94a3b8", fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 },
  personaGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 },
  personaBtn: { background: "#161b27", border: "1.5px solid", borderRadius: 14, padding: "16px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "transform 0.15s, background 0.15s" },
  personaEmoji: { fontSize: 28 },
  personaName: { fontSize: 13, fontWeight: 700 },
  personaSubname: { fontSize: 11, color: "#475569" },
  customSection: { marginBottom: 20 },
  customRow: { display: "flex", gap: 10 },
  customInput: { flex: 1, background: "#161b27", border: "1px solid #1e2230", borderRadius: 10, color: "#f1f5f9", padding: "10px 14px", fontSize: 14, outline: "none" },
  customBtn: { background: "#10b981", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 20px", cursor: "pointer" },
  dangerNote: { background: "#1c0a0a", border: "1px solid #450a0a", borderRadius: 10, color: "#fca5a5", fontSize: 12, padding: "12px 14px", lineHeight: 1.6 },
  ringPage: { minHeight: "100vh", background: "#050810", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" },
  ringContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  ringLabel: { color: "#94a3b8", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" },
  ringPulse1: { position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(99,102,241,0.15)", animation: "pulse 1.5s ease-out infinite", top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  ringPulse2: { position: "absolute", width: 160, height: 160, borderRadius: "50%", background: "rgba(99,102,241,0.07)", animation: "pulse 1.5s ease-out infinite 0.4s", top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  ringAvatar: { width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#fff", position: "relative", zIndex: 1 },
  ringName: { color: "#f1f5f9", fontSize: 28, fontWeight: 700, margin: "8px 0 4px" },
  ringSubtitle: { color: "#64748b", fontSize: 14, margin: 0 },
  ringDots: { display: "flex", gap: 6, margin: "12px 0 32px" },
  ringDot: { width: 6, height: 6, borderRadius: "50%", background: "#475569", display: "inline-block", animation: "blink 1s infinite" },
  ringBtns: { display: "flex", gap: 40 },
  declineBtn: { background: "#dc2626", border: "none", borderRadius: "50%", width: 64, height: 64, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 },
  acceptBtn: { background: "#16a34a", border: "none", borderRadius: "50%", width: 64, height: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 },
  ringBtnIcon: { fontSize: 20 },
  ringBtnLabel: { fontSize: 10, color: "#fff" },
  callPage: { minHeight: "100vh", background: "#050810", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', sans-serif", maxWidth: 600, margin: "0 auto" },
  callHeader: { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#0a0d16", borderBottom: "1px solid #1e2230" },
  callAvatar: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 },
  callHeaderInfo: { flex: 1 },
  callName: { color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: 0 },
  callTimer: { color: "#22c55e", fontSize: 13, margin: 0 },
  callHeaderRight: { display: "flex", alignItems: "center", gap: 10 },
  sosBadge: { background: "#450a0a", border: "1px solid #dc2626", borderRadius: 20, color: "#fca5a5", fontSize: 11, fontWeight: 700, padding: "3px 10px" },
  endBtn: { background: "#dc2626", border: "none", borderRadius: 20, color: "#fff", fontSize: 13, fontWeight: 600, padding: "7px 16px", cursor: "pointer" },
  sosBanner: { padding: "10px 20px", border: "1px solid", color: "#f1f5f9", fontSize: 13, fontWeight: 600, textAlign: "center" },
  chatArea: { flex: 1, overflowY: "auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  msgAvatar: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 },
  bubble: { maxWidth: "72%", padding: "10px 14px", color: "#f1f5f9", fontSize: 14, lineHeight: 1.5 },
  typingBubble: { background: "#1e293b", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" },
  typingDot: { width: 7, height: 7, borderRadius: "50%", background: "#64748b", display: "inline-block", animation: "blink 1s infinite" },
  listeningHint: { textAlign: "center", fontSize: 12, color: "#ef4444", padding: "6px 0 4px", background: "#0a0d16" },
  inputArea: { display: "flex", gap: 10, padding: "14px 16px", borderTop: "1px solid #1e2230", background: "#0a0d16", alignItems: "center" },
  chatInput: { flex: 1, background: "#161b27", border: "1px solid #1e2230", borderRadius: 24, color: "#f1f5f9", padding: "11px 18px", fontSize: 14, outline: "none", transition: "opacity 0.2s" },
  sendBtn: { background: "#1d4ed8", border: "none", borderRadius: "50%", width: 44, height: 44, color: "#fff", fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  micBtn: { width: 44, height: 44, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", transition: "all 0.2s ease" },
};



// // src/pages/FakeCall.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";

// const API = "https://cab-safety.onrender.com/api";

// function getToken() {
//   return (
//     localStorage.getItem("token") ||
//     localStorage.getItem("authToken") ||
//     localStorage.getItem("jwt") ||
//     sessionStorage.getItem("token") ||
//     null
//   );
// }

// function authHeaders() {
//   return { Authorization: `Bearer ${getToken()}` };
// }

// // ── Danger keywords ────────────────────────────────────────────
// const DANGER_KEYWORDS = [
//   "help", "danger", "unsafe", "scared", "afraid", "threat", "attack",
//   "hurt", "emergency", "sos", "save me", "follow", "following",
//   "kidnap", "harass", "threatening", "please help", "in trouble"
// ];

// function containsDanger(text) {
//   const lower = text.toLowerCase();
//   return DANGER_KEYWORDS.some((kw) => lower.includes(kw));
// }

// // ── Personas ───────────────────────────────────────────────────
// const PERSONAS = [
//   {
//     id: "friend",
//     label: "Friend",
//     emoji: "👫",
//     name: "Riya",
//     avatar: "R",
//     color: "#6366f1",
//     systemPrompt: `You are Riya, a close friend of the user. You're on a phone call with them.
// Keep replies SHORT (1-3 sentences max) — like real spoken conversation.
// Sound casual, warm, use Indian English naturally (yaar, haan, arrey etc).
// Ask natural follow-up questions. If they say they're in danger or need help, sound alarmed and ask where they are urgently.
// Never break character. Never say you're an AI.`
//   },
//   {
//     id: "family",
//     label: "Family",
//     emoji: "👨‍👩‍👧",
//     name: "Mom",
//     avatar: "M",
//     color: "#ec4899",
//     systemPrompt: `You are the user's mother. You're on a phone call with them.
// Keep replies SHORT (1-3 sentences max) — like real spoken conversation.
// Sound caring, warm, slightly protective. Use Indian English naturally.
// Ask how they're doing, where they are. If they say they're in danger, sound very worried and tell them to call police immediately.
// Never break character. Never say you're an AI.`
//   },
//   {
//     id: "support",
//     label: "Cab Support",
//     emoji: "🚖",
//     name: "Cab Support",
//     avatar: "S",
//     color: "#f59e0b",
//     systemPrompt: `You are a professional cab company customer support agent named Arjun.
// Keep replies SHORT (1-3 sentences max) — like real spoken conversation.
// Sound professional and helpful. Reference the user's ride naturally.
// If they say they're in danger or feel unsafe, immediately say you're tracking their location and sending help, and ask them to stay on the line.
// Never break character. Never say you're an AI.`
//   },
//   {
//     id: "custom",
//     label: "Custom",
//     emoji: "✏️",
//     name: "",
//     avatar: "?",
//     color: "#10b981",
//     systemPrompt: ``
//   }
// ];

// // ── Format timer ───────────────────────────────────────────────
// function formatTime(s) {
//   const m = Math.floor(s / 60).toString().padStart(2, "0");
//   const sec = (s % 60).toString().padStart(2, "0");
//   return `${m}:${sec}`;
// }

// // ── Main Component ─────────────────────────────────────────────
// export default function FakeCall() {
//   const navigate = useNavigate();
//   const [screen, setScreen] = useState("pick"); // pick | ringing | call
//   const [selectedPersona, setSelectedPersona] = useState(null);
//   const [customName, setCustomName] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState("");
//   const [aiTyping, setAiTyping] = useState(false);
//   const [timer, setTimer] = useState(0);
//   const [sosSent, setSosSent] = useState(false);
//   const [sosStatus, setSosStatus] = useState("");
//   const [isListening, setIsListening] = useState(false);
//   const [transcript, setTranscript] = useState("");
//   const [speechSupported, setSpeechSupported] = useState(true);

//   const timerRef = useRef(null);
//   const chatEndRef = useRef(null);
//   const inputRef = useRef(null);
//   const recognitionRef = useRef(null);
//   const transcriptRef = useRef("");

//   // ── Check speech support ─────────────────────────────────────
//   useEffect(() => {
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) setSpeechSupported(false);
//   }, []);

//   // scroll to bottom
//   useEffect(() => {
//     chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages, aiTyping]);

//   // timer
//   useEffect(() => {
//     if (screen === "call") {
//       timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
//     }
//     return () => clearInterval(timerRef.current);
//   }, [screen]);

//   // ── Speech Recognition ───────────────────────────────────────
//   const startListening = () => {
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) return;

//     const recognition = new SpeechRecognition();
//     recognition.lang = "en-IN";
//     recognition.continuous = false;
//     recognition.interimResults = true;

//     recognition.onstart = () => {
//       setIsListening(true);
//       setTranscript("");
//       transcriptRef.current = "";
//     };

//     recognition.onresult = (event) => {
//       const current = Array.from(event.results)
//         .map((r) => r[0].transcript)
//         .join("");
//       setTranscript(current);
//       transcriptRef.current = current;
//     };

//     recognition.onend = () => {
//       setIsListening(false);
//       const finalText = transcriptRef.current.trim();
//       if (finalText) {
//         sendMessageText(finalText, true);
//         setTranscript("");
//         transcriptRef.current = "";
//       }
//     };

//     recognition.onerror = () => {
//       setIsListening(false);
//       setTranscript("");
//       transcriptRef.current = "";
//     };

//     recognitionRef.current = recognition;
//     recognition.start();
//   };

//   const stopListening = () => {
//     recognitionRef.current?.stop();
//   };

//   // ── Auto SOS ────────────────────────────────────────────────
//   const triggerAutoSOS = async () => {
//     if (sosSent) return;
//     setSosSent(true);
//     setSosStatus("🚨 Danger detected — sending SOS...");

//     navigator.geolocation.getCurrentPosition(
//       async (pos) => {
//         try {
//           await axios.post(
//             `${API}/profile/sos`,
//             { lat: pos.coords.latitude, lng: pos.coords.longitude },
//             { headers: authHeaders() }
//           );
//           setSosStatus("✅ SOS sent to your emergency contacts!");
//         } catch {
//           setSosStatus("⚠ SOS failed — call 100 directly!");
//         }
//       },
//       () => {
//         setSosStatus("⚠ Location unavailable — call 100 directly!");
//       }
//     );
//   };

//   // ── Start call ───────────────────────────────────────────────
//   const startCall = async (persona) => {
//     setScreen("ringing");
//     setSelectedPersona(persona);
//     await new Promise((r) => setTimeout(r, 2500));
//     setScreen("call");
//     const opening = await getAIReply(persona, [], "<<call_started>>");
//     setMessages([{ role: "ai", text: opening }]);
//   };

//   // ── Get AI reply ─────────────────────────────────────────────
//   const getAIReply = async (persona, history, userText) => {
//     try {
//       const builtHistory = history.map((m) => ({
//         role: m.role === "ai" ? "assistant" : "user",
//         content: m.text
//       }));

//       if (userText !== "<<call_started>>") {
//         builtHistory.push({ role: "user", content: userText });
//       }

//       const systemPrompt = persona.id === "custom"
//         ? `You are ${persona.name}, a close contact of the user on a phone call. Keep replies SHORT (1-3 sentences). Sound natural. If they mention danger, sound alarmed and tell them to call police. Never say you're an AI.`
//         : persona.systemPrompt;

//       const openingInstruction = userText === "<<call_started>>"
//         ? [{ role: "user", content: "You just called me. Say a natural opening greeting." }]
//         : builtHistory;

//       const response = await fetch(`${API}/callai/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ messages: openingInstruction, system: systemPrompt })
//       });

//       const data = await response.json();
//       return data.content?.[0]?.text || "Sorry, I couldn't hear you.";
//     } catch {
//       return "Sorry, I missed that. Can you repeat?";
//     }
//   };

//   // ── Core send function ───────────────────────────────────────
//   const sendMessageText = async (text, fromVoice = false) => {
//     if (!text || aiTyping) return;

//     const userMsg = { role: "user", text, fromVoice };
//     setMessages((prev) => {
//       const newMessages = [...prev, userMsg];
//       // fire AI reply with updated messages
//       fireAIReply(newMessages, text);
//       return newMessages;
//     });

//     if (containsDanger(text)) triggerAutoSOS();
//   };

//   const fireAIReply = async (currentMessages, text) => {
//     setAiTyping(true);
//     const reply = await getAIReply(selectedPersona, currentMessages, text);
//     setAiTyping(false);
//     setMessages((prev) => [...prev, { role: "ai", text: reply }]);
//     inputRef.current?.focus();
//   };

//   // ── Send from text input ─────────────────────────────────────
//   const sendMessage = () => {
//     const text = input.trim();
//     if (!text) return;
//     setInput("");
//     sendMessageText(text, false);
//   };

//   const handleKeyDown = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   const endCall = () => {
//     clearInterval(timerRef.current);
//     recognitionRef.current?.stop();
//     navigate("/sos");
//   };

//   // ─────────────────────────────────────────────────────────────
//   // SCREEN: PICK PERSONA
//   // ─────────────────────────────────────────────────────────────
//   if (screen === "pick") {
//     return (
//       <div style={styles.page}>
//         <div style={styles.pickCard}>
//           <button style={styles.backBtn} onClick={() => navigate("/sos")}>← Back</button>
//           <div style={styles.pickIcon}>📞</div>
//           <h1 style={styles.pickTitle}>Fake Call</h1>
//           <p style={styles.pickSubtitle}>
//             Start a realistic conversation to stay safe in uncomfortable situations.
//             Speak or type — danger words trigger SOS automatically.
//           </p>

//           <p style={styles.pickLabel}>Who's calling you?</p>
//           <div style={styles.personaGrid}>
//             {PERSONAS.filter(p => p.id !== "custom").map((p) => (
//               <button
//                 key={p.id}
//                 style={{ ...styles.personaBtn, borderColor: p.color }}
//                 onClick={() => startCall(p)}
//               >
//                 <span style={styles.personaEmoji}>{p.emoji}</span>
//                 <span style={{ ...styles.personaName, color: p.color }}>{p.label}</span>
//                 <span style={styles.personaSubname}>{p.name}</span>
//               </button>
//             ))}
//           </div>

//           <div style={styles.customSection}>
//             <p style={styles.pickLabel}>Or enter a custom name</p>
//             <div style={styles.customRow}>
//               <input
//                 style={styles.customInput}
//                 placeholder="e.g. Rahul, Office, Priya..."
//                 value={customName}
//                 onChange={(e) => setCustomName(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter" && customName.trim()) {
//                     const custom = {
//                       ...PERSONAS.find(p => p.id === "custom"),
//                       name: customName.trim(),
//                       avatar: customName.trim().charAt(0).toUpperCase()
//                     };
//                     startCall(custom);
//                   }
//                 }}
//               />
//               <button
//                 style={{
//                   ...styles.customBtn,
//                   opacity: customName.trim() ? 1 : 0.4,
//                   cursor: customName.trim() ? "pointer" : "not-allowed"
//                 }}
//                 disabled={!customName.trim()}
//                 onClick={() => {
//                   const custom = {
//                     ...PERSONAS.find(p => p.id === "custom"),
//                     name: customName.trim(),
//                     avatar: customName.trim().charAt(0).toUpperCase()
//                   };
//                   startCall(custom);
//                 }}
//               >
//                 Call
//               </button>
//             </div>
//           </div>

//           <div style={styles.dangerNote}>
//             🛡 Say or type "help", "danger", "unsafe" etc. and SOS is sent automatically to your emergency contacts.
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────────
//   // SCREEN: RINGING
//   // ─────────────────────────────────────────────────────────────
//   if (screen === "ringing") {
//     const p = selectedPersona;
//     return (
//       <div style={styles.ringPage}>
//         <div style={styles.ringContent}>
//           <p style={styles.ringLabel}>Incoming Call</p>
//           <div style={{ position: "relative", marginBottom: 24 }}>
//             <div style={styles.ringPulse1} />
//             <div style={styles.ringPulse2} />
//             <div style={{ ...styles.ringAvatar, background: p?.color }}>
//               {p?.avatar}
//             </div>
//           </div>
//           <h2 style={styles.ringName}>{p?.name}</h2>
//           <p style={styles.ringSubtitle}>{p?.label}</p>
//           <div style={styles.ringDots}>
//             <span style={{ ...styles.ringDot, animationDelay: "0s" }} />
//             <span style={{ ...styles.ringDot, animationDelay: "0.3s" }} />
//             <span style={{ ...styles.ringDot, animationDelay: "0.6s" }} />
//           </div>
//           <div style={styles.ringBtns}>
//             <button style={styles.declineBtn} onClick={() => navigate("/sos")}>
//               <span style={styles.ringBtnIcon}>✕</span>
//               <span style={styles.ringBtnLabel}>Decline</span>
//             </button>
//             <button style={styles.acceptBtn}>
//               <span style={styles.ringBtnIcon}>📞</span>
//               <span style={styles.ringBtnLabel}>Connecting…</span>
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────────
//   // SCREEN: CALL / CHAT
//   // ─────────────────────────────────────────────────────────────
//   const p = selectedPersona;
//   return (
//     <div style={styles.callPage}>

//       {/* Header */}
//       <div style={styles.callHeader}>
//         <div style={{ ...styles.callAvatar, background: p?.color }}>
//           {p?.avatar}
//         </div>
//         <div style={styles.callHeaderInfo}>
//           <p style={styles.callName}>{p?.name}</p>
//           <p style={styles.callTimer}>{formatTime(timer)}</p>
//         </div>
//         <div style={styles.callHeaderRight}>
//           {sosSent && <span style={styles.sosBadge}>🚨 SOS</span>}
//           <button style={styles.endBtn} onClick={endCall}>End Call</button>
//         </div>
//       </div>

//       {/* SOS banner */}
//       {sosStatus && (
//         <div style={{
//           ...styles.sosBanner,
//           background: sosStatus.startsWith("✅") ? "#052e16" : "#450a0a",
//           borderColor: sosStatus.startsWith("✅") ? "#16a34a" : "#dc2626"
//         }}>
//           {sosStatus}
//         </div>
//       )}

//       {/* Messages */}
//       <div style={styles.chatArea}>
//         {messages.map((msg, i) => (
//           <div key={i} style={{
//             ...styles.msgRow,
//             justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
//           }}>
//             {msg.role === "ai" && (
//               <div style={{ ...styles.msgAvatar, background: p?.color }}>
//                 {p?.avatar}
//               </div>
//             )}
//             <div style={{
//               ...styles.bubble,
//               background: msg.role === "user" ? "#1d4ed8" : "#1e293b",
//               borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
//             }}>
//               {msg.fromVoice && <span style={{ fontSize: 11, opacity: 0.6, marginRight: 5 }}>🎤</span>}
//               {msg.text}
//             </div>
//           </div>
//         ))}

//         {/* Live transcript preview */}
//         {isListening && transcript && (
//           <div style={{ ...styles.msgRow, justifyContent: "flex-end" }}>
//             <div style={{
//               ...styles.bubble,
//               background: "#1e3a8a",
//               borderRadius: "18px 18px 4px 18px",
//               opacity: 0.7,
//               fontStyle: "italic"
//             }}>
//               🎤 {transcript}…
//             </div>
//           </div>
//         )}

//         {aiTyping && (
//           <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
//             <div style={{ ...styles.msgAvatar, background: p?.color }}>{p?.avatar}</div>
//             <div style={styles.typingBubble}>
//               <span style={styles.typingDot} />
//               <span style={{ ...styles.typingDot, animationDelay: "0.2s" }} />
//               <span style={{ ...styles.typingDot, animationDelay: "0.4s" }} />
//             </div>
//           </div>
//         )}

//         <div ref={chatEndRef} />
//       </div>

//       {/* Listening hint */}
//       {isListening && (
//         <div style={styles.listeningHint}>
//           🔴 Listening… speak now, tap ⏹ when done
//         </div>
//       )}

//       {/* Input area */}
//       <div style={styles.inputArea}>
//         <input
//           ref={inputRef}
//           style={{
//             ...styles.chatInput,
//             opacity: isListening ? 0.4 : 1
//           }}
//           placeholder={isListening ? "🎤 Listening..." : "Type a message..."}
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={handleKeyDown}
//           disabled={isListening}
//         />

//         {/* Send button */}
//         <button
//           style={{
//             ...styles.sendBtn,
//             opacity: input.trim() && !aiTyping && !isListening ? 1 : 0.3,
//             cursor: input.trim() && !aiTyping && !isListening ? "pointer" : "not-allowed"
//           }}
//           onClick={sendMessage}
//           disabled={!input.trim() || aiTyping || isListening}
//         >
//           ➤
//         </button>

//         {/* Mic button */}
//         {speechSupported && (
//           <button
//             style={{
//               ...styles.micBtn,
//               background: isListening ? "#dc2626" : "#1e293b",
//               border: `2px solid ${isListening ? "#ef4444" : "#334155"}`,
//               transform: isListening ? "scale(1.12)" : "scale(1)"
//             }}
//             onClick={isListening ? stopListening : startListening}
//             disabled={aiTyping}
//             title={isListening ? "Stop" : "Speak"}
//           >
//             {isListening ? "⏹" : "🎤"}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

// // ── Styles ─────────────────────────────────────────────────────
// const styles = {
//   page: {
//     minHeight: "100vh",
//     background: "#0a0a0f",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: "24px 16px",
//     fontFamily: "'Segoe UI', sans-serif"
//   },
//   pickCard: {
//     background: "#0f1117",
//     border: "1px solid #1e2230",
//     borderRadius: 20,
//     padding: "36px 28px",
//     maxWidth: 480,
//     width: "100%",
//     position: "relative"
//   },
//   backBtn: {
//     position: "absolute",
//     top: 20,
//     left: 20,
//     background: "none",
//     border: "none",
//     color: "#64748b",
//     fontSize: 14,
//     cursor: "pointer"
//   },
//   pickIcon: { fontSize: 48, textAlign: "center", marginBottom: 12 },
//   pickTitle: {
//     color: "#f1f5f9",
//     fontSize: 26,
//     fontWeight: 700,
//     textAlign: "center",
//     margin: "0 0 8px"
//   },
//   pickSubtitle: {
//     color: "#64748b",
//     fontSize: 13,
//     textAlign: "center",
//     lineHeight: 1.6,
//     margin: "0 0 28px"
//   },
//   pickLabel: {
//     color: "#94a3b8",
//     fontSize: 13,
//     fontWeight: 600,
//     marginBottom: 12,
//     textTransform: "uppercase",
//     letterSpacing: 1
//   },
//   personaGrid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(3, 1fr)",
//     gap: 12,
//     marginBottom: 28
//   },
//   personaBtn: {
//     background: "#161b27",
//     border: "1.5px solid",
//     borderRadius: 14,
//     padding: "16px 8px",
//     cursor: "pointer",
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     gap: 6,
//     transition: "transform 0.15s, background 0.15s"
//   },
//   personaEmoji: { fontSize: 28 },
//   personaName: { fontSize: 13, fontWeight: 700 },
//   personaSubname: { fontSize: 11, color: "#475569" },
//   customSection: { marginBottom: 20 },
//   customRow: { display: "flex", gap: 10 },
//   customInput: {
//     flex: 1,
//     background: "#161b27",
//     border: "1px solid #1e2230",
//     borderRadius: 10,
//     color: "#f1f5f9",
//     padding: "10px 14px",
//     fontSize: 14,
//     outline: "none"
//   },
//   customBtn: {
//     background: "#10b981",
//     border: "none",
//     borderRadius: 10,
//     color: "#fff",
//     fontWeight: 700,
//     fontSize: 14,
//     padding: "10px 20px",
//     cursor: "pointer"
//   },
//   dangerNote: {
//     background: "#1c0a0a",
//     border: "1px solid #450a0a",
//     borderRadius: 10,
//     color: "#fca5a5",
//     fontSize: 12,
//     padding: "12px 14px",
//     lineHeight: 1.6
//   },
//   ringPage: {
//     minHeight: "100vh",
//     background: "#050810",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     fontFamily: "'Segoe UI', sans-serif"
//   },
//   ringContent: {
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     gap: 8
//   },
//   ringLabel: { color: "#94a3b8", fontSize: 14, letterSpacing: 2, textTransform: "uppercase" },
//   ringPulse1: {
//     position: "absolute",
//     width: 120,
//     height: 120,
//     borderRadius: "50%",
//     background: "rgba(99,102,241,0.15)",
//     animation: "pulse 1.5s ease-out infinite",
//     top: "50%", left: "50%",
//     transform: "translate(-50%,-50%)"
//   },
//   ringPulse2: {
//     position: "absolute",
//     width: 160,
//     height: 160,
//     borderRadius: "50%",
//     background: "rgba(99,102,241,0.07)",
//     animation: "pulse 1.5s ease-out infinite 0.4s",
//     top: "50%", left: "50%",
//     transform: "translate(-50%,-50%)"
//   },
//   ringAvatar: {
//     width: 80, height: 80,
//     borderRadius: "50%",
//     display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: 32, fontWeight: 700, color: "#fff",
//     position: "relative", zIndex: 1
//   },
//   ringName: { color: "#f1f5f9", fontSize: 28, fontWeight: 700, margin: "8px 0 4px" },
//   ringSubtitle: { color: "#64748b", fontSize: 14, margin: 0 },
//   ringDots: { display: "flex", gap: 6, margin: "12px 0 32px" },
//   ringDot: {
//     width: 6, height: 6,
//     borderRadius: "50%",
//     background: "#475569",
//     display: "inline-block",
//     animation: "blink 1s infinite"
//   },
//   ringBtns: { display: "flex", gap: 40 },
//   declineBtn: {
//     background: "#dc2626", border: "none", borderRadius: "50%",
//     width: 64, height: 64, cursor: "pointer",
//     display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2
//   },
//   acceptBtn: {
//     background: "#16a34a", border: "none", borderRadius: "50%",
//     width: 64, height: 64,
//     display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2
//   },
//   ringBtnIcon: { fontSize: 20 },
//   ringBtnLabel: { fontSize: 10, color: "#fff" },
//   callPage: {
//     minHeight: "100vh",
//     background: "#050810",
//     display: "flex",
//     flexDirection: "column",
//     fontFamily: "'Segoe UI', sans-serif",
//     maxWidth: 600,
//     margin: "0 auto"
//   },
//   callHeader: {
//     display: "flex", alignItems: "center", gap: 12,
//     padding: "16px 20px",
//     background: "#0a0d16",
//     borderBottom: "1px solid #1e2230"
//   },
//   callAvatar: {
//     width: 44, height: 44, borderRadius: "50%",
//     display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0
//   },
//   callHeaderInfo: { flex: 1 },
//   callName: { color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: 0 },
//   callTimer: { color: "#22c55e", fontSize: 13, margin: 0 },
//   callHeaderRight: { display: "flex", alignItems: "center", gap: 10 },
//   sosBadge: {
//     background: "#450a0a", border: "1px solid #dc2626",
//     borderRadius: 20, color: "#fca5a5",
//     fontSize: 11, fontWeight: 700, padding: "3px 10px"
//   },
//   endBtn: {
//     background: "#dc2626", border: "none", borderRadius: 20,
//     color: "#fff", fontSize: 13, fontWeight: 600,
//     padding: "7px 16px", cursor: "pointer"
//   },
//   sosBanner: {
//     padding: "10px 20px", border: "1px solid",
//     color: "#f1f5f9", fontSize: 13, fontWeight: 600, textAlign: "center"
//   },
//   chatArea: {
//     flex: 1, overflowY: "auto",
//     padding: "20px 16px",
//     display: "flex", flexDirection: "column", gap: 12
//   },
//   msgRow: { display: "flex", alignItems: "flex-end", gap: 8 },
//   msgAvatar: {
//     width: 30, height: 30, borderRadius: "50%",
//     display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0
//   },
//   bubble: {
//     maxWidth: "72%", padding: "10px 14px",
//     color: "#f1f5f9", fontSize: 14, lineHeight: 1.5
//   },
//   typingBubble: {
//     background: "#1e293b",
//     borderRadius: "18px 18px 18px 4px",
//     padding: "12px 16px",
//     display: "flex", gap: 5, alignItems: "center"
//   },
//   typingDot: {
//     width: 7, height: 7, borderRadius: "50%",
//     background: "#64748b", display: "inline-block",
//     animation: "blink 1s infinite"
//   },
//   listeningHint: {
//     textAlign: "center", fontSize: 12,
//     color: "#ef4444", padding: "6px 0 4px",
//     background: "#0a0d16"
//   },
//   inputArea: {
//     display: "flex", gap: 10,
//     padding: "14px 16px",
//     borderTop: "1px solid #1e2230",
//     background: "#0a0d16",
//     alignItems: "center"
//   },
//   chatInput: {
//     flex: 1, background: "#161b27",
//     border: "1px solid #1e2230",
//     borderRadius: 24, color: "#f1f5f9",
//     padding: "11px 18px", fontSize: 14, outline: "none",
//     transition: "opacity 0.2s"
//   },
//   sendBtn: {
//     background: "#1d4ed8", border: "none", borderRadius: "50%",
//     width: 44, height: 44, color: "#fff", fontSize: 16,
//     flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
//     cursor: "pointer"
//   },
//   micBtn: {
//     width: 44, height: 44, borderRadius: "50%",
//     flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
//     fontSize: 18, cursor: "pointer",
//     transition: "all 0.2s ease"
//   }
// };