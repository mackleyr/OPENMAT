// src/contexts/CardContext.jsx

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
    description: "",
    expires: null,
  };

  const [cardData, rawSetCardData] = useState(initialCardData);

  /**
   * debugSetCardData => logs the old/new data so we know who is calling it
   */
  const debugSetCardData = (updater, debugLabel = "UNLABELED_CALL") => {
    rawSetCardData((prev) => {
      const newValue =
        typeof updater === "function" ? updater(prev) : { ...prev, ...updater };

      console.log(
        `[CardContext.debugSetCardData] => ${debugLabel}:\n`,
        "Previous =>",
        prev,
        "\nNew =>",
        newValue
      );
      return newValue;
    });
  };

  const resetCardData = () => {
    console.log("CardContext.resetCardData(): resetting to initial deal data.");
    debugSetCardData(initialCardData, "resetCardData");
  };

  console.log("CardContext: Current cardData:", cardData);

  return (
    <CardContext.Provider
      value={{
        cardData,
        setCardData: debugSetCardData, // we use the debug version
        resetCardData,
      }}
    >
      {children}
    </CardContext.Provider>
  );
};

export const useCard = () => useContext(CardContext);
