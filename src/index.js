// src/index.js

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CardProvider } from "./contexts/CardContext";
import { LocalUserProvider } from "./contexts/LocalUserContext";
import { ActivityProvider } from "./contexts/ActivityContext";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <LocalUserProvider>
        <CardProvider>
          <ActivityProvider>
            <App />
          </ActivityProvider>
        </CardProvider>
      </LocalUserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
