// src/hooks/useCountdownSOS.js
//
// Arms a countdown timer. Fires onTrigger() when it hits 0.
// User can cancel at any time by calling cancel().
//
// Usage:
//   const { start, cancel, active, secondsLeft } = useCountdownSOS({ onTrigger });

import { useState, useRef, useCallback } from "react";

export default function useCountdownSOS({ onTrigger }) {
  const [active, setActive]           = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef                   = useRef(null);
  const totalRef                      = useRef(0);

  const cancel = useCallback(() => {
    clearInterval(intervalRef.current);
    setActive(false);
    setSecondsLeft(0);
    totalRef.current = 0;
  }, []);

  const start = useCallback((seconds = 10) => {
    clearInterval(intervalRef.current);
    totalRef.current = seconds;
    setSecondsLeft(seconds);
    setActive(true);

    intervalRef.current = setInterval(() => {
      totalRef.current -= 1;
      setSecondsLeft(totalRef.current);

      if (totalRef.current <= 0) {
        clearInterval(intervalRef.current);
        setActive(false);
        setSecondsLeft(0);
        onTrigger();
      }
    }, 1000);
  }, [onTrigger]);

  return { start, cancel, active, secondsLeft };
}