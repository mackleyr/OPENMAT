// src/contexts/ActivityContext.js

import React, { createContext, useContext, useState } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);

  /**
   * Called by TheRealDeal (or any screen) once we know dealId.
   * We fetch all existing rows for that deal, then set up a realtime channel
   * specifically for that deal’s inserts.
   */
  const fetchDealActivities = async (dealId) => {
    console.log(`[ActivityContext] => fetchDealActivities(${dealId})...`);

    // 1) Clear out old activities or append? Typically, you'd reset:
    setActivities([]);

    // 2) Fetch just that deal’s rows
    const { data, error } = await supabase
      .from("activities")
      .select(
        `
          *,
          user:users (
            name,
            profile_image_url
          )
        `
      )
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ActivityContext] => Error fetching deal’s activities:", error);
    } else {
      console.log("[ActivityContext] => Successfully fetched deal’s activities:", data);
      setActivities(data || []);
    }

    // 3) Set up a channel listening only for new inserts in "activities"
    // We'll do simple client-side filtering for the matching deal_id.
    console.log(
      `[ActivityContext] => Setting up realtime subscription for deal_id=${dealId}...`
    );

    const channel = supabase.channel(`activities-deal-${dealId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "activities",
      },
      async (payload) => {
        if (payload.eventType === "INSERT") {
          // Check if the inserted row belongs to *this* deal
          if (payload.new.deal_id === dealId) {
            console.log("[ActivityContext] => Realtime (INSERT) for this deal:", payload.new);
            // fetch the single row with user join
            const newId = payload.new.id;
            const { data: joinedRow, error: joinError } = await supabase
              .from("activities")
              .select(
                `
                  *,
                  user:users (
                    name,
                    profile_image_url
                  )
                `
              )
              .eq("id", newId)
              .single();
            if (!joinError && joinedRow) {
              console.log("[ActivityContext] => Joined new activity =>", joinedRow);
              setActivities((prev) => [joinedRow, ...prev]);
            }
          }
        }
      }
    );

    channel.subscribe();
  };

  /**
   * Insert a new row => rely on Realtime to update the UI
   */
  const addActivity = async ({ userId, dealId, action }) => {
    console.log("[ActivityContext] => addActivity() called with:", {
      userId,
      dealId,
      action,
    });

    const { data, error } = await supabase
      .from("activities")
      .insert([{ user_id: userId, deal_id: dealId, action }]);

    if (error) {
      console.error("[ActivityContext] => Error inserting activity to DB:", error);
    } else {
      console.log("[ActivityContext] => Inserted activity =>", data);
    }
  };

  // For convenience, local filtering
  const getActivitiesByDeal = (dealId) => {
    return activities.filter((a) => a.deal_id === dealId);
  };

  const getActivitiesByUser = (userId) => {
    return activities.filter((a) => a.user_id === userId);
  };

  return (
    <ActivityContext.Provider
      value={{
        activities,
        fetchDealActivities,
        addActivity,
        getActivitiesByDeal,
        getActivitiesByUser,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
