// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CardProvider } from "./contexts/CardContext";
import { ActivityProvider } from "./contexts/ActivityContext";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <CardProvider>
        <ActivityProvider>
          <App />
        </ActivityProvider>
      </CardProvider>
    </BrowserRouter>
  </React.StrictMode>
);
