// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { LocalUserProvider } from "./contexts/LocalUserContext";
import { CardProvider } from "./contexts/CardContext";
import { ActivityProvider } from "./contexts/ActivityContext";
import App from "./App";

const isSandbox = process.env.REACT_APP_PAYPAL_ENV === "sandbox";
const clientId = isSandbox
  ? process.env.REACT_APP_PAYPAL_SANDBOX_CLIENT_ID
  : process.env.REACT_APP_PAYPAL_LIVE_CLIENT_ID;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <PayPalScriptProvider
      options={{
        "client-id": clientId || "sb",
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
