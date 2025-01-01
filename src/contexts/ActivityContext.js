import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);

  // 1) On mount, fetch all existing activities (or you can filter by current deal or user)
  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false }); // newest first
      if (!error && data) {
        setActivities(data);
      } else {
        console.error("Error fetching initial activities:", error);
      }
    };

    fetchActivities();

    // 2) Realtime subscription to the 'activities' table
    const subscription = supabase
      .channel("activities-channel")               // name your channel
      .on("postgres_changes", {                   // watch for changes
         event: "*",                              // or 'INSERT', 'UPDATE'
         schema: "public",
         table: "activities",
      }, (payload) => {
        // 'payload' has { new, old, eventType }
        if (payload.eventType === "INSERT") {
          const newActivity = payload.new;
          setActivities((prev) => [newActivity, ...prev]);
        }
        // if you handle UPDATES, etc., do that here
      })
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 3) A helper to upsert a new activity to DB (using 'on_conflict' if you want no duplicates)
  const addActivityToDB = async ({
    userId,
    userName,
    userProfile,
    action,
    dealId,
  }) => {
    const { data, error } = await supabase
      .from("activities")
      .upsert(
        [{
          user_id: userId,
          user_name: userName,
          user_profile_url: userProfile,
          action,
          deal_id: dealId,
        }],
        {
          onConflict: "user_id,deal_id,action",
        }
      );
    if (error) {
      console.error("Error upserting activity to DB:", error);
    } else {
      console.log("Successfully upserted activity to DB:", data);
    }
  };

  // 4) Helper queries for filtering
  const getActivitiesByDeal = (dealId) =>
    activities.filter((a) => a.deal_id === dealId);

  const getActivitiesByUser = (userId) =>
    activities.filter((a) => a.user_id === userId);

  return (
    <ActivityContext.Provider
      value={{
        activities,
        addActivityToDB,
        getActivitiesByDeal,
        getActivitiesByUser,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => useContext(ActivityContext);
