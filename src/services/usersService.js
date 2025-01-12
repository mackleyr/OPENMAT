// src/services/usersService.js
import { supabase } from "../supabaseClient";

/**
 * upsertUser => ensures a single user row keyed by paypal_email
 */
export const upsertUser = async ({
  paypal_email,
  name,
  profile_image_url,
}) => {
  console.log("upsertUser(): Attempting upsert =>", {
    paypal_email,
    name,
    profile_image_url,
  });

  // upsert by paypal_email
  const { data: user, error } = await supabase
    .from("users")
    .upsert(
      { paypal_email, name, profile_image_url },
      { onConflict: "paypal_email" }
    )
    .select("*")
    .single();

  console.log("upsertUser(): Supabase returned =>", user, "error:", error);
  if (error) throw error;

  // Store user.id so we remain "signed in" for the session
  if (user?.id) {
    window.localStorage.setItem("userId", user.id);
  }

  return user;
};
