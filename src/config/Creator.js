// src/config/Creator.js
const NAME = process.env.REACT_APP_CREATOR_NAME || "mack";
const USER_ID = process.env.REACT_APP_CREATOR_USER_ID || "default";
const IMAGE = process.env.REACT_APP_CREATOR_IMAGE_URL || "";
const DEAL_ID = process.env.REACT_APP_DEFAULT_DEAL_ID || "default";

export const API_BASE =
  process.env.REACT_APP_API_BASE ||
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:3001";

export const CREATOR = {
  userId: USER_ID,
  name: NAME,
  imageUrl: IMAGE,
  dealId: DEAL_ID,
};
