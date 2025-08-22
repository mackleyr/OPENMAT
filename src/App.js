// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Give from "./pages/Give";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/give" element={<Give />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
