import React, { useEffect, useMemo, useState } from "react";
import {
  Claim,
  createClaim,
  createCheckoutSession,
  createOffer,
  createReferral,
  createUser,
  updateUser,
  getInbox,
  getKFactor,
  getOffer,
  getProfile,
  getStripeStatus,
  Offer,
  OfferDetailResponse,
  OfferSlot,
  ProfileResponse,
  KFactorResponse,
  StripeStatusResponse,
  trackEvent,
  createWalletPass,
} from "./api";
import EventRow from "./components/EventRow";
import OfferCard from "./components/OfferCard";
import "./styles.css";

const TABS = {
  PROFILE: "PROFILE",
  INBOX: "INBOX",
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

type CustomerStep =
  | "landing"
  | "details"
  | "choose-time"
  | "create-profile"
  | "success"
  | "wallet"
  | "confirmed";

type OfferDraft = {
  title: string;
  price_cents: number;
  discount_percent: number;
  session_count: number;
  session_duration_minutes: number;
  deposit_cents: number;
  payment_mode: "deposit" | "full" | "pay_in_person";
  capacity_min: number;
  capacity_max: number;
  place: string;
  description: string;
  availability: Array<{ day: string; start: string; end: string }>;
  image_url: string | null;
};

const DEFAULT_USER_ID = 1;
const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

const parseRoute = () => {
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "offer" && segments[1]) {
    const offerId = Number(segments[1]);
    if (Number.isFinite(offerId)) {
      return { mode: "offer" as const, offerId };
    }
  }
  const offerParam = new URLSearchParams(window.location.search).get("offer");
  if (offerParam) {
    const offerId = Number(offerParam);
    if (Number.isFinite(offerId)) {
      return { mode: "offer" as const, offerId };
    }
  }
  return { mode: "creator" as const };
};

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(0)}`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const App = () => {
  const [route, setRoute] = useState(parseRoute());
  const [activeTab, setActiveTab] = useState<Tab>(TABS.PROFILE);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [kFactor, setKFactor] = useState<KFactorResponse | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);
  const [connectBanner, setConnectBanner] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isImportingOffers, setIsImportingOffers] = useState(false);
  const [inboxEvents, setInboxEvents] = useState<Awaited<ReturnType<typeof getInbox>> | null>(
    null
  );
  const [offerDetail, setOfferDetail] = useState<OfferDetailResponse | null>(null);
  const [customerStep, setCustomerStep] = useState<CustomerStep>("landing");
  const [selectedSlot, setSelectedSlot] = useState<OfferSlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhoto, setCustomerPhoto] = useState<string | null>(null);
  const [customerAddress, setCustomerAddress] = useState("");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [walletSaved, setWalletSaved] = useState(false);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [offerDraft, setOfferDraft] = useState<OfferDraft>({
    title: "One-on-one home session",
    price_cents: 20000,
    discount_percent: 0,
    session_count: 1,
    session_duration_minutes: 60,
    deposit_cents: 2000,
    payment_mode: "deposit",
    capacity_min: 1,
    capacity_max: 3,
    place: "L.A. Live, Staples Center, CA",
    description: "",
    availability: [
      { day: "Fri, Jan 8", start: "11:30am", end: "4:30pm" },
      { day: "Sat, Jan 9", start: "11:30am", end: "4:30pm" },
    ],
    image_url: null,
  });
  const [creatorNameDraft, setCreatorNameDraft] = useState("");
  const [creatorPhotoDraft, setCreatorPhotoDraft] = useState<string | null>(null);
  const referralCode = new URLSearchParams(window.location.search).get("ref") || undefined;
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;

  useEffect(() => {
    const handlePop = () => setRoute(parseRoute());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    if (route.mode === "creator") {
      getProfile(DEFAULT_USER_ID)
        .then((data) => {
          setProfile(data);
          setCreatorNameDraft(data.user.name);
          setCreatorPhotoDraft(data.user.image_url);
        })
        .catch(() => setProfile(null));
      getInbox(DEFAULT_USER_ID)
        .then(setInboxEvents)
        .catch(() => setInboxEvents(null));
      getKFactor(DEFAULT_USER_ID)
        .then(setKFactor)
        .catch(() => setKFactor(null));
      getStripeStatus(DEFAULT_USER_ID)
        .then(setStripeStatus)
        .catch(() => setStripeStatus(null));
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "1") {
        setConnectBanner("Stripe connected.");
      } else if (params.get("connected") === "0") {
        setConnectBanner("Stripe connection failed. Try again.");
      } else {
        setConnectBanner(null);
      }
    }
  }, [route.mode]);

  useEffect(() => {
    if (route.mode === "offer" && route.offerId) {
      getOffer(route.offerId)
        .then((data) => {
          setOfferDetail(data);
          const params = new URLSearchParams(window.location.search);
          if (params.get("paid") === "1") {
            setCustomerStep("success");
          } else {
            setCustomerStep("landing");
          }
        })
        .catch(() => setOfferDetail(null));
    }
  }, [route.mode, route.offerId]);

  useEffect(() => {
    if (!offerDetail) return;
    trackEvent({
      user_id: offerDetail.offer.creator_id,
      type: "OFFER_VIEWED",
      ref_id: offerDetail.offer.id,
    }).catch(() => null);
  }, [offerDetail]);

  const stripeFullyConnected =
    Boolean(profile?.user.stripe_account_id) &&
    Boolean(stripeStatus?.details_submitted) &&
    Boolean(stripeStatus?.charges_enabled) &&
    Boolean(stripeStatus?.payouts_enabled);

  useEffect(() => {
    if (!profile || !stripeFullyConnected) {
      setOnboardingStep(0);
      return;
    }
    if (creatorNameDraft.trim().length === 0) {
      setOnboardingStep(1);
      return;
    }
    if (!creatorPhotoDraft) {
      setOnboardingStep(2);
      return;
    }
    setOnboardingStep(3);
  }, [profile, stripeFullyConnected, creatorNameDraft, creatorPhotoDraft]);

  useEffect(() => {
    const importOffers = async () => {
      if (!stripeFullyConnected || !profile || isImportingOffers) return;
      if (profile.offers.length > 0) return;
      setIsImportingOffers(true);
      const presets = [
        {
          title: "1:1 Personal Training",
          price_cents: 20000,
          deposit_cents: 2000,
        },
        {
          title: "5-Session Package",
          price_cents: 90000,
          deposit_cents: 5000,
        },
      ];
      const created: Offer[] = [];
      for (const preset of presets) {
        const response = await createOffer({
          creator_id: DEFAULT_USER_ID,
          title: preset.title,
          price_cents: preset.price_cents,
          deposit_cents: preset.deposit_cents,
          payment_mode: "deposit",
          capacity: 1,
          location_text: "Your place",
          description: "Imported from Stripe",
          image_url: null,
          slots: [
            {
              start_at: new Date().toISOString(),
              end_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              remaining_capacity: 1,
            },
          ],
        });
        created.push({ ...response.offer, claimed_count: 0 });
      }
      setProfile((current) =>
        current ? { ...current, offers: [...created, ...current.offers] } : current
      );
      setIsImportingOffers(false);
      setOnboardingStep(4);
    };
    importOffers().catch(() => setIsImportingOffers(false));
  }, [stripeFullyConnected, profile, isImportingOffers]);

  const goTo = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(parseRoute());
  };

  const handleCreateOffer = async () => {
    const slots = offerDraft.availability.map((slot) => {
      const start = new Date();
      const end = new Date(start.getTime() + offerDraft.session_duration_minutes * 60000);
      return {
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        remaining_capacity: offerDraft.capacity_max,
      };
    });
    const response = await createOffer({
      creator_id: DEFAULT_USER_ID,
      title: offerDraft.title,
      price_cents: offerDraft.price_cents,
      deposit_cents: offerDraft.deposit_cents,
      payment_mode: offerDraft.payment_mode,
      capacity: offerDraft.capacity_max,
      location_text: offerDraft.place,
      description: offerDraft.description,
      image_url: offerDraft.image_url,
      slots,
    });
    await trackEvent({
      user_id: DEFAULT_USER_ID,
      type: "OFFER_CREATED",
      ref_id: response.offer.id,
    });
    setProfile((current) =>
      current
        ? {
            ...current,
            offers: [{ ...response.offer, claimed_count: 0 }, ...current.offers],
          }
        : current
    );
    setShowCreateOffer(false);
  };

  const handleClaim = async () => {
    if (!offerDetail) return;
    await trackEvent({
      user_id: offerDetail.offer.creator_id,
      type: "OFFER_CLAIM_CLICKED",
      ref_id: offerDetail.offer.id,
    });
    if (offerDetail.slots.length > 1) {
      setCustomerStep("choose-time");
      return;
    }
    if (offerDetail.slots.length === 1) {
      setSelectedSlot(offerDetail.slots[0]);
    }
    setCustomerStep("create-profile");
  };

  const handleCustomerProfile = async () => {
    if (!offerDetail) return;
    const userResponse = await createUser({
      name: customerName.trim(),
      image_url: customerPhoto,
    });
    const claimResponse = await createClaim({
      offer_id: offerDetail.offer.id,
      user_id: userResponse.user.id,
      slot_id: selectedSlot?.id ?? null,
      address: customerAddress,
      referral_code: referralCode,
    });
    setClaim(claimResponse.claim);
    await trackEvent({
      user_id: offerDetail.offer.creator_id,
      type: "OFFER_CLAIMED",
      ref_id: claimResponse.claim.id,
    });
    if (claimResponse.payment_mode === "pay_in_person") {
      setCustomerStep("success");
      return;
    }
    const checkout = await createCheckoutSession(claimResponse.claim.id);
    window.location.href = checkout.url;
  };

  const handleShareOffer = async (offerId: number) => {
    const { code } = await createReferral({ inviter_id: DEFAULT_USER_ID, offer_id: offerId });
    const username = profile?.user.username || profile?.user.name?.split(/\\s+/)[0]?.toLowerCase();
    const base = `${PUBLIC_BASE_URL}/${username || "creator"}`;
    const shareLink = `${base}?offer=${offerId}&ref=${code}`;
    await navigator.clipboard.writeText(shareLink);
  };

  const handleWalletSave = async () => {
    setWalletSaved(true);
    await trackEvent({
      user_id: offerDetail?.offer.creator_id ?? DEFAULT_USER_ID,
      type: "WALLET_SAVED",
      ref_id: claim?.id ?? null,
    });
    if (claim) {
      await createWalletPass(claim.id, "apple");
      await createWalletPass(claim.id, "google");
    }
    setCustomerStep("confirmed");
  };

  const offerPreview: Offer = useMemo(
    () => ({
      id: 0,
      creator_id: DEFAULT_USER_ID,
      title: offerDraft.title,
      price_cents: offerDraft.price_cents,
      deposit_cents: offerDraft.deposit_cents,
      capacity: offerDraft.capacity_max,
      location_text: offerDraft.place,
      description: offerDraft.description,
      image_url: offerDraft.image_url,
      created_at: new Date().toISOString(),
      claimed_count: 0,
    }),
    [offerDraft]
  );

  const dueNowCents = (offer: Offer) =>
    offer.payment_mode === "full" ? offer.price_cents : offer.deposit_cents;

  const ctaLabel = (offer: Offer) => {
    if (offer.payment_mode === "pay_in_person") return "Claim spot";
    const amount = dueNowCents(offer);
    return `${formatMoney(amount)} ${offer.payment_mode === "full" ? "to claim" : "deposit to claim"}`;
  };

  const onboarding = (
    <section className="screen onboarding-flow">
      {onboardingStep === 0 ? (
        <div className="card onboarding-panel">
          <div className="onboarding-number">00</div>
          <div className="onboarding-title">Connect Stripe</div>
          <div className="muted center">OPENMAT is a public ledger for your Stripe payments.</div>
          <button
            className="button primary-cta"
            type="button"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_API_BASE || "http://localhost:3001"}/stripe/connect?user_id=${DEFAULT_USER_ID}`;
            }}
          >
            Connect Stripe
          </button>
          <div className="muted center">By agreeing, you accept terms and privacy.</div>
        </div>
      ) : null}
      {onboardingStep === 1 ? (
        <div className="card onboarding-panel">
          <div className="onboarding-number">01</div>
          <div className="onboarding-title">Confirm your name</div>
          <input
            className="onboarding-input"
            value={creatorNameDraft}
            placeholder="Stripe name"
            onChange={(event) => setCreatorNameDraft(event.target.value)}
          />
          <button
            className="button primary-cta"
            type="button"
            disabled={!creatorNameDraft.trim()}
            onClick={async () => {
              const result = await updateUser(DEFAULT_USER_ID, {
                name: creatorNameDraft.trim(),
                username: creatorNameDraft.trim().split(/\s+/)[0].toLowerCase(),
              });
              setProfile((current) => (current ? { ...current, user: result.user } : current));
            }}
          >
            Next
          </button>
        </div>
      ) : null}
      {onboardingStep === 2 ? (
        <div className="card onboarding-panel">
          <div className="onboarding-number">02</div>
          <div className="onboarding-title">Add your photo</div>
          <label className="photo-drop">
            {creatorPhotoDraft ? <img src={creatorPhotoDraft} alt="Creator" /> : null}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                const preview = file ? URL.createObjectURL(file) : null;
                setCreatorPhotoDraft(preview);
              }}
            />
          </label>
          <button
            className="button primary-cta"
            type="button"
            disabled={!creatorPhotoDraft}
            onClick={async () => {
              if (!creatorPhotoDraft) return;
              const result = await updateUser(DEFAULT_USER_ID, {
                image_url: creatorPhotoDraft,
              });
              setProfile((current) => (current ? { ...current, user: result.user } : current));
            }}
          >
            Next
          </button>
        </div>
      ) : null}
      {onboardingStep === 3 ? (
        <div className="card onboarding-panel">
          <div className="onboarding-number">03</div>
          <div className="onboarding-title">Syncing your prices</div>
          <div className="muted center">
            We’re importing your Stripe services and prices.
          </div>
          <div className="muted center">{isImportingOffers ? "Importing…" : "Done"}</div>
        </div>
      ) : null}
    </section>
  );

  if (route.mode === "offer") {
    const offer = offerDetail?.offer;
    if (!offer) {
      return <div className="app">Offer not found.</div>;
    }

    return (
      <div className="app">
        {customerStep === "landing" ? (
          <section className="screen">
            <div className="profile-header">
              <div className="avatar" />
              <h2>Jordan Sara</h2>
              <div className="score">Score: 5</div>
              <div className="role-line">Personal trainer at LifeTime Fitness</div>
              <div className="profile-actions">
                <button className="button" type="button">
                  Subscribe
                </button>
                <button className="button ghost" type="button" onClick={() => handleShareOffer(offer.id)}>
                  Share profile
                </button>
              </div>
            </div>
            <div className="card">
              <OfferCard offer={offer} />
              <div className="offer-activity">
                <div className="activity-row">
                  <span>Activity</span>
                  <span>{offer.claimed_count ?? 0}+ claimed</span>
                </div>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => setCustomerStep("details")}
                >
                  View details
                </button>
              </div>
            </div>
            <button className="button primary-cta" type="button" onClick={handleClaim}>
              {ctaLabel(offer)}
            </button>
            {offer.payment_mode !== "pay_in_person" ? (
              <div className="muted center">Secure payment via Stripe</div>
            ) : null}
          </section>
        ) : null}

        {customerStep === "details" ? (
          <section className="screen">
            <header className="offer-header">
              <button className="ghost" type="button" onClick={() => setCustomerStep("landing")}>
                {"<"}
              </button>
              <h3>Offer details</h3>
              <span />
            </header>
            <div className="card">
              <OfferCard offer={offer} />
              <div className="offer-details-list">
                {offerDetail.slots.map((slot) => (
                  <div key={slot.id} className="detail-line">
                    {formatDateTime(slot.start_at)}
                  </div>
                ))}
                <div className="detail-line">{offer.location_text}</div>
                <div className="detail-line">Upfront deposit: {formatMoney(offer.deposit_cents)}</div>
                <div className="detail-line">Capacity: {offer.capacity} persons</div>
              </div>
            </div>
            <button className="button primary-cta" type="button" onClick={handleClaim}>
              {ctaLabel(offer)}
            </button>
          </section>
        ) : null}

        {customerStep === "choose-time" ? (
          <section className="screen">
            <header className="offer-header">
              <button className="ghost" type="button" onClick={() => setCustomerStep("landing")}>
                {"<"}
              </button>
              <h3>Choose time</h3>
              <span />
            </header>
            <div className="card choose-time">
              {offerDetail.slots.map((slot) => (
                <button
                  key={slot.id}
                  className={selectedSlot?.id === slot.id ? "slot-button active" : "slot-button"}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                >
                  {formatDateTime(slot.start_at)}
                </button>
              ))}
            </div>
            <button
              className="button primary-cta"
              type="button"
              disabled={!selectedSlot}
              onClick={() => setCustomerStep("create-profile")}
            >
              Continue
            </button>
            <div className="muted center">Secure payment via Stripe</div>
          </section>
        ) : null}

        {customerStep === "create-profile" ? (
          <section className="screen">
            <div className="profile-header">
              {customerPhoto ? (
                <img className="avatar" src={customerPhoto} alt="Customer" />
              ) : (
                <div className="avatar" />
              )}
            </div>
            <div className="card form-card">
              <label className="form-field">
                Name
                <input
                  value={customerName}
                  placeholder="Enter your name"
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>
              <label className="form-field">
                Address
                <input
                  value={customerAddress}
                  placeholder="Add your address"
                  onChange={(event) => setCustomerAddress(event.target.value)}
                />
              </label>
              <label className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setCustomerPhoto(file ? URL.createObjectURL(file) : null);
                  }}
                />
                {customerPhoto ? "Replace photo" : "Upload photo"}
              </label>
            </div>
            <button
              className="button primary-cta"
              type="button"
              disabled={!customerName.trim()}
              onClick={handleCustomerProfile}
            >
              Continue
            </button>
          </section>
        ) : null}

        {customerStep === "success" ? (
          <section className="screen success-screen">
            <div className="success-icon">✓</div>
            <h2>You're in</h2>
            <div className="muted">Show this on arrival</div>
            <button className="button primary-cta" type="button" onClick={() => setCustomerStep("wallet")}>
              View wallet pass
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => handleShareOffer(offer.id)}
            >
              Share this offer
            </button>
          </section>
        ) : null}

        {customerStep === "wallet" ? (
          <section className="screen">
            <div className="card wallet-pass">
              <div className="wallet-header">Wallet Pass</div>
              <div className="wallet-meta">
                {offer.payment_mode === "pay_in_person"
                  ? "Pay at check-in"
                  : offer.payment_mode === "full"
                  ? "Paid in full"
                  : `${formatMoney(offer.deposit_cents)} upfront deposit`}
              </div>
              <div className="wallet-balance">
                {formatMoney(
                  offer.payment_mode === "full"
                    ? 0
                    : offer.payment_mode === "pay_in_person"
                    ? offer.price_cents
                    : offer.price_cents - offer.deposit_cents
                )}{" "}
                due at check-in
              </div>
              <div className="wallet-details">
                <div>{offer.title}</div>
                <div>{selectedSlot ? formatDateTime(selectedSlot.start_at) : ""}</div>
                <div>{offer.location_text}</div>
              </div>
            </div>
            <button className="button primary-cta" type="button" onClick={handleWalletSave}>
              {walletSaved ? "Saved" : "Save pass to proceed"}
            </button>
          </section>
        ) : null}

        {customerStep === "confirmed" ? (
          <section className="screen">
            <div className="success-icon">★</div>
            <h2>You showed up</h2>
            <div className="muted">This is now visible on OPENMAT</div>
            <div className="card">
              <OfferCard offer={offer} />
              <div className="offer-activity">
                <div className="activity-row">
                  <span>Activity</span>
                  <span>{offer.claimed_count ?? 0}+</span>
                </div>
              </div>
            </div>
            <div className="inline-row">
              <button className="button ghost" type="button" onClick={() => goTo("/")}>Profile</button>
              <button className="button" type="button" onClick={() => goTo("/")}>Inbox</button>
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const creatorOffers = profile?.offers ?? [];

  const creatorContent = (
    <div className="app">
      <header className="top-bar">
        <button
          className={activeTab === TABS.PROFILE ? "tab active" : "tab"}
          onClick={() => setActiveTab(TABS.PROFILE)}
          type="button"
        >
          Profile
        </button>
        <button
          className={activeTab === TABS.INBOX ? "tab active" : "tab"}
          onClick={() => setActiveTab(TABS.INBOX)}
          type="button"
        >
          Inbox
        </button>
      </header>

      <main className="content">
        {activeTab === TABS.PROFILE ? (
          <section className="screen">
            <div className="profile-header">
              <div className="avatar" />
              <h2>{profile?.user.name ?? "Creator"}</h2>
              <div className="score">Score: {profile?.score ?? 0}</div>
              <div className="role-line">Personal trainer at LifeTime Fitness</div>
              <div className="profile-actions">
                <button className="button ghost" type="button">
                  Edit profile
                </button>
                <button className="button ghost" type="button" onClick={() => handleShareOffer(creatorOffers[0]?.id ?? 1)}>
                  Share profile
                </button>
              </div>
            </div>
            {connectBanner ? <div className="card banner-card">{connectBanner}</div> : null}
            <div className="card insight-card">
              <div>
                <div className="insight-title">Connect Stripe</div>
                <div className="insight-copy">OPENMAT is a public ledger for your Stripe payments.</div>
                {stripeStatus ? (
                  <div className="insight-subcopy">
                    {stripeStatus.charges_enabled ? "Charges enabled." : "Charges not enabled yet."}{" "}
                    {stripeStatus.payouts_enabled ? "Payouts enabled." : "Payouts not enabled yet."}
                  </div>
                ) : null}
              </div>
              {profile?.user.stripe_account_id ? (
                <button className="button" type="button" disabled>
                  Connected
                </button>
              ) : (
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    window.location.href = `${import.meta.env.VITE_API_BASE || "http://localhost:3001"}/stripe/connect?user_id=${DEFAULT_USER_ID}`;
                  }}
                >
                  Connect Stripe
                </button>
              )}
            </div>
            <div className="card metrics-card">
              <div>
                <div className="metric-label">k-factor</div>
                <div className="metric-value">{kFactor?.k_factor ?? 0}</div>
              </div>
              <div>
                <div className="metric-label">Invites</div>
                <div className="metric-value">{kFactor?.invites ?? 0}</div>
              </div>
              <div>
                <div className="metric-label">Conversions</div>
                <div className="metric-value">{kFactor?.conversions ?? 0}</div>
              </div>
            </div>

            <div className="offer-carousel">
              {creatorOffers.length === 0 ? (
                <div className="card">No offers yet.</div>
              ) : (
                creatorOffers.map((offer) => (
                  <div key={offer.id} className="card">
                    <OfferCard offer={offer} />
                    <div className="offer-activity">
                      <div className="activity-row">
                        <span>Activity</span>
                        <span>{offer.claimed_count ?? 0}+ claimed</span>
                      </div>
                      <button className="button ghost" type="button" onClick={() => handleShareOffer(offer.id)}>
                        Copy link
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="screen">
            <div className="list-section">
              <h3>Inbox</h3>
              <div className="list">
                {(inboxEvents?.events ?? []).map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {activeTab === TABS.PROFILE ? (
        <button className="floating-button" type="button" onClick={() => setShowCreateOffer(true)}>
          +
        </button>
      ) : null}

      {showCreateOffer ? (
        <div className="overlay">
          <div className="overlay-card">
            <header className="offer-header">
              <button className="ghost" type="button" onClick={() => setShowCreateOffer(false)}>
                {"<"}
              </button>
              <h3>Create Offer</h3>
              <span />
            </header>
            <div className="offer-preview-card">
              <OfferCard offer={offerPreview} />
            </div>
            <div className="form-stack">
              <label className="form-field">
                Title
                <input
                  value={offerDraft.title}
                  onChange={(event) =>
                    setOfferDraft((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <div className="inline-row">
                <label className="form-field">
                  Price
                  <input
                    value={offerDraft.price_cents / 100}
                    onChange={(event) =>
                      setOfferDraft((current) => ({
                        ...current,
                        price_cents: Math.round(Number(event.target.value || 0) * 100),
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  Deposit
                  <input
                    value={offerDraft.deposit_cents / 100}
                    onChange={(event) =>
                      setOfferDraft((current) => ({
                        ...current,
                        deposit_cents: Math.round(Number(event.target.value || 0) * 100),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="segmented">
                {(["deposit", "full", "pay_in_person"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={offerDraft.payment_mode === mode ? "segment-button active" : "segment-button"}
                    onClick={() => setOfferDraft((current) => ({ ...current, payment_mode: mode }))}
                  >
                    {mode === "deposit" ? "Deposit" : mode === "full" ? "Full prepay" : "Pay in person"}
                  </button>
                ))}
              </div>
              <div className="inline-row">
                <label className="form-field">
                  Sessions
                  <input
                    value={offerDraft.session_count}
                    onChange={(event) =>
                      setOfferDraft((current) => ({
                        ...current,
                        session_count: Number(event.target.value || 1),
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  Duration (min)
                  <input
                    value={offerDraft.session_duration_minutes}
                    onChange={(event) =>
                      setOfferDraft((current) => ({
                        ...current,
                        session_duration_minutes: Number(event.target.value || 60),
                      }))
                    }
                  />
                </label>
              </div>
              <div className="inline-row">
                <label className="form-field">
                  Capacity min
                  <input
                    value={offerDraft.capacity_min}
                    onChange={(event) =>
                      setOfferDraft((current) => ({
                        ...current,
                        capacity_min: Number(event.target.value || 1),
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  Capacity max
                  <input
                    value={offerDraft.capacity_max}
                    onChange={(event) =>
                      setOfferDraft((current) => ({
                        ...current,
                        capacity_max: Number(event.target.value || 1),
                      }))
                    }
                  />
                </label>
              </div>
              <label className="form-field">
                Place
                <input
                  value={offerDraft.place}
                  onChange={(event) =>
                    setOfferDraft((current) => ({ ...current, place: event.target.value }))
                  }
                />
              </label>
              <label className="form-field">
                Description
                <input
                  value={offerDraft.description}
                  onChange={(event) =>
                    setOfferDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
            </div>
            <button className="button primary-cta" type="button" onClick={handleCreateOffer}>
              Create
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const content = !stripeFullyConnected ? onboarding : creatorContent;

  if (isDesktop) {
    return (
      <div className="desktopShell">
        <div className="deviceFrame">{content}</div>
      </div>
    );
  }

  return content;
};

export default App;
