// src/services/dealsService.js
import { supabase } from "../supabaseClient";

/**
 * createDeal => inserts a new row, then updates share_link
 */
export const createDeal = async ({
  creator_id,
  title,
  background,
  creatorName,
  deal_value,
}) => {
  console.log("[createDeal] => incoming payload:", {
    creator_id,
    title,
    background,
    creatorName,
    deal_value,
  });

  // 1) Insert row
  const { data: insertedDeal, error: insertError } = await supabase
    .from("deals")
    .insert([
      {
        creator_id,
        title,
        background,
        deal_value,

      },
    ])
    .select("*")
    .single();

  if (insertError) throw insertError;
  if (!insertedDeal || !insertedDeal.id) {
    throw new Error("Unable to create deal or missing deal.id");
  }

  // 2) Build share_link
  // Make sure REACT_APP_DOMAIN is set to "https://www.and.deals"
  const baseUrl = process.env.REACT_APP_DOMAIN || "https://www.and.deals";
  const nameLower = (creatorName || "").trim().toLowerCase();
  const encodedName = encodeURIComponent(nameLower);
  const share_link = `${baseUrl}/share/${encodedName}/${insertedDeal.id}`;

  // 3) Update row with share_link
  const { data: updatedDeal, error: updateError } = await supabase
    .from("deals")
    .update({ share_link })
    .eq("id", insertedDeal.id)
    .select("*")
    .single();

  if (updateError) throw updateError;

  return updatedDeal;
};

/**
 * updateDeal => modifies an existing deal
 */
export const updateDeal = async ({ dealId, title, background, deal_value }) => {
  console.log("[updateDeal] =>", { dealId, title, background, deal_value });

  const { data: updatedDeal, error } = await supabase
    .from("deals")
    .update({ title, background, deal_value })
    .eq("id", dealId)
    .select("*")
    .single();

  if (error) throw error;
  return updatedDeal;
};
