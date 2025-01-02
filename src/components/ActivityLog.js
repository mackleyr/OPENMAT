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

  // Because the global "activities" array might change frequently (real-time),
  // we can also update whenever "activities" changes in ActivityContext:
  // In that case, just do:
  /*
  useEffect(() => {
    if (dealId) {
      setFilteredActivities(getActivitiesByDeal(dealId));
    }
  }, [dealId, getActivitiesByDeal, activities]);
  */
  // But let's keep your approach if it works.

  return (
    <div
      className="flex flex-col flex-1 bg-gray-50 rounded-lg overflow-hidden px-[5%] py-[5%] box-border"
      style={{ height: "100%" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-4">
        <Text type="large" role="primary">
          Activity
        </Text>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto flex-1 space-y-3">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity, index) => {
            // "activity.user" is the joined user object
            const userName = activity.user?.name || "Anonymous";
            const userPhoto = activity.user?.profile_image_url || defaultProfile;

            return (
              <div
                key={activity.id || index}
                className="flex items-center py-4 px-5 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
              >
                {/* Use user.profile_image_url or a default */}
                <Profile
                  src={userPhoto}
                  altText={`${userName}'s profile`}
                  size={50}
                  onClick={onProfileClick}
                />
                <div className="flex-1 ml-4">
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
            No action? Share your link.
          </Text>
        )}
      </div>
    </div>
  );
}

export default ActivityLog;
