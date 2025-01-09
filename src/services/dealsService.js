// src/services/dealsService.js
import { supabase } from "../supabaseClient";

/**
 * createDeal => inserts a new row into 'deals' WITHOUT share_link,
 * then updates that same row with share_link.
 */
export const createDeal = async ({
  creator_id,
  title,
  background,
  creatorName,
  deal_value,
  description,
}) => {
  console.log("[createDeal] => incoming payload:", {
    creator_id,
    title,
    background,
    creatorName,
    deal_value,
    description,
  });

  try {
    // 1) Insert row
    const { data: insertedDeal, error: insertError } = await supabase
      .from("deals")
      .insert([
        {
          creator_id,
          title,
          background,       // must match DB column
          deal_value,       // must match DB column
          description,      // optional
        },
      ])
      .select("*")
      .single();

    console.log("[createDeal] => insertedDeal:", insertedDeal, "error:", insertError);
    if (insertError) throw insertError;
    if (!insertedDeal || !insertedDeal.id) {
      throw new Error("Unable to create deal or missing deal.id");
    }

    // 2) Build share_link
    const baseUrl = process.env.REACT_APP_DOMAIN || "https://and.deals";
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

    console.log("[createDeal] => updatedDeal with share_link:", updatedDeal, "error:", updateError);
    if (updateError) throw updateError;

    return updatedDeal;
  } catch (err) {
    console.error("createDeal() unhandled error:", err);
    throw err;
  }
};

/**
 * updateDeal => updates an existing row in 'deals' by dealId.
 * We do NOT regenerate the share_link unless specifically requested.
 */
export const updateDeal = async ({
  dealId,
  title,
  background,
  deal_value,
  description,
}) => {
  console.log("[updateDeal] => incoming payload:", {
    dealId,
    title,
    background,
    deal_value,
    description,
  });

  try {
    const { data: updatedDeal, error } = await supabase
      .from("deals")
      .update({
        title,
        background,    // must match DB column
        deal_value,    // must match DB column
        description,   // optional
      })
      .eq("id", dealId)
      .select("*")
      .single();

    console.log("[updateDeal] => updatedDeal:", updatedDeal, "error:", error);
    if (error) throw error;
    return updatedDeal;
  } catch (err) {
    console.error("updateDeal() unhandled error:", err);
    throw err;
  }
};
