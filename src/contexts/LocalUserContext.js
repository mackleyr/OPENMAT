// src/contexts/LocalUserContext.js
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { API_BASE } from "../config/Creator";

function safeUuid() {
  if (typeof crypto?.getRandomValues === "function") {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  try { return uuidv4(); } catch {}
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

const LS_KEY = "openmat.local_user";
const LocalUserContext = createContext({ localUser: null, setLocalUser: () => {} });

export function LocalUserProvider({ children }) {
  const [localUser, setLocalUserState] = useState(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });

  // ensure an id exactly once
  useEffect(() => {
    if (!localUser?.id) {
      const next = { id: safeUuid(), ...(localUser || {}) };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      setLocalUserState(next);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocalUser = useCallback((updater) => {
    setLocalUserState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const withId = next?.id ? next : { ...next, id: prev?.id || safeUuid() };
      localStorage.setItem(LS_KEY, JSON.stringify(withId));
      return withId;
    });
  }, []);

  // one-time hydrate from API if we only have an id
  const hydratedRef = useRef(false);
  const id = localUser?.id;
  const hasProfile = Boolean(localUser?.name && localUser?.image_url);

  useEffect(() => {
    (async () => {
      if (hydratedRef.current || !id || hasProfile) return;
      try {
        const r = await fetch(`${API_BASE}/api/profile/get?id=${encodeURIComponent(id)}`);
        const j = await r.json();
        if (j?.ok && j.profile) setLocalUser((prev) => ({ ...prev, ...j.profile }));
      } catch {}
      hydratedRef.current = true;
    })();
  }, [id, hasProfile, setLocalUser]);

  // persist when we have a full profile
  useEffect(() => {
    if (!localUser) return;
    const { id, name, image_url } = localUser;
    if (!id || !name || !image_url) return;
    (async () => {
      try {
        await fetch(`${API_BASE}/api/profile/upsert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name, image_url }),
        });
      } catch {}
    })();
  }, [localUser]);

  return (
    <LocalUserContext.Provider value={{ localUser, setLocalUser }}>
      {children}
    </LocalUserContext.Provider>
  );
}

export function useLocalUser() {
  return useContext(LocalUserContext);
}
