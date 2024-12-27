// src/supabaseClient.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("[supabaseClient.js] REACT_APP_SUPABASE_URL =>", supabaseUrl);
if (!supabaseUrl) {
  console.warn("[supabaseClient.js] supabaseUrl is UNDEFINED in production build!");
}

console.log("[supabaseClient.js] REACT_APP_SUPABASE_ANON_KEY =>", 
  supabaseAnonKey ? "[REDACTED - key present]" : "UNDEFINED"
);
if (!supabaseAnonKey) {
  console.warn("[supabaseClient.js] supabaseAnonKey is UNDEFINED in production build!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
