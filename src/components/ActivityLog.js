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
  const { getActivitiesByDeal, getActivitiesByUser, activities } = useActivity();
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
  }, [dealId, userId, activities, getActivitiesByDeal, getActivitiesByUser]);

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
          filteredActivities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center py-4 px-5 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
            >
              {/* Use user_profile_url from the DB or default */}
              <Profile
                src={activity.user_profile_url || defaultProfile}
                altText={`${activity.user_name}'s profile`}
                size={50} // Larger profile image
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
                    {activity.user_name}
                  </span>{" "}
                  {activity.action}{" "}
                  <span style={{ color: textColors.tertiary }}>
                    {/* We use activity.created_at for timeAgo */}
                    {timeAgo(activity.created_at)}
                  </span>
                </Text>
              </div>
            </div>
          ))
        ) : (
          <Text type="medium" role="tertiary">
            No action? Share a deal.
          </Text>
        )}
      </div>
    </div>
  );
}

export default ActivityLog;
