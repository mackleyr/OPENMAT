// src/components/ActivityLog.jsx
import React, { useEffect, useState } from "react";
import { useActivity } from "../contexts/ActivityContext";
import Profile from "./Profile";
import defaultProfile from "../assets/profile.svg";
import Text from "../config/Text";
import { textColors } from "../config/Colors";

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
  const [filteredActivities, setFilteredActivities] = useState([]);

  useEffect(() => {
    let fetched = [];
    if (dealId) {
      fetched = getActivitiesByDeal(dealId);
    } else if (userId) {
      fetched = getActivitiesByUser(userId);
    }
    setFilteredActivities(fetched);
  }, [dealId, userId, getActivitiesByDeal, getActivitiesByUser]);

  return (
    <div className="flex flex-col rounded-lg bg-gray-50 w-full h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-300 px-4 py-3">
        <Text type="large" role="primary">
          Activity
        </Text>
      </div>

      {/* Scrollable list */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3"
        style={{
          WebkitOverflowScrolling: "touch", // iOS momentum
          touchAction: "pan-y",
        }}
      >
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => {
            const userPhoto = activity.user?.profile_image_url || defaultProfile;
            const userName = activity.user?.name || "Anonymous";
            return (
              <div
                key={activity.id}
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
                      style={{ cursor: "pointer", color: textColors.primary }}
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
