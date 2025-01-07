// src/services/usersService.js

import { supabase } from '../supabaseClient';

/**
 * upsertUser:
 * 1) Takes { phone_number, name, profile_image_url }
 * 2) .upsert() by phone_number so the same phone yields same user record
 * 3) After success, store user.id in localStorage
 * 
 * 
 * NOTE:
 * If dev used a "dummy phone" and the user updates to a real phone,
 * that would create or overwrite the user record with the new phone.
 * This is a quick hack for an MVP without Twilio verification.
 */
export const upsertUser = async ({ phone_number, name, profile_image_url }) => {
  console.log('upsertUser(): Attempting to upsert user =>', { phone_number, name });

  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      {
        phone_number,
        name,
        profile_image_url,
      },
      { onConflict: 'phone_number' } 
    )
    .select('*')
    .single();

  console.log('upsertUser(): Supabase returned => data:', user, 'error:', error);

  if (error) {
    console.error('upsertUser(): supabase error:', error);
    throw error;
  }

  console.log('upsertUser() success =>', user);

  // Store user.id in localStorage for persistent login
  if (user && user.id) {
    window.localStorage.setItem('userId', user.id);
  }

  return user; // This includes user.id
};
