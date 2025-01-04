import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const channelRef = useRef(null);

  /**
   * 1) fetchDealActivities – calls Supabase to get all activity logs for a given dealId.
   *    We also set up a realtime subscription once per dealId.
   */
  const fetchDealActivities = useCallback(async (dealId) => {
    console.log("[ActivityContext] => fetchDealActivities(", dealId, ")...");

    try {
      // Clear out old activities
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
        // remove previous subscription if it exists
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
            console.log(
              "[ActivityContext] => Realtime (INSERT) for this deal:",
              payload.new
            );
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

  /**
   * 2) addActivity – Insert a row in the "activities" table
   *    We assume userId is a valid UUID if user is known. If unknown, skip or handle differently.
   */
  const addActivity = async ({ userId, dealId, action }) => {
    console.log("[ActivityContext] => addActivity() called with:", { userId, dealId, action });

    // If there's no userId, we skip. (We removed "someone" logic.)
    if (!userId || userId === "someone") {
      console.log("[ActivityContext] => No valid userId provided. Skipping insert.");
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
      // The real-time subscription will pick it up as well.
    }
  };

  /**
   * 3) getActivitiesByDeal
   */
  const getActivitiesByDeal = (dealId) => {
    return activities.filter((a) => a.deal_id === dealId);
  };

  /**
   * 4) getActivitiesByUser
   */
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
