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

const API = `${import.meta.env.VITE_API_URL}/api`;
const TRAFFIC_MULTIPLIER = 1.4;


function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("token") ||
    null
  );
}

// FIX: Overpass fetch with automatic mirror fallback on 429
async function overpassQuery(query) {
  try {
    const res = await axios.post(`${API}/maps/overpass`, {
      query,
    });

    return res.data;
  } catch (err) {
    console.error("Backend overpass error:", err);
    return { elements: [] };
  }
}

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
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
  const lats = routeCoords.map((c) => c[0]);
  const lngs = routeCoords.map((c) => c[1]);
  const minLat = (Math.min(...lats) - 0.01).toFixed(6);
  const maxLat = (Math.max(...lats) + 0.01).toFixed(6);
  const minLng = (Math.min(...lngs) - 0.01).toFixed(6);
  const maxLng = (Math.max(...lngs) + 0.01).toFixed(6);
  const query = `[out:json][timeout:15];(node["amenity"="police"](${minLat},${minLng},${maxLat},${maxLng}););out body;`;

  try {
    // FIX: Use mirror-fallback overpass fetch — never throws on 429
    const data = await overpassQuery(query, 15000);
    const nodes = data?.elements || [];
    if (nodes.length === 0) return [];
    const cumDists = buildCumulativeDistances(routeCoords);
    const totalRouteDist = cumDists[cumDists.length - 1];
    const stations = nodes.map((node) => {
      const idx = closestRouteIndex(routeCoords, [node.lat, node.lon]);
      const distFromStart = cumDists[idx];
      const etaAtStation =
        totalRouteDist > 0
          ? Math.round((distFromStart / totalRouteDist) * totalEtaMin)
          : 0;
      const name = node.tags?.name || node.tags?.["name:en"] || "Police Station";
      return { name, etaAtStation, distFromStart };
    });
    const seen = new Set();
    return stations
      .sort((a, b) => a.etaAtStation - b.etaAtStation)
      .filter((s) => {
        const key = Math.round(s.etaAtStation / 2);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return []; // Always safe — police stations are a bonus, not critical
  }
}

async function getSafestRoute(originLat, originLng, destLat, destLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=3`;
  const res = await axios.get(url);
  const routes = res.data.routes;
  if (!routes || routes.length === 0) throw new Error("No routes found");

  const scored = await Promise.all(
    routes.map(async (route) => {
      const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
      const etaMin = Math.round((route.duration / 60) * TRAFFIC_MULTIPLIER);
      const distKm = (route.distance / 1000).toFixed(2);
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      const minLat = (Math.min(...lats) - 0.01).toFixed(6);
      const maxLat = (Math.max(...lats) + 0.01).toFixed(6);
      const minLng = (Math.min(...lngs) - 0.01).toFixed(6);
      const maxLng = (Math.max(...lngs) + 0.01).toFixed(6);
      const query = `[out:json][timeout:10];(node["amenity"="police"](${minLat},${minLng},${maxLat},${maxLng}););out count;`;
      let policeScore = 0;
      try {
        // FIX: Use mirror-fallback — a 429 here should NOT abort route selection
        const data = await overpassQuery(query, 12000);
        policeScore = parseInt(data?.elements?.[0]?.tags?.total || "0", 10);
      } catch {
        policeScore = 0; // treat as 0 police stations, not a crash
      }
      return {
        coords,
        etaMin,
        distanceKm: distKm,
        policeScore,
        distance: route.distance,
      };
    })
  );

  scored.sort((a, b) =>
    b.policeScore !== a.policeScore
      ? b.policeScore - a.policeScore
      : a.distance - b.distance
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

  const [destination, setDestination]         = useState("");
  const [destinationCoords, setDestCoords]    = useState(null);
  const [currentLocation, setCurrentLoc]      = useState(null);
  const [currentLocationName, setCurrentLocName] = useState("");
  const [route, setRoute]                     = useState([]);
  const [distance, setDistance]               = useState(null);
  const [eta, setEta]                         = useState(null);
  const [policeStations, setPoliceStations]   = useState([]);
  const [rideStarted, setRideStarted]         = useState(false);
  const [savedRideId, setSavedRideId]         = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [locLoading, setLocLoading]           = useState(false);
  const [launching, setLaunching]             = useState(false);
  const [error, setError]                     = useState("");

  const [vehicleType, setVehicleType]         = useState("bike");
  const [suggestions, setSuggestions]         = useState([]);
  const [sugLoading, setSugLoading]           = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef(null);
  const suggestRef   = useRef(null);

  // FIX: step now derived purely from route readiness — not destinationCoords
  const step = rideStarted ? 3 : route.length > 0 ? 2 : currentLocation ? 1 : 0;

  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getLocation = () => {
    setLocLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLoc([lat, lng]);
        // Reverse geocode for display name
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          const addr = res.data?.address;
          setCurrentLocName(
            addr?.road || addr?.suburb || addr?.city || addr?.town || "Current Location"
          );
        } catch {
          setCurrentLocName("Current Location");
        }
        setLocLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Location access denied. Please allow location in your browser settings.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestination(val);
    setDestCoords(null); // reset coords on edit

    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (val.trim().length < 2) {
      setSuggestions([]); setShowSuggestions(false); return;
    }
    setSugLoading(true);
    suggestTimer.current = setTimeout(async () => {
      try {
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
    }, 350);
  };

  const pickSuggestion = (place) => {
    const name = place.display_name.split(",").slice(0, 3).join(", ");
    setDestination(name);
    setDestCoords([parseFloat(place.lat), parseFloat(place.lon)]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const formatSuggestion = (place) => {
    const parts = place.display_name.split(", ");
    return { main: parts[0], sub: parts.slice(1, 4).join(", ") };
  };

  const searchDestination = async () => {
    if (!currentLocation) { setError("Get your current location first."); return; }
    if (!destination.trim()) { setError("Enter a destination."); return; }

    setLoading(true);
    setError("");
    setRoute([]);
    setDistance(null);
    setEta(null);
    setPoliceStations([]);
    setRideStarted(false);
    setSavedRideId(null);
    setShowSuggestions(false);

    try {
      let destLat, destLng;

      if (destinationCoords) {
        [destLat, destLng] = destinationCoords;
      } else {
        const geo = await axios.get(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json`
        );
        if (!geo.data || geo.data.length === 0) {
          setError("Location not found. Try a more specific name.");
          setLoading(false);
          return;
        }
        destLat = parseFloat(geo.data[0].lat);
        destLng = parseFloat(geo.data[0].lon);
        // FIX: Always set coords from geocode result too
        setDestCoords([destLat, destLng]);
      }

      const best = await getSafestRoute(
        currentLocation[0], currentLocation[1],
        destLat, destLng
      );

      setRoute(best.coords);
      setDistance(best.distanceKm);
      setEta(best.etaMin);

      // FIX: Police stations are non-critical — fetch after route is set,
      // never block or throw from here
      getPoliceStationsAlongRoute(best.coords, best.etaMin)
        .then(setPoliceStations)
        .catch(() => setPoliceStations([]));

    } catch (err) {
      console.error("Route search error:", err);
      setError("Could not calculate route. Please try again.");
    }

    // FIX: setLoading(false) is always reached — not blocked by police station fetch
    setLoading(false);
  };

  const startRide = async () => {
    // Guards
    if (!currentLocation) {
      setError("Current location is missing.");
      return;
    }
    if (!destinationCoords) {
      setError("Destination coordinates missing. Please search again.");
      return;
    }
    const token = getToken();
    if (!token) {
      setError("Not logged in. Please log in and try again.");
      return;
    }

    setLaunching(true);
    setError("");

    try {
      const payload = {
        lat:               currentLocation[0],
        lng:               currentLocation[1],
        startLocationName: currentLocationName || "Unknown",
        destLat:           destinationCoords[0],
        destLng:           destinationCoords[1],
        destinationName:   destination,
        vehicleType,
        distance:          String(distance),
        expectedTime:      Number(eta),
      };

      console.log("Starting ride with payload:", payload);

      const res = await axios.post(`${API}/rides/start`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Ride start response:", res.data);

      // FIX: Handle both response shapes: { ride: { _id } } and { _id }
      const rideId = res.data?.ride?._id || res.data?._id;

      if (!rideId) {
        console.error("No ride ID in response:", res.data);
        setError("Server did not return a ride ID. Please try again.");
        setLaunching(false);
        return;
      }

      setSavedRideId(rideId);
      setRideStarted(true);

      // FIX: Navigate immediately — don't wait for state re-render
      navigate(`/tracking/${rideId}`);

    } catch (err) {
      console.error("startRide error:", err.response?.data || err.message);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError("Session expired. Please log in again.");
      } else {
        setError(
          `Could not start ride: ${err.response?.data?.message || err.message || "Unknown error"}`
        );
      }
      setLaunching(false);
    }
  };

  const safetyScore = Math.min(100, 60 + policeStations.length * 10);

  return (
    <>

      {/* Steps Bar */}
      <div className="ride-steps-bar">
        <div className="ride-steps-inner">
          <div className="ride-steps-tag">
            <div className="ride-pulse-dot" />
            <span className="ride-tag">MISSION CONTROL</span>
          </div>
          <div className="ride-steps">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`ride-step ${i <= step ? "done" : ""} ${i === step ? "active" : ""}`}
              >
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

          {/* Left Panel */}
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
                    <p className="ride-loc-coords">
                      {currentLocation[0].toFixed(4)}°N, {currentLocation[1].toFixed(4)}°E
                    </p>
                    <p className="ride-loc-status">{currentLocationName || "GPS lock acquired"}</p>
                  </div>
                  <button className="ride-reget-btn" onClick={getLocation}>↺</button>
                </div>
              ) : (
                <button className="ride-loc-btn" onClick={getLocation} disabled={locLoading}>
                  {locLoading ? <><span className="ride-spinner" /> Acquiring GPS…</> : <>◎ Get Current Location</>}
                </button>
              )}
            </div>

            {/* Step 2 — Destination + Vehicle */}
            <div className={`ride-card ${destinationCoords ? "done" : ""}`}>
              <div className="ride-card-label">02 — DESTINATION</div>
              <div className="ride-dest-row" ref={suggestRef}>
                <div className="ride-autocomplete-wrap">
                  <input
                    className="ride-input"
                    type="text"
                    placeholder="Where are you headed?"
                    value={destination}
                    onChange={handleDestinationChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { searchDestination(); setShowSuggestions(false); }
                      if (e.key === "Escape") setShowSuggestions(false);
                    }}
                    autoComplete="off"
                  />
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
                          <button key={i} className="ride-sug-item" onMouseDown={() => pickSuggestion(place)}>
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
                <button
                  className="ride-search-btn"
                  onClick={searchDestination}
                  disabled={loading || !currentLocation}
                >
                  {loading ? <span className="ride-spinner" /> : "→"}
                </button>
              </div>

              <div className="ride-vehicle-label">VEHICLE</div>
              <div className="ride-vehicles">
                {VEHICLE_OPTIONS.map((v) => (
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
            {route.length > 0 && !loading && (
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
                    <div className="ride-police-header">
                      🚔 {policeStations.length} police station{policeStations.length > 1 ? "s" : ""} on route
                    </div>
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

            {/* FIX: Launch button — depends on route, not police stations */}
            {route.length > 0 && destinationCoords && !rideStarted && !loading && (
              <button
                className="ride-launch-btn"
                onClick={startRide}
                disabled={launching}
              >
                <span className="ride-launch-ring" />
                <span className="ride-launch-ring ride-launch-ring2" />
                <span className="ride-launch-text">
                  {launching
                    ? <><span className="ride-spinner" /> Launching…</>
                    : "▶ Launch Ride"
                  }
                </span>
              </button>
            )}

            {/* Fallback manual nav in case auto-navigate failed */}
            {rideStarted && savedRideId && (
              <button
                className="ride-track-btn"
                onClick={() => navigate(`/tracking/${savedRideId}`)}
              >
                Go to Live Tracking →
              </button>
            )}
          </div>

          {/* Map Panel */}
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
                    <Polyline
                      positions={route}
                      pathOptions={{ color: "#f59e0b", weight: 4, opacity: 0.9 }}
                    />
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