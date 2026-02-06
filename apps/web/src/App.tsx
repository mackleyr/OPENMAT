import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createStripeConnectLink,
  createUser,
  createOffer,
  createReferral,
  getMe,
  getPublicProfile,
  getSessions,
  getStripeStatus,
  initSession,
  createReferral,
  trackEvent,
  updateMe,
  redeemSession,
  PublicProfileResponse,
  SessionSummary,
  StripeStatusResponse,
} from "./api";
import "./styles.css";

const HOST_ID_KEY = "openmat_host_user_id";
const ONBOARD_KEY = "openmat_onboarding";

type PublicOffer = NonNullable<PublicProfileResponse["offers"]>[number];

const parseHandle = () => {
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "";
  const raw = segments[0];
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [bookOffer, setBookOffer] = useState<PublicOffer | null>(null);
  const [offerSheetOpen, setOfferSheetOpen] = useState(false);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerLocation, setOfferLocation] = useState("");
  const [offerImage, setOfferImage] = useState("");
  const [offerEditingId, setOfferEditingId] = useState<number | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [hostUserId, setHostUserId] = useState<number | null>(null);
  const [hostSessions, setHostSessions] = useState<SessionSummary[]>([]);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);
  const [hostStripeAccount, setHostStripeAccount] = useState(false);
  const [publicStripeStatus, setPublicStripeStatus] = useState<StripeStatusResponse | null>(null);
  const isHome = !handle;
  const carouselRef = useRef<HTMLDivElement | null>(null);

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
    const ref = params.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
    if (userId) {
      const parsed = Number(userId);
      if (Number.isFinite(parsed)) {
        localStorage.setItem(HOST_ID_KEY, String(parsed));
        setHostUserId(parsed);
      }
    }
    if (connected) {
      setRecentlyConnected(true);
      localStorage.setItem(ONBOARD_KEY, "1");
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

  useEffect(() => {
    const onboarding = localStorage.getItem(ONBOARD_KEY);
    if (onboarding) {
      setRecentlyConnected(true);
    }
  }, []);

  const formatLastPaid = () => {
    const lastPaid = profile?.last_paid_amount_cents ?? null;
    if (lastPaid == null) return "";
    return formatMoney(lastPaid);
  };

  const loadProfile = async () => {
    if (!handle) {
      setProfile(null);
      setProfileError(null);
      setLoadingProfile(false);
      return;
    }
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
      if (hostUserId) {
        try {
          const me = await getMe(hostUserId);
          setProfile({
            user: {
              id: me.user.id,
              handle: me.user.username || "",
              name: me.user.name,
              photo_url: me.user.image_url,
            },
            last_paid_amount_cents: null,
            redeemed_public_sessions: [],
            offers: [],
          });
          return;
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, [handle]);

  useEffect(() => {
    const offerCount = profile?.offers?.length ?? 0;
    if (activeOfferIndex >= offerCount) {
      setActiveOfferIndex(0);
    }
    if (activeCardIndex >= cardCount) {
      setActiveCardIndex(0);
    }
  }, [activeOfferIndex, profile?.offers?.length]);

  useEffect(() => {
    if (!hostUserId) return;
    getStripeStatus(hostUserId)
      .then(setStripeStatus)
      .catch(() => setStripeStatus(null));
  }, [hostUserId]);

  useEffect(() => {
    if (!hostUserId) return;
    getMe(hostUserId)
      .then((response) => {
        setHostStripeAccount(Boolean(response.user.stripe_account_id));
        if ((recentlyConnected || !handle) && response.user.username && response.user.username !== handle) {
          const nextHandle = response.user.username;
          window.history.replaceState({}, "", `/${nextHandle}`);
          setHandle(nextHandle);
        }
      })
      .catch(() => setHostStripeAccount(false));
  }, [hostUserId, recentlyConnected, handle]);

  useEffect(() => {
    if (!profile?.user.id) return;
    getStripeStatus(profile.user.id)
      .then(setPublicStripeStatus)
      .catch(() => setPublicStripeStatus(null));
  }, [profile?.user.id]);

  useEffect(() => {
    if (!profile?.user.id) return;
    trackEvent({
      user_id: profile.user.id,
      type: "offer_viewed",
      ref_id: activeOffer?.id ?? null,
      metadata: { source: "profile" },
    }).catch(() => {});
  }, [profile?.user.id, activeOffer?.id]);

  const stripeConnected =
    stripeStatus?.charges_enabled || stripeStatus?.payouts_enabled || stripeStatus?.details_submitted;

  const publicPaymentsEnabled =
    publicStripeStatus?.charges_enabled && publicStripeStatus?.payouts_enabled ? true : false;

  const offers = profile?.offers ?? [];
  const activeOffer = offers.length ? offers[activeOfferIndex] ?? offers[0] : null;
  const hasMultipleOffers = offers.length > 1;
  const cardCount = 1 + offers.length;

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
  const normalizedName = profile?.user.name?.trim().toLowerCase() || "";
  const nameIsPlaceholder =
    Boolean(normalizedName) &&
    (normalizedName === handle.toLowerCase() || normalizedName === "new creator" || normalizedName === "newcreator");
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
    const shouldOnboard = recentlyConnected || stripeConnected || hostStripeAccount;
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
      localStorage.removeItem(ONBOARD_KEY);
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
    setWaiverAccepted(false);
    const nextOffer = activeOffer ?? null;
    const fallbackCents = nextOffer ? nextOffer.price_cents : lastPaid ?? 5000;
    setBookOffer(nextOffer);
    setAmountInput((fallbackCents / 100).toFixed(0));
    if (profile?.user.id) {
      trackEvent({
        user_id: profile.user.id,
        type: "offer_claim_clicked",
        ref_id: nextOffer?.id ?? null,
        metadata: { amount_cents: fallbackCents, source: "profile" },
      }).catch(() => {});
    }
    setSheetOpen(true);
  };

  const closeBookSheet = () => {
    setSheetOpen(false);
    setBookOffer(null);
  };

  const handleShareInvite = async () => {
    if (!profile?.user.id || !profile.user.handle || !activeOffer) {
      setShareError("Create an offer first.");
      return;
    }
    try {
      setShareError(null);
      setShareMessage(null);
      const response = await createReferral({ inviter_id: profile.user.id, offer_id: activeOffer.id });
      const code = response.code;
      const link = `${window.location.origin}/${profile.user.handle}?ref=${code}`;
      try {
        await navigator.clipboard.writeText(link);
        setShareMessage("Invite link copied");
      } catch {
        setShareMessage(link);
      }
    } catch {
      setShareError("Unable to create invite right now.");
    }
  };

  const handleInitSession = async () => {
    setInitError(null);
    setInitMessage(null);
    if (!waiverAccepted) {
      setInitError("Accept the liability waiver to continue.");
      return;
    }
    let amountCents = 0;
    if (bookOffer) {
      amountCents = bookOffer.price_cents;
    } else {
      const raw = Number(amountInput);
      if (!Number.isFinite(raw) || raw < 0) {
        setInitError("Enter a valid amount.");
        return;
      }
      amountCents = Math.round(raw * 100);
    }
    try {
      const bookedOfferId = bookOffer?.id ?? null;
      const response = await initSession({
        host_handle: handle,
        amount_cents: amountCents,
        offer_id: bookOffer?.id ?? null,
        referral_code: referralCode,
      });
      if (response.checkout_url && amountCents > 0) {
        window.location.href = response.checkout_url;
        return;
      }
      setInitMessage("You’re set. Payment completes when you meet.");
      setSheetOpen(false);
      setBookOffer(null);
      void loadProfile();
      if (profile?.user.id) {
        trackEvent({
          user_id: profile.user.id,
          type: "offer_claim_completed",
          ref_id: bookedOfferId,
          metadata: { amount_cents: amountCents, source: "profile" },
        }).catch(() => {});
      }
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("host_not_connected")) {
        setInitError("Host hasn’t connected Stripe yet.");
      } else if (message.includes("payments_not_enabled")) {
        setInitError("Payments are not enabled yet.");
      } else {
        setInitError("Unable to start the session.");
      }
    }
  };

  const handleOpenOfferSheet = () => {
    if (!canEdit) return;
    setOfferTitle("");
    setOfferPrice("");
    setOfferLocation("");
    setOfferImage("");
    setOfferError(null);
    setOfferSheetOpen(true);
    if (hostUserId) {
      trackEvent({ user_id: hostUserId, type: "offer_create_started", ref_id: null }).catch(() => {});
    }
  };

  const handleCreateOffer = async () => {
    if (!hostUserId) return;
    setOfferSaving(true);
    setOfferError(null);
    const title = offerTitle.trim();
    const rawPrice = Number(offerPrice);
    if (!title) {
      setOfferError("Add a title.");
      setOfferSaving(false);
      return;
    }
    if (!Number.isFinite(rawPrice) || rawPrice < 0) {
      setOfferError("Enter a valid price.");
      setOfferSaving(false);
      return;
    }
    const priceCents = Math.round(rawPrice * 100);
    const location = offerLocation.trim() || "In person";
    const imageUrl = offerImage.trim() || null;
    try {
      await createOffer({
        creator_id: hostUserId,
        title,
        price_cents: priceCents,
        deposit_cents: 0,
        capacity: 1,
        location_text: location,
        description: "",
        image_url: imageUrl,
        payment_mode: "full",
        slots: [],
      });
      setOfferSheetOpen(false);
      setOfferTitle("");
      setOfferPrice("");
      setOfferLocation("");
      setOfferImage("");
      await loadProfile();
      setActiveCardIndex(1);
      requestAnimationFrame(() => {
        if (carouselRef.current) {
          carouselRef.current.scrollTo({ left: carouselRef.current.clientWidth, behavior: "smooth" });
        }
      });
      trackEvent({ user_id: hostUserId, type: "offer_create_completed", ref_id: null }).catch(() => {});
    } catch (error) {
      setOfferError("Unable to create offer.");
    } finally {
      setOfferSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    let userId = hostUserId;
    if (!userId) {
      try {
        const seedName = handle ? handle : "New Creator";
        const created = await createUser({ name: seedName, role: "creator" });
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
    if (userId) {
      trackEvent({ user_id: userId, type: "profile_create_started", ref_id: null }).catch(() => {});
    }
    localStorage.setItem(ONBOARD_KEY, "1");
    const { url } = await createStripeConnectLink(userId);
    window.location.href = url;
  };

  const handleSaveEdit = async () => {
    if (!hostUserId) return;
    setEditSaving(true);
    setEditError(null);
    const finishingOnboarding = onboardingStep === "photo";
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
      const response = await updateMe(hostUserId, payload);
      const nextHandle = response.user.username;
      if (nextHandle && nextHandle !== handle) {
        window.history.replaceState({}, "", `/${nextHandle}`);
        setHandle(nextHandle);
        setEditOpen(false);
        return;
      }
      setEditOpen(false);
      await loadProfile();
      if (finishingOnboarding) {
        trackEvent({ user_id: hostUserId, type: "profile_create_completed", ref_id: null }).catch(() => {});
      }
    } catch (error) {
      setEditError("Unable to update profile.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem(HOST_ID_KEY);
    localStorage.removeItem(ONBOARD_KEY);
    setHostUserId(null);
    setHostSessions([]);
    setHostError(null);
    setSettingsOpen(false);
    setOnboardingStep(null);
    setRecentlyConnected(false);
    setProfile(null);
    setProfileError(null);
    setOfferSheetOpen(false);
    setSheetOpen(false);
    setBookOffer(null);
    setHandle("");
    window.history.replaceState({}, "", "/");
  };

  const handleRedeem = async (sessionId: number) => {
    if (!hostUserId) return;
    setHostError(null);
    try {
      await redeemSession(sessionId, hostUserId);
      await loadHostSessions();
      await loadProfile();
      trackEvent({ user_id: hostUserId, type: "redeem_completed", ref_id: sessionId }).catch(() => {});
    } catch (error) {
      setHostError("Unable to confirm right now.");
    }
  };

  const handleCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const width = el.clientWidth || 1;
    const nextIndex = Math.round(el.scrollLeft / width);
    if (nextIndex !== activeCardIndex) {
      setActiveCardIndex(nextIndex);
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
            <button className="settings-button" type="button" onClick={() => setSettingsOpen((prev) => !prev)}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-.9-.35a7.47 7.47 0 0 0-.7-1.7l.5-.82a.9.9 0 0 0-.14-1.11l-1.3-1.3a.9.9 0 0 0-1.11-.14l-.82.5a7.47 7.47 0 0 0-1.7-.7L12 4a.9.9 0 0 0-.9.73l-.2 1a7.47 7.47 0 0 0-1.7.7l-.82-.5a.9.9 0 0 0-1.11.14l-1.3 1.3a.9.9 0 0 0-.14 1.11l.5.82a7.47 7.47 0 0 0-.7 1.7L4 12a.9.9 0 0 0 .73.9l1 .2a7.47 7.47 0 0 0 .7 1.7l-.5.82a.9.9 0 0 0 .14 1.11l1.3 1.3a.9.9 0 0 0 1.11.14l.82-.5a7.47 7.47 0 0 0 1.7.7l.2 1a.9.9 0 0 0 .9.73l1.6-.3a7.47 7.47 0 0 0 1.7-.7l.82.5a.9.9 0 0 0 1.11-.14l1.3-1.3a.9.9 0 0 0 .14-1.11l-.5-.82a7.47 7.47 0 0 0 .7-1.7l1-.2A.9.9 0 0 0 20 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </header>

          {showPaidBanner ? <div className="notice">Payment received. Confirm when you meet.</div> : null}
          {initMessage ? <div className="notice">{initMessage}</div> : null}

          {activeTab === "profile" ? (
            <>
              {!profile && !loadingProfile ? (
                <section className="card ledger">
                  <div className="card-title">Get paid for your 1:1 service</div>
                  <div className="muted">
                    Connect Stripe, confirm your name and photo, and share your link.
                  </div>
                  <button className="button primary full" type="button" onClick={handleConnectStripe}>
                    Connect Stripe
                  </button>
                  {profileError ? <div className="error-text">{profileError}</div> : null}
                </section>
              ) : (
                <>
                  <div
                    className={cardCount > 1 ? "carousel" : "carousel single"}
                    ref={carouselRef}
                    onScroll={cardCount > 1 ? handleCarouselScroll : undefined}
                  >
                    <div className="carousel-track">
                      <div className="carousel-item">
                        <section
                          className={canEdit ? "card profile-card editable" : "card profile-card"}
                          onClick={canEdit ? openEditSheet : undefined}
                          role={canEdit ? "button" : undefined}
                          tabIndex={canEdit ? 0 : -1}
                          style={
                            {
                              "--card-bg": profile?.user.photo_url
                                ? `url(${profile.user.photo_url})`
                                : undefined,
                            } as React.CSSProperties
                          }
                        >
                          <div className="profile-card-inner">
                            {profile?.user.photo_url ? (
                              <img className="avatar" src={profile.user.photo_url} alt={profile.user.name} />
                            ) : (
                              <div className="avatar" />
                            )}
                            <div className="profile-name">{profile?.user.name || "OPENMAT"}</div>
                            <div className="last-label">LAST PAID</div>
                            <div className="last-amount">{formatMoney(lastPaid)}</div>
                          </div>
                        </section>
                      </div>
                      {offers.map((offer) => (
                        <div className="carousel-item" key={offer.id}>
                          <section
                            className="card offer-card"
                            style={
                              {
                                "--card-bg": offer.image_url
                                  ? `url(${offer.image_url})`
                                  : profile?.user.photo_url
                                    ? `url(${profile.user.photo_url})`
                                    : undefined,
                              } as React.CSSProperties
                            }
                          >
                            <div className="offer-card-inner">
                              <div className="offer-title">{offer.title}</div>
                              <div className="offer-price">{formatMoney(offer.price_cents)}</div>
                              <div className="offer-meta">{offer.location_text}</div>
                            </div>
                          </section>
                        </div>
                      ))}
                    </div>
                  </div>
                  {cardCount > 1 ? (
                    <div className="carousel-dots" aria-hidden>
                      {Array.from({ length: cardCount }).map((_, index) => (
                        <span key={index} className={index === activeCardIndex ? "dot active" : "dot"} />
                      ))}
                    </div>
                  ) : null}
                  <button
                    className="button primary full"
                    type="button"
                    onClick={handleOpenSheet}
                    disabled={!profile || (publicStripeStatus ? !publicPaymentsEnabled : false)}
                  >
                    Book session
                  </button>
                  <button className="button ghost full" type="button" onClick={handleShareInvite} disabled={!profile || !activeOffer}>
                    Share invite link
                  </button>
                  {shareMessage ? <div className="muted">{shareMessage}</div> : null}
                  {shareError ? <div className="error-text">{shareError}</div> : null}
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
              )}
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

          {canEdit ? (
            <button className="fab" type="button" onClick={handleOpenOfferSheet}>
              +
            </button>
          ) : null}

          {settingsOpen ? (
            <div className="settings-backdrop" onClick={() => setSettingsOpen(false)}>
              <div className="settings-menu" onClick={(event) => event.stopPropagation()}>
                <button className="settings-item" type="button" onClick={handleSignOut}>
                  Sign out
                </button>
                <a className="settings-item" href="mailto:macrevers@gmail.com">
                  Contact
                </a>
              </div>
            </div>
          ) : null}
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
        <div className="sheet-backdrop" onClick={closeBookSheet}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-title">{bookOffer ? bookOffer.title : "Set your amount"}</div>
            <label className="field">
              Amount (USD)
              <input
                value={amountInput}
                onChange={(event) => setAmountInput(formatAmountInput(event.target.value))}
                inputMode="decimal"
                readOnly={Boolean(bookOffer)}
              />
            </label>
            {bookOffer ? <div className="muted">Offer price is fixed.</div> : null}
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={waiverAccepted}
                onChange={(event) => setWaiverAccepted(event.target.checked)}
              />
              <span>I accept the liability waiver.</span>
            </label>
            {initError ? <div className="error-text">{initError}</div> : null}
            <div className="sheet-actions">
              <button className="button ghost" type="button" onClick={closeBookSheet}>
                Cancel
              </button>
              <button className="button primary" type="button" onClick={handleInitSession}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {offerSheetOpen ? (
        <div className="sheet-backdrop" onClick={() => setOfferSheetOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-title">Create offer</div>
            <label className="field">
              Title
              <input value={offerTitle} onChange={(event) => setOfferTitle(event.target.value)} />
            </label>
            <label className="field">
              Price (USD)
              <input
                value={offerPrice}
                onChange={(event) => setOfferPrice(formatAmountInput(event.target.value))}
                inputMode="decimal"
              />
            </label>
            <label className="field">
              Location
              <input value={offerLocation} onChange={(event) => setOfferLocation(event.target.value)} />
            </label>
            <label className="field">
              Image URL (optional)
              <input value={offerImage} onChange={(event) => setOfferImage(event.target.value)} />
            </label>
            {offerError ? <div className="error-text">{offerError}</div> : null}
            <div className="sheet-actions">
              <button className="button ghost" type="button" onClick={() => setOfferSheetOpen(false)}>
                Cancel
              </button>
              <button className="button primary" type="button" onClick={handleCreateOffer} disabled={offerSaving}>
                {offerSaving ? "Saving…" : "Create offer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default App;
