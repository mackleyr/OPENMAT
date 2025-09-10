// src/components/ActivityLog.jsx
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

export default function ActivityLog({ onProfileClick, dealId, offerId }) {
  const { getActivitiesByDeal, getActivitiesByOffer } = useActivity();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const data = offerId ? getActivitiesByOffer(offerId) : getActivitiesByDeal(dealId);
    setRows(data);
  }, [dealId, offerId, getActivitiesByDeal, getActivitiesByOffer]);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50 w-full rounded-lg overflow-hidden">
      <div
        id="activity-scroll"
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        <div className="sticky top-0 z-10">
          <div className="px-4 py-3 border-b border-gray-300 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70">
            <Text type="large" role="primary">Activity</Text>
          </div>
        </div>

        <div className="px-4 pt-3 pb-4 space-y-3">
          {rows.length > 0 ? (
            rows.map((a) => {
              const name = a.donor_name || "Anonymous";
              const photo = a.donor_image || defaultProfile;
              const label =
                a.type === "claim" || a.action === "claimed"
                  ? "claimed"
                  : a.type === "give"
                  ? `gave $${((a.amount_cents || 0) / 100).toFixed(2)}`
                  : a.action || "did something";

              return (
                <div
                  key={a.id}
                  className="flex items-center py-2 px-3 rounded-lg border border-transparent hover:bg-gray-100 hover:border-gray-300 transition-all duration-150"
                >
                  <Profile src={photo} size={40} onClick={onProfileClick} />
                  <div className="flex-1 ml-3">
                    <Text type="small">
                      <span
                        onClick={onProfileClick}
                        style={{ cursor: "pointer", color: textColors.primary }}
                      >
                        {name}
                      </span>{" "}
                      {label}{" "}
                      <span style={{ color: textColors.tertiary }}>{timeAgo(a.created_at)}</span>
                      {a.receipt_url && (
                        <>
                          {" "}
                          <a
                            href={a.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: textColors.secondary, textDecoration: "underline" }}
                          >
                            receipt
                          </a>
                        </>
                      )}
                    </Text>
                  </div>
                </div>
              );
            })
          ) : (
            <Text type="medium" role="tertiary">Share your link.</Text>
          )}
        </div>
      </div>
    </div>
  );
}
