// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home"; // or TheRealDeal

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* We also handle share links */}
      <Route path="/share/:creatorName/:dealId" element={<Home />} />
    </Routes>
  );
}

export default App;
