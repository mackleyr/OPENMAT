// src/components/ActivityLog.jsx

import React, { useEffect, useState } from "react";
import { useActivity } from "../contexts/ActivityContext";
import { useCard } from "../contexts/CardContext";
import Profile from "./Profile";
import defaultProfile from "../assets/profile.svg";
import Text from "../config/Text";
import { textColors } from "../config/Colors";

// Helper function to display "time ago" (m, h, d)
function timeAgo(timestamp) {
  if (!timestamp) return "";
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function ActivityLog({ onProfileClick, dealId, userId }) {
  const { getActivitiesByDeal, getActivitiesByUser } = useActivity();
  const { cardData } = useCard();
  const [filteredActivities, setFilteredActivities] = useState([]);

  useEffect(() => {
    let fetchedActivities = [];
    if (dealId) {
      fetchedActivities = getActivitiesByDeal(dealId);
    } else if (userId) {
      fetchedActivities = getActivitiesByUser(userId);
    }
    setFilteredActivities(fetchedActivities);
  }, [dealId, userId, getActivitiesByDeal, getActivitiesByUser]);

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden box-border bg-gray-50"
      style={{
        /* This container takes up the remaining space in TheRealDeal, 
           so it can scroll inside. */
        flex: 1,
        padding: "1rem",
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex justify-between items-center border-b border-gray-300 pb-4">
        <Text type="large" role="primary">
          Activity
        </Text>
      </div>

      {/* Scrollable Content */}
      <div
        className="flex-1 overflow-y-auto space-y-3 pt-4"
        style={{
          marginRight: "-0.25rem",
          paddingRight: "0.25rem",
          WebkitOverflowScrolling: "touch", // iOS momentum scrolling
          touchAction: "pan-y", // ensure vertical scroll on iOS
        }}
      >
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity, index) => {
            const userName = activity.user?.name || "Anonymous";
            const userPhoto = activity.user?.profile_image_url || defaultProfile;

            return (
              <div
                key={activity.id || index}
                className="flex items-center py-2 px-3 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
              >
                <Profile
                  src={userPhoto}
                  altText={`${userName}'s profile`}
                  size={40}
                  onClick={onProfileClick}
                />
                <div className="flex-1 ml-3">
                  <Text type="small">
                    <span
                      onClick={onProfileClick}
                      style={{
                        cursor: "pointer",
                        color: textColors.primary,
                      }}
                    >
                      {userName}
                    </span>{" "}
                    {activity.action}{" "}
                    <span style={{ color: textColors.tertiary }}>
                      {timeAgo(activity.created_at)}
                    </span>
                  </Text>
                </div>
              </div>
            );
          })
        ) : (
          <Text type="medium" role="tertiary">
            No activity yet. Share your link.
          </Text>
        )}
      </div>
    </div>
  );
}

export default ActivityLog;
