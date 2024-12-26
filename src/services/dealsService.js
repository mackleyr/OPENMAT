// src/services/dealsService.js
import { supabase } from '../supabaseClient';

export const createDeal = async ({
  creator_id,    // must be a valid UUID
  title,
  background,
  expires_at,
  creatorName,
}) => {
  console.log("createDeal(): Attempting to create deal:", {
    creator_id,
    title,
    background,
    expires_at,
    creatorName
  });

  try {
    const uniqueUrl = crypto.randomUUID();
    const encodedName = encodeURIComponent(creatorName || '');
    const share_link = `https://and.deals/share/${encodedName}/${uniqueUrl}`;

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert([
        { creator_id, title, background, expires_at, share_link }
      ])
      .select('*')
      .single();

    console.log("createDeal(): Supabase returned => data:", deal, "error:", dealError);

    if (dealError) {
      console.error("createDeal() supabase error:", dealError);
      throw dealError;
    }

    console.log("createDeal() success =>", deal);
    return deal;
  } catch (err) {
    console.error("createDeal() unhandled error:", err);
    throw err;
  }
};

export const updateDeal = async ({
  dealId,
  title,
  background,
  expires_at,
  creatorName,
}) => {
  console.log("updateDeal(): Attempting to update deal:", {
    dealId,
    title,
    background,
    expires_at,
    creatorName
  });

  try {
    const uniqueUrl = crypto.randomUUID();
    const encodedName = encodeURIComponent(creatorName);
    const share_link = `https://and.deals/share/${encodedName}/${uniqueUrl}`;

    const { data: updatedDeal, error: updateError } = await supabase
      .from('deals')
      .update({ title, background, expires_at, share_link })
      .eq('id', dealId)
      .select('*')
      .single();

    console.log("updateDeal(): Supabase returned => data:", updatedDeal, "error:", updateError);

    if (updateError) {
      console.error("updateDeal() supabase error:", updateError);
      throw updateError;
    }

    console.log("updateDeal() success =>", updatedDeal);
    return updatedDeal;
  } catch (err) {
    console.error("updateDeal() unhandled error:", err);
    throw err;
  }
};
