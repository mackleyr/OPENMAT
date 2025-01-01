import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivities = async () => {
      console.log("[ActivityContext] => Fetching initial activities...");

      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ActivityContext] => Error fetching initial activities:", error);
      } else {
        console.log("[ActivityContext] => Successfully fetched activities:", data);
        setActivities(data);
      }
    };

    fetchActivities();

    // Realtime subscription to 'activities' table
    console.log("[ActivityContext] => Setting up realtime subscription for 'activities'...");
    const subscription = supabase
      .channel("activities-channel")
      .on(
        "postgres_changes",
        {
          event: "*", // or 'INSERT', 'UPDATE'
          schema: "public",
          table: "activities",
        },
        (payload) => {
          console.log("[ActivityContext] => Realtime payload:", payload);

          if (payload.eventType === "INSERT") {
            const newActivity = payload.new;
            console.log("[ActivityContext] => New activity inserted:", newActivity);
            setActivities((prev) => [newActivity, ...prev]);
          }
          // handle UPDATE/DELETE if needed
        }
      )
      .subscribe();

    return () => {
      console.log("[ActivityContext] => Removing realtime subscription for 'activities'...");
      supabase.removeChannel(subscription);
    };
  }, []);

  const addActivity = async ({ userId, userName, userProfile, action, dealId }) => {
    console.log("[ActivityContext] => addActivity() called with:", {
      userId,
      userName,
      userProfile,
      action,
      dealId,
    });

    const { data, error } = await supabase
      .from("activities")
      .upsert(
        [
          {
            user_id: userId,
            user_name: userName,
            user_profile_url: userProfile,
            action,
            deal_id: dealId,
          },
        ],
        { onConflict: "user_id,deal_id,action" }
      );

    if (error) {
      console.error("[ActivityContext] => Error upserting activity to DB:", error);
    } else {
      console.log("[ActivityContext] => Successfully upserted activity to DB:", data);
    }
  };

  const getActivitiesByDeal = (dealId) => {
    const matching = activities.filter((a) => a.deal_id === dealId);
    console.log("[ActivityContext] => getActivitiesByDeal() =>", { dealId, matching });
    return matching;
  };

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