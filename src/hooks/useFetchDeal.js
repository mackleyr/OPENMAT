// src/hooks/useFetchDeal.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

/**
 *  A custom hook to fetch a deal either by shareLink or dealId.
 *  Optionally auto-fetch on mount if you pass initialShareLink or initialDealId.
 */
export function useFetchDeal({ initialShareLink, initialDealId } = {}) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dealError, setDealError] = useState(null);

  const fetchDeal = useCallback(
    async ({ shareLink, dealId } = {}) => {
      setLoading(true);
      setDealError(null);
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

        // If we have a shareLink, query .eq("share_link", shareLink)
        if (shareLink) {
          query = query.eq("share_link", shareLink);
        }
        // If we have an id, query .eq("id", dealId)
        if (dealId) {
          query = query.eq("id", dealId);
        }

        const { data: dealRow, error } = await query;

        if (error) {
          throw error;
        }
        if (!dealRow) {
          setDeal(null);
          return;
        }

        const { id, title, background, deal_value, share_link, description, users } = dealRow;
        const normalizedDeal = {
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
        setDeal(normalizedDeal);
      } catch (err) {
        console.error("[useFetchDeal]: Error =>", err);
        setDealError(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // On mount, if initialShareLink or initialDealId is provided, fetch automatically
  useEffect(() => {
    if (initialShareLink || initialDealId) {
      fetchDeal({ shareLink: initialShareLink, dealId: initialDealId });
    }
  }, [initialShareLink, initialDealId, fetchDeal]);

  return {
    deal,
    loading,
    error: dealError,
    fetchDeal,
  };
}
