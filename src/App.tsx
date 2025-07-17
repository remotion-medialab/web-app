// src/App.tsx

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OnboardingPage from "./pages/OnboardingPage";
import OverviewPage from "./pages/OverviewPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/insights" element={<OverviewPage />} />
      </Routes>
    </Router>
  );
};

export default App;
