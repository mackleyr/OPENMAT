import React from "react";

export type Offer = {
  id: number;
  creator_id: number;
  title: string;
  price_cents: number;
  deposit_cents: number;
  capacity: number;
  location_text: string;
  description: string;
  image_url: string | null;
  created_at: string;
};

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(0)}`;

const OfferCard = ({ offer }: { offer: Offer }) => {
  return (
    <article className="offer-card">
      <div className="offer-media hero">
        {offer.image_url ? <img src={offer.image_url} alt={offer.title} /> : <div className="offer-media-placeholder" />}
      </div>
      <div className="offer-title-row">
        <h3>{offer.title || "Untitled offer"}</h3>
        <div className="price-pill">{formatMoney(offer.price_cents)}</div>
      </div>
      <div className="offer-meta">{offer.location_text}</div>
      <div className="offer-meta">Upfront deposit: {formatMoney(offer.deposit_cents)}</div>
      {offer.description ? <div className="description-input">{offer.description}</div> : null}
    </article>
  );
};

export default OfferCard;
