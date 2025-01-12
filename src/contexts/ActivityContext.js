// src/contexts/ActivityContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../supabaseClient";

const ActivityContext = createContext();

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const channelRef = useRef(null);

  // fetchDealActivities => pulls all activities for a deal + sets up realtime
  const fetchDealActivities = useCallback(async (dealId) => {
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

      if (!error && data) {
        setActivities(data);
      }

      // Realtime subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      const channel = supabase.channel(`activities-deal-${dealId}`);
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities" },
        async (payload) => {
          if (payload.eventType === "INSERT" && payload.new.deal_id === dealId) {
            // fetch the inserted row with join
            const { data: joinedRow } = await supabase
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
              .eq("id", payload.new.id)
              .single();
            if (joinedRow) {
              setActivities((prev) => [joinedRow, ...prev]);
            }
          }
        }
      );
      channel.subscribe();
      channelRef.current = channel;
    } catch (err) {
      console.error("[ActivityContext] => fetchDealActivities error:", err);
    }
  }, []);

  // addActivity => inserts a new activity
  const addActivity = async ({ userId, dealId, action }) => {
    try {
      if (!userId || !dealId) return;
      await supabase
        .from("activities")
        .insert([{ user_id: userId, deal_id: dealId, action }]);
      // Realtime will pick it up
    } catch (err) {
      console.error("[ActivityContext] => addActivity error:", err);
    }
  };

  // Utility for filtering
  const getActivitiesByDeal = (dealId) =>
    activities.filter((a) => a.deal_id === dealId);
  const getActivitiesByUser = (userId) =>
    activities.filter((a) => a.user_id === userId);

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
