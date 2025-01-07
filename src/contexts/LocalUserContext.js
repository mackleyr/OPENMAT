// src/contexts/LocalUserContext.jsx

import React, { createContext, useContext, useState } from "react";

const LocalUserContext = createContext();

export const LocalUserProvider = ({ children }) => {
  const initialLocalUser = {
    id: null,
    phone: "",
    name: "",
    profilePhoto: "",
  };

  const [localUser, setLocalUser] = useState(initialLocalUser);

  console.log("[LocalUserContext] => localUser:", localUser);

  return (
    <LocalUserContext.Provider value={{ localUser, setLocalUser }}>
      {children}
    </LocalUserContext.Provider>
  );
};

export const useLocalUser = () => useContext(LocalUserContext);
