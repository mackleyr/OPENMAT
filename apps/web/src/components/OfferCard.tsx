import React from "react";

export type Offer = {
  id: number;
  title: string;
  price_cents: number;
  capacity: number;
  claimed_count: number;
  created_at: string;
};

const CENTS_PER_DOLLAR = 100;

const formatPrice = (cents: number) => {
  const dollars = cents / CENTS_PER_DOLLAR;
  if (cents % CENTS_PER_DOLLAR === 0) {
    return `$${dollars.toFixed(0)}`;
  }
  return `$${dollars.toFixed(2)}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const OfferCard = ({ offer }: { offer: Offer }) => {
  return (
    <article className="card offer-card">
      <div className="offer-header">
        <h3>{offer.title}</h3>
        <span className="pill">{formatPrice(offer.price_cents)}</span>
      </div>
      <div className="offer-meta">Capacity: {offer.capacity}</div>
      <div className="offer-meta">Claimed: {offer.claimed_count}</div>
      <div className="offer-meta">Created: {formatDate(offer.created_at)}</div>
    </article>
  );
};

export default OfferCard;
