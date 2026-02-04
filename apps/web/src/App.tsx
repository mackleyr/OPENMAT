import React, { useEffect, useMemo, useState } from "react";
import {
  createStripeConnectLink,
  createUser,
  getPublicProfile,
  getSessions,
  getStripeStatus,
  initSession,
  updateMe,
  redeemSession,
  PublicProfileResponse,
  SessionSummary,
  StripeStatusResponse,
} from "./api";
import "./styles.css";

const HOST_ID_KEY = "openmat_host_user_id";

const parseHandle = () => {
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);
  const raw = segments[0] || "mackley";
  return decodeURIComponent(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
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
  const [activeTab, setActiveTab] = useState<"profile" | "inbox">("profile");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [initError, setInitError] = useState<string | null>(null);
  const [initMessage, setInitMessage] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"name" | "photo" | null>(null);
  const [recentlyConnected, setRecentlyConnected] = useState(false);

  const [hostUserId, setHostUserId] = useState<number | null>(null);
  const [hostSessions, setHostSessions] = useState<SessionSummary[]>([]);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);
  const [publicStripeStatus, setPublicStripeStatus] = useState<StripeStatusResponse | null>(null);

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
      setRecentlyConnected(true);
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

  useEffect(() => {
    if (!profile?.user.id) return;
    getStripeStatus(profile.user.id)
      .then(setPublicStripeStatus)
      .catch(() => setPublicStripeStatus(null));
  }, [profile?.user.id]);

  const stripeConnected =
    stripeStatus?.charges_enabled || stripeStatus?.payouts_enabled || stripeStatus?.details_submitted;

  const publicPaymentsEnabled =
    publicStripeStatus?.charges_enabled && publicStripeStatus?.payouts_enabled ? true : false;

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
  const isViewingOwnProfile =
    hostMode && hostUserId && profile?.user.id && Number(profile.user.id) === hostUserId;
  const canEdit = Boolean(isViewingOwnProfile);
  const nameIsPlaceholder =
    Boolean(profile?.user.name) && profile?.user.name?.trim().toLowerCase() === handle.toLowerCase();
  const showNameField = !onboardingStep || onboardingStep === "name";
  const showPhotoField = !onboardingStep || onboardingStep === "photo";
  const editTitle =
    onboardingStep === "name"
      ? "Confirm your name"
      : onboardingStep === "photo"
        ? "Add your photo"
        : "Edit profile";
  const saveLabel = onboardingStep === "name" ? "Next" : onboardingStep === "photo" ? "Finish" : "Save";

  const openEditSheet = () => {
    if (!canEdit) return;
    setEditName(profile?.user.name || "");
    setEditPhoto(profile?.user.photo_url || "");
    setEditError(null);
    setEditOpen(true);
  };

  useEffect(() => {
    if (!isViewingOwnProfile || !profile?.user.handle) return;
    if (profile.user.handle !== handle) {
      const nextPath = `/${profile.user.handle}`;
      window.history.replaceState({}, "", nextPath);
      setHandle(profile.user.handle);
    }
  }, [isViewingOwnProfile, profile?.user.handle, handle]);

  const closeEditSheet = () => {
    if (onboardingStep) return;
    setEditOpen(false);
  };

  useEffect(() => {
    const shouldOnboard = recentlyConnected || stripeConnected;
    if (!isViewingOwnProfile || !shouldOnboard) {
      setOnboardingStep(null);
      return;
    }
    if (!profile?.user.name || !profile.user.name.trim() || nameIsPlaceholder) {
      setOnboardingStep("name");
    } else if (!profile.user.photo_url) {
      setOnboardingStep("photo");
    } else {
      setOnboardingStep(null);
    }
  }, [
    isViewingOwnProfile,
    stripeConnected,
    recentlyConnected,
    nameIsPlaceholder,
    profile?.user.name,
    profile?.user.photo_url,
  ]);

  useEffect(() => {
    if (!onboardingStep && recentlyConnected) {
      setRecentlyConnected(false);
    }
  }, [onboardingStep, recentlyConnected]);

  useEffect(() => {
    if (!onboardingStep) return;
    if (!editOpen) {
      setEditName(profile?.user.name || "");
      setEditPhoto(profile?.user.photo_url || "");
      setEditError(null);
      setEditOpen(true);
    }
  }, [onboardingStep, editOpen, profile?.user.name, profile?.user.photo_url]);

  useEffect(() => {
    if (onboardingStep) {
      setActiveTab("profile");
    }
  }, [onboardingStep]);

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
      const message = String(error?.message || "");
      if (message.includes("host_not_connected")) {
        setInitError("Mackley hasn’t connected Stripe yet.");
      } else if (message.includes("payments_not_enabled")) {
        setInitError("Payments are not enabled yet.");
      } else {
        setInitError("Unable to start the session.");
      }
    }
  };

  const handleConnectStripe = async () => {
    let userId = hostUserId;
    if (!userId) {
      try {
        const created = await createUser({ name: handle, role: "creator" });
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

  const handleSaveEdit = async () => {
    if (!hostUserId) return;
    setEditSaving(true);
    setEditError(null);
    if (onboardingStep === "name" && !editName.trim()) {
      setEditError("Enter your name.");
      setEditSaving(false);
      return;
    }
    if (onboardingStep === "photo" && !editPhoto.trim()) {
      setEditError("Add a photo URL.");
      setEditSaving(false);
      return;
    }
    const payload: { name?: string; photo_url?: string } = {};
    if (showNameField && editName.trim()) {
      payload.name = editName.trim();
    }
    if (showPhotoField && editPhoto.trim()) {
      payload.photo_url = editPhoto.trim();
    }
    try {
      await updateMe(hostUserId, payload);
      setEditOpen(false);
      await loadProfile();
    } catch (error) {
      setEditError("Unable to update profile.");
    } finally {
      setEditSaving(false);
    }
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

  const showPaidBanner = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("paid") === "1";
  }, [handle]);

  return (
    <div className="stage">
      <div className="phone-shell">
        <div className="phone-notch" />
        <div className="phone-screen">
          <header className="phone-header">
            <div className="logo" aria-label="Openmat" />
            <div className="segmented">
              <button
                className={activeTab === "profile" ? "segment active" : "segment"}
                type="button"
                onClick={() => setActiveTab("profile")}
              >
                Profile
              </button>
              <button
                className={activeTab === "inbox" ? "segment active" : "segment"}
                type="button"
                onClick={() => setActiveTab("inbox")}
              >
                Inbox
              </button>
            </div>
            <div className="header-spacer" />
          </header>

          {showPaidBanner ? <div className="notice">Payment received. Confirm when you meet.</div> : null}
          {initMessage ? <div className="notice">{initMessage}</div> : null}

          {activeTab === "profile" ? (
            <>
              <section
                className={canEdit ? "card profile-card editable" : "card profile-card"}
                onClick={canEdit ? openEditSheet : undefined}
                role={canEdit ? "button" : undefined}
                tabIndex={canEdit ? 0 : -1}
                style={
                  {
                    "--card-bg": profile?.user.photo_url ? `url(${profile.user.photo_url})` : undefined,
                  } as React.CSSProperties
                }
              >
                <div className="profile-card-inner">
                  {profile?.user.photo_url ? (
                    <img className="avatar" src={profile.user.photo_url} alt={profile.user.name} />
                  ) : (
                    <div className="avatar" />
                  )}
                  <div className="profile-name">{profile?.user.name || handle}</div>
                  <div className="last-label">LAST PAID</div>
                  <div className="last-amount">{formatMoney(lastPaid)}</div>
                </div>
              </section>
              <div className="carousel-dots" aria-hidden>
                <span className="dot active" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <button
                className="button primary full"
                type="button"
                onClick={handleOpenSheet}
                disabled={publicStripeStatus ? !publicPaymentsEnabled : false}
              >
                Book session
              </button>
              {publicStripeStatus && !publicPaymentsEnabled ? (
                <div className="muted">Payments not enabled yet.</div>
              ) : null}

              <section className="card ledger">
                <div className="card-title">Activity</div>
                {loadingProfile ? <div className="muted">Loading ledger…</div> : null}
                {profileError ? <div className="error-text">{profileError}</div> : null}
                {profile?.redeemed_public_sessions?.length ? (
                  <div className="ledger-list">
                    {profile.redeemed_public_sessions.map((session) => (
                      <div key={session.id} className="activity-row">
                        <div className="activity-dot" />
                        <div className="activity-body">
                          <div className="activity-title">{formatMoney(session.amount_cents)} redeemed</div>
                          <div className="activity-meta">
                            {session.redeemed_at ? new Date(session.redeemed_at).toDateString() : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">No redeemed sessions yet.</div>
                )}
              </section>
            </>
          ) : (
            <section className="card ledger">
              <div className="card-title">Inbox</div>
              {!hostMode ? (
                <div className="muted">Nothing here yet.</div>
              ) : (
                <>
                  {!hostUserId || !stripeConnected ? (
                    <>
                      <div className="muted">Stripe connection required to confirm sessions.</div>
                      <button className="button primary full" type="button" onClick={handleConnectStripe}>
                        Connect Stripe
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="status-row">
                        <span className={stripeStatus?.charges_enabled && stripeStatus?.payouts_enabled ? "status-good" : "status-warn"}>
                          {stripeStatus?.charges_enabled && stripeStatus?.payouts_enabled
                            ? "Payments enabled"
                            : "Finish Stripe setup"}
                        </span>
                      </div>
                      {hostLoading ? <div className="muted">Loading…</div> : null}
                      {hostError ? <div className="error-text">{hostError}</div> : null}
                      {hostSessions.length ? (
                        <div className="session-list">
                          {hostSessions.map((session) => (
                            <div key={session.id} className="activity-row inbox-row">
                              <div className="activity-dot" />
                              <div className="activity-body">
                                <div className="activity-title">{formatMoney(session.price_cents)}</div>
                                <div className="activity-meta">{session.guest_name || "Guest"}</div>
                              </div>
                              <button
                                className="button primary"
                                type="button"
                                onClick={() => handleRedeem(session.id)}
                              >
                                Confirm
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="muted">No pending sessions.</div>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          )}

          <button className="fab" type="button" onClick={handleOpenSheet}>
            +
          </button>
        </div>
      </div>

      {editOpen ? (
        <div className="sheet-backdrop" onClick={closeEditSheet}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-title">{editTitle}</div>
            {showNameField ? (
              <label className="field">
                Name
                <input value={editName} onChange={(event) => setEditName(event.target.value)} />
              </label>
            ) : null}
            {showPhotoField ? (
              <label className="field">
                Photo URL
                <input
                  value={editPhoto}
                  onChange={(event) => setEditPhoto(event.target.value)}
                  placeholder="https://"
                />
              </label>
            ) : null}
            {editError ? <div className="error-text">{editError}</div> : null}
            <div className="sheet-actions">
              {!onboardingStep ? (
                <button className="button ghost" type="button" onClick={closeEditSheet}>
                  Cancel
                </button>
              ) : null}
              <button className="button primary" type="button" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? "Saving…" : saveLabel}
              </button>
            </div>
          </div>
        </div>
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

    </div>
  );
};

export default App;
