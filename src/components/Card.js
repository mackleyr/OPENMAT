import React from "react";
import CardSide from "./CardSide";
import { useCard } from "../contexts/CardContext";

function Card({
  onCardTap,
  onOpenCardForm,
  onProfileClick,
  isInForm = false,
  cardData: overrideData,
}) {
  const { cardData: globalCardData } = useCard();
  const displayedData = overrideData || globalCardData;

  const handleCardContainerClick = () => {
    if (isInForm) return;

    if (onCardTap) {
      onCardTap();
    } else if (onOpenCardForm) {
      onOpenCardForm(globalCardData);
    }
  };

  return (
    <div
      onClick={handleCardContainerClick}
      className="relative flex flex-col justify-between items-center w-full h-auto bg-white cursor-pointer rounded-lg"
    >
      <CardSide cardData={displayedData} onProfileClick={onProfileClick} />
    </div>
  );
}

export default Card;
