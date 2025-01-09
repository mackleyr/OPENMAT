// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import TheRealDeal from "./pages/TheRealDeal";

function App() {
  return (
    <Routes>
      {/* Base path => no external deal => user is new creator */}
      <Route path="/" element={<TheRealDeal />} />

      {/* Shared path => existing deal => user can grab or edit if they're the creator */}
      <Route path="/share/:creatorName/:dealId" element={<TheRealDeal />} />
    </Routes>
  );
}

export default App;
