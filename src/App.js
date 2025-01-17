// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home"; // Or whatever your main Home component is named

function App() {
  return (
    <Routes>
      {/* The default route => loads Home */}
      <Route path="/" element={<Home />} />
      {/* The share route => /share/:creatorName/:dealId => also loads Home */}
      <Route path="/share/:creatorName/:dealId" element={<Home />} />
    </Routes>
  );
}

export default App;
