// src/contexts/CardContext.jsx
import React, { createContext, useState, useContext } from 'react';

const CardContext = createContext();

export const CardProvider = ({ children }) => {
  const initialCardData = {
    id: null,
    title: '',
    expires: null,
    name: '',
    profilePhoto: '',
    image: null,
    value: '',
    phone: '',
    description: '',
    share_link: '',
  };

  const [cardData, setCardData] = useState(initialCardData);

  const resetCardData = () => {
    console.log("CardContext.resetCardData(): Resetting card data to initial.");
    setCardData(initialCardData);
  };

  console.log("CardContext: Current cardData:", cardData);

  return (
    <CardContext.Provider value={{ cardData, setCardData, resetCardData }}>
      {children}
    </CardContext.Provider>
  );
};

export const useCard = () => useContext(CardContext);
