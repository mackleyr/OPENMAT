import React, { useEffect, useMemo, useState } from "react";
import {
  createStripeConnectLink,
  createUser,
  getPublicProfile,
  getSessions,
  getStripeStatus,
  initSession,
  redeemSession,
  trackEvent,
  PublicProfileResponse,
  SessionSummary,
  StripeStatusResponse,
} from "./api";
import "./styles.css";

const HOST_ID_KEY = "openmat_host_user_id";

const parseHandle = () => {
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);
  return segments[0] || "mackley";
};

const formatMoney = (cents: number | null) => {
  if (cents == null) return "$0";
  return `$${(cents / 100).toFixed(0)}`;
};

const formatAmountInput = (value: string) => value.replace(/[^0-9.]/g, "");

const App = () => {
  const [handle, setHandle] = useState(parseHandle());
  const [profile, setProfile] = useState<PublicProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [initMessage, setInitMessage] = useState<string | null>(null);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageStatus, setMessageStatus] = useState<string | null>(null);

  const [hostUserId, setHostUserId] = useState<number | null>(null);
  const [hostSessions, setHostSessions] = useState<SessionSummary[]>([]);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);

  const hostMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("host") === "1" || Boolean(hostUserId);
  }, [hostUserId]);

  useEffect(() => {
    const handlePop = () => setHandle(parseHandle());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const userId = params.get("user_id");
    if (userId) {
      const parsed = Number(userId);
      if (Number.isFinite(parsed)) {
        localStorage.setItem(HOST_ID_KEY, String(parsed));
        setHostUserId(parsed);
      }
    }
    if (connected) {
      params.delete("connected");
      params.delete("user_id");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(HOST_ID_KEY);
    if (stored && Number.isFinite(Number(stored))) {
      setHostUserId(Number(stored));
    }
  }, []);

  const loadProfile = async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const data = await getPublicProfile(handle);
      setProfile(data);
      if (!amountInput) {
        const fallback = data.last_paid_amount_cents ?? 5000;
        setAmountInput((fallback / 100).toFixed(0));
      }
    } catch (error) {
      setProfileError("Unable to load profile.");
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [handle]);

  useEffect(() => {
    if (!hostUserId) return;
    getStripeStatus(hostUserId)
      .then(setStripeStatus)
      .catch(() => setStripeStatus(null));
  }, [hostUserId]);

  const stripeConnected =
    stripeStatus?.charges_enabled || stripeStatus?.payouts_enabled || stripeStatus?.details_submitted;

  const loadHostSessions = async () => {
    if (!hostUserId) return;
    setHostLoading(true);
    setHostError(null);
    try {
      const response = await getSessions(hostUserId, "pending");
      setHostSessions(response.sessions);
    } catch (error) {
      setHostError("Unable to load pending sessions.");
    } finally {
      setHostLoading(false);
    }
  };

  useEffect(() => {
    if (hostMode && hostUserId && stripeConnected) {
      void loadHostSessions();
    }
  }, [hostMode, hostUserId, stripeConnected]);

  const lastPaid = profile?.last_paid_amount_cents ?? null;

  const handleOpenSheet = () => {
    setInitMessage(null);
    setInitError(null);
    if (!amountInput && lastPaid != null) {
      setAmountInput((lastPaid / 100).toFixed(0));
    }
    setSheetOpen(true);
  };

  const handleInitSession = async () => {
    setInitError(null);
    setInitMessage(null);
    const raw = Number(amountInput);
    if (!Number.isFinite(raw) || raw < 0) {
      setInitError("Enter a valid amount.");
      return;
    }
    const amountCents = Math.round(raw * 100);
    try {
      const response = await initSession({ host_handle: handle, amount_cents: amountCents });
      if (response.checkout_url && amountCents > 0) {
        window.location.href = response.checkout_url;
        return;
      }
      setInitMessage("You’re set. Payment completes when you meet.");
      setSheetOpen(false);
      void loadProfile();
    } catch (error: any) {
      if (String(error?.message || "").includes("host_not_connected")) {
        setInitError("Mackley hasn’t connected Stripe yet.");
      } else {
        setInitError("Unable to start the session.");
      }
    }
  };

  const handleConnectStripe = async () => {
    let userId = hostUserId;
    if (!userId) {
      try {
        const created = await createUser({ name: handle, username: handle, role: "creator" });
        userId = created.user.id;
      } catch {
        userId = profile?.user.id ?? null;
      }
      if (!userId) {
        setHostError("Unable to create host profile.");
        return;
      }
      localStorage.setItem(HOST_ID_KEY, String(userId));
      setHostUserId(userId);
    }
    const { url } = await createStripeConnectLink(userId);
    window.location.href = url;
  };

  const handleRedeem = async (sessionId: number) => {
    if (!hostUserId) return;
    setHostError(null);
    try {
      await redeemSession(sessionId, hostUserId);
      await loadHostSessions();
      await loadProfile();
    } catch (error) {
      setHostError("Unable to confirm right now.");
    }
  };

  const handleSendMessage = async () => {
    if (!profile?.user.id) return;
    if (!messageText.trim()) {
      setMessageStatus("Enter a message first.");
      return;
    }
    try {
      await trackEvent({
        user_id: profile.user.id,
        type: "MESSAGE_SENT",
        ref_id: null,
        metadata: { message: messageText.trim() },
      });
      setMessageStatus("Sent.");
      setMessageText("");
      setTimeout(() => setMessageOpen(false), 600);
    } catch {
      setMessageStatus("Unable to send.");
    }
  };

  const showPaidBanner = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("paid") === "1";
  }, [handle]);

  return (
    <div className="page">
      <header className="nav">
        <div className="nav-left">
          <div className="logo">OPENMAT</div>
          <div className="slug">/{handle}</div>
        </div>
        <div className="nav-actions">
          <button className="button ghost" type="button" onClick={() => setMessageOpen(true)}>
            Message
          </button>
        </div>
      </header>

      {showPaidBanner ? <div className="notice">Payment received. Confirm when you meet.</div> : null}
      {initMessage ? <div className="notice">{initMessage}</div> : null}

      <section className="card profile-card">
        <div className="profile-header">
          {profile?.user.photo_url ? (
            <img className="avatar" src={profile.user.photo_url} alt={profile.user.name} />
          ) : (
            <div className="avatar" />
          )}
          <div>
            <div className="profile-name">{profile?.user.name || handle}</div>
            <div className="profile-role">Personal trainer · South Suburban Rec</div>
          </div>
        </div>
        <div className="last-paid">
          <div className="last-label">Last paid</div>
          <div className="last-amount">{formatMoney(lastPaid)}</div>
        </div>
        <button className="button primary" type="button" onClick={handleOpenSheet}>
          Pay {profile?.user.name || handle}
        </button>
      </section>

      <section className="card ledger">
        <div className="card-title">Proof of redeemed sessions</div>
        {loadingProfile ? <div className="muted">Loading ledger…</div> : null}
        {profileError ? <div className="error-text">{profileError}</div> : null}
        {profile?.redeemed_public_sessions?.length ? (
          <div className="ledger-list">
            {profile.redeemed_public_sessions.map((session) => (
              <div key={session.id} className="ledger-row">
                <div>
                  <div className="ledger-amount">{formatMoney(session.amount_cents)}</div>
                  <div className="muted">{session.redeemed_at ? new Date(session.redeemed_at).toDateString() : ""}</div>
                </div>
                <div className="ledger-proof">Redeemed</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted">No redeemed sessions yet.</div>
        )}
      </section>

      {hostMode ? (
        <section className="card host-panel">
          <div className="card-title">Host</div>
          {!hostUserId || !stripeConnected ? (
            <>
              <div className="muted">Connect Stripe to confirm sessions.</div>
              <button className="button primary" type="button" onClick={handleConnectStripe}>
                Connect Stripe
              </button>
            </>
          ) : (
            <>
              <div className="muted">Pending sessions</div>
              {hostLoading ? <div className="muted">Loading…</div> : null}
              {hostError ? <div className="error-text">{hostError}</div> : null}
              {hostSessions.length ? (
                <div className="session-list">
                  {hostSessions.map((session) => (
                    <div key={session.id} className="session-row">
                      <div>
                        <div className="session-amount">{formatMoney(session.price_cents)}</div>
                        <div className="muted">{session.guest_name || "Guest"}</div>
                      </div>
                      <button
                        className="button primary"
                        type="button"
                        onClick={() => handleRedeem(session.id)}
                      >
                        Confirm in person
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted">No pending sessions.</div>
              )}
            </>
          )}
        </section>
      ) : null}

      {sheetOpen ? (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-title">Set your amount</div>
            <label className="field">
              Amount (USD)
              <input
                value={amountInput}
                onChange={(event) => setAmountInput(formatAmountInput(event.target.value))}
                inputMode="decimal"
              />
            </label>
            {initError ? <div className="error-text">{initError}</div> : null}
            <div className="sheet-actions">
              <button className="button ghost" type="button" onClick={() => setSheetOpen(false)}>
                Cancel
              </button>
              <button className="button primary" type="button" onClick={handleInitSession}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {messageOpen ? (
        <div className="sheet-backdrop" onClick={() => setMessageOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-title">Message {profile?.user.name || handle}</div>
            <label className="field">
              Message
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
              />
            </label>
            {messageStatus ? <div className="muted">{messageStatus}</div> : null}
            <div className="sheet-actions">
              <button className="button ghost" type="button" onClick={() => setMessageOpen(false)}>
                Close
              </button>
              <button className="button primary" type="button" onClick={handleSendMessage}>
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer className="footer">
        OPENMAT is a public ledger of real-world work. Proof creates demand.
      </footer>
    </div>
  );
};

export default App;
