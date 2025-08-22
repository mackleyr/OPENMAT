export const CREATOR = {
  name: process.env.REACT_APP_CREATOR_NAME || "mack",
  imageUrl: process.env.REACT_APP_CREATOR_IMAGE_URL || "",
  dealId: process.env.REACT_APP_DEFAULT_DEAL_ID || "default",
};

export const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:3001";
