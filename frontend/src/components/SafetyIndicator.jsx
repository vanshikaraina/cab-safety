import { useSafetyMode } from "../context/SafetyModeContext";

const SafetyIndicator = () => {

  const {
    safetyMode,
    batteryLevel
  } = useSafetyMode();

  if (!safetyMode) return null;

  return (

    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "rgba(20,30,45,0.95)",
        color: "white",
        padding: "12px 16px",
        borderRadius: "14px",
        fontSize: "15px",
        fontWeight: "600",
        zIndex: 999999,
        boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)"
      }}
    >

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        🛡 Safety Mode
      </div>

      <div style={{
        marginTop: "6px",
        fontSize: "14px",
        opacity: 0.9
      }}>

        {batteryLevel !== null
          ? `🔋 ${batteryLevel}%`
          : "🔋 Battery unavailable"}

      </div>

    </div>

  );

};

export default SafetyIndicator;