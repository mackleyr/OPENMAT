// src/contexts/ActivityContext.jsx
import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext(null);

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const channelRef = useRef(null);

  const fetchDealActivities = useCallback(async (dealId) => {
    try {
      setActivities([]);

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false });

      if (!error && data) setActivities(data);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(`activities:deal:${dealId}`);
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activities", filter: `deal_id=eq.${dealId}` },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setActivities((prev) => [payload.new, ...prev]);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      console.error("[ActivityContext] fetchDealActivities error:", err);
    }
  }, []);

  const addActivity = async (row) => {
    try {
      await supabase.from("activities").insert([row]);
    } catch (err) {
      console.error("[ActivityContext] addActivity error:", err);
    }
  };

  const getActivitiesByDeal = (dealId) => activities.filter((a) => a.deal_id === dealId);
  const getActivitiesByUser = (userId) => activities.filter((a) => a.user_id === userId);

  return (
    <ActivityContext.Provider
      value={{ activities, fetchDealActivities, addActivity, getActivitiesByDeal, getActivitiesByUser }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
