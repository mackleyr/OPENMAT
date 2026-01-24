import React, { useEffect, useState } from "react";
import { createOffer, getProfile, ProfileResponse } from "../api";
import OfferCard from "../components/OfferCard";

const DEFAULT_PRICE = "";
const DEFAULT_CAPACITY = "";
const CENTS_PER_DOLLAR = 100;

type ProfileProps = {
  userId: number;
  isCreateOpen: boolean;
  onCreateClosed: () => void;
};

type FormState = {
  title: string;
  price: string;
  capacity: string;
  isSaving: boolean;
  error: string | null;
};

const CreateOfferForm = ({
  userId,
  onCreated,
  onCancel,
}: {
  userId: number;
  onCreated: () => void;
  onCancel: () => void;
}) => {
  const [form, setForm] = useState<FormState>({
    title: "",
    price: DEFAULT_PRICE,
    capacity: DEFAULT_CAPACITY,
    isSaving: false,
    error: null,
  });

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value, error: null }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const priceCents = Math.round(Number(form.price) * CENTS_PER_DOLLAR);
    const capacityValue = Number(form.capacity);
    const isValidCapacity = Number.isInteger(capacityValue) && capacityValue > 0;
    const isValidPrice = Number.isFinite(priceCents) && priceCents >= 0;

    if (!form.title.trim() || !isValidPrice || !isValidCapacity) {
      setForm((current) => ({ ...current, error: "Enter a title, price, and capacity." }));
      return;
    }

    setForm((current) => ({ ...current, isSaving: true, error: null }));

    try {
      await createOffer({
        creator_id: userId,
        title: form.title.trim(),
        price_cents: priceCents,
        capacity: capacityValue,
      });
      setForm({ title: "", price: DEFAULT_PRICE, capacity: DEFAULT_CAPACITY, isSaving: false, error: null });
      onCreated();
    } catch (error) {
      setForm((current) => ({ ...current, isSaving: false, error: "Unable to create offer." }));
    }
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h3>Create Offer</h3>
      <label className="form-field">
        Title
        <input value={form.title} onChange={handleChange("title")} placeholder="Five sessions package" />
      </label>
      <label className="form-field">
        Price (USD)
        <input value={form.price} onChange={handleChange("price")} inputMode="decimal" />
      </label>
      <label className="form-field">
        Capacity
        <input value={form.capacity} onChange={handleChange("capacity")} inputMode="numeric" />
      </label>
      {form.error ? <div className="form-error">{form.error}</div> : null}
      <div className="form-actions">
        <button className="button" type="submit" disabled={form.isSaving}>
          {form.isSaving ? "Saving" : "Create"}
        </button>
        <button className="button ghost" type="button" onClick={onCancel} disabled={form.isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const Profile = ({ userId, isCreateOpen, onCreateClosed }: ProfileProps) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      const data = await getProfile(userId);
      setProfile(data);
      setError(null);
    } catch (fetchError) {
      setError("Unable to load profile.");
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  return (
    <section className="screen">
      {profile ? (
        <div className="profile-header">
          <div className="avatar" />
          <h2>{profile.user.name}</h2>
          <div className="score">Score: {profile.score}</div>
          <div className="role-line">{profile.user.role}</div>
        </div>
      ) : null}

      {error ? <div className="error-text">{error}</div> : null}

      {isCreateOpen ? (
        <CreateOfferForm userId={userId} onCreated={loadProfile} onCancel={onCreateClosed} />
      ) : null}

      <div className="list-section">
        <h3>Offers</h3>
        <div className="list">
          {profile?.offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
          {profile && profile.offers.length === 0 ? (
            <div className="empty-state">No offers yet.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default Profile;
