// src/components/OfferCard.js
import React from "react";

export default function OfferCard({ offer, onClick }) {
  return (
    <button onClick={onClick} className="text-left">
      <div className="h-36 rounded-xl overflow-hidden bg-gray-100">
        {offer.image_url ? (
          <img src={offer.image_url} alt="" className="w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="mt-2">
        <div className="text-sm font-semibold truncate">{offer.title}</div>
        <div className="text-xs text-gray-500">
          {offer.price_cents > 0 ? `$${(offer.price_cents/100).toFixed(0)}` : "Free"}
        </div>
      </div>
    </button>
  );
}
