// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { LocalUserProvider } from "./contexts/LocalUserContext";
import { CardProvider } from "./contexts/CardContext";
import { ActivityProvider } from "./contexts/ActivityContext";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <PayPalScriptProvider
      options={{
        "client-id": process.env.REACT_APP_PAYPAL_CLIENT_ID || "sb",
        currency: "USD",
      }}
    >
      <BrowserRouter>
        <LocalUserProvider>
          <CardProvider>
            <ActivityProvider>
              <App />
            </ActivityProvider>
          </CardProvider>
        </LocalUserProvider>
      </BrowserRouter>
    </PayPalScriptProvider>
  </React.StrictMode>
);
