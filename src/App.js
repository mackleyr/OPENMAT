// src/App.js

import React from "react";
import { Routes, Route } from "react-router-dom";
import ShareCard from "./pages/ShareCard"; // Our main/home page
import ClaimCard from "./pages/ClaimCard"; // The share link page

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
