// src/contexts/LocalUserContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const LocalUserContext = createContext(null);

export const LocalUserProvider = ({ children }) => {
  const [localUser, setLocalUser] = useState({
    id: null,
    name: "",
    image_url: "",
  });

  useEffect(() => {
    const storedId = window.localStorage.getItem("userId");
    if (!storedId) return;
    supabase
      .from("profiles")
      .select("id,name,image_url")
      .eq("id", storedId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setLocalUser({
            id: data.id,
            name: data.name || "",
            image_url: data.image_url || "",
          });
        }
      });
  }, []);

  return (
    <LocalUserContext.Provider value={{ localUser, setLocalUser }}>
      {children}
    </LocalUserContext.Provider>
  );
};

export const useLocalUser = () => useContext(LocalUserContext);
