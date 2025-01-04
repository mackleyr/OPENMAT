// src/contexts/ActivityContext.js
import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const channelRef = useRef(null);

  // fetchDealActivities
  const fetchDealActivities = useCallback(async (dealId) => {
    console.log("[ActivityContext] => fetchDealActivities(", dealId, ")...");
    try {
      setActivities([]);

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

      // Realtime subscription
      console.log("[ActivityContext] => Setting up realtime subscription for deal_id=", dealId, "...");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase.channel(`activities-deal-${dealId}`);
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        async (payload) => {
          console.log("[ActivityContext] => Realtime event:", payload.eventType, payload.new);
          if (payload.eventType === "INSERT" && payload.new.deal_id === dealId) {
            console.log("[ActivityContext] => Realtime (INSERT) for this deal:", payload.new);
            const newId = payload.new.id;
            // fetch the joined row
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
      );
      channel.subscribe();
      channelRef.current = channel;
    } catch (err) {
      console.error("[ActivityContext] => fetchDealActivities caught error:", err);
    }
  }, []);

  // addActivity
  const addActivity = async ({ userId, dealId, action }) => {
    console.log("[ActivityContext] => addActivity() called with:", { userId, dealId, action });

    // If there's no valid userId or dealId, skip
    if (!userId || !dealId) {
      console.log("[ActivityContext] => Missing userId or dealId. Skipping insert.");
      return;
    }

    const { data, error } = await supabase
      .from("activities")
      .insert([{ user_id: userId, deal_id: dealId, action }])
      .select("*");

    if (error) {
      console.error("[ActivityContext] => Error inserting activity to DB:", error);
    } else {
      console.log("[ActivityContext] => Inserted activity =>", data);
      // Realtime subscription will pick it up
    }
  };

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
