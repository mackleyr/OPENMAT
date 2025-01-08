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
    // We only create a share_link here (the first time).
    const baseUrl = process.env.REACT_APP_DOMAIN || "https://and.deals";
    const nameLower = (creatorName || "").toLowerCase().trim();
    const encodedName = encodeURIComponent(nameLower);

    // The "uniqueUrl" is the random slug we append.
    const uniqueUrl = crypto.randomUUID();
    const share_link = `${baseUrl}/share/${encodedName}/${uniqueUrl}`;

    console.log("createDeal(): final share_link =>", share_link);

    const { data: deal, error } = await supabase
      .from("deals")
      .insert([
        {
          creator_id,
          title,
          background,
          share_link,
          deal_value,
        },
      ])
      .select("*")
      .single();

    if (error) throw error;
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
  creatorName,
  deal_value,
  regenLink = false,
}) => {
  try {
    let updates = {
      title,
      background,
      deal_value,
    };

    if (regenLink) {
      // regenerate the link if needed
      const baseUrl = process.env.REACT_APP_DOMAIN || "https://and.deals";
      const nameLower = (creatorName || "").toLowerCase().trim();
      const encodedName = encodeURIComponent(nameLower);

      const uniqueUrl = crypto.randomUUID();
      const newShareLink = `${baseUrl}/share/${encodedName}/${uniqueUrl}`;

      console.log("updateDeal(): re-generated share_link =>", newShareLink);
      updates.share_link = newShareLink;
    }

    const { data: updatedDeal, error } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", dealId)
      .select("*")
      .single();

    if (error) throw error;
    return updatedDeal;
  } catch (err) {
    console.error("updateDeal() unhandled error:", err);
    throw err;
  }
};
