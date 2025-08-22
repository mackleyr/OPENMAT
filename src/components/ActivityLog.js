// src/components/ActivityLog.js
import React, { useEffect, useState } from "react";
import { useActivity } from "../contexts/ActivityContext";
import Profile from "./Profile";
import defaultProfile from "../assets/profile.svg";
import Text from "../config/Text";
import { textColors } from "../config/Colors";

function timeAgo(ts) {
  if (!ts) return "";
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function ActivityLog({ onProfileClick, dealId, userId }) {
  const { getActivitiesByDeal, getActivitiesByUser } = useActivity();
  const [filtered, setFiltered] = useState([]);

  useEffect(() => {
    let rows = [];
    if (dealId) rows = getActivitiesByDeal(dealId);
    else if (userId) rows = getActivitiesByUser(userId);
    setFiltered(rows);
  }, [dealId, userId, getActivitiesByDeal, getActivitiesByUser]);

  return (
    <div className="flex flex-col rounded-lg bg-gray-50 w-full h-full overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-300 px-4 py-3">
        <Text type="large" role="primary">Activity</Text>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
        {filtered.length > 0 ? (
          filtered.map((a) => {
            const name = a.donor_name || "Anonymous";
            const photo = a.donor_image || defaultProfile;
            const label = a.type === "give"
              ? `gave $${((a.amount_cents || 0) / 100).toFixed(2)}`
              : (a.action || "did something");

            return (
              <div key={a.id} className="flex items-center py-2 px-3 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150">
                <Profile src={photo} size={40} onClick={onProfileClick} />
                <div className="flex-1 ml-3">
                  <Text type="small">
                    <span onClick={onProfileClick} style={{ cursor: "pointer", color: textColors.primary }}>
                      {name}
                    </span>{" "}
                    {label}{" "}
                    <span style={{ color: textColors.tertiary }}>{timeAgo(a.created_at)}</span>
                  </Text>
                </div>
              </div>
            );
          })
        ) : (
          <Text type="medium" role="tertiary">No action yet. Share your link.</Text>
        )}
      </div>
    </div>
  );
}
