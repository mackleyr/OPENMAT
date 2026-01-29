import React, { useEffect, useMemo, useState } from "react";
import {
  createProfile,
  getMenu,
  getProfile,
  Menu,
  ProfileResponse,
  saveMenu,
  updateProfile,
} from "../api";
import OfferCard, { Offer } from "../components/OfferCard";

type ProfileProps = {
  userId: number;
  onProfileStatusChange?: (status: { hasProfile: boolean; offerCount: number }) => void;
  isOwner?: boolean;
};

type ProfileDraft = {
  name: string;
  phone: string;
  bio: string;
  imageUrl: string | null;
  imageFile: File | null;
};

const createEmptyProfile = (): ProfileDraft => ({
  name: "",
  phone: "",
  bio: "",
  imageUrl: null,
  imageFile: null,
});

const createEmptyMenu = (): Menu => ({
  pricing_tiers: [],
  donation_allowed: false,
  availability_windows: [],
  upload: {
    file_name: "",
    link: "",
    text: "",
  },
});

const Profile = ({ userId, onProfileStatusChange, isOwner = true }: ProfileProps) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(createEmptyProfile());
  const [menu, setMenu] = useState<Menu>(createEmptyMenu());
  const [menuSaved, setMenuSaved] = useState(false);
  const [offerOverrides, setOfferOverrides] = useState<Record<string, Partial<Offer>>>({});
  const [activePanel, setActivePanel] = useState<"none" | "profile" | "edit-profile">("profile");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [profileAttempted, setProfileAttempted] = useState(false);
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

  const loadMenu = async () => {
    try {
      const data = await getMenu();
      if (data) {
        setMenu(data);
        setMenuSaved(true);
      }
    } catch (fetchError) {
      setMenuError("Unable to load menu.");
    }
  };

  useEffect(() => {
    loadProfile();
    loadMenu();
  }, [userId]);

  useEffect(() => {
    onProfileStatusChange?.({
      hasProfile: Boolean(profile),
      offerCount: profile?.offers.length ?? 0,
    });
  }, [profile, onProfileStatusChange]);

  useEffect(() => {
    if (!profile && activePanel === "none") {
      setActivePanel("profile");
    }
    if (profile && activePanel === "profile") {
      setActivePanel("none");
    }
  }, [profile, activePanel]);

  const handleProfileImage = (file: File | null, previewUrl: string | null) => {
    setProfileDraft((current) => ({
      ...current,
      imageFile: file,
      imageUrl: previewUrl,
    }));
  };

  const normalizedPhone = profileDraft.phone.replace(/\D/g, "");
  const phoneIsValid = normalizedPhone.length === 0 || normalizedPhone.length === 10;
  const profileErrors = {
    name: profileDraft.name.trim().length > 0 ? "" : "Enter your name.",
    phone: phoneIsValid ? "" : "Enter a valid phone number.",
    photo: profileDraft.imageUrl ? "" : "Add a profile photo.",
  };
  const profileIsValid = profileErrors.name === "" && profileErrors.photo === "";

  const renderBio = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith("http://") || part.startsWith("https://")) {
        return (
          <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        );
      }
      return <span key={`${part}-${index}`}>{part}</span>;
    });
  };


  const handleCreateProfile = async () => {
    setProfileError(null);
    setProfileAttempted(true);
    if (!profileIsValid) {
      setProfileError("Fix the highlighted fields.");
      return;
    }
    try {
      const nextProfile = await createProfile({
        name: profileDraft.name.trim(),
        phone: profileDraft.phone.trim(),
        bio: profileDraft.bio.trim(),
        image_url: profileDraft.imageUrl,
      });
      setProfile(nextProfile);
      setActivePanel("none");
    } catch (profileCreateError) {
      setProfileError("Unable to create profile.");
    }
  };

  const handleUpdateProfile = async () => {
    setProfileError(null);
    setProfileAttempted(true);
    if (!profileIsValid) {
      setProfileError("Fix the highlighted fields.");
      return;
    }
    try {
      const nextProfile = await updateProfile({
        name: profileDraft.name.trim(),
        phone: normalizedPhone,
        bio: profileDraft.bio.trim(),
        image_url: profileDraft.imageUrl,
      });
      setProfile(nextProfile);
      setActivePanel("none");
    } catch (profileUpdateError) {
      setProfileError("Unable to update profile.");
    }
  };

  const handleSaveMenu = async () => {
    setMenuError(null);
    if (!menu.upload.file_name && !menu.upload.link && !menu.upload.text) {
      setMenuError("Upload a menu first.");
      return;
    }
    try {
      const nextMenu = { ...menu };
      if (nextMenu.pricing_tiers.length === 0) {
        nextMenu.pricing_tiers = [
          {
            id: `tier-${Date.now()}-in-person`,
            name: "In-person",
            hourly_rate: 80,
            pricing_mode: "fixed",
            allowed_locations: ["my_space"],
            minimum_duration_minutes: 60,
            notes: "",
            hidden: false,
          },
          {
            id: `tier-${Date.now()}-outcall`,
            name: "Outcall",
            hourly_rate: 120,
            pricing_mode: "fixed",
            allowed_locations: ["outcall"],
            minimum_duration_minutes: 60,
            notes: "",
            hidden: false,
          },
          {
            id: `tier-${Date.now()}-online`,
            name: "Online",
            hourly_rate: 60,
            pricing_mode: "fixed",
            allowed_locations: ["online"],
            minimum_duration_minutes: 45,
            notes: "",
            hidden: false,
          },
        ];
      }
      setMenu(nextMenu);
      await saveMenu(nextMenu);
      setMenuSaved(true);
    } catch (menuSaveError) {
      setMenuError("Unable to save menu.");
    }
  };

  const derivedOffers = useMemo(() => {
    return menu.pricing_tiers.flatMap((tier) =>
      tier.allowed_locations.map((location) => ({
        id: `${tier.id}-${location}`,
        pricing_tier_id: tier.id,
        name: tier.name,
        location,
        hourly_rate: tier.hourly_rate,
        pricing_mode: tier.pricing_mode,
        minimum_duration_minutes: tier.minimum_duration_minutes,
      }))
    );
  }, [menu.pricing_tiers]);

  const formatLocation = (location: "my_space" | "outcall" | "online") => {
    if (location === "my_space") return "At my space";
    if (location === "outcall") return "Outcall";
    return "Online";
  };

  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  const profileButtons = profile ? (
    <div className="profile-actions">
      {isOwner ? (
        activePanel === "edit-profile" ? (
          <>
            <button className="button" type="button" onClick={handleUpdateProfile}>
              Save profile
            </button>
            <button className="button ghost" type="button" onClick={() => setActivePanel("none")}>
              Cancel
            </button>
          </>
        ) : (
          <button
            className="button ghost"
            type="button"
            onClick={() => {
              setProfileDraft({
                name: profile.user.name,
                phone: profile.user.phone,
                bio: profile.user.bio,
                imageUrl: profile.user.image_url,
                imageFile: null,
              });
              setActivePanel("edit-profile");
            }}
          >
            Edit profile
          </button>
        )
      ) : (
        <button className="button ghost" type="button">
          Subscribe
        </button>
      )}
      {activePanel !== "edit-profile" ? (
        <button className="button ghost" type="button">
          Share profile
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <section className="screen">
      {profile ? (
        <div className="profile-header">
          {activePanel === "edit-profile" ? (
            <div className="profile-photo">
              {profileDraft.imageUrl ? (
                <img
                  className="profile-photo-preview"
                  src={profileDraft.imageUrl}
                  alt="Profile preview"
                />
              ) : (
                <div className="avatar large" />
              )}
              <label className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    const previewUrl = file ? URL.createObjectURL(file) : null;
                    handleProfileImage(file, previewUrl);
                  }}
                />
                {profileDraft.imageUrl ? "Replace photo" : "Upload photo"}
              </label>
            </div>
          ) : profile.user.image_url ? (
            <img className="avatar" src={profile.user.image_url} alt={profile.user.name} />
          ) : (
            <div className="avatar" />
          )}
          {activePanel === "edit-profile" ? (
            <>
              <input
                className="inline-input title"
                value={profileDraft.name}
                placeholder="Name"
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
              <div className="phone-input">
                <span className="phone-prefix">+1</span>
                <input
                  className="inline-input"
                  value={profileDraft.phone}
                  placeholder="(555) 555-5555"
                  inputMode="numeric"
                  onChange={(event) =>
                    setProfileDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
              <input
                className="inline-input"
                value={profileDraft.bio}
                placeholder="Bio"
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </>
          ) : (
            <>
              <h2>{profile.user.name}</h2>
              <div className="score">Score: {profile.score}</div>
              {profile.user.bio ? (
                <div className="role-line">{renderBio(profile.user.bio)}</div>
              ) : null}
            </>
          )}
          {profileButtons}
        </div>
      ) : null}

      {error ? <div className="error-text">{error}</div> : null}

      {activePanel === "profile" ? (
        <div className="card form-card">
          <h3>Create Profile</h3>
          <div className="profile-form">
            <div className="profile-photo">
              {profileDraft.imageUrl ? (
                <img
                  className="profile-photo-preview"
                  src={profileDraft.imageUrl}
                  alt="Profile preview"
                />
              ) : (
                <div className="avatar large" />
              )}
              <label className="image-upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    const previewUrl = file ? URL.createObjectURL(file) : null;
                    handleProfileImage(file, previewUrl);
                  }}
                />
                {profileDraft.imageUrl ? "Replace photo" : "Upload photo"}
              </label>
              {profileAttempted && profileErrors.photo ? (
                <div className="field-error">{profileErrors.photo}</div>
              ) : null}
            </div>
            <label className="form-field">
              Name
              <input
                value={profileDraft.name}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
              {profileAttempted && profileErrors.name ? (
                <div className="field-error">{profileErrors.name}</div>
              ) : null}
            </label>
            <label className="form-field">
              Phone
              <input
                value={profileDraft.phone}
                placeholder="(555) 555-5555"
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, phone: event.target.value }))
                }
              />
              {profileAttempted && profileErrors.phone ? (
                <div className="field-error">{profileErrors.phone}</div>
              ) : null}
            </label>
            <label className="form-field">
              Bio
              <input
                value={profileDraft.bio}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, bio: event.target.value }))
                }
              />
            </label>
            {profileError ? <div className="form-error">{profileError}</div> : null}
            <div className="form-actions">
              <button
                className="button"
                type="button"
                onClick={handleCreateProfile}
              >
                Create profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="list-section">
        <h3>Step 1</h3>
        <div className="card form-card">
          <div className="menu-section">
            <strong>Profile</strong>
            <div className="muted">{profile ? "Complete" : "Add identity"}</div>
          </div>
        </div>
        <h3>Step 2</h3>
        <div className={profile ? "card form-card" : "card form-card disabled"}>
          <div className="menu-section">
            <strong>Upload menu</strong>
            <div className="menu-upload">
              <label className="upload-field">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setMenu((current) => ({
                      ...current,
                      upload: {
                        ...current.upload,
                        file_name: file ? file.name : "",
                      },
                    }));
                  }}
                />
                {menu.upload.file_name || "Upload PDF or image"}
              </label>
              <input
                className="inline-input"
                placeholder="Paste menu link"
                value={menu.upload.link}
                onChange={(event) =>
                  setMenu((current) => ({
                    ...current,
                    upload: { ...current.upload, link: event.target.value },
                  }))
                }
                disabled={!profile}
              />
              <textarea
                className="inline-input textarea"
                placeholder="Paste menu text"
                rows={3}
                value={menu.upload.text}
                onChange={(event) =>
                  setMenu((current) => ({
                    ...current,
                    upload: { ...current.upload, text: event.target.value },
                  }))
                }
                disabled={!profile}
              />
            </div>
          </div>
          {menuError ? <div className="form-error">{menuError}</div> : null}
          <button className="button" type="button" onClick={handleSaveMenu} disabled={!profile}>
            {menuSaved ? "Menu saved" : "Upload menu"}
          </button>
        </div>
        <h3>Step 3</h3>
        <div className={menuSaved ? "card form-card" : "card form-card disabled"}>
          <strong>Share</strong>
          <button className="button" type="button" disabled={!menuSaved}>
            Copy link
          </button>
        </div>
        {menuSaved ? (
          <>
            <h3>Offers</h3>
            <div className="list">
              {derivedOffers.map((offer) => {
                const overrides = offerOverrides[offer.id] || {};
                const offerCard: Offer = {
                  id: 0,
                  title: overrides.title ?? offer.name,
                  type:
                    offer.pricing_mode === "free"
                      ? "free"
                      : offer.pricing_mode === "donation"
                      ? "donation"
                      : "price",
                  price_cents:
                    offer.pricing_mode === "fixed" ? Math.round(offer.hourly_rate * 100) : 0,
                  session_count: 1,
                  discount_percent: null,
                  deposit_cents: null,
                  duration_minutes: offer.minimum_duration_minutes,
                  availability: [],
                  availability_text: overrides.availability_text ?? "",
                  address: formatLocation(offer.location),
                  description: overrides.description ?? "",
                  image_url: overrides.image_url ?? null,
                  claimed_count: 0,
                  created_at: new Date().toISOString(),
                };
                const isEditing = activeOfferId === offer.id;
                return (
                  <div key={offer.id} className="offer-edit-card">
                    <OfferCard
                      offer={offerCard}
                      editable={isEditing}
                      editableMode="aesthetic"
                      className="card"
                      onChange={(patch) =>
                        setOfferOverrides((current) => ({
                          ...current,
                          [offer.id]: { ...current[offer.id], ...patch },
                        }))
                      }
                      onImageChange={(_, previewUrl) =>
                        setOfferOverrides((current) => ({
                          ...current,
                          [offer.id]: { ...current[offer.id], image_url: previewUrl },
                        }))
                      }
                    />
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => setActiveOfferId(isEditing ? null : offer.id)}
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default Profile;
