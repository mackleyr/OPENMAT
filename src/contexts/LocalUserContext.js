// src/contexts/LocalUserContext.js
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { API_BASE } from "../config/Creator";

// Tiny polyfill if uuid isn't installed for some reason
function fallbackUuid() {
  try { return uuidv4(); } catch {
    // rudimentary fallback
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
}

const LS_KEY = "openmat.local_user";

const LocalUserContext = createContext({
  localUser: null,
  setLocalUser: () => {},
});

export function LocalUserProvider({ children }) {
  const [localUser, setLocalUserState] = useState(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });

  // Ensure we always have a stable id
  useEffect(() => {
    if (!localUser?.id) {
      const next = { id: fallbackUuid(), ...(localUser || {}) };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      setLocalUserState(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocalUser = useCallback((updater) => {
    setLocalUserState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const withId = next?.id ? next : { ...next, id: prev?.id || fallbackUuid() };
      localStorage.setItem(LS_KEY, JSON.stringify(withId));
      return withId;
    });
  }, []);

  // Hydrate from API if we have an id but no profile fields
  const hydratedRef = useRef(false);
  useEffect(() => {
    (async () => {
      if (hydratedRef.current) return;
      const id = localUser?.id;
      if (!id) return;

      // If we already have name+image_url, skip hydrate
      if (localUser?.name && localUser?.image_url) {
        hydratedRef.current = true;
        return;
      }

      try {
        const r = await fetch(`${API_BASE}/api/profile/get?id=${encodeURIComponent(id)}`);
        const j = await r.json();
        if (j?.ok && j.profile) {
          setLocalUser((prev) => ({ ...prev, ...j.profile }));
        }
      } catch (e) {
        // silent
      } finally {
        hydratedRef.current = true;
      }
    })();
  }, [localUser?.id, localUser?.name, localUser?.image_url, setLocalUser]);

  // Auto-save to API whenever we have id + name + image_url
  useEffect(() => {
    (async () => {
      const { id, name, image_url } = localUser || {};
      if (!id || !name || !image_url) return;
      try {
        await fetch(`${API_BASE}/api/profile/upsert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name, image_url }),
        });
      } catch {
        /* ignore; we’ll retry on next change */
      }
    })();
  }, [localUser?.id, localUser?.name, localUser?.image_url]);

  return (
    <LocalUserContext.Provider value={{ localUser, setLocalUser }}>
      {children}
    </LocalUserContext.Provider>
  );
}

export function useLocalUser() {
  return useContext(LocalUserContext);
}
