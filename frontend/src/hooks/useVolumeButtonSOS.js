// src/hooks/useVolumeButtonSOS.js
import { useEffect, useRef } from "react";

const REQUIRED_PRESSES = 3;
const WINDOW_MS = 3000;

function detectMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function useVolumeButtonSOS({ armed, onTrigger, onProgress }) {
  const pressTimesRef = useRef([]);
  const wakeLockRef = useRef(null);

  const onTriggerRef = useRef(onTrigger);
  const onProgressRef = useRef(onProgress);

  const isMobileUnsupported = detectMobile();

  useEffect(() => {
    onTriggerRef.current = onTrigger;
    onProgressRef.current = onProgress;
  }, [onTrigger, onProgress]);

  useEffect(() => {
    if (!armed || isMobileUnsupported) return;

    const acquireWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("Wake lock unavailable:", err);
      }
    };

    acquireWakeLock();

    return () => {
      wakeLockRef.current?.release?.().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [armed, isMobileUnsupported]);

  useEffect(() => {
    if (!armed || isMobileUnsupported) {
      pressTimesRef.current = [];
      onProgressRef.current?.(0);
      return;
    }

    const handleKeyDown = (e) => {
      const isSOSKey =
        e.key === "AudioVolumeDown" ||
        e.code === "AudioVolumeDown" ||
        e.key === "VolumeDown" ||
        e.code === "VolumeDown" ||
        e.key === "v" ||
        e.key === "V" ||
        e.code === "KeyV" ||
        e.key === "ArrowDown" ||
        e.code === "ArrowDown";

      if (!isSOSKey) return;

      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();

      pressTimesRef.current = pressTimesRef.current.filter(
        (time) => now - time <= WINDOW_MS
      );

      pressTimesRef.current.push(now);

      const count = Math.min(pressTimesRef.current.length, REQUIRED_PRESSES);
      onProgressRef.current?.(count);

      if (count >= REQUIRED_PRESSES) {
        pressTimesRef.current = [];
        onProgressRef.current?.(0);
        onTriggerRef.current?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [armed, isMobileUnsupported]);

  return { isMobileUnsupported };
}