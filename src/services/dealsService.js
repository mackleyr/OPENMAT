// src/services/dealsService.js

import { supabase } from "../supabaseClient";

export const createDeal = async ({
  creator_id,
  title,
  background,
  creatorName,
  deal_value,
}) => {
  try {
    // 1) Insert the row WITHOUT share_link
    const { data: insertedDeal, error: insertError } = await supabase
      .from("deals")
      .insert([
        {
          creator_id,
          title,
          background,
          deal_value,
          // no share_link yet
        },
      ])
      .select("*")
      .single();

    if (insertError) throw insertError;
    if (!insertedDeal || !insertedDeal.id) {
      throw new Error("Unable to create deal or missing deal.id");
    }

    // 2) Build the share_link using insertedDeal.id
    const baseUrl = process.env.REACT_APP_DOMAIN || "https://and.deals";
    const nameLower = (creatorName || "").toLowerCase().trim();
    const encodedName = encodeURIComponent(nameLower);

    // Use the row's UUID as slug
    const share_link = `${baseUrl}/share/${encodedName}/${insertedDeal.id}`;

    // 3) Update that same row with share_link
    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update({ share_link })
      .eq("id", insertedDeal.id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    // Return the final record (with share_link)
    return updatedDeal;
  } catch (err) {
    console.error("createDeal() unhandled error:", err);
    throw err;
  }
};
