// src/config/Creator.js
export const CREATOR = {
  dealId: process.env.REACT_APP_DEFAULT_DEAL_ID || "default",
  name: process.env.REACT_APP_CREATOR_NAME || "mack",
  imageUrl: process.env.REACT_APP_CREATOR_IMAGE_URL || "",
};

// 1) Prefer explicit env (works in prod & dev when set)
const ENV_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "";

// 2) Same-origin (works in prod when API and web are one domain)
const SAME_ORIGIN =
  typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

// 3) Dev helper: if on localhost/127.* force 3001 (no matter the port the FE runs on)
const IS_LOCALHOST =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

const DEV_DEFAULT = "http://localhost:3001";

function pickApiBase() {
  // explicit env wins
  if (/^https?:\/\//.test(ENV_BASE)) return ENV_BASE.replace(/\/$/, "");

  // force port 3001 for any localhost/127.* dev run
  if (IS_LOCALHOST) return DEV_DEFAULT;

  // otherwise same origin (prod)
  return SAME_ORIGIN;
}

export const API_BASE = pickApiBase();
