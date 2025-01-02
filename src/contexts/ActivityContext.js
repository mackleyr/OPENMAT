// src/contexts/ActivityContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivities = async () => {
      console.log("[ActivityContext] => Fetching initial activities...");

      // 1) Fetch all existing rows, including user join
      const { data, error } = await supabase
        .from("activities")
        .select(`
          *,
          user:users (
            name,
            profile_image_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ActivityContext] => Error fetching initial activities:", error);
      } else {
        console.log("[ActivityContext] => Successfully fetched activities:", data);
        setActivities(data || []);
      }
    };

    fetchActivities();

    // 2) Real-time subscription: watch for INSERT, no local duplicate
    console.log("[ActivityContext] => Setting up realtime subscription for 'activities'...");
    const subscription = supabase
      .channel("activities-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
        },
        async (payload) => {
          console.log("[ActivityContext] => Realtime payload:", payload);
          if (payload.eventType === "INSERT") {
            // 3) Just fetch that single row (with user join)
            const newId = payload.new.id;
            const { data: joinedRow, error: joinError } = await supabase
              .from("activities")
              .select(`
                *,
                user:users (
                  name,
                  profile_image_url
                )
              `)
              .eq("id", newId)
              .single();

            if (!joinError && joinedRow) {
              console.log("[ActivityContext] => Joined new activity =>", joinedRow);
              // 4) Prepend to local activities
              setActivities((prev) => [joinedRow, ...prev]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[ActivityContext] => Removing realtime subscription for 'activities'...");
      supabase.removeChannel(subscription);
    };
  }, []);

  /**
   * addActivity => Insert a minimal row: { user_id, deal_id, action }.
   * We rely purely on Realtime to display the new row => no duplication.
   */
  const addActivity = async ({ userId, dealId, action }) => {
    console.log("[ActivityContext] => addActivity() called with:", {
      userId,
      dealId,
      action,
    });

    // Insert row with no .select(...) => data will likely be []
    const { data, error } = await supabase
      .from("activities")
      .insert([{ user_id: userId, deal_id: dealId, action }]);

    if (error) {
      console.error("[ActivityContext] => Error inserting activity to DB:", error);
    } else {
      console.log("[ActivityContext] => Inserted activity =>", data);
      // No local setState => let Realtime handle it
    }
  };

  // Filter by deal ID
  const getActivitiesByDeal = (dealId) => {
    const matching = activities.filter((a) => a.deal_id === dealId);
    console.log("[ActivityContext] => getActivitiesByDeal() =>", { dealId, matching });
    return matching;
  };

  // Filter by user
  const getActivitiesByUser = (userId) => {
    const matching = activities.filter((a) => a.user_id === userId);
    console.log("[ActivityContext] => getActivitiesByUser() =>", { userId, matching });
    return matching;
  };

  return (
    <ActivityContext.Provider
      value={{
        activities,
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
