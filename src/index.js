import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

import { LocalUserProvider } from "./contexts/LocalUserContext";
import { ActivityProvider } from "./contexts/ActivityContext";

const root = createRoot(document.getElementById("root"));

root.render(
  <BrowserRouter>
    <ActivityProvider>
      <LocalUserProvider>
        <App />
      </LocalUserProvider>
    </ActivityProvider>
  </BrowserRouter>
);
