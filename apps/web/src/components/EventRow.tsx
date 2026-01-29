import React from "react";

export type Event = {
  id: number;
  type: string;
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

  if (event.type === "OFFER_CLAIMED") return `${actor} claimed ${offer}`;
  if (event.type === "REDEMPTION_COMPLETED") return `${actor} redeemed ${offer}`;
  if (event.type === "OFFER_VIEWED") return `${actor} viewed ${offer}`;
  if (event.type === "OFFER_CREATED") return `${actor} created ${offer}`;
  if (event.type === "WALLET_SAVED") return `${actor} saved a wallet pass`;
  if (event.type === "REFERRAL_CONVERTED") return `${actor} joined from your link`;
  return `${actor} triggered an event`;
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
