import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/LiveTracking.css";
import Navbar from "../components/Navbar";

const API = "http://localhost:5000/api";
const STOPPED_THRESHOLD_M = 50;
const STOPPED_TIMEOUT_MS  = 5 * 60 * 1000;
const DEST_RADIUS_M       = 200;

function getToken() { return localStorage.getItem("token"); }

function openWhatsApp(phone, message) {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0"))  p = "91" + p.slice(1);
  if (p.length === 10)    p = "91" + p;
  const encoded = encodeURIComponent(message);
  window.location.href = `whatsapp://send?phone=${p}&text=${encoded}`;
  setTimeout(() => {
    if (!document.hidden) window.open(`https://wa.me/${p}?text=${encoded}`, "_blank");
  }, 1500);
}

function haversineM(a, b) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
    Math.cos((b[0] * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function haversineKm(a, b) { return haversineM(a, b) / 1000; }

function buildCumDists(coords) {
  const d = [0];
  for (let i = 1; i < coords.length; i++)
    d.push(d[i - 1] + haversineKm(coords[i - 1], coords[i]));
  return d;
}

function closestIdx(coords, pt) {
  let min = Infinity, idx = 0;
  coords.forEach((c, i) => {
    const d = haversineM(c, pt);
    if (d < min) { min = d; idx = i; }
  });
  return idx;
}

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function fmtMin(mins) {
  if (!mins || mins <= 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function isNightTime() {
  const h = new Date().getHours();
  return h >= 22 || h < 5;
}

function MapFollower({ center, autoFollow }) {
  const map = useMap();
  useEffect(() => {
    if (center && autoFollow) map.setView(center, map.getZoom());
  }, [center, autoFollow]);
  return null;
}

export default function LiveTracking() {
  const { rideId } = useParams();
  const navigate   = useNavigate();

  const [ride, setRide]                     = useState(null);
  const [route, setRoute]                   = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [loadError, setLoadError]           = useState("");
  const [currentPos, setCurrentPos]         = useState(null);
  const [speed, setSpeed]                   = useState(0);
  const [rideTime, setRideTime]             = useState(0);
  const rideStartTimeRef                    = useRef(null);
  const [distCovered, setDistCovered]       = useState(0);
  const [remainingDist, setRemainingDist]   = useState(null);
  const [remainingEta, setRemainingEta]     = useState(null);
  const [progress, setProgress]             = useState(0);
  const [offRoute, setOffRoute]             = useState(false);
  const [arrived, setArrived]               = useState(false);
  const [stoppedAlert, setStoppedAlert]     = useState(false);
  const [sosCountdown, setSosCountdown]     = useState(null);
  const [batteryWarn, setBatteryWarn]       = useState(false);
  const [nightMode, setNightMode]           = useState(isNightTime());
  const [autoFollow, setAutoFollow]         = useState(true);
  const [sosActive, setSosActive]           = useState(false);
  const [sosMsg, setSosMsg]                 = useState("");
  const [quickMsg, setQuickMsg]             = useState("");

  const lastPosRef      = useRef(null);
  const lastMoveTimeRef = useRef(Date.now());
  const stoppedTimerRef = useRef(null);
  const sosCountdownRef = useRef(null);
  const cumDistsRef     = useRef([]);
  const routeRef        = useRef([]);
  const destRef         = useRef(null);

  useEffect(() => {
    axios.get(`${API}/rides/${rideId}`)
      .then(async res => {
        const d = res.data;
        setRide(d);
        if (d.startTime) {
          const elapsedSecs = Math.floor((Date.now() - new Date(d.startTime).getTime()) / 1000);
          setRideTime(Math.max(0, elapsedSecs));
          rideStartTimeRef.current = new Date(d.startTime).getTime();
        }
        const sLat = d?.startLocation?.lat ?? d?.startLocation?.coordinates?.[1];
        const sLng = d?.startLocation?.lng ?? d?.startLocation?.coordinates?.[0];
        const eLat = d?.endLocation?.lat   ?? d?.endLocation?.coordinates?.[1];
        const eLng = d?.endLocation?.lng   ?? d?.endLocation?.coordinates?.[0];
        if (sLat && sLng && eLat && eLng) {
          destRef.current = [eLat, eLng];
          await fetchRoute([sLat, sLng], [eLat, eLng]);
          const cLat = d?.currentLocation?.lat;
          const cLng = d?.currentLocation?.lng;
          if (cLat && cLng) {
            setCurrentPos([cLat, cLng]);
            lastPosRef.current = [cLat, cLng];
          }
        }
      })
      .catch(() => setLoadError("Could not load ride data."));
  }, [rideId]);

  useEffect(() => {
    if (route.length > 0 && lastPosRef.current) {
      recalcMetrics(lastPosRef.current);
    }
  }, [route]);

  const fetchRoute = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res = await axios.get(url);
      const coords = res.data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      setRoute(coords);
      routeRef.current    = coords;
      cumDistsRef.current = buildCumDists(coords);
      fetchPoliceStations(coords);
    } catch (e) { console.error("Route fetch failed", e); }
  };

  const fetchPoliceStations = async (coords) => {
    const lats = coords.map(c => c[0]);
    const lngs = coords.map(c => c[1]);
    const minLat = (Math.min(...lats) - 0.01).toFixed(6);
    const maxLat = (Math.max(...lats) + 0.01).toFixed(6);
    const minLng = (Math.min(...lngs) - 0.01).toFixed(6);
    const maxLng = (Math.max(...lngs) + 0.01).toFixed(6);
    const query = `[out:json][timeout:15];(node["amenity"="police"](${minLat},${minLng},${maxLat},${maxLng}););out body;`;
    try {
      const res = await axios.post("https://overpass-api.de/api/interpreter", query,
        { headers: { "Content-Type": "text/plain" }, timeout: 15000 });
      const nodes = res.data?.elements || [];
      const cumDists = buildCumDists(coords);
      const seen = new Set();
      setPoliceStations(
        nodes
          .map(n => ({ name: n.tags?.name || "Police Station", distKm: cumDists[closestIdx(coords, [n.lat, n.lon])] }))
          .sort((a, b) => a.distKm - b.distKm)
          .filter(s => { const k = Math.round(s.distKm * 2); if (seen.has(k)) return false; seen.add(k); return true; })
      );
    } catch {}
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (rideStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - rideStartTimeRef.current) / 1000);
        setRideTime(Math.max(0, elapsed));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { const t = setInterval(() => setNightMode(isNightTime()), 60000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if ("getBattery" in navigator) {
      navigator.getBattery().then(b => {
        setBatteryWarn(b.level < 0.15 && !b.charging);
        b.addEventListener("levelchange", () => setBatteryWarn(b.level < 0.15 && !b.charging));
      });
    }
  }, []);

  const recalcMetrics = useCallback((pos) => {
    const coords   = routeRef.current;
    const cumDists = cumDistsRef.current;
    if (!coords.length || !cumDists.length) return;
    const totalDist = cumDists[cumDists.length - 1];
    if (totalDist === 0) return;
    const idx       = closestIdx(coords, pos);
    const coveredKm = cumDists[idx];
    const leftKm    = Math.max(0, totalDist - coveredKm);
    setDistCovered(coveredKm.toFixed(1));
    setRemainingDist(leftKm.toFixed(1));
    setProgress(Math.min(100, Math.round((coveredKm / totalDist) * 100)));
    setRemainingEta(Math.round((leftKm / 30) * 60 * 1.4));
    setOffRoute(haversineM(pos, coords[idx]) > 300);
    if (destRef.current && haversineM(pos, destRef.current) < DEST_RADIUS_M) setArrived(true);
  }, []);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentPos([lat, lng]);
        setSpeed(pos.coords.speed ? +(pos.coords.speed * 3.6).toFixed(1) : 0);
        axios.post(`${API}/rides/update-location`, { rideId, lat, lng }).catch(() => {});
        recalcMetrics([lat, lng]);
        if (lastPosRef.current) {
          const moved = haversineM(lastPosRef.current, [lat, lng]);
          if (moved > STOPPED_THRESHOLD_M) {
            lastMoveTimeRef.current = Date.now();
            if (stoppedTimerRef.current) { clearTimeout(stoppedTimerRef.current); stoppedTimerRef.current = null; }
            setStoppedAlert(false);
            if (sosCountdownRef.current) { clearInterval(sosCountdownRef.current); sosCountdownRef.current = null; setSosCountdown(null); }
          }
        }
        lastPosRef.current = [lat, lng];
        if (!stoppedTimerRef.current) {
          stoppedTimerRef.current = setTimeout(() => {
            setStoppedAlert(true);
            let count = 30;
            setSosCountdown(count);
            sosCountdownRef.current = setInterval(() => {
              count--;
              setSosCountdown(count);
              if (count <= 0) {
                clearInterval(sosCountdownRef.current); sosCountdownRef.current = null;
                setSosCountdown(null); setStoppedAlert(false);
                handleSOS(true);
              }
            }, 1000);
          }, STOPPED_TIMEOUT_MS);
        }
      },
      (err) => console.error("Geolocation error", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (stoppedTimerRef.current) clearTimeout(stoppedTimerRef.current);
      if (sosCountdownRef.current) clearInterval(sosCountdownRef.current);
    };
  }, [rideId, recalcMetrics]);

  const handleSOS = async (auto = false) => {
    setSosActive(true);
    setSosMsg("📡 Sending SOS...");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await axios.post(`${API}/profile/sos`,
          { lat: pos.coords.latitude, lng: pos.coords.longitude, rideId },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const { contacts, location, userName, smsSent } = res.data;
        const msg = auto
          ? `🚨 AUTO-ALERT: ${userName} may need help! No movement detected. Location: ${location.mapsLink}`
          : `🚨 SOS from ${userName}! I need help. Location: ${location.mapsLink}`;
        if (contacts.length > 0) openWhatsApp(contacts[0].phone, msg);
        contacts.slice(1).forEach((c, i) => {
          let p = c.phone.replace(/\D/g, "");
          if (p.startsWith("0")) p = "91" + p.slice(1);
          if (p.length === 10)   p = "91" + p;
          setTimeout(() => window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, `_wa_${i + 1}`), (i + 1) * 800);
        });
        const smsStatus = smsSent ? "📱 SMS sent" : "📱 SMS unavailable";
        setSosMsg(`✅ WhatsApp opened + ${smsStatus} to ${contacts.length} contact(s)`);
      } catch (e) {
        setSosMsg(e.response?.data?.message || "❌ SOS failed. Call 100 directly.");
      }
      setTimeout(() => { setSosActive(false); setSosMsg(""); }, 7000);
    }, () => {
      setSosMsg("❌ Could not get location. Call 100 directly.");
      setTimeout(() => { setSosActive(false); setSosMsg(""); }, 4000);
    });
  };

  const sendQuickMsg = (type) => {
    const msgs = {
      safe: "✅ I'm safe and on my way!",
      late: "⏰ I'm running a bit late, don't worry!",
      help: "🆘 I need help, please call me!",
    };
    setQuickMsg("📡 Sending...");
    const doSend = async (lat, lng) => {
      try {
        const res = await axios.post(
          `${API}/profile/sos`,
          { lat, lng, rideId },
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        const { contacts, location, userName } = res.data;
        if (!contacts || contacts.length === 0) {
          setQuickMsg("❌ No emergency contacts found. Add them in Profile.");
          setTimeout(() => setQuickMsg(""), 4000);
          return;
        }
        const text = `${msgs[type]} — ${userName}. My location: ${location.mapsLink}`;
        openWhatsApp(contacts[0].phone, text);
        contacts.slice(1).forEach((c, i) => {
          let p = c.phone.replace(/\D/g, "");
          if (p.startsWith("0")) p = "91" + p.slice(1);
          if (p.length === 10)   p = "91" + p;
          setTimeout(() => window.open(`https://wa.me/${p}?text=${encodeURIComponent(text)}`, `_qm_${i}`), (i + 1) * 600);
        });
        setQuickMsg(`✅ Message sent to ${contacts.length} contact(s)`);
        setTimeout(() => setQuickMsg(""), 3000);
      } catch (err) {
        const errMsg = err.response?.data?.message || err.message || "Unknown error";
        setQuickMsg(`❌ Could not send: ${errMsg}`);
        setTimeout(() => setQuickMsg(""), 4000);
      }
    };
    if (lastPosRef.current) {
      const [lat, lng] = lastPosRef.current;
      doSend(lat, lng);
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => doSend(pos.coords.latitude, pos.coords.longitude),
        () => { setQuickMsg("❌ Could not get location. Check GPS permissions."); setTimeout(() => setQuickMsg(""), 3000); }
      );
    }
  };

  const stopRide = async () => {
    try {
      await axios.post(`${API}/rides/stop`, { rideId, actualDistance: parseFloat(distCovered) || 0 });
      navigate("/dashboard");
    } catch { alert("Could not stop ride. Please try again."); }
  };

  const dismissStoppedAlert = () => {
    setStoppedAlert(false); setSosCountdown(null);
    if (sosCountdownRef.current) { clearInterval(sosCountdownRef.current); sosCountdownRef.current = null; }
    if (stoppedTimerRef.current) { clearTimeout(stoppedTimerRef.current);  stoppedTimerRef.current = null; }
    lastMoveTimeRef.current = Date.now();
  };

  const nextStation = policeStations.find(s => {
    if (!currentPos || !routeRef.current.length) return false;
    return s.distKm > (cumDistsRef.current[closestIdx(routeRef.current, currentPos)] || 0);
  });

  if (loadError) return (
    <><Navbar /><div className="lt-error-page"><div className="lt-error">⚠️ {loadError}</div></div></>
  );
  if (!ride) return (
    <><Navbar /><div className="lt-error-page"><div className="lt-loading"><div className="lt-spinner" /><p>Loading ride…</p></div></div></>
  );

  return (
    <>
      <Navbar />
      <div className="lt-page">

        {nightMode   && <div className="lt-banner lt-banner-night">🌙 Night ride in progress — stay alert and ride safely</div>}
        {batteryWarn && <div className="lt-banner lt-banner-battery">🔋 Low battery — your live location may stop updating soon</div>}
        {offRoute    && <div className="lt-banner lt-banner-warn">⚠️ You've left the planned route</div>}
        {arrived     && <div className="lt-banner lt-banner-arrived">🎉 You've arrived! <button onClick={stopRide}>End Ride</button></div>}

        {stoppedAlert && (
          <div className="lt-modal-overlay">
            <div className="lt-modal">
              <div className="lt-modal-icon">🤔</div>
              <h3>Are you okay?</h3>
              <p>No movement detected for 5 minutes.</p>
              {sosCountdown !== null && (
                <p className="lt-modal-countdown">Auto-alerting contacts in <strong>{sosCountdown}s</strong></p>
              )}
              <div className="lt-modal-btns">
                <button className="lt-modal-ok"  onClick={dismissStoppedAlert}>✅ I'm okay</button>
                <button className="lt-modal-sos" onClick={() => { dismissStoppedAlert(); handleSOS(); }}>🆘 Send SOS</button>
              </div>
            </div>
          </div>
        )}

        <h2 className="ride-title">Live Tracking</h2>

        <div className="lt-metrics">
          <div className="lt-metric"><span className="lt-metric-icon">⏱️</span><span className="lt-metric-val">{fmtTime(rideTime)}</span><span className="lt-metric-label">Elapsed</span></div>
          <div className="lt-metric"><span className="lt-metric-icon">🚀</span><span className="lt-metric-val">{speed}<span className="lt-unit"> km/h</span></span><span className="lt-metric-label">Speed</span></div>
          <div className="lt-metric"><span className="lt-metric-icon">📏</span><span className="lt-metric-val">{distCovered}<span className="lt-unit"> km</span></span><span className="lt-metric-label">Covered</span></div>
          <div className="lt-metric"><span className="lt-metric-icon">🏁</span><span className="lt-metric-val">{remainingDist ?? "—"}<span className="lt-unit"> km</span></span><span className="lt-metric-label">Remaining</span></div>
          <div className="lt-metric"><span className="lt-metric-icon">⏰</span><span className="lt-metric-val">{remainingEta !== null ? fmtMin(remainingEta) : "—"}</span><span className="lt-metric-label">ETA</span></div>
        </div>

        <div className="lt-progress-wrap">
          <div className="lt-progress-bar"><div className="lt-progress-fill" style={{ width: `${progress}%` }} /></div>
          <span className="lt-progress-pct">{progress}%</span>
        </div>

        <div className="lt-info">
          <p>📍 <strong>{ride.destinationName || "—"}</strong></p>
          <p>🚗 {ride.vehicleType || "Bike"}</p>
          {nextStation && (
            <p className="lt-next-station">
              🚔 Next: <strong>{nextStation.name}</strong>
              {" "}— {Math.max(0, nextStation.distKm - (parseFloat(distCovered) || 0)).toFixed(1)} km ahead
            </p>
          )}
        </div>

        {currentPos && (
          <div className="lt-map-wrapper">
            <div className="lt-map-controls">
              <button className={`lt-follow-btn ${autoFollow ? "active" : ""}`} onClick={() => setAutoFollow(p => !p)}>
                {autoFollow ? "🔒 Following" : "🔓 Free"}
              </button>
            </div>
            <MapContainer center={currentPos} zoom={15} style={{ height: "100%", width: "100%" }}>
              <MapFollower center={currentPos} autoFollow={autoFollow} />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              <Marker position={currentPos} />
              {destRef.current && <Marker position={destRef.current} />}
              {route.length > 0 && <Polyline positions={route} pathOptions={{ color: "#f59e0b", weight: 5, opacity: 0.9 }} />}
            </MapContainer>
          </div>
        )}

        <div className="lt-quick-section">
          <p className="lt-quick-label">Quick message to contacts:</p>
          <div className="lt-quick-btns">
            <button className="lt-quick-btn lt-quick-safe" onClick={() => sendQuickMsg("safe")}>✅ I'm Safe</button>
            <button className="lt-quick-btn lt-quick-late" onClick={() => sendQuickMsg("late")}>⏰ Running Late</button>
            <button className="lt-quick-btn lt-quick-help" onClick={() => sendQuickMsg("help")}>🆘 Need Help</button>
          </div>
          {quickMsg && <p className="lt-quick-msg">{quickMsg}</p>}
        </div>

        <div className="lt-actions">
          <button className={`lt-sos-btn ${sosActive ? "active" : ""}`} onClick={() => handleSOS()} disabled={sosActive}>
            <span className="lt-sos-ring" /><span className="lt-sos-ring lt-sos-ring2" />
            {sosActive ? "Sending…" : "🆘 SOS"}
          </button>
          <button className="lt-stop-btn" onClick={stopRide}>⏹ Stop Ride</button>
        </div>

        {sosMsg && <div className="lt-sos-msg">{sosMsg}</div>}
      </div>
    </>
  );
}