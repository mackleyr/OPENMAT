import React, { createContext, useState, useContext } from "react";

const CardContext = createContext();

export const CardProvider = ({ children }) => {
  const initialCardData = {
    id: null,
    creatorId: null,
    name: "",
    profilePhoto: "",
    title: "",
    value: "",
    image: null,
    share_link: "",
    expires: null,
  };

  const [cardData, rawSetCardData] = useState(initialCardData);

  // logs old/new data so we know who is calling it
  const debugSetCardData = (updater, debugLabel = "UNLABELED_CALL") => {
    rawSetCardData((prev) => {
      const newValue =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      console.log(`[CardContext.debugSetCardData] => label: ${debugLabel}
oldValue:`, prev, `
newValue:`, newValue);
      return newValue;
    });
  };

  const resetCardData = () => {
    console.log("CardContext.resetCardData(): resetting to initial deal data.");
    debugSetCardData(initialCardData, "resetCardData");
  };

  return (
    <CardContext.Provider
      value={{
        cardData,
        setCardData: debugSetCardData, 
        resetCardData,
      }}
    >
      {children}
    </CardContext.Provider>
  );
};

export const useCard = () => useContext(CardContext);
