import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

function normalizeDeal(dealRow) {
  if (!dealRow) return null;
  const { id, title, background, deal_value, share_link, description, users } = dealRow;
  return {
    id,
    title,
    image: background,
    value: deal_value,
    description,
    share_link,
    creatorId: users?.id || null,
    creatorName: users?.name || "",
    creatorPhoto: users?.profile_image_url || null,
    creatorPayPalEmail: users?.paypal_email || "",
  };
}

/**
 * A custom hook to fetch a Deal row by shareLink or dealId.
 * If `initialShareLink` or `initialDealId` is provided, it auto-fetches on mount.
 */
export function useFetchDeal({ initialShareLink, initialDealId } = {}) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDeal = useCallback(async ({ shareLink, dealId } = {}) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("deals")
        .select(
          `
            *,
            users!deals_creator_id_fkey (
              id,
              name,
              profile_image_url,
              paypal_email
            )
          `
        )
        .single();

      if (shareLink) {
        query = query.eq("share_link", shareLink);
      } else if (dealId) {
        query = query.eq("id", dealId);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      setDeal(normalizeDeal(data));
    } catch (err) {
      console.error("[useFetchDeal] Error =>", err);
      setError(err);
      setDeal(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount if initialShareLink or initialDealId is provided
  useEffect(() => {
    if (initialShareLink || initialDealId) {
      fetchDeal({ shareLink: initialShareLink, dealId: initialDealId });
    }
  }, [initialShareLink, initialDealId, fetchDeal]);

  return { deal, loading, error, fetchDeal };
}
