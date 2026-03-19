import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/ride.css";
import Navbar from "../components/Navbar";

const TRAFFIC_MULTIPLIER = 1.4;

function getToken() { return localStorage.getItem("token"); }

function MapUpdater({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center]);
  return null;
}

function haversine(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function closestRouteIndex(routeCoords, point) {
  let minDist = Infinity, minIdx = 0;
  routeCoords.forEach((coord, i) => {
    const d = haversine(coord, point);
    if (d < minDist) { minDist = d; minIdx = i; }
  });
  return minIdx;
}

function buildCumulativeDistances(routeCoords) {
  const dists = [0];
  for (let i = 1; i < routeCoords.length; i++)
    dists.push(dists[i - 1] + haversine(routeCoords[i - 1], routeCoords[i]));
  return dists;
}

async function getPoliceStationsAlongRoute(routeCoords, totalEtaMin) {
  const lats = routeCoords.map(c => c[0]);
  const lngs = routeCoords.map(c => c[1]);
  const minLat = (Math.min(...lats) - 0.01).toFixed(6);
  const maxLat = (Math.max(...lats) + 0.01).toFixed(6);
  const minLng = (Math.min(...lngs) - 0.01).toFixed(6);
  const maxLng = (Math.max(...lngs) + 0.01).toFixed(6);
  const query = `[out:json][timeout:15];(node["amenity"="police"](${minLat},${minLng},${maxLat},${maxLng}););out body;`;
  try {
    const res = await axios.post(
      "https://overpass-api.de/api/interpreter", query,
      { headers: { "Content-Type": "text/plain" }, timeout: 15000 }
    );
    const nodes = res.data?.elements || [];
    if (nodes.length === 0) return [];
    const cumDists = buildCumulativeDistances(routeCoords);
    const totalRouteDist = cumDists[cumDists.length - 1];
    const stations = nodes.map(node => {
      const idx = closestRouteIndex(routeCoords, [node.lat, node.lon]);
      const distFromStart = cumDists[idx];
      const etaAtStation = Math.round((distFromStart / totalRouteDist) * totalEtaMin);
      const name = node.tags?.name || node.tags?.["name:en"] || "Police Station";
      return { name, etaAtStation, distFromStart };
    });
    const seen = new Set();
    return stations
      .sort((a, b) => a.etaAtStation - b.etaAtStation)
      .filter(s => {
        const key = Math.round(s.etaAtStation / 2);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch { return []; }
}

async function getSafestRoute(originLat, originLng, destLat, destLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=3`;
  const res = await axios.get(url);
  const routes = res.data.routes;
  if (!routes || routes.length === 0) throw new Error("No routes found");
  const scored = await Promise.all(
    routes.map(async route => {
      const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      const etaMin = Math.round((route.duration / 60) * TRAFFIC_MULTIPLIER);
      const distKm = (route.distance / 1000).toFixed(2);
      const lats = coords.map(c => c[0]);
      const lngs = coords.map(c => c[1]);
      const minLat = (Math.min(...lats) - 0.01).toFixed(6);
      const maxLat = (Math.max(...lats) + 0.01).toFixed(6);
      const minLng = (Math.min(...lngs) - 0.01).toFixed(6);
      const maxLng = (Math.max(...lngs) + 0.01).toFixed(6);
      const query = `[out:json][timeout:10];(node["amenity"="police"](${minLat},${minLng},${maxLat},${maxLng}););out count;`;
      let policeScore = 0;
      try {
        const pRes = await axios.post(
          "https://overpass-api.de/api/interpreter", query,
          { headers: { "Content-Type": "text/plain" }, timeout: 12000 }
        );
        policeScore = parseInt(pRes.data?.elements?.[0]?.tags?.total || "0", 10);
      } catch {}
      return { coords, etaMin, distanceKm: distKm, policeScore, distance: route.distance };
    })
  );
  scored.sort((a, b) =>
    b.policeScore !== a.policeScore ? b.policeScore - a.policeScore : a.distance - b.distance
  );
  return scored[0];
}

const VEHICLE_OPTIONS = [
  { value: "bike",    label: "Bike",    icon: "🏍️" },
  { value: "scooter", label: "Scooter", icon: "🛵" },
  { value: "car",     label: "Car",     icon: "🚗" },
  { value: "other",   label: "Other",   icon: "🚌" },
];

const STEPS = ["Location", "Destination", "Route", "Launch"];

function StartRide() {
  const navigate = useNavigate();

  const [destination, setDestination]       = useState("");
  const [destinationCoords, setDestCoords]  = useState(null);
  const [currentLocation, setCurrentLoc]   = useState(null);
  const [route, setRoute]                   = useState([]);
  const [distance, setDistance]             = useState(null);
  const [eta, setEta]                       = useState(null);
  const [policeStations, setPoliceStations] = useState([]);
  const [rideStarted, setRideStarted]       = useState(false);
  const [savedRideId, setSavedRideId]       = useState(null);
  const [loading, setLoading]               = useState(false);
  const [locLoading, setLocLoading]         = useState(false);
  const [error, setError]                   = useState("");
  const [vehicleType, setVehicleType]       = useState("bike");

  // ── Autocomplete state ────────────────────────────────────────────────────────
  const [suggestions, setSuggestions]       = useState([]);
  const [sugLoading, setSugLoading]         = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);
  const suggestRef   = useRef(null);

  const step = rideStarted ? 3 : distance ? 2 : currentLocation ? 1 : 0;

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Location ──────────────────────────────────────────────────────────────────
  const getLocation = () => {
    setLocLoading(true); setError("");
    navigator.geolocation.getCurrentPosition(
      pos => { setCurrentLoc([pos.coords.latitude, pos.coords.longitude]); setLocLoading(false); },
      () => { setError("Location access denied. Please allow location in your browser."); setLocLoading(false); }
    );
  };

  // ── Autocomplete: fetch suggestions as user types ─────────────────────────────
  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestination(val);
    setDestCoords(null); // reset coords when user edits

    if (suggestTimer.current) clearTimeout(suggestTimer.current);

    if (val.trim().length < 2) {
      setSuggestions([]); setShowSuggestions(false); return;
    }

    setSugLoading(true);
    suggestTimer.current = setTimeout(async () => {
      try {
        // Bias results toward India for better local suggestions
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&countrycodes=in&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        setSuggestions(res.data || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
      setSugLoading(false);
    }, 350); // 350ms debounce
  };

  // ── Pick a suggestion ─────────────────────────────────────────────────────────
  const pickSuggestion = (place) => {
    const name = place.display_name.split(",").slice(0, 3).join(", ");
    setDestination(name);
    setDestCoords([parseFloat(place.lat), parseFloat(place.lon)]);
    setSuggestions([]); setShowSuggestions(false);
  };

  // ── Format suggestion label ───────────────────────────────────────────────────
  const formatSuggestion = (place) => {
    const parts = place.display_name.split(", ");
    const main = parts[0];
    const sub  = parts.slice(1, 4).join(", ");
    return { main, sub };
  };

  // ── Search / route calculation ────────────────────────────────────────────────
  const searchDestination = async () => {
    if (!currentLocation) { setError("Get your current location first."); return; }
    if (!destination.trim()) { setError("Enter a destination."); return; }
    setLoading(true); setError("");
    setRoute([]); setDistance(null);
    setEta(null); setPoliceStations([]); setRideStarted(false); setSavedRideId(null);
    setShowSuggestions(false);

    try {
      let destLat, destLng;

      // If user picked from autocomplete, use those coords directly
      if (destinationCoords) {
        [destLat, destLng] = destinationCoords;
      } else {
        // Otherwise geocode the typed text
        const geo = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json`
        );
        if (!geo.data || geo.data.length === 0) {
          setError("Location not found. Try a more specific name."); setLoading(false); return;
        }
        destLat = parseFloat(geo.data[0].lat);
        destLng = parseFloat(geo.data[0].lon);
        setDestCoords([destLat, destLng]);
      }

      const best = await getSafestRoute(currentLocation[0], currentLocation[1], destLat, destLng);
      setRoute(best.coords); setDistance(best.distanceKm); setEta(best.etaMin);
      const stations = await getPoliceStationsAlongRoute(best.coords, best.etaMin);
      setPoliceStations(stations);
    } catch { setError("Could not calculate route. Please try again."); }
    setLoading(false);
  };

  // ── Start ride ────────────────────────────────────────────────────────────────
  const startRide = async () => {
    try {
      const res = await axios.post(
        "https://cab-safety.onrender.com/api/rides/start",
        {
          lat: currentLocation[0], lng: currentLocation[1],
          destLat: destinationCoords[0], destLng: destinationCoords[1],
          destinationName: destination, vehicleType,
          distance, expectedTime: eta,
        },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setSavedRideId(res.data.ride._id);
      setRideStarted(true);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Session expired. Please log in again."
          : "Could not start ride. Please try again."
      );
    }
  };

  const safetyScore = Math.min(100, 60 + policeStations.length * 10);

  return (
    <>
      <Navbar />

      {/* ── TOP STEPS BAR ── */}
      <div className="ride-steps-bar">
        <div className="ride-steps-inner">
          <div className="ride-steps-tag">
            <div className="ride-pulse-dot" />
            <span className="ride-tag">MISSION CONTROL</span>
          </div>
          <div className="ride-steps">
            {STEPS.map((s, i) => (
              <div key={s} className={`ride-step ${i <= step ? "done" : ""} ${i === step ? "active" : ""}`}>
                <div className="ride-step-dot">{i < step ? "✓" : i + 1}</div>
                <span>{s}</span>
                {i < STEPS.length - 1 && <div className="ride-step-line" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ride-page">
        <div className="ride-grid-bg" aria-hidden="true" />
        <div className="ride-layout">

          {/* ══ LEFT PANEL ══ */}
          <div className="ride-panel">

            <h1 className="ride-title">Start<br /><em>Ride</em></h1>
            <p className="ride-subtitle">Safest route · Live tracking · SOS ready</p>

            {/* Step 1 — Location */}
            <div className={`ride-card ${currentLocation ? "done" : ""}`}>
              <div className="ride-card-label">01 — YOUR LOCATION</div>
              {currentLocation ? (
                <div className="ride-loc-found">
                  <span style={{ fontSize: 22 }}>📍</span>
                  <div>
                    <p className="ride-loc-coords">{currentLocation[0].toFixed(4)}°N, {currentLocation[1].toFixed(4)}°E</p>
                    <p className="ride-loc-status">GPS lock acquired</p>
                  </div>
                  <button className="ride-reget-btn" onClick={getLocation}>↺</button>
                </div>
              ) : (
                <button className="ride-loc-btn" onClick={getLocation} disabled={locLoading}>
                  {locLoading
                    ? <><span className="ride-spinner" /> Acquiring GPS…</>
                    : <>◎ Get Current Location</>
                  }
                </button>
              )}
            </div>

            {/* Step 2 — Destination + Vehicle */}
            <div className={`ride-card ${destinationCoords ? "done" : ""}`}>
              <div className="ride-card-label">02 — DESTINATION</div>

              {/* Autocomplete input */}
              <div className="ride-dest-row" ref={suggestRef}>
                <div className="ride-autocomplete-wrap">
                  <input
                    className="ride-input"
                    type="text"
                    placeholder="Where are you headed?"
                    value={destination}
                    onChange={handleDestinationChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={e => {
                      if (e.key === "Enter") { searchDestination(); setShowSuggestions(false); }
                      if (e.key === "Escape") setShowSuggestions(false);
                    }}
                    autoComplete="off"
                  />

                  {/* Suggestions dropdown */}
                  {showSuggestions && (suggestions.length > 0 || sugLoading) && (
                    <div className="ride-suggestions">
                      {sugLoading && (
                        <div className="ride-sug-loading">
                          <span className="ride-spinner" /> Searching…
                        </div>
                      )}
                      {!sugLoading && suggestions.map((place, i) => {
                        const { main, sub } = formatSuggestion(place);
                        return (
                          <button
                            key={i}
                            className="ride-sug-item"
                            onMouseDown={() => pickSuggestion(place)}
                          >
                            <span className="ride-sug-pin">📍</span>
                            <span className="ride-sug-text">
                              <span className="ride-sug-main">{main}</span>
                              <span className="ride-sug-sub">{sub}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button className="ride-search-btn" onClick={searchDestination} disabled={loading || !currentLocation}>
                  {loading ? <span className="ride-spinner" /> : "→"}
                </button>
              </div>

              <div className="ride-vehicle-label">VEHICLE</div>
              <div className="ride-vehicles">
                {VEHICLE_OPTIONS.map(v => (
                  <button
                    key={v.value}
                    className={`ride-vehicle-btn ${vehicleType === v.value ? "active" : ""}`}
                    onClick={() => setVehicleType(v.value)}
                  >
                    <span>{v.icon}</span>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && <div className="ride-error">⚠ {error}</div>}

            {/* Step 3 — Route info */}
            {distance && !loading && (
              <div className="ride-card ride-route-card done">
                <div className="ride-card-label">03 — ROUTE ANALYSIS</div>
                <div className="ride-route-stats">
                  <div className="ride-stat">
                    <span className="ride-stat-val">{distance}</span>
                    <span className="ride-stat-unit">km</span>
                    <span className="ride-stat-label">Distance</span>
                  </div>
                  <div className="ride-stat-divider" />
                  <div className="ride-stat">
                    <span className="ride-stat-val">{eta}</span>
                    <span className="ride-stat-unit">min</span>
                    <span className="ride-stat-label">Est. time</span>
                  </div>
                  <div className="ride-stat-divider" />
                  <div className="ride-stat">
                    <span className="ride-stat-val safe">{safetyScore}</span>
                    <span className="ride-stat-unit">/ 100</span>
                    <span className="ride-stat-label">Safety score</span>
                  </div>
                </div>

                <div className="ride-safety-wrap">
                  <div className="ride-safety-bar">
                    <div className="ride-safety-fill" style={{ width: `${safetyScore}%` }} />
                  </div>
                  <span className="ride-safety-label">🛡️ Safest route selected</span>
                </div>

                {policeStations.length > 0 && (
                  <div className="ride-police-list">
                    <div className="ride-police-header">🚔 {policeStations.length} police station{policeStations.length > 1 ? "s" : ""} on route</div>
                    <div className="ride-police-items">
                      {policeStations.map((s, i) => (
                        <div key={i} className="ride-police-item">
                          <span className="ride-police-name">{s.name}</span>
                          <span className="ride-police-eta">+{s.etaAtStation} min</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Launch button */}
            {destinationCoords && !rideStarted && !loading && (
              <button className="ride-launch-btn" onClick={startRide}>
                <span className="ride-launch-ring" />
                <span className="ride-launch-ring ride-launch-ring2" />
                <span className="ride-launch-text">▶ Launch Ride</span>
              </button>
            )}

            {rideStarted && savedRideId && (
              <button className="ride-track-btn" onClick={() => navigate(`/tracking/${savedRideId}`)}>
                Go to Live Tracking →
              </button>
            )}

          </div>

          {/* ══ MAP PANEL ══ */}
          <div className="ride-map-panel">
            {currentLocation ? (
              <>
                <div className="ride-map-label">
                  {route.length > 0 ? "🛡️ Safest route plotted" : "📍 Location acquired"}
                </div>
                <MapContainer
                  center={currentLocation}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                >
                  <MapUpdater center={currentLocation} />
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  <Marker position={currentLocation} />
                  {destinationCoords && <Marker position={destinationCoords} />}
                  {route.length > 0 && (
                    <Polyline positions={route} pathOptions={{ color: "#f59e0b", weight: 4, opacity: 0.9 }} />
                  )}
                </MapContainer>
              </>
            ) : (
              <div className="ride-map-empty">
                <div className="ride-map-empty-icon">🗺️</div>
                <p>Waiting for location…</p>
                <p className="ride-map-empty-sub">Grant GPS access to see your map</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default StartRide;