// AuthContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { supabase } from "../supabaseClient";
import defaultProfile from "../assets/profile.svg";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [profileData, setProfileData] = useState({
    phoneNumber: "",
    name: "",
    profileImage: defaultProfile,
    userId: null,
  });
  const [profileLoading, setProfileLoading] = useState(true);

  const resetProfileData = useCallback(() => {
    console.log("AuthContext.resetProfileData(): Resetting profile data.");
    setProfileData({
      phoneNumber: "",
      name: "",
      profileImage: defaultProfile,
      userId: null,
    });
    setIsOnboarded(false);
    setIsVerified(false);
    setAuthUser(null);
    setProfileLoading(false);
  }, []);

  const createUserIfNotExists = useCallback(async (userId, phone_number) => {
    console.log("AuthContext.createUserIfNotExists(): Checking user existence:", userId);
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("id, phone_number, name, profile_image_url")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        console.warn("Error checking existing user:", fetchError);
        return null;
      }

      if (!existingUser) {
        console.log("AuthContext.createUserIfNotExists(): Creating new user row.");
        const { data: newUser, error: upsertError } = await supabase
          .from("users")
          .upsert({
            id: userId,
            phone_number: phone_number || "",
            name: "",
            profile_image_url: "",
          })
          .select("id, phone_number, name, profile_image_url")
          .single();

        if (upsertError) {
          console.warn("Error creating user row:", upsertError);
          return null;
        }

        console.log("New user created:", newUser);
        return newUser;
      }

      console.log("User already exists:", existingUser);
      return existingUser;
    } catch (err) {
      console.warn("Unexpected error ensuring user row:", err);
      return null;
    }
  }, []);

  const fetchUserProfile = useCallback(async (identifier) => {
    if (!identifier) {
      console.warn("AuthContext.fetchUserProfile(): No identifier provided.");
      return;
    }

    console.log("AuthContext.fetchUserProfile(): Fetching profile for:", identifier);
    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, phone_number, name, profile_image_url")
        .eq("id", identifier)
        .maybeSingle();

      if (error) {
        console.warn("Error fetching profile:", error);
        resetProfileData();
        return;
      }

      if (!data) {
        console.warn("No user record found for:", identifier);
        resetProfileData();
        return;
      }

      setProfileData({
        phoneNumber: data.phone_number || "",
        name: data.name || "",
        profileImage: data.profile_image_url || defaultProfile,
        userId: data.id || null,
      });

      const onboarded = !!data.name && !!data.phone_number && !!data.profile_image_url;
      setIsOnboarded(onboarded);
      setProfileLoading(false);

      console.log("AuthContext.fetchUserProfile(): Profile fetched and updated:", data, "Onboarded:", onboarded);
    } catch (err) {
      console.warn("Unexpected error fetching profile:", err);
      resetProfileData();
    }
  }, [resetProfileData]);

  const fetchSession = useCallback(async () => {
    console.log("AuthContext.fetchSession(): Checking session...");
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session || !session.user?.id) {
      console.warn("No active session found.");
      resetProfileData();
      return;
    }

    setAuthUser(session.user);
    setIsVerified(true);
    console.log("AuthContext.fetchSession(): Session found. User is verified:", session.user);
  }, [resetProfileData]);

  useEffect(() => {
    fetchSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext.onAuthStateChange(): event:", event, "session:", session);
        if (event === "SIGNED_IN" && session?.user?.id) {
          setAuthUser(session.user);
          setIsVerified(true);

          const ensuredUser = await createUserIfNotExists(session.user.id, session.user.phone);
          if (!ensuredUser) {
            resetProfileData();
            return;
          }

          await fetchUserProfile(session.user.id);
        } else if (event === "SIGNED_OUT") {
          resetProfileData();
        }
      }
    );

    return () => subscription?.unsubscribe?.();
  }, [fetchSession, createUserIfNotExists, fetchUserProfile, resetProfileData]);

  const updateUserProfile = async (newProfileData) => {
    console.log("AuthContext.updateUserProfile(): Attempting profile update with:", newProfileData);
    if (!authUser?.id) {
      console.warn("No authUser present. Re-checking session...");
      await fetchSession();
      if (!authUser?.id) {
        console.error("Still no authUser after re-checking session. Cannot update profile.");
        return;
      }
    }

    const phone_number = newProfileData.phone_number || profileData.phoneNumber || "";
    const name = newProfileData.name || profileData.name || "";
    const profile_image_url = newProfileData.profile_image_url || profileData.profileImage || "";

    const { data, error } = await supabase
      .from("users")
      .upsert({
        id: profileData.userId || authUser.id,
        phone_number,
        name,
        profile_image_url,
      })
      .select("id, phone_number, name, profile_image_url")
      .single();

    if (error) {
      console.warn("Error updating user profile:", error);
      throw error; // Throw so calling function can handle it
    }

    setProfileData({
      phoneNumber: data.phone_number,
      name: data.name,
      profileImage: data.profile_image_url,
      userId: data.id,
    });

    const onboarded = !!data.name && !!data.phone_number && !!data.profile_image_url;
    setIsOnboarded(onboarded);

    console.log("AuthContext.updateUserProfile(): Profile updated successfully.", data, "Onboarded:", onboarded);
  };

  const refreshProfile = async () => {
    if (authUser?.id) {
      console.log("AuthContext.refreshProfile(): Refreshing profile for user:", authUser.id);
      await fetchUserProfile(authUser.id);
    } else {
      console.warn("AuthContext.refreshProfile(): No authUser available.");
    }
  };

  const deleteUser = async () => {
    if (!authUser?.id) return;
    console.log("AuthContext.deleteUser(): Deleting user from DB:", authUser.id);
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", authUser.id);

    if (deleteError) {
      console.warn("Error deleting user from DB:", deleteError);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn("Error signing out user:", signOutError);
      return;
    }

    resetProfileData();
    console.log("AuthContext.deleteUser(): User deleted and signed out.");
  };

  console.log("AuthContext: Current state:", {
    authUser,
    isVerified,
    isOnboarded,
    profileData,
    profileLoading,
  });

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isVerified,
        isOnboarded,
        profileData,
        profileLoading,
        updateUserProfile,
        refreshProfile,
        deleteUser,
        setIsVerified,
        setIsOnboarded,
        fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);