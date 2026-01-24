import React from "react";

export type Event = {
  id: number;
  type: "OFFER_VIEWED" | "OFFER_CLAIMED" | "REDEMPTION_COMPLETED";
  created_at: string;
  actor_name: string | null;
  offer_title: string | null;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

const getEventText = (event: Event) => {
  const actor = event.actor_name || "Someone";
  const offer = event.offer_title || "an offer";

  if (event.type === "OFFER_CLAIMED") {
    return `${actor} claimed ${offer}`;
  }

  if (event.type === "REDEMPTION_COMPLETED") {
    return `${actor} redeemed ${offer}`;
  }

  return `${actor} viewed ${offer}`;
};

const EventRow = ({ event }: { event: Event }) => {
  return (
    <div className="event-row">
      <div className="event-text">{getEventText(event)}</div>
      <div className="event-time">{formatDate(event.created_at)}</div>
    </div>
  );
};

export default EventRow;
