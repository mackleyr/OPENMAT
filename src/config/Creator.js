// src/config/Creator.js
export const CREATOR = {
  dealId: process.env.REACT_APP_DEFAULT_DEAL_ID || "default",
  name: process.env.REACT_APP_CREATOR_NAME || "mack",
  imageUrl: process.env.REACT_APP_CREATOR_IMAGE_URL || "",
};

// Prefer explicit env; else same-origin /api; else localhost:3001
const API_BASE_FROM_ENV =
  process.env.REACT_APP_API_BASE ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "";

const SAME_ORIGIN_API = (typeof window !== "undefined")
  ? `${window.location.origin.replace(/\/$/, "")}`
  : "";

export const API_BASE =
  API_BASE_FROM_ENV ||
  SAME_ORIGIN_API ||
  "http://localhost:3001";
