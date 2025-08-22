// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("[supabaseClient.js] REACT_APP_SUPABASE_URL =>", supabaseUrl);
console.log(
  "[supabaseClient.js] REACT_APP_SUPABASE_ANON_KEY =>",
  supabaseAnonKey ? "[REDACTED - key present]" : "UNDEFINED"
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
