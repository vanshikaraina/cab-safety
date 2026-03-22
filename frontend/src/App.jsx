import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SafetyCenter from "./pages/SafetyCenter";
import StartRide from "./pages/StartRide";
import LiveTracking from "./pages/LiveTracking";
import ProfileSafety from "./pages/ProfileSafety";
import Recordings from "./pages/Recordings";
import SafetyMode from "./pages/SafetyMode";
import SOSCenter from "./pages/SOSCenter";

import RecordingWidget from "./components/RecordingWidget";
import SafetyIndicator from "./components/SafetyIndicator";
import SafetyCheckPopup from "./components/SafetyCheckPopup";
import AllRides from "./pages/AllRides";
import FakeCall from "./pages/FakeCall";

import { RecordingProvider, useRecording } from "./context/RecordingContext";
import { SafetyModeProvider, useSafetyMode } from "./context/SafetyModeContext";

function AppContent() {

  const { isRecording } = useRecording();

  const {
    safetyMode,
    showCheck,
    confirmSafe,
    reportIssue
  } = useSafetyMode();

  const token = localStorage.getItem("token");

  return (
    <BrowserRouter>

      {token && isRecording && <RecordingWidget />}
      {token && safetyMode && <SafetyIndicator />}

      <SafetyCheckPopup
        visible={showCheck}
        onSafe={confirmSafe}
        onReport={reportIssue}
      />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/start-ride" element={<StartRide />} />
        <Route path="/tracking/:rideId" element={<LiveTracking />} />
        <Route path="/profile" element={<ProfileSafety />} />
        <Route path="/safety-center" element={<SafetyCenter />} />
        <Route path="/recordings" element={<Recordings />} />
        <Route path="/safety-mode" element={<SafetyMode />} />
        <Route path="/rides" element={<AllRides />} />
        <Route path="/sos" element={<SOSCenter />} />
        <Route path="/fake-call" element={<FakeCall />} />
      </Routes>

    </BrowserRouter>
  );
}

function App() {
  return (
    <RecordingProvider>
      <SafetyModeProvider>
        <AppContent />
      </SafetyModeProvider>
    </RecordingProvider>
  );
}

export default App;