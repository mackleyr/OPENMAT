// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import TheRealDeal from "./pages/TheRealDeal";

function App() {
  return (
    <Routes>
      <Route path="/" element={<TheRealDeal />} />
      <Route path="/share/:creatorName/:dealId" element={<TheRealDeal />} />
    </Routes>
  );
}

export default App;
