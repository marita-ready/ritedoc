import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSetting } from "./lib/commands";

import OnboardingWelcome from "./pages/onboarding/Welcome";
import OnboardingSetup from "./pages/onboarding/Setup";
import OnboardingCartridges from "./pages/onboarding/CartridgeSelect";

import MainLayout from "./components/MainLayout";
import Home from "./pages/main/Home";
import RewriteNote from "./pages/main/NewNote";
import Settings from "./pages/main/Settings";

import "./App.css";

function App() {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    try {
      const val = await getSetting("onboarding_complete");
      setOnboarded(val === "true");
    } catch {
      // DB not ready or first run — treat as not onboarded
      setOnboarded(false);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading RiteDoc...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            onboarded ? <Navigate to="/" replace /> : <OnboardingWelcome />
          }
        />
        <Route
          path="/onboarding/setup"
          element={
            onboarded ? <Navigate to="/" replace /> : <OnboardingSetup />
          }
        />
        <Route
          path="/onboarding/cartridges"
          element={
            onboarded ? (
              <Navigate to="/" replace />
            ) : (
              <OnboardingCartridges onComplete={() => setOnboarded(true)} />
            )
          }
        />

        {/* Main app */}
        <Route
          path="/"
          element={
            onboarded ? <MainLayout /> : <Navigate to="/onboarding" replace />
          }
        >
          <Route index element={<Home />} />
          <Route path="rewrite" element={<RewriteNote />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
