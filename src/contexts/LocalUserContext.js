// src/contexts/LocalUserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const LocalUserContext = createContext();

export const LocalUserProvider = ({ children }) => {
  const initialLocalUser = {
    id: null,
    paypalEmail: "",
    name: "",
    profilePhoto: "",
  };

  const [localUser, setLocalUser] = useState(initialLocalUser);

  // Attempt to load user from localStorage
  useEffect(() => {
    const storedId = window.localStorage.getItem("userId");
    if (storedId) {
      supabase
        .from("users")
        .select("*")
        .eq("id", storedId)
        .single()
        .then(({ data: user, error }) => {
          if (!error && user) {
            setLocalUser({
              id: user.id,
              paypalEmail: user.paypal_email,
              name: user.name || "",
              profilePhoto: user.profile_image_url || "",
            });
          }
        });
    }
  }, []);

  return (
    <LocalUserContext.Provider value={{ localUser, setLocalUser }}>
      {children}
    </LocalUserContext.Provider>
  );
};

export const useLocalUser = () => useContext(LocalUserContext);
