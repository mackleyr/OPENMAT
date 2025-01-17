// src/contexts/CardContext.jsx
import React, { createContext, useContext, useState } from "react";

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
  };

  const [cardData, rawSetCardData] = useState(initialCardData);

  const debugSetCardData = (updater, debugLabel = "UNLABELED_CALL") => {
    rawSetCardData((prev) => {
      const newValue =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      console.log(
        `[CardContext.debugSetCardData] => label: ${debugLabel}
oldValue:`,
        prev,
        "\nnewValue:",
        newValue
      );
      return newValue;
    });
  };

  const resetCardData = () => {
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
