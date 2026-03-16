import React from "react";

const SafetyCheckPopup = ({ visible, onSafe, onReport }) => {

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000
    }}>
      <div style={{
        background: "#111827",
        padding: "28px",
        borderRadius: "14px",
        textAlign: "center",
        width: "320px"
      }}>

        <h3 style={{marginBottom:"10px"}}>🛡 Safety Check</h3>

        <p style={{marginBottom:"20px"}}>
          Are you safe?
        </p>

        <button
          onClick={onSafe}
          style={{
            marginRight:"10px",
            padding:"8px 14px",
            borderRadius:"8px",
            border:"none",
            cursor:"pointer"
          }}
        >
          Yes
        </button>

        <button
          onClick={onReport}
          style={{
            padding:"8px 14px",
            borderRadius:"8px",
            border:"none",
            background:"#ef4444",
            color:"white",
            cursor:"pointer"
          }}
        >
          Report Issue
        </button>

      </div>
    </div>
  );

};

export default SafetyCheckPopup;