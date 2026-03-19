import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const SafetyModeContext = createContext();

export const SafetyModeProvider = ({ children }) => {

  const [safetyMode, setSafetyMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const [missedChecks, setMissedChecks] = useState(0);

  const API = "https://cab-safety.onrender.com/api";

  useEffect(() => {

    let timer;

    if (safetyMode) {
      timer = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timer);

  }, [safetyMode]);

  useEffect(() => {

    if (safetyMode && seconds > 0 && seconds % 60 === 0) {

      if (navigator.vibrate) {
        navigator.vibrate(500);
      }

      setShowCheck(true);

    }

  }, [seconds, safetyMode]);

  useEffect(() => {

    if (showCheck) {

      const timer = setTimeout(() => {
        setShowCheck(false);
        setMissedChecks(prev => prev + 1);
      }, 15000);

      return () => clearTimeout(timer);

    }

  }, [showCheck]);

  useEffect(() => {

    if (missedChecks >= 3) {

      navigator.geolocation.getCurrentPosition(async (pos) => {

        try {

          const token = localStorage.getItem("token");

          const res = await axios.post(
            `${API}/profile/sos`,
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            },
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          const { contacts, location, userName } = res.data;

          const message =
            `🚨 SOS ALERT from ${userName}! I may be in danger.\nLocation: ${location.mapsLink}`;

          contacts.forEach((c, i) => {

            const phone = c.phone.replace(/\D/g, "");

            const encoded = encodeURIComponent(message);

            setTimeout(() => {

              window.open(
                `https://wa.me/91${phone}?text=${encoded}`,
                "_blank"
              );

            }, i * 600);

          });

          alert("🚨 Emergency alert sent to contacts");

        } catch (err) {

          console.error(err);
          alert("❌ Failed to send emergency alert");

        }

      });

      setMissedChecks(0);

    }

  }, [missedChecks]);

  const confirmSafe = () => {
    setShowCheck(false);
    setMissedChecks(0);
  };

  const reportIssue = () => {
    setShowCheck(false);
    setMissedChecks(3);
  };

  const enableSafetyMode = () => {
    setSafetyMode(true);
  };

  const disableSafetyMode = () => {
    setSafetyMode(false);
    setSeconds(0);
    setShowCheck(false);
    setMissedChecks(0);
  };

  return (
    <SafetyModeContext.Provider
      value={{
        safetyMode,
        seconds,
        showCheck,
        confirmSafe,
        reportIssue,
        enableSafetyMode,
        disableSafetyMode
      }}
    >
      {children}
    </SafetyModeContext.Provider>
  );

};

export const useSafetyMode = () => useContext(SafetyModeContext);