// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Give from "./pages/Give";
import Offer from "./pages/Offer";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/give" element={<Give />} />
      <Route path="/o/:offerId" element={<Offer />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
