// dealsService.js
import { supabase } from '../supabaseClient';

export const createDeal = async ({ creator_id, title, background, expires_at, creatorName }) => {
  console.log("createDeal(): Attempting to create deal:", { creator_id, title, background, expires_at, creatorName });

  const uniqueUrl = crypto.randomUUID();
  const encodedName = encodeURIComponent(creatorName);
  const share_link = `https://and.deals/share/${encodedName}/${uniqueUrl}`;

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert([{ creator_id, title, background, expires_at, share_link }])
    .select('*')
    .single();

  if (dealError) {
    console.error("createDeal() error:", dealError.message);
    throw dealError;
  }

  console.log("createDeal(): Deal created successfully:", deal);
  return deal;
};
