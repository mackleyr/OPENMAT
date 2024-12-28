// src/services/dealsService.js

import { supabase } from '../supabaseClient';

// CREATE
export const createDeal = async ({
  creator_id,
  title,
  background,
  expires_at,
  creatorName,
  deal_value,
}) => {
  console.log("createDeal(): Attempting to create deal:", {
    creator_id,
    title,
    background,
    expires_at,
    creatorName,
    deal_value
  });

  try {
    const nameLower = (creatorName || '').toLowerCase().trim();
    const uniqueUrl = crypto.randomUUID();
    const encodedName = encodeURIComponent(nameLower);
    const share_link = `https://and.deals/share/${encodedName}/${uniqueUrl}`;

    console.log("createDeal(): final share_link =>", share_link);

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert([
        {
          creator_id,
          title,                 // e.g. "Some title"
          background,            // base64 image
          expires_at,
          share_link,
          deal_value,            // <-- numeric string
        }
      ])
      .select('*')
      .single();

    console.log("createDeal(): Supabase returned => data:", deal, "error:", dealError);
    if (dealError) throw dealError;

    console.log("createDeal() success =>", deal);
    return deal;
  } catch (err) {
    console.error("createDeal() unhandled error:", err);
    throw err;
  }
};

// UPDATE
export const updateDeal = async ({
  dealId,
  title,
  background,
  expires_at,
  creatorName,
  deal_value,
}) => {
  console.log("updateDeal(): Attempting to update deal:", {
    dealId,
    title,
    background,
    expires_at,
    creatorName,
    deal_value
  });

  try {
    const nameLower = (creatorName || '').toLowerCase().trim();
    const uniqueUrl = crypto.randomUUID();
    const encodedName = encodeURIComponent(nameLower);
    const share_link = `https://and.deals/share/${encodedName}/${uniqueUrl}`;

    console.log("updateDeal(): final share_link =>", share_link);

    const { data: updatedDeal, error: updateError } = await supabase
      .from('deals')
      .update({
        title,
        background,
        expires_at,
        share_link,
        deal_value,
      })
      .eq('id', dealId)
      .select('*')
      .single();

    console.log("updateDeal(): Supabase returned => data:", updatedDeal, "error:", updateError);
    if (updateError) throw updateError;

    console.log("updateDeal() success =>", updatedDeal);
    return updatedDeal;
  } catch (err) {
    console.error("updateDeal() unhandled error:", err);
    throw err;
  }
};
