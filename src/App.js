// src/App.js

import React from "react";
import { Routes, Route } from "react-router-dom";
import ShareCard from "./pages/ShareCard";
import ClaimCard from "./pages/ClaimCard";

function App() {
  return (
    <Routes>
      {/* Home route (main screen) */}
      <Route path="/" element={<ShareCard />} />

      {/* Route for anyone visiting the share link */}
      <Route path="/share/:creatorName/:dealId" element={<ClaimCard />} />
    </Routes>
  );
}

export default App;
