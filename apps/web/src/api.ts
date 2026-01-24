const API_BASE = "http://localhost:3001";
const USE_MOCKS = true;

export type ProfileResponse = {
  user: {
    id: number;
    name: string;
    role: string;
    created_at: string;
  };
  score: number;
  offers: {
    id: number;
    title: string;
    price_cents: number;
    capacity: number;
    claimed_count: number;
    created_at: string;
  }[];
};

export type InboxResponse = {
  events: {
    id: number;
    type: "OFFER_VIEWED" | "OFFER_CLAIMED" | "REDEMPTION_COMPLETED";
    ref_id: number;
    created_at: string;
    actor_name: string | null;
    offer_title: string | null;
  }[];
};

export type CreateOfferInput = {
  creator_id: number;
  title: string;
  price_cents: number;
  capacity: number;
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

const mockProfile: ProfileResponse = {
  user: {
    id: 1,
    name: "Jordan Sara",
    role: "Personal trainer at LifeTime Fitness",
    created_at: new Date().toISOString(),
  },
  score: 5,
  offers: [
    {
      id: 1,
      title: "Five sessions package",
      price_cents: 30000,
      capacity: 18,
      claimed_count: 13,
      created_at: new Date().toISOString(),
    },
  ],
};

const mockInbox: InboxResponse = {
  events: [
    {
      id: 1,
      type: "OFFER_CLAIMED",
      ref_id: 1,
      created_at: new Date().toISOString(),
      actor_name: "Alex",
      offer_title: "5-Session Package",
    },
    {
      id: 2,
      type: "OFFER_VIEWED",
      ref_id: 1,
      created_at: new Date().toISOString(),
      actor_name: null,
      offer_title: "Free Assessment",
    },
  ],
};

export const getProfile = (userId: number) =>
  USE_MOCKS
    ? Promise.resolve({ ...mockProfile, user: { ...mockProfile.user, id: userId } })
    : request<ProfileResponse>(`/profile/${userId}`);

export const getInbox = (userId: number) =>
  USE_MOCKS ? Promise.resolve(mockInbox) : request<InboxResponse>(`/inbox/${userId}`);

export const createOffer = (input: CreateOfferInput) => {
  if (USE_MOCKS) {
    const offer = {
      id: Date.now(),
      title: input.title,
      price_cents: input.price_cents,
      capacity: input.capacity,
      claimed_count: 0,
      created_at: new Date().toISOString(),
    };
    mockProfile.offers = [offer, ...mockProfile.offers];
    return Promise.resolve({ offer });
  }

  return request<{ offer: ProfileResponse["offers"][number] }>("/offers", {
    method: "POST",
    body: JSON.stringify(input),
  });
};
