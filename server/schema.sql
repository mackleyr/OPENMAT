CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'creator',
  username TEXT,
  stripe_account_id TEXT,
  stripe_access_token TEXT,
  stripe_refresh_token TEXT,
  stripe_publishable_key TEXT,
  stripe_account_email TEXT,
  bio TEXT,
  phone TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offers (
  id BIGSERIAL PRIMARY KEY,
  creator_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  payment_mode TEXT NOT NULL DEFAULT 'deposit' CHECK (payment_mode IN ('deposit', 'full', 'pay_in_person')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  location_text TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offer_slots (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES offers(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  remaining_capacity INTEGER NOT NULL CHECK (remaining_capacity >= 0)
);

CREATE TABLE claims (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES offers(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  slot_id BIGINT REFERENCES offer_slots(id),
  address TEXT,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deposit_paid', 'redeemed', 'failed')),
  deposit_payment_intent_id TEXT,
  balance_payment_intent_id TEXT,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'zero')),
  provider TEXT NOT NULL DEFAULT 'stripe',
  provider_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE redemptions (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL UNIQUE REFERENCES claims(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE referral_links (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  inviter_id BIGINT NOT NULL REFERENCES users(id),
  offer_id BIGINT NOT NULL REFERENCES offers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_passes (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id),
  platform TEXT NOT NULL CHECK (platform IN ('apple', 'google')),
  status TEXT NOT NULL CHECK (status IN ('created', 'issued', 'failed')),
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  ref_id BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX offers_creator_id_idx ON offers(creator_id);
CREATE INDEX claims_offer_id_idx ON claims(offer_id);
CREATE INDEX offer_slots_offer_id_idx ON offer_slots(offer_id);
CREATE INDEX events_user_id_created_at_idx ON events(user_id, created_at DESC);
