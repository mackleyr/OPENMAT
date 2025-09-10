// src/contexts/ActivityContext.jsx
import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext(null);

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const channelRef = useRef(null);

  const fetchActivities = useCallback(async ({ dealId, offerId } = {}) => {
    try {
      setActivities([]);

      let q = supabase.from("activities").select("*").order("created_at", { ascending: false });
      if (offerId) q = q.eq("offer_id", offerId);
      else if (dealId) q = q.eq("deal_id", dealId);

      const { data, error } = await q;
      if (!error && data) setActivities(data);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const topic = offerId ? `offer:${offerId}` : `deal:${dealId}`;
      const filter = offerId ? `offer_id=eq.${offerId}` : `deal_id=eq.${dealId}`;

      const channel = supabase.channel(`activities:${topic}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activities", filter },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setActivities((prev) => [payload.new, ...prev]);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      console.error("[ActivityContext] fetchActivities error:", err);
    }
  }, []);

  const getActivitiesByOffer = (offerId) => activities.filter((a) => a.offer_id === offerId);
  const getActivitiesByDeal  = (dealId)  => activities.filter((a) => a.deal_id  === dealId);

  return (
    <ActivityContext.Provider value={{ activities, fetchActivities, getActivitiesByDeal, getActivitiesByOffer }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
