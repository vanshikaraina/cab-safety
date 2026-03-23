// src/hooks/useVolumeButtonSOS.js
//
// Volume Down × 3 within 2 seconds → calls onTrigger().
// Calls onProgress(count) for live UI feedback (0-3).
//
// IMPORTANT: Mobile browsers (Android Chrome, iOS Safari) block all volume key
// events at the OS level — this hook does nothing on those devices.
// isMobileUnsupported is returned so the UI can show a clear notice.

import { useEffect, useRef, useCallback } from "react";

const REQUIRED_PRESSES = 3;
const WINDOW_MS        = 2000;

function detectMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function useVolumeButtonSOS({ armed, onTrigger, onProgress }) {
  const pressTimesRef       = useRef([]);
  const wakeLockRef         = useRef(null);
  const isMobileUnsupported = detectMobile();

  // ── Wake Lock (desktop / tablet only) ────────────────────────
  useEffect(() => {
    if (!armed || isMobileUnsupported) return;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          wakeLockRef.current.addEventListener("release", () => {
            if (armed) acquire();
          });
        }
      } catch (e) {
        console.warn("Wake lock unavailable:", e.message);
      }
    };
    acquire();
    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [armed, isMobileUnsupported]);

  // ── Volume key listener ───────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    const isVolumeDown =
      e.key  === "AudioVolumeDown" ||
      e.code === "VolumeDown"      ||
      e.key  === "VolumeDown";
    if (!isVolumeDown) return;
    e.preventDefault();

    const now = Date.now();
    pressTimesRef.current = pressTimesRef.current.filter(t => now - t < WINDOW_MS);
    pressTimesRef.current.push(now);

    const count = pressTimesRef.current.length;
    onProgress?.(count);

    if (count >= REQUIRED_PRESSES) {
      pressTimesRef.current = [];
      onProgress?.(0);
      onTrigger();
    }
  }, [onTrigger, onProgress]);

  useEffect(() => {
    // Never attach on mobile — OS blocks events anyway, no point listening
    if (!armed || isMobileUnsupported) {
      pressTimesRef.current = [];
      onProgress?.(0);
      return;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      pressTimesRef.current = [];
      onProgress?.(0);
    };
  }, [armed, isMobileUnsupported, handleKeyDown, onProgress]);

  return { isMobileUnsupported };
}