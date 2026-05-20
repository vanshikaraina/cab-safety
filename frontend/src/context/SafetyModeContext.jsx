import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const SafetyModeContext = createContext();

export const SafetyModeProvider = ({ children }) => {

  const [safetyMode, setSafetyMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showCheck, setShowCheck] = useState(false);
  const [missedChecks, setMissedChecks] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [lowBatteryTriggered, setLowBatteryTriggered] = useState(false);

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

  let battery;
  let updateBattery;

  const setupBattery = async () => {

    if (!navigator.getBattery) {
      console.log("Battery API not supported");
      return;
    }

    battery = await navigator.getBattery();

    updateBattery = () => {

      const level = Math.round(battery.level * 100);

      setBatteryLevel(level);

      if (
        safetyMode &&
        level <= 15 &&
        !lowBatteryTriggered
      ) {

        setLowBatteryTriggered(true);

        if (navigator.vibrate) {
          navigator.vibrate([300, 200, 300]);
        }

        alert(
          `⚠️ Battery low (${level}%). Please charge your phone.`
        );

      }

    };

    updateBattery();

    battery.addEventListener(
      "levelchange",
      updateBattery
    );

  };

  setupBattery();

  return () => {

    if (battery && updateBattery) {

      battery.removeEventListener(
        "levelchange",
        updateBattery
      );

    }

  };

  }, [safetyMode, lowBatteryTriggered]);

  useEffect(() => {

    if (missedChecks >= 3) {

      navigator.geolocation.getCurrentPosition(async (pos) => {

        try {

          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("token")
              : null;
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
    setLowBatteryTriggered(false);
  };

  return (
    <SafetyModeContext.Provider
      value={{
        safetyMode,
        seconds,
        batteryLevel,
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