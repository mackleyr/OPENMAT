// src/services/usersService.js
import { supabase } from '../supabaseClient';

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
      { onConflict: 'phone_number' } // requires phone_number to be unique
    )
    .select('*')
    .single();

  console.log('upsertUser(): Supabase returned => data:', user, 'error:', error);

  if (error) {
    console.error('upsertUser(): supabase error:', error);
    throw error;
  }

  console.log('upsertUser() success =>', user);
  return user; // This includes user.id
};
