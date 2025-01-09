import { supabase } from "../supabaseClient";

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
        },
      ])
      .select("*")
      .single();

    console.log("[createDeal] => insertedDeal:", insertedDeal, "insertError:", insertError);

    if (insertError) throw insertError;
    if (!insertedDeal || !insertedDeal.id) {
      throw new Error("Unable to create deal or missing deal.id");
    }

    // 2) Build the share_link using insertedDeal.id
    const baseUrl = process.env.REACT_APP_DOMAIN || "https://and.deals";
    const nameLower = (creatorName || "").toLowerCase().trim();
    const encodedName = encodeURIComponent(nameLower);
    const share_link = `${baseUrl}/share/${encodedName}/${insertedDeal.id}`;

    // 3) Update that same row with share_link
    const { data: updatedDeal, error: updateError } = await supabase
      .from("deals")
      .update({ share_link })
      .eq("id", insertedDeal.id)
      .select("*")
      .single();

    console.log("[createDeal] => updatedDeal with share_link:", updatedDeal, "updateError:", updateError);

    if (updateError) throw updateError;

    // Return the final record (with share_link)
    return updatedDeal;
  } catch (err) {
    console.error("createDeal() unhandled error:", err);
    throw err;
  }
};

export const updateDeal = async ({
  dealId,
  title,
  background,
  deal_value,
  // We do NOT regenerate share_link by default.
}) => {
  console.log("[updateDeal] => incoming payload:", {
    dealId,
    title,
    background,
    deal_value,
  });
  try {
    const { data: updatedDeal, error } = await supabase
      .from("deals")
      .update({
        title,
        background,
        deal_value,
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
