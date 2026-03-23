// src/hooks/useShakeSOS.js
//
// Detects 3 strong shakes within 4 seconds → calls onTrigger().
// Android Chrome : works automatically, no permission needed.
// iOS 13+        : needs one-time permission tap via requestPermission().
//
// permissionState: "unknown" | "prompt" | "granted" | "denied" | "unavailable"

import { useEffect, useRef, useCallback, useState } from "react";

// ── Tuning constants ─────────────────────────────────────────────────────────
// accelerationIncludingGravity includes ~9.8 m/s² gravity on one axis at rest.
// A hard shake produces a per-axis spike of 20–40+ on top of that.
// We compare consecutive frames (delta), so gravity cancels out most of the
// time — but we still need a threshold high enough to ignore walking (~5–8).
const SHAKE_THRESHOLD = 20;   // delta magnitude per frame to count as a shake
const REQUIRED_SHAKES = 3;
const WINDOW_MS       = 4000; // all 3 shakes must land within this window
const COOLDOWN_MS     = 300;  // min gap between counted shakes (debounce)

export default function useShakeSOS({ armed, onTrigger, onProgress }) {
  const shakeTimesRef = useRef([]);
  const lastShakeRef  = useRef(0);
  const lastAccelRef  = useRef(null);        // null = no previous frame yet
  const triggeredRef  = useRef(false);
  const listenerRef   = useRef(null);        // keep stable ref for removal

  const [permissionState, setPermissionState] = useState("unknown");

  // ── Detect permission model on mount ──────────────────────────────────────
  useEffect(() => {
    if (!window.DeviceMotionEvent) {
      setPermissionState("unavailable");
      return;
    }

    if (typeof DeviceMotionEvent.requestPermission === "function") {
      // iOS 13+ path.
      // We CANNOT know whether permission was previously granted without
      // calling requestPermission() (which would show a dialog immediately).
      // Instead, listen for ONE devicemotion event with a generous 500 ms
      // window — if iOS fires one, permission is already granted.
      let resolved = false;

      const testHandler = () => {
        if (resolved) return;
        resolved = true;
        setPermissionState("granted");
        window.removeEventListener("devicemotion", testHandler);
      };

      window.addEventListener("devicemotion", testHandler, { passive: true });

      // 500 ms is enough for iOS to fire the first event if permission exists.
      // 300 ms was occasionally too short on older devices.
      const timer = setTimeout(() => {
        window.removeEventListener("devicemotion", testHandler);
        if (!resolved) {
          setPermissionState("prompt"); // user hasn't granted yet
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("devicemotion", testHandler);
      };
    } else {
      // Android / desktop — no permission gate
      setPermissionState("granted");
    }
  }, []);

  // ── iOS permission request (MUST be called inside a user-gesture handler) ─
  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent?.requestPermission === "function") {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        const ok = result === "granted";
        setPermissionState(ok ? "granted" : "denied");
        return ok;
      } catch (err) {
        // User dismissed or browser threw (e.g. called outside gesture)
        console.warn("DeviceMotion permission error:", err);
        setPermissionState("denied");
        return false;
      }
    }
    // Android / desktop — always granted
    setPermissionState("granted");
    return true;
  }, []);

  // ── Motion handler (stable reference via ref) ─────────────────────────────
  const handleMotionRef = useRef(null);
  handleMotionRef.current = useCallback(
    (e) => {
      // Prefer accelerationIncludingGravity — available on all mobile browsers.
      // Pure `acceleration` (gravity-subtracted) is unreliable on many Androids.
      const acc =
        e.accelerationIncludingGravity ||
        e.acceleration;
      if (!acc) return;

      const { x = 0, y = 0, z = 0 } = acc;

      // First frame — nothing to compare against yet
      if (!lastAccelRef.current) {
        lastAccelRef.current = { x, y, z };
        return;
      }

      const prev  = lastAccelRef.current;
      const delta =
        Math.abs(x - prev.x) +
        Math.abs(y - prev.y) +
        Math.abs(z - prev.z);

      lastAccelRef.current = { x, y, z };

      const now = Date.now();

      if (delta > SHAKE_THRESHOLD && now - lastShakeRef.current > COOLDOWN_MS) {
        lastShakeRef.current = now;

        // Drop shakes outside the rolling window
        shakeTimesRef.current = shakeTimesRef.current.filter(
          (t) => now - t < WINDOW_MS
        );
        shakeTimesRef.current.push(now);

        const count = shakeTimesRef.current.length;
        onProgress?.(Math.min(count, REQUIRED_SHAKES));

        if (count >= REQUIRED_SHAKES && !triggeredRef.current) {
          triggeredRef.current = true;

          // Hold the 3rd dot for 600 ms so the user sees it, then reset
          setTimeout(() => {
            shakeTimesRef.current = [];
            triggeredRef.current  = false;
            onProgress?.(0);
          }, 600);

          onTrigger();
        }
      }
    },
    [onTrigger, onProgress]
  );

  // ── Attach / detach listener based on armed + permission ─────────────────
  useEffect(() => {
    // Stable wrapper so we can removeEventListener with the exact same ref
    const stableHandler = (e) => handleMotionRef.current(e);

    if (!armed || permissionState !== "granted") {
      // Disarmed — clean up
      if (listenerRef.current) {
        window.removeEventListener("devicemotion", listenerRef.current);
        listenerRef.current = null;
      }
      lastAccelRef.current  = null;
      shakeTimesRef.current = [];
      triggeredRef.current  = false;
      onProgress?.(0);
      return;
    }

    // Armed and permission granted — attach
    listenerRef.current = stableHandler;
    window.addEventListener("devicemotion", stableHandler, { passive: true });

    return () => {
      window.removeEventListener("devicemotion", stableHandler);
      listenerRef.current   = null;
      lastAccelRef.current  = null;
      shakeTimesRef.current = [];
      triggeredRef.current  = false;
      onProgress?.(0);
    };
  }, [armed, permissionState, onProgress]);

  return { requestPermission, permissionState };
}