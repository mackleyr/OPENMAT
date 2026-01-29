const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const PUBLIC_BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

export type User = {
  id: number;
  name: string;
  bio: string | null;
  phone: string | null;
  image_url: string | null;
  username?: string | null;
  stripe_account_id?: string | null;
  created_at: string;
};

export type Offer = {
  id: number;
  creator_id: number;
  title: string;
  price_cents: number;
  deposit_cents: number;
  payment_mode?: "deposit" | "full" | "pay_in_person";
  capacity: number;
  location_text: string;
  description: string;
  image_url: string | null;
  created_at: string;
  claimed_count?: number;
};

export type OfferSlot = {
  id: number;
  offer_id: number;
  start_at: string;
  end_at: string;
  remaining_capacity: number;
};

export type Claim = {
  id: number;
  offer_id: number;
  user_id: number;
  slot_id: number | null;
  address: string | null;
  deposit_cents: number;
  created_at: string;
};

export type ProfileResponse = {
  user: User;
  score: number;
  offers: Offer[];
};

export type OfferDetailResponse = {
  offer: Offer;
  slots: OfferSlot[];
  activity: Array<{
    id: number;
    type: string;
    created_at: string;
    actor_name: string | null;
    offer_title: string | null;
  }>;
};

export type InboxResponse = {
  events: Array<{
    id: number;
    type: string;
    ref_id: number;
    created_at: string;
    actor_name: string | null;
    offer_title: string | null;
  }>;
};

export type KFactorResponse = {
  invites: number;
  conversions: number;
  k_factor: number;
};

export type StripeStatusResponse = {
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
};

export type CreateOfferInput = {
  creator_id: number;
  title: string;
  price_cents: number;
  deposit_cents: number;
  capacity: number;
  location_text: string;
  description: string;
  image_url: string | null;
  payment_mode: "deposit" | "full" | "pay_in_person";
  slots: Array<{ start_at: string; end_at: string; remaining_capacity: number }>;
};

export type CreateUserInput = {
  name: string;
  bio?: string;
  phone?: string;
  image_url?: string | null;
  username?: string;
};

export type CreateClaimInput = {
  offer_id: number;
  user_id: number;
  slot_id: number | null;
  address?: string;
  referral_code?: string;
};

export type TrackEventInput = {
  user_id: number;
  type: string;
  ref_id: number | null;
  metadata?: Record<string, unknown>;
};

const request = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json() as Promise<T>;
};

let mockUser: User | null = {
  id: 1,
  name: "Jordan Sara",
  bio: "Personal trainer at LifeTime Fitness",
  phone: "",
  image_url: null,
  username: "jordan",
  stripe_account_id: null,
  created_at: new Date().toISOString(),
};

let mockOffers: Offer[] = [
  {
    id: 1,
    creator_id: 1,
    title: "Five sessions package",
    price_cents: 30000,
    deposit_cents: 2000,
    payment_mode: "deposit",
    capacity: 18,
    location_text: "L.A. Live, Staples Center, CA",
    description: "Train with me 1:1, show up ready.",
    image_url: null,
    created_at: new Date().toISOString(),
    claimed_count: 13,
  },
];

let mockSlots: OfferSlot[] = [
  {
    id: 1,
    offer_id: 1,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    remaining_capacity: 18,
  },
];

let mockClaims: Claim[] = [];

const mockInbox: InboxResponse = {
  events: [
    {
      id: 1,
      type: "OFFER_CLAIMED",
      ref_id: 1,
      created_at: new Date().toISOString(),
      actor_name: "Alex",
      offer_title: "Five sessions package",
    },
    {
      id: 2,
      type: "OFFER_VIEWED",
      ref_id: 1,
      created_at: new Date().toISOString(),
      actor_name: null,
      offer_title: "Free assessment",
    },
  ],
};

export const getProfile = (userId: number) =>
  USE_MOCKS
    ? Promise.resolve({
        user: { ...mockUser!, id: userId },
        score: mockClaims.length,
        offers: mockOffers.map((offer) => ({ ...offer })),
      })
    : request<ProfileResponse>(`/profile/${userId}`);

export const getOffer = (offerId: number) =>
  USE_MOCKS
    ? Promise.resolve({
        offer: mockOffers.find((offer) => offer.id === offerId)!,
        slots: mockSlots.filter((slot) => slot.offer_id === offerId),
        activity: mockInbox.events,
      })
    : request<OfferDetailResponse>(`/offers/${offerId}`);

export const getInbox = (userId: number) =>
  USE_MOCKS ? Promise.resolve(mockInbox) : request<InboxResponse>(`/inbox/${userId}`);

export const getKFactor = (userId: number) =>
  USE_MOCKS
    ? Promise.resolve({ invites: 10, conversions: 4, k_factor: 0.4 })
    : request<KFactorResponse>(`/metrics/kfactor/${userId}`);

export const getStripeStatus = (userId: number) =>
  USE_MOCKS
    ? Promise.resolve({
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
      })
    : request<StripeStatusResponse>(`/stripe/status?user_id=${userId}`);

export const createUser = (input: CreateUserInput) => {
  if (USE_MOCKS) {
    mockUser = {
      id: mockUser?.id ?? 2,
      name: input.name,
      bio: input.bio ?? null,
      phone: input.phone ?? null,
      image_url: input.image_url ?? null,
      username: input.username ?? input.name.split(/\s+/)[0].toLowerCase(),
      created_at: new Date().toISOString(),
    };
    return Promise.resolve({ user: mockUser });
  }

  return request<{ user: User }>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const updateUser = (userId: number, input: { name?: string; image_url?: string | null; username?: string }) => {
  if (USE_MOCKS) {
    if (!mockUser || mockUser.id !== userId) {
      throw new Error("User not found");
    }
    mockUser = {
      ...mockUser,
      name: input.name ?? mockUser.name,
      image_url: input.image_url ?? mockUser.image_url,
      username: input.username ?? mockUser.username,
    };
    return Promise.resolve({ user: mockUser });
  }

  return request<{ user: User }>(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
};

export const createOffer = (input: CreateOfferInput) => {
  if (USE_MOCKS) {
    const offer: Offer = {
      id: Date.now(),
      creator_id: input.creator_id,
      title: input.title,
      price_cents: input.price_cents,
      deposit_cents: input.deposit_cents,
      payment_mode: input.payment_mode,
      capacity: input.capacity,
      location_text: input.location_text,
      description: input.description,
      image_url: input.image_url,
      created_at: new Date().toISOString(),
      claimed_count: 0,
    };
    mockOffers = [offer, ...mockOffers];
    mockSlots = [
      ...mockSlots,
      ...input.slots.map((slot, index) => ({
        id: Date.now() + index + 1,
        offer_id: offer.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        remaining_capacity: slot.remaining_capacity,
      })),
    ];
    return Promise.resolve({ offer });
  }

  return request<{ offer: Offer }>("/offers", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const createClaim = (input: CreateClaimInput) => {
  if (USE_MOCKS) {
    const claim: Claim = {
      id: Date.now(),
      offer_id: input.offer_id,
      user_id: input.user_id,
      slot_id: input.slot_id ?? null,
      address: input.address ?? null,
      deposit_cents: mockOffers.find((offer) => offer.id === input.offer_id)?.deposit_cents ?? 0,
      created_at: new Date().toISOString(),
    };
    mockClaims = [claim, ...mockClaims];
    return Promise.resolve({ claim, payment_mode: mockOffers[0].payment_mode ?? "deposit" });
  }

  return request<{ claim: Claim; payment_mode: string }>("/claims", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const createCheckoutSession = (claimId: number) => {
  if (USE_MOCKS) {
    return Promise.resolve({ url: `${PUBLIC_BASE_URL}/?claim=${claimId}&paid=1` });
  }
  return request<{ url: string }>("/checkout/session", {
    method: "POST",
    body: JSON.stringify({ claim_id: claimId }),
  });
};

export const trackEvent = (input: TrackEventInput) => {
  if (USE_MOCKS) {
    return Promise.resolve({ ok: true });
  }

  return request<{ ok: true }>("/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const createReferral = (input: { inviter_id: number; offer_id: number }) => {
  if (USE_MOCKS) {
    return Promise.resolve({ code: "JORDAN" });
  }

  return request<{ code: string }>("/referrals", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export const createWalletPass = (claimId: number, platform: "apple" | "google") => {
  if (USE_MOCKS) {
    return Promise.resolve({ ok: true });
  }

  return request<{ ok: true }>(`/wallet/${platform}`, {
    method: "POST",
    body: JSON.stringify({ claim_id: claimId }),
  });
};
