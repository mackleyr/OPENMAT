// src/components/Card.jsx

import React from 'react';
import CardSide from './CardSide';
import { useCard } from '../contexts/CardContext';

function Card({ onOpenCardForm, isInForm = false, cardData: overrideData }) {
  // If overrideData is provided, use it; else use globalCardData
  const { cardData: globalCardData } = useCard();
  const displayedData = overrideData || globalCardData;

  const handleClick = () => {
    if (!isInForm && onOpenCardForm) {
      onOpenCardForm(globalCardData);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative flex flex-col justify-between items-center w-full h-auto bg-white cursor-pointer rounded-lg"
      style={{
        boxSizing: 'border-box',
      }}
    >
      <CardSide cardData={displayedData} />
    </div>
  );
}

export default Card;
