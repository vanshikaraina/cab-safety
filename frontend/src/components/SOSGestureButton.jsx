// src/components/SOSGestureButton.jsx
import React, { useRef, useState } from "react";
import "../styles/SOSGestureButton.css";

export default function SOSGestureButton({ onSOSTriggered }) {
  const [open, setOpen]     = useState(false);
  const [result, setResult] = useState("");
  const canvasRef           = useRef(null);
  const drawing             = useRef(false);
  const points              = useRef([]);

  const reset = () => {
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, 640, 840);
    points.current  = [];
    drawing.current = false;
    setResult("");
  };

  const getPos = (e) => {
    const rect   = canvasRef.current.getBoundingClientRect();
    const scaleX = 640 / rect.width;
    const scaleY = 840 / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const onStart = (e) => {
    drawing.current = true;
    points.current  = [];
    const p   = getPos(e);
    points.current.push(p);
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 640, 840);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    const p   = getPos(e);
    points.current.push(p);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth   = 6;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
  };

  const onEnd = () => {
    if (!drawing.current) return;
    drawing.current = false;
    analyze();
  };

  const analyze = () => {
    const pts = points.current;
    if (pts.length < 20) return setResult("✗ Too short — draw a full S");

    const ys     = pts.map((p) => p.y);
    const xs     = pts.map((p) => p.x);
    const height = Math.max(...ys) - Math.min(...ys);
    const width  = Math.max(...xs) - Math.min(...xs);

    if (height < 120 || width < 60) return setResult("✗ Draw bigger!");

    let dirChanges = 0;
    let lastDir    = null;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      if (Math.abs(dx) < 2) continue;
      const dir = dx > 0 ? 1 : -1;
      if (lastDir !== null && dir !== lastDir) dirChanges++;
      lastDir = dir;
    }

    const flowsDown = pts[pts.length - 1].y > pts[0].y + 80;

    if (dirChanges >= 1 && flowsDown) {
      setResult("✓ S detected! Triggering SOS…");
      setTimeout(() => {
        setOpen(false);
        reset();
        onSOSTriggered();
      }, 700);
    } else if (!flowsDown) {
      setResult("✗ Draw top to bottom");
    } else {
      setResult("✗ Not quite — try a clearer S shape");
    }
  };

  const resultClass = result.startsWith("✓")
    ? "sgb-result success"
    : result
    ? "sgb-result error"
    : "sgb-result empty";

  return (
    <>
      {/* ── Floating pill button ── */}
      <button
        className="sgb-fab"
        onClick={() => { setOpen(true); reset(); }}
        title="Draw S to trigger SOS"
      >
        <span className="sgb-fab-icon">✏️</span>
        <span className="sgb-fab-label">Draw S</span>
      </button>

      {/* ── Fullscreen canvas overlay ── */}
      {open && (
        <div className="sgb-overlay">

          <div className="sgb-canvas-wrap">
            {/* Ghost guide */}
            <div className="sgb-guide">
              <svg width="120" height="180" viewBox="0 0 120 180">
                <path
                  d="M90 30 Q90 10 60 10 Q30 10 30 40 Q30 70 60 75 Q90 80 90 110 Q90 140 60 140 Q30 140 30 160"
                  stroke="white" strokeWidth="18" fill="none" strokeLinecap="round"
                />
              </svg>
            </div>

            <canvas
              ref={canvasRef}
              className="sgb-canvas"
              width={640}
              height={840}
              onMouseDown={onStart}
              onMouseMove={onMove}
              onMouseUp={onEnd}
              onTouchStart={onStart}
              onTouchMove={onMove}
              onTouchEnd={onEnd}
            />
          </div>

          <p className="sgb-hint">Draw an "S" top-to-bottom to trigger SOS</p>
          <p className={resultClass}>{result || " "}</p>

          <div className="sgb-actions">
            <button className="sgb-btn-clear" onClick={reset}>Clear &amp; try again</button>
            <button className="sgb-btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
          </div>

        </div>
      )}
    </>
  );
}