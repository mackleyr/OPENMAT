// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import TheRealDeal from "./pages/TherealDeal";

function App() {
  return (
    <Routes>
      {/* If user goes to / => just show the new single page */}
      <Route path="/" element={<TheRealDeal />} />

      {/* If user visits /share/:creatorName/:dealId => show the same page */}
      <Route path="/share/:creatorName/:dealId" element={<TheRealDeal />} />
    </Routes>
  );
}

export default App;
